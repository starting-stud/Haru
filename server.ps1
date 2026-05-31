# PowerShell-based static file web server for Haru-dev_Hong
$port = 8090
$localPath = Get-Item .
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
    Write-Host "Server is running at http://localhost:$port/"
    Write-Host "Press Ctrl+C to stop the server."
    
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $rawUrl = $request.RawUrl.Split('?')[0]
        # Decode URL-encoded characters (like %20)
        $decodedUrl = [System.Uri]::UnescapeDataString($rawUrl)
        if ($decodedUrl -eq "/") {
            $decodedUrl = "/index.html"
        }
        
        $relativePath = $decodedUrl.TrimStart('/')
        $filePath = [System.IO.Path]::GetFullPath((Join-Path $localPath $relativePath))
        
        # Security check: ensure path is within the directory
        if ($filePath.StartsWith($localPath.FullName) -and (Test-Path $filePath -PathType Leaf)) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = switch ($ext) {
                ".html" { "text/html; charset=utf-8" }
                ".css" { "text/css; charset=utf-8" }
                ".js" { "application/javascript; charset=utf-8" }
                ".json" { "application/json; charset=utf-8" }
                ".png" { "image/png" }
                ".jpg" { "image/jpeg" }
                ".jpeg" { "image/jpeg" }
                ".gif" { "image/gif" }
                ".svg" { "image/svg+xml" }
                ".ico" { "image/x-icon" }
                default { "application/octet-stream" }
            }
            
            $response.ContentType = $contentType
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $errorMessage = "404 Not Found: $decodedUrl"
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($errorMessage)
            $response.ContentType = "text/plain; charset=utf-8"
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        }
        $response.OutputStream.Close()
    }
} catch {
    Write-Error $_
} finally {
    if ($listener.IsListening) {
        $listener.Stop()
    }
}
