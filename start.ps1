# 하루 그림일기 - 자동 실행 스크립트

Write-Host ""
Write-Host "하루 그림일기 시작 중..." -ForegroundColor Magenta
Write-Host ""

# 1. 현재 Wi-Fi IP 감지
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.IPAddress -notlike "127.*" -and
    $_.IPAddress -notlike "169.*" -and
    $_.PrefixOrigin -ne "WellKnown"
} | Select-Object -First 1).IPAddress

if (-not $ip) {
    Write-Host "IP를 찾을 수 없어요. Wi-Fi에 연결됐는지 확인해주세요." -ForegroundColor Red
    exit 1
}

Write-Host "현재 IP: $ip" -ForegroundColor Cyan

# 2. theme.js IP 업데이트
$themePath = "$PSScriptRoot\mobile\src\constants\theme.js"
$content = Get-Content $themePath -Raw
$updated = $content -replace "export const API_BASE = 'http://[^']+';", "export const API_BASE = 'http://${ip}:8000';"
Set-Content $themePath $updated -Encoding UTF8

Write-Host "theme.js IP 업데이트 완료" -ForegroundColor Green

# 3. 포트 8000 기존 프로세스 전부 종료
Write-Host "포트 8000 기존 프로세스 확인 중..." -ForegroundColor Yellow
$conns = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if ($conns) {
    $procIds = $conns | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($procId in $procIds) {
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        Write-Host "  프로세스 종료: PID $procId" -ForegroundColor Gray
    }
    # 포트가 완전히 해제될 때까지 대기 (최대 5초)
    $waited = 0
    while ($waited -lt 5) {
        Start-Sleep -Seconds 1
        $waited++
        if (-not (Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue)) { break }
    }
    if (Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue) {
        Write-Host "경고: 포트 8000이 아직 사용 중입니다. 강제 진행합니다." -ForegroundColor Red
    } else {
        Write-Host "포트 8000 해제 완료" -ForegroundColor Green
    }
} else {
    Write-Host "포트 8000 사용 중인 프로세스 없음" -ForegroundColor Gray
}

# 4. 백엔드 서버 새 창에서 실행
Write-Host "백엔드 서버 시작 중..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\backend'; node server.js"

Start-Sleep -Seconds 2

# 5. Expo 실행
Write-Host "Expo 시작 중... (QR 코드를 Expo Go로 스캔하세요)" -ForegroundColor Yellow
Write-Host ""
Set-Location "$PSScriptRoot\mobile"
npx expo start --lan --clear
