param(
  [int]$Port = 8000
)

Write-Host "Starting simple static server on port $Port (Ctrl+C to stop)"

$listener = New-Object System.Net.HttpListener
$prefix = "http://+:$Port/"
$listener.Prefixes.Add($prefix)
try{
  $listener.Start()
} catch {
  Write-Error "Failed to start listener. You may need to run PowerShell as Administrator or pick a different port."
  exit 1
}

while ($listener.IsListening) {
  $context = $listener.GetContext()
  $req = $context.Request
  $rawUrl = $req.RawUrl.TrimStart('/')
  if ([string]::IsNullOrEmpty($rawUrl)) { $rawUrl = 'index.html' }
  $filePath = Join-Path (Get-Location) $rawUrl
  if (-not (Test-Path $filePath)) {
    $context.Response.StatusCode = 404
    $msg = "404 Not Found"
    $buffer = [System.Text.Encoding]::UTF8.GetBytes($msg)
    $context.Response.OutputStream.Write($buffer,0,$buffer.Length)
    $context.Response.Close()
    continue
  }

  try{
    $bytes = [System.IO.File]::ReadAllBytes($filePath)
    $context.Response.ContentLength64 = $bytes.Length
    # set content-type for common extensions
    switch ([System.IO.Path]::GetExtension($filePath).ToLower()){
      '.html' { $context.Response.ContentType = 'text/html; charset=utf-8' }
      '.js'   { $context.Response.ContentType = 'application/javascript' }
      '.css'  { $context.Response.ContentType = 'text/css' }
      '.png'  { $context.Response.ContentType = 'image/png' }
      '.jpg'  { $context.Response.ContentType = 'image/jpeg' }
      '.svg'  { $context.Response.ContentType = 'image/svg+xml' }
      default { $context.Response.ContentType = 'application/octet-stream' }
    }
    $context.Response.OutputStream.Write($bytes,0,$bytes.Length)
    $context.Response.Close()
  } catch {
    $context.Response.StatusCode = 500
    $msg = "500 Internal Server Error"
    $buffer = [System.Text.Encoding]::UTF8.GetBytes($msg)
    $context.Response.OutputStream.Write($buffer,0,$buffer.Length)
    $context.Response.Close()
  }
}

$listener.Stop()
