# 하루 그림일기 - 자동 실행 스크립트

Write-Host ""
Write-Host "🌼 하루 그림일기 시작 중..." -ForegroundColor Magenta
Write-Host ""

# 1. 현재 Wi-Fi IP 감지
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.IPAddress -notlike "127.*" -and
    $_.IPAddress -notlike "169.*" -and
    $_.IPAddress -notlike "172.*" -and
    $_.PrefixOrigin -ne "WellKnown"
} | Select-Object -First 1).IPAddress

if (-not $ip) {
    Write-Host "❌ IP를 찾을 수 없어요. Wi-Fi에 연결됐는지 확인해주세요." -ForegroundColor Red
    exit 1
}

Write-Host "📡 현재 IP: $ip" -ForegroundColor Cyan

# 2. theme.js IP 업데이트
$themePath = "$PSScriptRoot\mobile\src\constants\theme.js"
$content = Get-Content $themePath -Raw
$updated = $content -replace "export const API_BASE = 'http://[^']+';", "export const API_BASE = 'http://${ip}:8000';"
Set-Content $themePath $updated -Encoding UTF8

Write-Host "✅ theme.js IP 업데이트 완료" -ForegroundColor Green

# 3. 백엔드 서버 새 창에서 실행
Write-Host "🚀 백엔드 서버 시작 중..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\backend'; Write-Host '🌸 하루 백엔드 서버' -ForegroundColor Magenta; node server.js"

Start-Sleep -Seconds 2

# 4. Expo 실행
Write-Host "📱 Expo 시작 중... (QR 코드를 Expo Go로 스캔하세요)" -ForegroundColor Yellow
Write-Host ""
Set-Location "$PSScriptRoot\mobile"
npx expo start --lan
