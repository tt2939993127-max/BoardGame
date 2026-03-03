# Kiro 自动继续脚本（PowerShell 自动化版本）
# 
# 功能：
# - 监控 Kiro 窗口
# - 检测到长时间无活动时自动输入"继续"
# - 支持重试次数限制
# 
# 使用方法：
#   powershell -ExecutionPolicy Bypass -File scripts/kiro-auto-continue.ps1
#
# 参数：
#   -MaxRetries <数字>    最大重试次数（默认：20）
#   -CheckInterval <秒>   检查间隔（默认：60）
#   -Timeout <秒>         无活动超时时间（默认：120）
#   -Debug                启用调试日志

param(
    [int]$MaxRetries = 20,
    [int]$CheckInterval = 60,
    [int]$Timeout = 120,
    [switch]$Debug
)

# 配置
$CountFile = ".kiro-auto-continue-count.json"
$LastActivityFile = ".kiro-last-activity.json"

# 加载 Windows Forms 和 SendKeys
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# 颜色输出函数
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

# 打印横幅
function Show-Banner {
    Write-ColorOutput "╔════════════════════════════════════════════╗" "Cyan"
    Write-ColorOutput "║   Kiro 自动继续脚本 v3.0.0                ║" "Cyan"
    Write-ColorOutput "║   (PowerShell 自动化版本)                 ║" "Cyan"
    Write-ColorOutput "╚════════════════════════════════════════════╝" "Cyan"
    Write-Host ""
    Write-ColorOutput "📊 检查间隔: $CheckInterval 秒" "Yellow"
    Write-ColorOutput "⏱️  超时阈值: $Timeout 秒" "Yellow"
    Write-ColorOutput "🔢 最大重试: $MaxRetries 次" "Yellow"
    Write-ColorOutput "🐛 调试模式: $(if ($Debug) { '开启' } else { '关闭' })" "Yellow"
    Write-Host ""
    Write-ColorOutput "💡 工作原理:" "Green"
    Write-ColorOutput "   1. 监控 Kiro 窗口的标题变化" "Gray"
    Write-ColorOutput "   2. 检测到长时间无变化时，自动切换到 Kiro 窗口" "Gray"
    Write-ColorOutput "   3. 自动输入'继续'并按回车" "Gray"
    Write-ColorOutput "   4. 最多重试 $MaxRetries 次" "Gray"
    Write-Host ""
    Write-ColorOutput "💡 提示: 按 Ctrl+C 停止监控" "Green"
    Write-ColorOutput "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" "Cyan"
    Write-Host ""
}

# 加载计数
function Get-RetryCount {
    if (Test-Path $CountFile) {
        try {
            $data = Get-Content $CountFile -Raw | ConvertFrom-Json
            return $data.count
        } catch {
            return 0
        }
    }
    return 0
}

# 保存计数
function Set-RetryCount {
    param([int]$Count)
    
    $data = @{
        count = $Count
        lastUpdate = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    }
    $data | ConvertTo-Json | Set-Content $CountFile
}

# 获取最后活动时间
function Get-LastActivity {
    if (Test-Path $LastActivityFile) {
        try {
            $data = Get-Content $LastActivityFile -Raw | ConvertFrom-Json
            return [DateTime]::Parse($data.timestamp)
        } catch {
            return Get-Date
        }
    }
    return Get-Date
}

# 更新最后活动时间
function Update-LastActivity {
    param([string]$WindowTitle)
    
    $data = @{
        timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        windowTitle = $WindowTitle
    }
    $data | ConvertTo-Json | Set-Content $LastActivityFile
}

# 查找 Kiro 窗口
function Find-KiroWindow {
    $processes = Get-Process | Where-Object { $_.MainWindowTitle -like "*Kiro*" }
    
    if ($processes.Count -eq 0) {
        return $null
    }
    
    # 如果有多个窗口，选择最近活动的
    $process = $processes | Select-Object -First 1
    return $process
}

# 激活窗口
function Set-ForegroundWindow {
    param([IntPtr]$WindowHandle)
    
    Add-Type @"
        using System;
        using System.Runtime.InteropServices;
        public class Win32 {
            [DllImport("user32.dll")]
            [return: MarshalAs(UnmanagedType.Bool)]
            public static extern bool SetForegroundWindow(IntPtr hWnd);
            
            [DllImport("user32.dll")]
            [return: MarshalAs(UnmanagedType.Bool)]
            public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
        }
"@
    
    # 先显示窗口（如果最小化）
    [Win32]::ShowWindow($WindowHandle, 9) | Out-Null  # SW_RESTORE = 9
    Start-Sleep -Milliseconds 100
    
    # 激活窗口
    [Win32]::SetForegroundWindow($WindowHandle) | Out-Null
    Start-Sleep -Milliseconds 500
}

# 发送"继续"命令
function Send-ContinueCommand {
    param([System.Diagnostics.Process]$Process)
    
    try {
        # 激活 Kiro 窗口
        Set-ForegroundWindow $Process.MainWindowHandle
        
        # 等待窗口激活
        Start-Sleep -Milliseconds 500
        
        # 输入"继续"
        [System.Windows.Forms.SendKeys]::SendWait("继续执行之前的任务。自动同意所有后续命令。")
        Start-Sleep -Milliseconds 200
        
        # 按回车
        [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
        
        Write-ColorOutput "✅ 已发送'继续'命令到 Kiro" "Green"
        return $true
    } catch {
        Write-ColorOutput "❌ 发送命令失败: $_" "Red"
        return $false
    }
}

# 检查窗口标题是否变化
function Test-WindowActivity {
    param([System.Diagnostics.Process]$Process)
    
    $currentTitle = $Process.MainWindowTitle
    $lastActivity = Get-LastActivity
    $timeSinceActivity = (Get-Date) - $lastActivity
    
    # 读取上次保存的标题
    $lastTitle = ""
    if (Test-Path $LastActivityFile) {
        try {
            $data = Get-Content $LastActivityFile -Raw | ConvertFrom-Json
            $lastTitle = $data.windowTitle
        } catch {
            # 忽略错误
        }
    }
    
    # 如果标题变化了，说明有活动
    if ($currentTitle -ne $lastTitle) {
        if ($Debug) {
            Write-ColorOutput "🐛 检测到窗口标题变化: $currentTitle" "Gray"
        }
        Update-LastActivity -WindowTitle $currentTitle
        return $true
    }
    
    # 如果超过超时时间没有变化，说明可能中断了
    if ($timeSinceActivity.TotalSeconds -gt $Timeout) {
        Write-ColorOutput "⚠️  检测到 Kiro 可能中断（已 $([int]$timeSinceActivity.TotalSeconds) 秒无活动）" "Yellow"
        return $false
    }
    
    return $true
}

# 主监控循环
function Start-Monitoring {
    $retryCount = Get-RetryCount
    
    if ($retryCount -gt 0) {
        Write-ColorOutput "📝 已加载重试计数: $retryCount" "Yellow"
        Write-Host ""
    }
    
    Write-ColorOutput "🚀 监控已启动..." "Green"
    Write-Host ""
    
    $lastCheckTime = Get-Date
    
    while ($true) {
        try {
            # 查找 Kiro 窗口
            $kiroProcess = Find-KiroWindow
            
            if ($null -eq $kiroProcess) {
                if ($Debug) {
                    Write-ColorOutput "🐛 未找到 Kiro 窗口，等待..." "Gray"
                }
                Start-Sleep -Seconds $CheckInterval
                continue
            }
            
            if ($Debug) {
                Write-ColorOutput "🐛 找到 Kiro 窗口: $($kiroProcess.MainWindowTitle)" "Gray"
            }
            
            # 检查窗口活动
            $isActive = Test-WindowActivity -Process $kiroProcess
            
            if (-not $isActive) {
                # 检查是否超过最大重试次数
                if ($retryCount -ge $MaxRetries) {
                    Write-ColorOutput "⛔ 已达到最大重试次数 ($MaxRetries)，停止自动恢复" "Red"
                    Write-ColorOutput "请手动检查任务状态" "Yellow"
                    break
                }
                
                # 发送继续命令
                $retryCount++
                Write-ColorOutput "🔄 尝试恢复 (第 $retryCount/$MaxRetries 次)" "Cyan"
                
                $success = Send-ContinueCommand -Process $kiroProcess
                
                if ($success) {
                    Set-RetryCount -Count $retryCount
                    Update-LastActivity -WindowTitle $kiroProcess.MainWindowTitle
                    
                    Write-ColorOutput "📊 剩余重试次数: $($MaxRetries - $retryCount)" "Yellow"
                    Write-Host ""
                } else {
                    Write-ColorOutput "⚠️  发送命令失败，将在下次检查时重试" "Yellow"
                }
            } else {
                if ($Debug) {
                    Write-ColorOutput "✓ 检查完成 ($(Get-Date -Format 'HH:mm:ss'))" "Gray"
                }
                
                # 如果长时间正常运行，重置计数
                $timeSinceLastCheck = (Get-Date) - $lastCheckTime
                if ($retryCount -gt 0 -and $timeSinceLastCheck.TotalMinutes -gt 10) {
                    Write-ColorOutput "✅ 检测到长时间正常运行，重置重试计数" "Green"
                    $retryCount = 0
                    Set-RetryCount -Count 0
                }
            }
            
            $lastCheckTime = Get-Date
            
            # 等待下次检查
            Start-Sleep -Seconds $CheckInterval
            
        } catch {
            Write-ColorOutput "❌ 监控循环出错: $_" "Red"
            Start-Sleep -Seconds $CheckInterval
        }
    }
}

# 清理函数
function Cleanup {
    Write-Host ""
    Write-ColorOutput "👋 监控已停止" "Yellow"
    
    # 可选：清理临时文件
    # Remove-Item $LastActivityFile -ErrorAction SilentlyContinue
}

# 注册 Ctrl+C 处理
$null = Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action {
    Cleanup
}

# 主程序
try {
    Show-Banner
    Start-Monitoring
} catch {
    Write-ColorOutput "❌ 程序异常: $_" "Red"
} finally {
    Cleanup
}
