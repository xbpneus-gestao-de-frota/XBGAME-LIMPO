@echo off
title XBPNEUS - salvar e enviar
cd /d "%~dp0"

REM Travas esquecidas: o assistente nao consegue apagar arquivos aqui.
if exist ".git\index.lock" del /q ".git\index.lock"
if exist ".git\HEAD.lock"  del /q ".git\HEAD.lock"

echo.
echo   Salvando o codigo...
REM ATENCAO: client/public/assets PRECISA estar nesta lista.
REM Sem ela a tela de boas-vindas sobe sem os oito entregadores,
REM e o jogo publicado mostra oito imagens quebradas.
git add -A client/src client/public/assets scripts/mapa tests/game docs assets-source > SUBIDA_LOG.txt 2>&1
git add -A *.bat >> SUBIDA_LOG.txt 2>&1

echo   Conferindo o que vai subir...
git diff --cached --name-only | find /c /v "" > CONTAGEM.txt
set /p QUANTOS=<CONTAGEM.txt
del /q CONTAGEM.txt
echo   %QUANTOS% arquivos.

git commit -F MENSAGEM_DO_COMMIT.txt >> SUBIDA_LOG.txt 2>&1

echo   Enviando para o GitHub...
git push -u origin master:main >> SUBIDA_LOG.txt 2>&1
echo CODIGO=%ERRORLEVEL% >> SUBIDA_LOG.txt

echo.
type SUBIDA_LOG.txt
echo.
REM LIMPEZA FINAL: nao deixa rastro para a proxima sessao tropecar.
if exist "CONTAGEM.txt" del /q "CONTAGEM.txt"

echo   Terminou. Pode fechar esta janela.
pause
