@echo off
setlocal
cd /d "%~dp0"
title XBPNEUS Racing 3.5.0
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js nao foi encontrado neste computador.
  echo Instale o Node.js 22 e execute este arquivo novamente.
  echo.
  pause
  exit /b 1
)
set "HOST=127.0.0.1"
set "PORT=3000"
echo.
echo Iniciando XBPNEUS Racing 3.5.0...
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Milliseconds 900; Start-Process 'http://127.0.0.1:3000'"
node dist\standalone-server.mjs
if errorlevel 1 (
  echo.
  echo O game foi encerrado com erro.
  pause
)
endlocal
