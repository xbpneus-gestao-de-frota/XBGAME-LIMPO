@echo off
title XBPNEUS Racing - jogar
cd /d "%~dp0"

REM UM JOGO SO.
REM Este arquivo serve a pasta dist deste projeto - o jogo principal, o
REM mesmo que sobe para o site. Antes existia uma segunda copia
REM (XBGAME_TESTE, desempacotada de um zip a cada clique) e ja aconteceu
REM de o jogo aberto na tela ser uma versao velha, sem ninguem perceber.
REM Agora o que se joga aqui e o que esta no projeto. Nao ha outra copia.

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo   Nao encontrei o Node neste computador.
  echo   Instale em https://nodejs.org e rode este arquivo de novo.
  echo.
  pause
  exit /b 1
)

if not exist "dist\standalone-server.mjs" (
  echo.
  echo   O jogo ainda nao esta montado.
  echo   Peca para montar antes de jogar.
  echo.
  pause
  exit /b 1
)

REM Duas portas, de proposito:
REM   8123 - servidor completo, com todas as protecoes. E onde se joga.
REM   8124 - so previa, sem a trava que impede o jogo de aparecer dentro
REM          da janela do chat. Sobe junto para olharmos a tela juntos.
if exist "preview-server.mjs" (
  start "XBPNEUS - previa para o chat" /min cmd /c "set PORT=8124&& node preview-server.mjs"
)

echo.
echo   XBPNEUS Racing esta subindo...
if exist "dist\public\VERSAO.txt" (
  echo.
  type "dist\public\VERSAO.txt"
  echo.
)
echo   Para jogar:        http://127.0.0.1:8123
echo   Para ver no chat:  ja esta no ar, e so voltar para a conversa.
echo   Para parar, feche esta janela.
echo.
set PORT=8123
start "" http://127.0.0.1:8123
node "dist\standalone-server.mjs"
pause
