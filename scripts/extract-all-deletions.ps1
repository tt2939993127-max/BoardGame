# 提取所有删除的代码
Write-Host "正在提取所有删除的代码...`n"

$numstat = git diff --numstat 6ea1f9f^..6ea1f9f
$files = @()

foreach ($line in $numstat) {
    $parts = $line -split '\s+'
    if ($parts.Length -ge 3) {
        $add = if ($parts[0] -eq '-') { 0 } else { [int]$parts[0] }
        $del = if ($parts[1] -eq '-') { 0 } else { [int]$parts[1] }
        $path = $parts[2..($parts.Length-1)] -join ' '
        
        # 只关注有删除的文件
        if ($del -gt 0) {
            $files += [PSCustomObject]@{
                Path = $path
                Add = $add
                Del = $del
                Net = $add - $del
            }
        }
    }
}

# 按删除行数排序
$files = $files | Sort-Object -Property Del -Descending

Write-Host "找到 $($files.Count) 个有删除代码的文件`n"

# 统计
$p0 = ($files | Where-Object { $_.Del -ge 100 }).Count
$p1 = ($files | Where-Object { $_.Del -ge 50 -and $_.Del -lt 100 }).Count
$p2 = ($files | Where-Object { $_.Del -ge 20 -and $_.Del -lt 50 }).Count
$p3 = ($files | Where-Object { $_.Del -lt 20 }).Count

Write-Host "=== 删除代码统计 ==="
Write-Host "P0 (>=100行): $p0 文件"
Write-Host "P1 (50-99行): $p1 文件"
Write-Host "P2 (20-49行): $p2 文件"
Write-Host "P3 (<20行): $p3 文件"
Write-Host "总计: $($files.Count) 文件`n"

# 生成报告（只生成前50个文件，避免太大）
$report = @"
# POD 提交删除代码完整报告

## 文档说明

本文档列出所有被 POD 提交删除的代码，按删除行数排序。

**创建时间**: 2026-03-04  
**总文件数**: $($files.Count) 个有删除的文件

---

## 删除代码统计

| 优先级 | 删除行数范围 | 文件数 |
|--------|--------------|--------|
| P0 - 高 | >=100 行 | $p0 |
| P1 - 中 | 50-99 行 | $p1 |
| P2 - 低 | 20-49 行 | $p2 |
| P3 - 微小 | <20 行 | $p3 |

---

## TOP 50 删除最多的文件

"@

$top50 = $files | Select-Object -First 50

for ($i = 0; $i -lt $top50.Count; $i++) {
    $file = $top50[$i]
    $priority = if ($file.Del -ge 100) { 'P0' } 
                elseif ($file.Del -ge 50) { 'P1' } 
                elseif ($file.Del -ge 20) { 'P2' } 
                else { 'P3' }
    
    $netStr = if ($file.Net -ge 0) { "+$($file.Net)" } else { "$($file.Net)" }
    
    $report += "`n### $($i + 1). $($file.Path)`n`n"
    $report += "**优先级**: $priority  `n"
    $report += "**变更**: +$($file.Add) -$($file.Del) (净: $netStr)  `n"
    $report += "**审查状态**: 待审查`n`n"
    $report += "---`n"
}

$report | Out-File -FilePath evidence/deletions-complete-report.md -Encoding UTF8
Write-Host "已生成删除代码报告: evidence/deletions-complete-report.md"

# 生成 CSV
$files | Export-Csv -Path tmp/deletions-summary.csv -NoTypeInformation -Encoding UTF8
Write-Host "已生成 CSV 摘要: tmp/deletions-summary.csv"

# 输出 TOP 20
Write-Host "`n=== TOP 20 删除最多的文件 ==="
$files | Select-Object -First 20 | ForEach-Object {
    Write-Host "$($_.Path): -$($_.Del) lines"
}
