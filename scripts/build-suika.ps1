# Build the Suika design island into frontend/suika/ (Phase 0+). Windows companion to build-suika.sh.
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location (Join-Path $Root 'frontend-studio_v3')
$env:HUSKY = '0'
$env:SUIKA_BASE = '/suika/'
pnpm install --no-frozen-lockfile
node (Join-Path $Root 'scripts\license-check.js') --root (Join-Path $Root 'frontend-studio_v3')
pnpm --filter '@suika/suika...' run build
$Out = Join-Path $Root 'frontend\suika'
if (Test-Path $Out) { Remove-Item -Recurse -Force $Out }
New-Item -ItemType Directory -Path $Out | Out-Null
Copy-Item -Recurse -Force (Join-Path (Get-Location) 'apps\suika\build\*') $Out
Write-Host "Built frontend/suika/"
