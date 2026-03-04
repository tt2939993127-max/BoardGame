$all = Get-Content tmp/all-files.txt
$dt = $all | Where-Object { $_ -like "src/games/dicethrone/*" }
$su = $all | Where-Object { $_ -like "src/games/smashup/*" }
$sw = $all | Where-Object { $_ -like "src/games/summonerwars/*" }
$eng = $all | Where-Object { $_ -like "src/engine/*" }
$srv = $all | Where-Object { $_ -like "src/server/*" }
$frm = $all | Where-Object { $_ -like "src/components/game/framework/*" }
$cor = $all | Where-Object { $_ -like "src/core/*" }

Write-Host "=== 审计覆盖率统计 ==="
Write-Host ""
Write-Host "总文件数: $($all.Count)"
Write-Host ""
Write-Host "已审计模块:"
Write-Host "  DiceThrone: $($dt.Count) 文件"
Write-Host "  SmashUp: $($su.Count) 文件"
Write-Host "  SummonerWars: $($sw.Count) 文件"
Write-Host "  Engine: $($eng.Count) 文件"
Write-Host "  Server: $($srv.Count) 文件"
Write-Host "  Framework: $($frm.Count) 文件"
Write-Host "  Core: $($cor.Count) 文件"

$audited = $dt.Count + $su.Count + $sw.Count + $eng.Count + $srv.Count + $frm.Count + $cor.Count
$remaining = $all.Count - $audited

Write-Host ""
Write-Host "已审计总数: $audited 文件 ($([math]::Round($audited / $all.Count * 100, 1))%)"
Write-Host "剩余文件: $remaining 文件 ($([math]::Round($remaining / $all.Count * 100, 1))%)"
Write-Host ""

if ($remaining -gt 0) {
    Write-Host "=== 剩余文件清单 ==="
    Write-Host ""
    $all | Where-Object { 
        $_ -notlike "src/games/dicethrone/*" -and 
        $_ -notlike "src/games/smashup/*" -and 
        $_ -notlike "src/games/summonerwars/*" -and 
        $_ -notlike "src/engine/*" -and 
        $_ -notlike "src/server/*" -and 
        $_ -notlike "src/components/game/framework/*" -and 
        $_ -notlike "src/core/*"
    } | ForEach-Object { Write-Host "  $_" }
}
