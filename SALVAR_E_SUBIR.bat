@echo off
title XBPNEUS - salvar e enviar
cd /d "%~dp0"

REM O jogo fica limpo: a mensagem desta gravacao e o registro do envio
REM moram FORA do jogo, na pasta NOTAS DE TRABALHO, ao lado dele.
set NOTAS=..\NOTAS DE TRABALHO

REM Travas esquecidas: o assistente nao consegue apagar arquivos aqui.
if exist ".git\index.lock" del /q ".git\index.lock"
if exist ".git\HEAD.lock"  del /q ".git\HEAD.lock"

echo.
echo   Salvando o codigo...
REM ATENCAO: client/public/assets PRECISA estar nesta lista.
REM Sem ela a tela de boas-vindas sobe sem os oito entregadores,
REM e o jogo publicado mostra oito imagens quebradas.
git add -A client/src client/public/assets scripts tests docs server security preview-server.mjs > "%NOTAS%\SUBIDA_LOG.txt" 2>&1
git add -A *.bat *.json *.ts *.md >> "%NOTAS%\SUBIDA_LOG.txt" 2>&1
REM -u: tambem salva o que mudou ou saiu dos arquivos que ja estao no historico,
REM em qualquer pasta. ("-A -u" juntos o git recusa, e a linha nao fazia nada.)
git add -u >> "%NOTAS%\SUBIDA_LOG.txt" 2>&1

echo   Conferindo o que vai subir...
git diff --cached --name-only | find /c /v "" > "%TEMP%\xb_contagem.txt"
set /p QUANTOS=<"%TEMP%\xb_contagem.txt"
del /q "%TEMP%\xb_contagem.txt"
echo   %QUANTOS% arquivos.

git commit -F "%NOTAS%\MENSAGEM_DO_COMMIT.txt" >> "%NOTAS%\SUBIDA_LOG.txt" 2>&1

echo   Enviando para o GitHub...
git push -u origin master:main >> "%NOTAS%\SUBIDA_LOG.txt" 2>&1
echo CODIGO=%ERRORLEVEL% >> "%NOTAS%\SUBIDA_LOG.txt"

echo.
type "%NOTAS%\SUBIDA_LOG.txt"
echo.
echo   Terminou. Pode fechar esta janela.
pause
