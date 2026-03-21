[CmdletBinding()]
param()

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[Console]::InputEncoding = $utf8NoBom
[Console]::OutputEncoding = $utf8NoBom
$OutputEncoding = $utf8NoBom

try {
    chcp 65001 > $null
} catch {
}

$isDotSourced = $MyInvocation.InvocationName -eq '.'
if (-not $isDotSourced) {
    Write-Warning '这个脚本需要点源到当前 PowerShell 会话；单独执行只会影响子进程。'
}

Write-Host '已将当前 PowerShell 会话切到 UTF-8 显示模式。'
Write-Host '推荐用法:'
Write-Host '  . .\scripts\infra\enable-utf8.ps1'
Write-Host ''
Write-Host '注意:'
Write-Host '1. 这只解决 PowerShell 显示乱码，不代表文件已经损坏。'
Write-Host '2. 这也不允许用 Set-Content / Out-File / > / >> 写回含中文源码或文档。'
Write-Host '3. 修改中文文件仍应优先使用 apply_patch 或 Node 显式 UTF-8 写回。'
