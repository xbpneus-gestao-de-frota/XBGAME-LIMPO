@echo off
title XBPNEUS Racing - modo ao vivo
cd /d "%~dp0"

where node >/dev/null 2>&1
if errorlevel 1 (
  echo.
  echo   Nao encontrei o Node neste computador.
  echo   Instale em https://nodejs.org e rode este arquivo de novo.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo.
  echo   Primeira vez: preparando as ferramentas.
  echo   Isso baixa bastante coisa e leva alguns minutos.
  echo   So acontece uma vez. Nao feche a janela.
  echo.
  call npx --yes pnpm@10.15.1 install
  if errorlevel 1 (
    echo.
    echo   A preparacao falhou. Costuma ser internet ou antivirus.
    echo.
    pause
    exit /b 1
  )
)

echo.
echo   Modo ao vivo. O jogo abre sozinho no navegador.
echo   Toda vez que um arquivo mudar, a tela se atualiza sozinha.
echo   Para parar, feche esta janela.
echo.
start "" http://127.0.0.1:3000
call npx --yes pnpm@10.15.1 dev
pause
