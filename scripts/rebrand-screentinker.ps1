#Requires -Version 5.1
<#
.SYNOPSIS
  Переименовывает ScreenTinker в LuminaScreen во всех написаниях.

.DESCRIPTION
  Меняет имя в тексте и в именах файлов и папок. Регистр и разделитель
  переносятся посимвольно, потому что обе части имени одной длины:

    ScreenTinker   -> LuminaScreen
    screentinker   -> luminascreen
    SCREENTINKER   -> LUMINASCREEN
    Screentinker   -> Luminascreen
    screen-tinker  -> lumina-screen
    Screen_Tinker  -> Lumina_Screen
    Screen Tinker  -> Lumina Screen

  Домен screentinker.com становится luminascreen.ru с тем же регистром.
  Пакет Tizen ScrnTinkr1 не меняется. Партнёрская метка Amazon
  screentinker-20 остаётся: это не имя продукта, а id аккаунта.

.PARAMETER Path
  Каталог снимка. По умолчанию — последний upstream/screentinker/vX.Y.Z.

.PARAMETER KeepDomain
  Не менять .com на .ru: screentinker.com станет luminascreen.com.

.EXAMPLE
  .\scripts\rebrand-screentinker.ps1

.EXAMPLE
  .\scripts\rebrand-screentinker.ps1 .\upstream\screentinker\v2.6.1 -WhatIf
#>
[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [Parameter(Position = 0)]
  [string]$Path,

  [switch]$KeepDomain
)

$ErrorActionPreference = 'Stop'
$utf8Console = New-Object System.Text.UTF8Encoding $false
try {
  [Console]::OutputEncoding = $utf8Console
  [Console]::InputEncoding = $utf8Console
} catch {}
$OutputEncoding = $utf8Console

$RepoRoot = Split-Path -Parent $PSScriptRoot

$BinaryExtensions = @(
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.bmp',
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.apk', '.aab', '.wgt', '.zip', '.gz', '.tgz', '.tar', '.jar',
  '.so', '.bin', '.pdf', '.mp4', '.mp3', '.webm', '.wav', '.ogg',
  '.db', '.sqlite', '.exe', '.dll', '.pdb', '.pack', '.vpkg', '.ipk',
  '.dmg', '.wasm', '.pyc', '.class'
)

$SkipDirectoryNames = @('.git', 'node_modules', '.cache')

# screen/tinker and lumina/screen are both 6+6, so each source letter
# decides the case of the letter in the same position.
# No trailing word boundary: ScreenTinkerHelper is one identifier, and the
# suffix after the brand (Helper) has to stay attached.
$BrandPattern = [regex]::new(
  '(?<![A-Za-z0-9])(?<w1>screen)(?<sep>[ _-]?)(?<w2>tinker)(?<tld>\.com(?![A-Za-z0-9.]))?',
  [System.Text.RegularExpressions.RegexOptions]::IgnoreCase -bor `
    [System.Text.RegularExpressions.RegexOptions]::Compiled
)

function ConvertTo-LuminaName {
  param(
    [Parameter(Mandatory = $true)][string]$Value,
    [bool]$RewriteDomain = $true
  )
  # The matcher calls this scriptblock from the regex engine, outside the
  # function, so the mapping stays inline and the inputs live in script scope.
  $script:RebrandCount = 0
  $script:RebrandSource = $Value
  $script:RebrandMapDomain = [bool]$RewriteDomain
  $evaluator = {
    param($match)
    $sourceText = $script:RebrandSource
    $tailStart = $match.Index + $match.Length
    $tail = if ($tailStart -lt $sourceText.Length) { $sourceText.Substring($tailStart) } else { '' }
    # Amazon associate tag, kept as published on the existing store links.
    if ($tail.Length -ge 3 -and $tail.StartsWith('-20') -and ($tail.Length -eq 3 -or $tail[3] -notmatch '[0-9A-Za-z]')) {
      return $match.Value
    }
    $w1 = $match.Groups['w1'].Value
    $w2 = $match.Groups['w2'].Value
    $lumina = 'lumina'.ToCharArray()
    $screen = 'screen'.ToCharArray()
    for ($i = 0; $i -lt $w1.Length; $i++) {
      if ([char]::IsUpper($w1[$i])) { $lumina[$i] = [char]::ToUpperInvariant($lumina[$i]) }
    }
    for ($i = 0; $i -lt $w2.Length; $i++) {
      if ([char]::IsUpper($w2[$i])) { $screen[$i] = [char]::ToUpperInvariant($screen[$i]) }
    }
    $name = (-join $lumina) + $match.Groups['sep'].Value + (-join $screen)
    $tld = $match.Groups['tld'].Value
    if ($tld) {
      if ($script:RebrandMapDomain) {
        $letters = $tld.Substring(1)
        $upper = 0
        foreach ($ch in $letters.ToCharArray()) { if ([char]::IsUpper($ch)) { $upper++ } }
        if ($upper -eq 0) { $name += '.ru' }
        elseif ($upper -eq $letters.Length) { $name += '.RU' }
        else { $name += '.Ru' }
      } else {
        $name += $tld
      }
    }
    $script:RebrandCount++
    return $name
  }
  $rewritten = $BrandPattern.Replace($Value, [System.Text.RegularExpressions.MatchEvaluator]$evaluator)
  return @{ Text = $rewritten; Count = $script:RebrandCount }
}

function Get-DefaultSnapshot {
  $root = Join-Path $RepoRoot (Join-Path 'upstream' 'screentinker')
  if (-not (Test-Path -LiteralPath $root)) { return $null }
  $dirs = @(Get-ChildItem -LiteralPath $root -Directory | Where-Object { $_.Name -match '^v\d+\.\d+\.\d+' })
  if ($dirs.Count -eq 0) { return $null }
  return ($dirs | Sort-Object { try { [version]($_.Name.TrimStart('v')) } catch { [version]'0.0.0' } } | Select-Object -Last 1).FullName
}

function Read-SourceFile {
  param([Parameter(Mandatory = $true)][string]$FilePath)
  $bytes = [System.IO.File]::ReadAllBytes($FilePath)
  if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
    return @{
      Text     = [System.Text.Encoding]::UTF8.GetString($bytes, 3, $bytes.Length - 3)
      Encoding = (New-Object System.Text.UTF8Encoding $true)
    }
  }
  if ($bytes.Length -ge 2 -and $bytes[0] -eq 0xFF -and $bytes[1] -eq 0xFE) {
    return @{
      Text     = [System.Text.Encoding]::Unicode.GetString($bytes, 2, $bytes.Length - 2)
      Encoding = [System.Text.Encoding]::Unicode
    }
  }
  if ($bytes.Length -ge 2 -and $bytes[0] -eq 0xFE -and $bytes[1] -eq 0xFF) {
    return @{
      Text     = [System.Text.Encoding]::BigEndianUnicode.GetString($bytes, 2, $bytes.Length - 2)
      Encoding = [System.Text.Encoding]::BigEndianUnicode
    }
  }
  $scan = [Math]::Min(8192, $bytes.Length)
  for ($i = 0; $i -lt $scan; $i++) {
    if ($bytes[$i] -eq 0) { return $null }
  }
  $utf8 = New-Object System.Text.UTF8Encoding $false, $true
  try {
    return @{ Text = $utf8.GetString($bytes); Encoding = (New-Object System.Text.UTF8Encoding $false) }
  } catch {
    return $null
  }
}

function Test-SkippedDirectory {
  param([AllowEmptyString()][string]$RelativePath)
  if (-not $RelativePath) { return $false }
  foreach ($part in ($RelativePath -split '[\\/]')) {
    if ($SkipDirectoryNames -contains $part) { return $true }
  }
  return $false
}

if (-not $Path) {
  $Path = Get-DefaultSnapshot
  if (-not $Path) {
    throw 'Не задан Path и нет снимка в upstream/screentinker/. Сначала запустите fetch-screentinker.ps1.'
  }
}
# Relative paths are from the repository root, not from the shell's current directory.
if (-not [System.IO.Path]::IsPathRooted($Path)) {
  $Path = Join-Path $RepoRoot $Path
}
$Path = [System.IO.Path]::GetFullPath($Path)
if (-not (Test-Path -LiteralPath $Path -PathType Container)) {
  throw "Каталог не найден: $Path"
}
$rootFull = [System.IO.Path]::GetFullPath($RepoRoot)
if ($Path.TrimEnd('\', '/') -eq $rootFull.TrimEnd('\', '/')) {
  throw 'Нельзя ребрандировать корень репозитория. Укажите снимок, например upstream/screentinker/v2.6.1.'
}

Write-Host "Ребрандинг: $Path"
if ($KeepDomain) { Write-Host 'Домен .com остаётся .com.' }

$filesChanged = 0
$replacements = 0
$skippedBinary = 0
$renamed = 0

$files = @(Get-ChildItem -LiteralPath $Path -Recurse -File -Force)
foreach ($file in $files) {
  $relative = $file.FullName.Substring($Path.Length).TrimStart('\', '/')
  if (Test-SkippedDirectory $relative) { continue }
  $ext = $file.Extension.ToLowerInvariant()
  if ($BinaryExtensions -contains $ext) {
    $skippedBinary++
    continue
  }
  $source = Read-SourceFile $file.FullName
  if (-not $source) {
    $skippedBinary++
    continue
  }
  $converted = ConvertTo-LuminaName -Value $source.Text -RewriteDomain:(!$KeepDomain)
  if ($converted.Count -eq 0) { continue }
  $replacements += $converted.Count
  $filesChanged++
  if ($PSCmdlet.ShouldProcess($relative, "заменить $($converted.Count) вхождений")) {
    [System.IO.File]::WriteAllText($file.FullName, $converted.Text, $source.Encoding)
  }
}

$entries = @(Get-ChildItem -LiteralPath $Path -Recurse -Force | Sort-Object { ($_.FullName -split '[\\/]').Count }, { $_.FullName.Length } -Descending)
foreach ($entry in $entries) {
  $relative = $entry.FullName.Substring($Path.Length).TrimStart('\', '/')
  if (-not $relative) { continue }
  if (Test-SkippedDirectory (Split-Path -Parent $relative)) { continue }
  $converted = ConvertTo-LuminaName -Value $entry.Name -RewriteDomain:(!$KeepDomain)
  if ($converted.Text -eq $entry.Name) { continue }
  $parent = Split-Path -Parent $entry.FullName
  $destination = Join-Path $parent $converted.Text
  if (Test-Path -LiteralPath $destination) {
    throw "Имя занято, переименование остановлено: $relative -> $($converted.Text)"
  }
  if ($PSCmdlet.ShouldProcess($relative, "переименовать в $($converted.Text)")) {
    if ($entry.PSIsContainer) {
      [System.IO.Directory]::Move($entry.FullName, $destination)
    } else {
      [System.IO.File]::Move($entry.FullName, $destination)
    }
  }
  $renamed++
  $replacements += $converted.Count
}

Write-Host ''
Write-Host "Готово: $Path"
Write-Host "  файлов с заменами: $filesChanged"
Write-Host "  замен в тексте и именах: $replacements"
Write-Host "  переименовано файлов и папок: $renamed"
Write-Host "  пропущено двоичных: $skippedBinary"
