@echo off
REM Kiro 自动继续监控启动脚本
REM 
REM 使用方法：
REM   双击运行此文件
REM   或在命令行中运行: start-kiro-monitor.bat

echo ========================================
echo    Kiro 自动继续监控
echo ========================================
echo.
echo 正在启动监控脚本...
echo.

REM 使用 PowerShell 运行脚本
powershell -ExecutionPolicy Bypass -File "%~dp0kiro-auto-continue.ps1" -MaxRetries 20 -CheckInterval 60 -Timeout 120

pause
