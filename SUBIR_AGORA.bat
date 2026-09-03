@echo off
title XBPNEUS - enviar para o GitHub
cd /d "%~dp0"

REM Travas esquecidas pelo assistente (ele nao consegue apagar arquivos aqui).
REM Sao arquivos vazios de controle: apagar e seguro e evita "index.lock exists".
if exist ".git\index.lock" del /q ".git\index.lock"
if exist ".git\HEAD.lock"  del /q ".git\HEAD.lock"

echo   Enviando... aguarde.
where git > SUBIDA_LOG.txt 2>&1
git push -u origin master:main >> SUBIDA_LOG.txt 2>&1
echo CODIGO=%ERRORLEVEL% >> SUBIDA_LOG.txt
type SUBIDA_LOG.txt
echo.
echo   Terminou. Pode fechar esta janela.
pause
