@echo off
cd /d "%~dp0"
echo   Enviando... aguarde.
where git > SUBIDA_LOG.txt 2>&1
git push -u origin master:main >> SUBIDA_LOG.txt 2>&1
echo CODIGO=%ERRORLEVEL% >> SUBIDA_LOG.txt
type SUBIDA_LOG.txt
echo.
echo   Terminou. Pode fechar esta janela.
pause
