# ─────────────────────────────────────────
#  하루 그림일기 — 로컬 개발 서버 (PowerShell)
#
#  실행 방법:
#    cd <프로젝트 폴더>
#    .\server.ps1
#
#  접속: http://localhost:8080
#
#  ※ SpeechRecognition / speechSynthesis(음성 인식·TTS)는
#    HTTPS 또는 localhost 에서만 동작합니다.
#    이 스크립트는 localhost 로 서빙하므로 음성 기능이 정상 작동합니다.
#    실제 배포 시에는 반드시 HTTPS 환경을 사용하세요.
# ─────────────────────────────────────────

$port     = 8080
$localPath = Get-Item .
$listener  = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

# MIME 타입 매핑
function Get-ContentType([string]$ext) {
    switch ($ext) {
        ".html"  { return "text/html; charset=utf-8" }
        ".css"   { return "text/css; charset=utf-8" }
        ".js"    { return "application/javascript; charset=utf-8" }
        ".mjs"   { return "application/javascript; charset=utf-8" }
        ".json"  { return "application/json; charset=utf-8" }
        ".png"   { return "image/png" }
        ".jpg"   { return "image/jpeg" }
        ".jpeg"  { return "image/jpeg" }
        ".gif"   { return "image/gif" }
        ".svg"   { return "image/svg+xml; charset=utf-8" }
        ".ico"   { return "image/x-icon" }
        ".webp"  { return "image/webp" }
        ".woff"  { return "font/woff" }
        ".woff2" { return "font/woff2" }
        ".txt"   { return "text/plain; charset=utf-8" }
        ".md"    { return "text/plain; charset=utf-8" }
        default  { return "application/octet-stream" }
    }
}

try {
    $listener.Start()
    Write-Host ""
    Write-Host "  ✅ 하루 그림일기 서버 시작" -ForegroundColor Green
    Write-Host "  🌐 http://localhost:$port" -ForegroundColor Cyan
    Write-Host "  🎤 음성 인식 기능: localhost 환경이므로 정상 작동합니다." -ForegroundColor Yellow
    Write-Host "  ⏹  종료: Ctrl+C" -ForegroundColor Gray
    Write-Host ""

    while ($listener.IsListening) {
        $context  = $listener.GetContext()
        $request  = $context.Request
        $response = $context.Response

        # URL 디코딩 및 기본 경로 처리
        $rawUrl     = $request.RawUrl.Split('?')[0]
        $decodedUrl = [System.Uri]::UnescapeDataString($rawUrl)
        if ($decodedUrl -eq '/') { $decodedUrl = '/index.html' }

        $relativePath = $decodedUrl.TrimStart('/')
        $filePath     = [System.IO.Path]::GetFullPath((Join-Path $localPath $relativePath))

        # CORS 헤더 추가 (Supabase ESM import 등에 필요)
        $response.Headers.Add("Access-Control-Allow-Origin", "*")
        $response.Headers.Add("Access-Control-Allow-Methods", "GET, OPTIONS")
        $response.Headers.Add("Access-Control-Allow-Headers", "Content-Type")

        # OPTIONS preflight
        if ($request.HttpMethod -eq 'OPTIONS') {
            $response.StatusCode = 204
            $response.OutputStream.Close()
            continue
        }

        # 보안 검사: 프로젝트 폴더 밖 접근 차단
        if ($filePath.StartsWith($localPath.FullName) -and (Test-Path $filePath -PathType Leaf)) {
            $ext         = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = Get-ContentType $ext

            $response.ContentType = $contentType
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)

            Write-Host "  200  $decodedUrl" -ForegroundColor DarkGray
        } else {
            $response.StatusCode = 404
            $errorMsg = "404 Not Found: $decodedUrl"
            $bytes    = [System.Text.Encoding]::UTF8.GetBytes($errorMsg)
            $response.ContentType     = "text/plain; charset=utf-8"
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)

            Write-Host "  404  $decodedUrl" -ForegroundColor Red
        }

        $response.OutputStream.Close()
    }
} catch {
    Write-Error $_
} finally {
    if ($listener.IsListening) {
        $listener.Stop()
        Write-Host "서버를 종료했습니다." -ForegroundColor Gray
    }
}
