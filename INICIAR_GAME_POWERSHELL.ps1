$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js não foi encontrado. Instale o Node.js 22 e tente novamente."
  Read-Host "Pressione Enter para encerrar"
  exit 1
}
$env:HOST = "127.0.0.1"
$env:PORT = "3000"
Write-Host "Iniciando XBPNEUS Racing 3.5.0..."
Start-Job { Start-Sleep -Milliseconds 900; Start-Process "http://127.0.0.1:3000" } | Out-Null
node dist/standalone-server.mjs
