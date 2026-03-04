@echo off
chcp 65001
set PYTHONUTF8=1

REM 用短路径避免中文路径在 cmd 下的兼容性问题
set "DIR=%~dp0"
for %%I in ("%DIR%.") do set "DIRS=%%~sI"

set "LOG=%DIRS%\run.log"
echo === %date% %time% === > "%LOG%"

REM 直接用短路径调用，确保能写日志到同目录
python -V >> "%LOG%" 2>&1
python "%DIRS%\alipan_save.py" >> "%LOG%" 2>&1
echo ExitCode=%errorlevel% >> "%LOG%"
echo.
echo 已将输出写入：%LOG%
echo.
type "%LOG%"
echo.
echo 运行结束。按任意键关闭。
pause
