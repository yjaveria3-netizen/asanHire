# asanHire Render Keep-Alive Script (PowerShell)
# Pings https://asanhire.onrender.com/health every 60 seconds

$TargetUrl = "https://asanhire.onrender.com/health"
$IntervalSeconds = 60

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "🚀 asanHire Render Keep-Alive Script Started" -ForegroundColor Green
Write-Host "🎯 Target URL : $TargetUrl" -ForegroundColor Yellow
Write-Host "⏱️  Interval   : Every $IntervalSeconds seconds" -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop." -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan

while ($true) {
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $Stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    
    try {
        $Response = Invoke-RestMethod -Uri $TargetUrl -Method Get -TimeoutSec 15
        $Stopwatch.Stop()
        $ElapsedMs = $Stopwatch.ElapsedMilliseconds
        $StatusText = $Response | ConvertTo-Json -Compress
        Write-Host "[$Timestamp] ✅ 200 OK (${ElapsedMs}ms) -> $StatusText" -ForegroundColor Green
    }
    catch {
        $Stopwatch.Stop()
        $ElapsedMs = $Stopwatch.ElapsedMilliseconds
        Write-Host "[$Timestamp] ❌ Request failed (${ElapsedMs}ms): $_" -ForegroundColor Red
    }

    Start-Sleep -Seconds $IntervalSeconds
}
