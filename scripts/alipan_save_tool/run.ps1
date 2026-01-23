$ErrorActionPreference = 'Stop'

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $here

$logPath = Join-Path $here 'run.log'
"=== $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" | Out-File -FilePath $logPath -Encoding utf8
"PowerShell: $($PSVersionTable.PSVersion)" | Out-File -FilePath $logPath -Append -Encoding utf8

# 说明：Windows PowerShell 5.1 对“原生命令(stderr)”会生成 ErrorRecord，容易导致 try/catch 提前中断。
# 这里用 cmd 重定向，确保完整 Traceback 会写入同一个 run.log。
"Python: $(python -V 2>&1)" | Out-File -FilePath $logPath -Append -Encoding utf8

$env:PYTHONUTF8 = '1'
$scriptPath = Join-Path $here 'alipan_save.py'

# PowerShell 5.1 里不要用反斜杠转义引号；用反引号 `" 来转义。
cmd /c "python `"$scriptPath`" >> `"$logPath`" 2>&1"
"ExitCode=$LASTEXITCODE" | Out-File -FilePath $logPath -Append -Encoding utf8

Get-Content -LiteralPath $logPath
Write-Host ""
Write-Host "已将输出写入：$logPath"
Write-Host "按任意键关闭..."
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
