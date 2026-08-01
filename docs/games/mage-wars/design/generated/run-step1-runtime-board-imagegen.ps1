param(
  [ValidateSet('gpt-image-2', 'codex-gpt-image-2')]
  [string]$Model = 'gpt-image-2',

  [string]$DaemonUrl = 'http://127.0.0.1:7456',

  [string]$ProxyUrl = 'http://127.0.0.1:17890',

  [switch]$UseProxy,

  [switch]$Force,

  [int]$TimeoutMinutes = 15
)

$ErrorActionPreference = 'Stop'

function Get-LastJsonLine {
  param([object[]]$Lines)
  $jsonLine = $Lines | Where-Object { "$_" -match '^\s*\{' } | Select-Object -Last 1
  if (-not $jsonLine) {
    throw 'No JSON line returned by Open Design media command.'
  }
  return ($jsonLine | ConvertFrom-Json)
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptDir '..\..\..\..\..')
$odRoot = 'D:\codex-home\tools\open-design'
$odBin = Join-Path $odRoot 'apps\daemon\bin\od.mjs'
$odProjectRoot = Join-Path $odRoot '.od\projects\mage-wars-ui-design'
$odReferenceSheet = Join-Path $odProjectRoot 'refs\mage-wars-step1\step1-runtime-board-reference-sheet.png'
$repoPrompt = Join-Path $repoRoot 'docs\games\mage-wars\design\reference\step1-runtime-board-imagegen-prompt.md'
$repoBrief = Join-Path $repoRoot 'docs\games\mage-wars\design\reference\step1-runtime-board-imagegen-brief.md'
$repoAssetManifest = Join-Path $repoRoot 'docs\games\mage-wars\design\reference\step1-runtime-board-asset-input-manifest.md'
$repoOutput = Join-Path $repoRoot 'docs\games\mage-wars\design\generated\step1-runtime-board-v1.png'
$outputName = 'step1-runtime-board-v1.png'

foreach ($requiredPath in @($odBin, $odProjectRoot, $odReferenceSheet, $repoPrompt, $repoBrief, $repoAssetManifest)) {
  if (-not (Test-Path -LiteralPath $requiredPath)) {
    throw "Required file is missing: $requiredPath"
  }
}

if ((Test-Path -LiteralPath $repoOutput) -and -not $Force) {
  throw "Output already exists. Re-run with -Force to replace: $repoOutput"
}

if ($UseProxy) {
  $env:HTTP_PROXY = $ProxyUrl
  $env:HTTPS_PROXY = $ProxyUrl
}

$health = Invoke-WebRequest -UseBasicParsing "$DaemonUrl/api/health" -TimeoutSec 10
if ($health.StatusCode -ne 200) {
  throw "Open Design daemon health check failed: HTTP $($health.StatusCode)"
}

$generateArgs = @(
  $odBin,
  'media',
  'generate',
  '--project',
  'mage-wars-ui-design',
  '--surface',
  'image',
  '--model',
  $Model,
  '--aspect',
  '16:9',
  '--output',
  $outputName,
  '--image',
  'refs/mage-wars-step1/step1-runtime-board-reference-sheet.png',
  '--prompt-file',
  $repoPrompt,
  '--daemon-url',
  $DaemonUrl
)

Write-Output "MODEL=$Model"
Write-Output "DAEMON=$DaemonUrl"
Write-Output "REFERENCE_IMAGE=$odReferenceSheet"
Write-Output "PROMPT=$repoPrompt"

$generateOutput = & node @generateArgs 2>&1
$generateExit = $LASTEXITCODE
$generateOutput | ForEach-Object { Write-Output $_ }
if ($generateExit -ne 0) {
  throw "Open Design media generate failed with exit code $generateExit."
}

$result = Get-LastJsonLine -Lines $generateOutput
$deadline = (Get-Date).AddMinutes($TimeoutMinutes)

while ($result.taskId) {
  if ((Get-Date) -ge $deadline) {
    throw "Timed out waiting for Open Design task $($result.taskId)."
  }
  $since = if ($null -ne $result.nextSince) { [int]$result.nextSince } else { 0 }
  Start-Sleep -Seconds 15
  $waitOutput = & node $odBin media wait $result.taskId --since $since --daemon-url $DaemonUrl 2>&1
  $waitExit = $LASTEXITCODE
  $waitOutput | ForEach-Object { Write-Output $_ }
  if ($waitExit -ne 0 -and $waitExit -ne 2) {
    throw "Open Design media wait failed with exit code $waitExit."
  }
  $result = Get-LastJsonLine -Lines $waitOutput
}

if (-not $result.file -or -not $result.file.name) {
  throw 'Open Design finished without a file result.'
}

$odOutput = Join-Path $odProjectRoot ([string]$result.file.name)
if (-not (Test-Path -LiteralPath $odOutput)) {
  throw "Generated file not found in Open Design project: $odOutput"
}

Copy-Item -LiteralPath $odOutput -Destination $repoOutput -Force

Write-Output "GENERATED_OD_FILE=$odOutput"
Write-Output "COPIED_WORKTREE_FILE=$repoOutput"
Write-Output 'NEXT_REQUIRED_GATE=AI visual audit must PASS before opening for human review.'
