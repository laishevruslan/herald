#Requires -Version 5.1
<#
.SYNOPSIS
  Скачивает из апстрима ScreenTinker только файлы, изменённые в указанной версии.

.DESCRIPTION
  Берёт тег vX.Y.Z репозитория https://github.com/screentinker/screentinker и
  предыдущий стабильный тег (пререлизы между ними пропускаются). В каталог
  попадают добавленные, изменённые и переименованные файлы в том виде, в каком
  они есть на этом теге, с исходной структурой папок. Удалённые файлы в дерево
  не копируются: они перечислены в _manifest.tsv.

  История коммитов кэшируется в upstream/.cache. Содержимое файлов скачивается
  только для путей из выбранного диапазона.

.PARAMETER Version
  Номер версии: 2.6.1 или v2.6.1.

.PARAMETER From
  Базовая версия. По умолчанию — предыдущий стабильный тег на истории Version.

.PARAMETER OutDir
  Куда сложить дерево. По умолчанию upstream/screentinker/<тег> в корне репозитория.

.PARAMETER CacheDir
  Bare-клон без блобов. По умолчанию upstream/.cache/screentinker.git.

.PARAMETER Repo
  URL апстрима.

.PARAMETER Force
  Разрешить каталог вне upstream/ (и заменить его, если он уже есть).

.EXAMPLE
  .\scripts\fetch-screentinker.ps1 2.6.1

.EXAMPLE
  .\scripts\fetch-screentinker.ps1 v2.6.1 -From 2.5.1
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$Version,

  [string]$From,

  [string]$OutDir,

  [string]$CacheDir,

  [string]$Repo = 'https://github.com/screentinker/screentinker.git',

  [switch]$Force
)

$ErrorActionPreference = 'Stop'
$env:GIT_TERMINAL_PROMPT = '0'
# Windows PowerShell 5.1 otherwise prints Cyrillic in the OEM code page.
$utf8Console = New-Object System.Text.UTF8Encoding $false
try {
  [Console]::OutputEncoding = $utf8Console
  [Console]::InputEncoding = $utf8Console
} catch {}
$OutputEncoding = $utf8Console

$RepoRoot = Split-Path -Parent $PSScriptRoot

function Format-Arguments {
  param([string[]]$Values)
  $parts = foreach ($value in $Values) {
    if ($null -eq $value -or $value.Length -eq 0) {
      '""'
      continue
    }
    if ($value -notmatch '[\s"]') {
      $value
      continue
    }
    '"' + ($value.Replace('"', '\"')) + '"'
  }
  return ($parts -join ' ')
}

function Invoke-GitText {
  param([Parameter(Mandatory = $true)][string[]]$GitArgs)
  $output = & git @GitArgs
  if ($LASTEXITCODE -ne 0) {
    throw "git $($GitArgs -join ' ') завершился с кодом $LASTEXITCODE"
  }
  if ($null -eq $output) { return '' }
  return (($output | ForEach-Object { "$_" }) -join "`n").Trim()
}

function Invoke-GitBytes {
  param([Parameter(Mandatory = $true)][string[]]$GitArgs)
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = 'git'
  $psi.Arguments = Format-Arguments $GitArgs
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.CreateNoWindow = $true
  $psi.EnvironmentVariables['GIT_TERMINAL_PROMPT'] = '0'

  $proc = New-Object System.Diagnostics.Process
  $proc.StartInfo = $psi
  if (-not $proc.Start()) { throw "Не удалось запустить git $($GitArgs -join ' ')" }

  $errTask = $proc.StandardError.ReadToEndAsync()
  $memory = New-Object System.IO.MemoryStream
  $proc.StandardOutput.BaseStream.CopyTo($memory)
  $proc.WaitForExit()
  $errText = $errTask.Result
  if ($proc.ExitCode -ne 0) {
    throw "git $($GitArgs -join ' ') завершился с кодом $($proc.ExitCode): $errText"
  }
  return $memory.ToArray()
}

function ConvertTo-UpstreamTag {
  param([Parameter(Mandatory = $true)][string]$Value)
  $name = $Value.Trim()
  if ($name -notmatch '^v?\d+\.\d+\.\d+([-+][0-9A-Za-z.-]+)?$') {
    throw "Номер версии должен быть вида 2.6.1 или v2.6.1-beta.1, получено: $Value"
  }
  if ($name -notmatch '^v') { $name = "v$name" }
  return $name
}

function Resolve-UpstreamTag {
  param(
    [Parameter(Mandatory = $true)][string]$GitDir,
    [Parameter(Mandatory = $true)][string]$Name
  )
  $sha = & git --git-dir $GitDir rev-parse --verify --quiet "${Name}^{commit}"
  if ($LASTEXITCODE -ne 0 -or -not $sha) {
    return $null
  }
  return @{ Name = $Name; Sha = ("$sha").Trim() }
}

function Show-RecentStableTags {
  param([Parameter(Mandatory = $true)][string]$GitDir)
  $listed = & git --git-dir $GitDir tag --sort=-v:refname -l 'v*'
  if ($LASTEXITCODE -ne 0 -or -not $listed) { return }
  $stable = @($listed | Where-Object { $_ -match '^v\d+\.\d+\.\d+$' } | Select-Object -First 12)
  if ($stable.Count -eq 0) { return }
  Write-Host "Последние стабильные теги:"
  foreach ($tag in $stable) { Write-Host "  $tag" }
}

function Update-UpstreamCache {
  param(
    [Parameter(Mandatory = $true)][string]$GitDir,
    [Parameter(Mandatory = $true)][string]$RepoUrl
  )
  $head = Join-Path $GitDir 'HEAD'
  if (-not (Test-Path -LiteralPath $head)) {
    $parent = Split-Path -Parent $GitDir
    if ($parent -and -not (Test-Path -LiteralPath $parent)) {
      New-Item -ItemType Directory -Path $parent | Out-Null
    }
    if (Test-Path -LiteralPath $GitDir) {
      Remove-Item -LiteralPath $GitDir -Recurse -Force
    }
    Write-Host "Клонирую историю $RepoUrl"
    Write-Host "Содержимое файлов не качается целиком: только пути выбранной версии."
    & git clone --bare --filter=blob:none --progress --origin origin -- $RepoUrl $GitDir
    if ($LASTEXITCODE -ne 0) { throw "git clone завершился с кодом $LASTEXITCODE" }
  } else {
    Write-Host "Обновляю теги ScreenTinker..."
    & git --git-dir $GitDir fetch --force --tags --prune --prune-tags --filter=blob:none --progress origin
    if ($LASTEXITCODE -ne 0) { throw "git fetch завершился с кодом $LASTEXITCODE" }
  }
  & git --git-dir $GitDir config core.longpaths true | Out-Null
}

function Get-PreviousStableTag {
  param(
    [Parameter(Mandatory = $true)][string]$GitDir,
    [Parameter(Mandatory = $true)][string]$TagName,
    [Parameter(Mandatory = $true)][string]$TagSha
  )
  $skipPrerelease = $TagName -notmatch '-'
  $cursor = $TagSha
  for ($step = 0; $step -lt 40; $step++) {
    $described = & git --git-dir $GitDir describe --tags --abbrev=0 "$cursor^" 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $described) { return $null }
    $candidate = ("$described").Trim()
    if ($skipPrerelease -and $candidate -match '-') {
      $cursor = Invoke-GitText @('--git-dir', $GitDir, 'rev-parse', '--verify', "${candidate}^{commit}")
      continue
    }
    return $candidate
  }
  throw "Слишком много пререлизов перед $TagName. Укажите базу явно: -From X.Y.Z"
}

function Split-GitDiffRaw {
  param([byte[]]$Bytes)
  $items = New-Object System.Collections.Generic.List[object]
  if ($null -eq $Bytes -or $Bytes.Length -eq 0) { return $items }
  $text = [System.Text.Encoding]::UTF8.GetString($Bytes)
  $parts = $text.Split([char]0)
  $index = 0
  while ($index -lt $parts.Length) {
    $meta = $parts[$index]
    if ([string]::IsNullOrEmpty($meta)) { break }
    $index++
    if ($meta -notmatch '^:(?<oldmode>\d+) (?<newmode>\d+) (?<oldsha>[0-9a-f]+) (?<newsha>[0-9a-f]+) (?<status>[A-Z][0-9]*)$') {
      throw "Неожиданная запись git diff: $meta"
    }
    $code = $Matches['status'].Substring(0, 1)
    $path = $parts[$index]
    $index++
    $fromPath = $null
    if ($code -eq 'R' -or $code -eq 'C') {
      $fromPath = $path
      $path = $parts[$index]
      $index++
    }
    $items.Add([pscustomobject]@{
      Code     = $code
      OldMode  = $Matches['oldmode']
      NewMode  = $Matches['newmode']
      Path     = $path
      FromPath = $fromPath
    })
  }
  return $items
}

function Invoke-CheckoutIndex {
  param(
    [Parameter(Mandatory = $true)][string]$GitDir,
    [Parameter(Mandatory = $true)][string]$IndexFile,
    [Parameter(Mandatory = $true)][string]$WorkTree,
    [Parameter(Mandatory = $true)][string[]]$Paths
  )
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = 'git'
  $psi.Arguments = Format-Arguments @(
    '--git-dir', $GitDir,
    '-c', 'core.autocrlf=false',
    '-c', 'core.longpaths=true',
    'checkout-index', '--stdin'
  )
  $psi.WorkingDirectory = $WorkTree
  $psi.UseShellExecute = $false
  $psi.RedirectStandardInput = $true
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.CreateNoWindow = $true
  $psi.EnvironmentVariables['GIT_INDEX_FILE'] = $IndexFile
  $psi.EnvironmentVariables['GIT_WORK_TREE'] = $WorkTree
  $psi.EnvironmentVariables['GIT_TERMINAL_PROMPT'] = '0'

  $proc = New-Object System.Diagnostics.Process
  $proc.StartInfo = $psi
  if (-not $proc.Start()) { throw 'Не удалось запустить git checkout-index' }

  $errTask = $proc.StandardError.ReadToEndAsync()
  $outTask = $proc.StandardOutput.ReadToEndAsync()
  $utf8 = New-Object System.Text.UTF8Encoding $false
  $writer = New-Object System.IO.StreamWriter($proc.StandardInput.BaseStream, $utf8, 1024, $false)
  $writer.NewLine = "`n"
  try {
    foreach ($path in $Paths) { $writer.WriteLine($path) }
  } finally {
    $writer.Dispose()
  }
  $proc.WaitForExit()
  $errText = $errTask.Result
  $outText = $outTask.Result
  if ($proc.ExitCode -ne 0) {
    throw "git checkout-index завершился с кодом $($proc.ExitCode): $errText $outText"
  }
}

function Resolve-OutputDirectory {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Root,
    [switch]$AllowOutside
  )
  $full = [System.IO.Path]::GetFullPath($Path)
  $rootFull = [System.IO.Path]::GetFullPath($Root)
  if ($full.TrimEnd('\', '/') -eq $rootFull.TrimEnd('\', '/')) {
    throw 'Выходной каталог не может быть корнем репозитория.'
  }
  $upstream = [System.IO.Path]::GetFullPath((Join-Path $Root 'upstream'))
  $separator = [System.IO.Path]::DirectorySeparatorChar
  $underUpstream = $full.StartsWith($upstream + $separator, [System.StringComparison]::OrdinalIgnoreCase)
  if (-not $underUpstream -and -not $AllowOutside) {
    throw "Каталог вне upstream/. Повторите с -Force, если это намеренно: $full"
  }
  if (Test-Path -LiteralPath $full) {
    Write-Host "Заменяю прежний снимок $full"
    Remove-Item -LiteralPath $full -Recurse -Force
  }
  New-Item -ItemType Directory -Path $full | Out-Null
  return $full
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw 'git не найден в PATH.'
}

$tagName = ConvertTo-UpstreamTag $Version
if (-not $CacheDir) {
  $CacheDir = Join-Path $RepoRoot (Join-Path 'upstream' (Join-Path '.cache' 'screentinker.git'))
}
$CacheDir = [System.IO.Path]::GetFullPath($CacheDir)

Update-UpstreamCache -GitDir $CacheDir -RepoUrl $Repo

$tag = Resolve-UpstreamTag -GitDir $CacheDir -Name $tagName
if (-not $tag) {
  Show-RecentStableTags -GitDir $CacheDir
  throw "Тег $tagName не найден в $Repo"
}

if ($From) {
  $baseName = ConvertTo-UpstreamTag $From
} else {
  $baseName = Get-PreviousStableTag -GitDir $CacheDir -TagName $tag.Name -TagSha $tag.Sha
  if (-not $baseName) {
    throw "Перед $($tag.Name) нет тега. Укажите базу: -From X.Y.Z"
  }
}

$base = Resolve-UpstreamTag -GitDir $CacheDir -Name $baseName
if (-not $base) {
  Show-RecentStableTags -GitDir $CacheDir
  throw "Базовый тег $baseName не найден в $Repo"
}
if ($base.Sha -eq $tag.Sha) {
  throw "База $($base.Name) и версия $($tag.Name) указывают на один и тот же коммит."
}

if (-not $OutDir) {
  $OutDir = Join-Path $RepoRoot (Join-Path 'upstream' (Join-Path 'screentinker' $tag.Name))
}

Write-Host "Диапазон: $($base.Name) -> $($tag.Name)"

$diffBytes = Invoke-GitBytes @(
  '--git-dir', $CacheDir,
  '-c', 'core.quotepath=false',
  'diff', '--raw', '--find-renames', '-z',
  $base.Sha, $tag.Sha
)
$changes = @(Split-GitDiffRaw -Bytes $diffBytes | Sort-Object Path, Code)

$exportPaths = New-Object System.Collections.Generic.List[string]
foreach ($change in $changes) {
  if ($change.NewMode -eq '160000' -or $change.OldMode -eq '160000') {
    $change.Code = 'S'
    continue
  }
  if ($change.Code -eq 'D' -or $change.NewMode -eq '000000') { continue }
  if ($change.Path) { [void]$exportPaths.Add($change.Path) }
}
$uniqueExport = @($exportPaths | Select-Object -Unique)
$OutDir = Resolve-OutputDirectory -Path $OutDir -Root $RepoRoot -AllowOutside:$Force

if ($uniqueExport.Count -gt 0) {
  $indexFile = Join-Path ([System.IO.Path]::GetTempPath()) ("screentinker-" + [guid]::NewGuid().ToString('n') + '.index')
  $previousIndex = $env:GIT_INDEX_FILE
  $env:GIT_INDEX_FILE = $indexFile
  try {
    Write-Host "Читаю дерево $($tag.Name)..."
    Invoke-GitText @('--git-dir', $CacheDir, '-c', 'core.autocrlf=false', 'read-tree', $tag.Sha) | Out-Null
    $batchSize = 200
    $done = 0
    Write-Host "Сохраняю $($uniqueExport.Count) файлов..."
    for ($offset = 0; $offset -lt $uniqueExport.Count; $offset += $batchSize) {
      $end = [Math]::Min($offset + $batchSize - 1, $uniqueExport.Count - 1)
      $batch = @($uniqueExport[$offset..$end])
      Invoke-CheckoutIndex -GitDir $CacheDir -IndexFile $indexFile -WorkTree $OutDir -Paths $batch
      $done += $batch.Count
      Write-Host "  $done / $($uniqueExport.Count)"
    }
  } finally {
    if ($null -eq $previousIndex) {
      Remove-Item Env:GIT_INDEX_FILE -ErrorAction SilentlyContinue
    } else {
      $env:GIT_INDEX_FILE = $previousIndex
    }
    if (Test-Path -LiteralPath $indexFile) { Remove-Item -LiteralPath $indexFile -Force }
  }
}

$manifestPath = Join-Path $OutDir '_manifest.tsv'
if (Test-Path -LiteralPath $manifestPath) {
  $manifestPath = $OutDir + '.manifest.tsv'
}
$counts = @{
  A = 0; M = 0; D = 0; R = 0; C = 0; T = 0; S = 0
}
$lines = New-Object System.Collections.Generic.List[string]
[void]$lines.Add("# repo $Repo")
[void]$lines.Add("# version $($tag.Name) $($tag.Sha)")
[void]$lines.Add("# base $($base.Name) $($base.Sha)")
[void]$lines.Add('# status: A added, M modified, D deleted (not written), R renamed, C copied, T type change, S submodule (not written)')
[void]$lines.Add("status`tpath`tfrom_path")
foreach ($change in $changes) {
  if (-not $counts.ContainsKey($change.Code)) { $counts[$change.Code] = 0 }
  $counts[$change.Code]++
  $fromPath = ''
  if ($change.FromPath) { $fromPath = $change.FromPath }
  [void]$lines.Add("$($change.Code)`t$($change.Path)`t$fromPath")
}
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllLines($manifestPath, $lines.ToArray(), $utf8NoBom)

$onDisk = @(Get-ChildItem -LiteralPath $OutDir -Recurse -File -Force | Where-Object { $_.FullName -ne $manifestPath })
if ($onDisk.Count -ne $uniqueExport.Count) {
  throw "На диске $($onDisk.Count) файлов, ожидалось $($uniqueExport.Count). Проверьте коллизии регистра имён в $OutDir"
}

Write-Host ''
Write-Host "Готово: $OutDir"
$summary = '  добавлено {0}, изменено {1}, удалено {2}, переименовано {3}, скопировано {4}, тип {5}, подмодули {6}' -f $counts['A'], $counts['M'], $counts['D'], $counts['R'], $counts['C'], $counts['T'], $counts['S']
Write-Host $summary
Write-Host "  манифест: $manifestPath"
