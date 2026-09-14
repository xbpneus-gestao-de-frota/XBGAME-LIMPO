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

REM ── ATUALIZACAO AUTOMATICA ───────────────────────────────────────────────
REM
REM Quando chega uma versao nova do jogo, ela vem como UM arquivo so
REM (atualizacao.zip) aqui nesta pasta. Este bloco abre o pacote por cima e
REM apaga o zip. Voce nao precisa fazer nada.
REM
REM POR QUE ASSIM: cada versao nova do jogo troca o nome de TODOS os 232
REM pedacos (o nome carrega a assinatura do conteudo). Mandar um por um e
REM lento e da margem a chegar pela metade; um pacote so chega inteiro ou nao
REM chega.

if exist "atualizacao.zip" (
  echo.
  echo   Chegou uma versao nova do jogo. Abrindo...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Expand-Archive -LiteralPath 'atualizacao.zip' -DestinationPath '.' -Force; exit 0 } catch { exit 1 }"
  if errorlevel 1 (
    echo.
    echo   Nao consegui abrir o pacote sozinho.
    echo   Extraia o atualizacao.zip aqui nesta pasta, substituindo, e rode de novo.
    echo.
    pause
  ) else (
    del /q "atualizacao.zip"
    echo   Pronto, jogo atualizado.
    echo.
  )
)

REM ── A CHAVE DA INTELIGENCIA ──────────────────────────────────────────────
REM
REM O jogo roda inteiro SEM chave: os moradores respondem pelas falas do
REM bairro, que sao montadas dentro do jogo e nao custam nada. A chave so
REM acrescenta a resposta em quatro momentos: a primeira conversa, quando
REM uma entrega deu errado, as viradas do jogo, e a pergunta que o bairro
REM nao entende.
REM
REM A chave e digitada AQUI, por voce. Ela fica so nesta maquina, no
REM arquivo .env, que nunca vai para o GitHub.
REM
REM POR QUE COM ETIQUETAS (goto) E NAO DENTRO DE UM IF:
REM   "set /p" dentro de parenteses e a armadilha classica do .bat - a
REM   variavel sai vazia sem avisar. Com etiqueta ela sempre chega.

if exist ".env" goto carregarchave

echo.
echo   ============================================================
echo    A INTELIGENCIA DOS MORADORES AINDA NAO ESTA LIGADA
echo   ============================================================
echo.
echo    Voce pode jogar assim mesmo: o bairro responde inteiro,
echo    de graca. A chave so acrescenta os quatro momentos.
echo.
echo    Para ligar: pegue a chave em console.groq.com/keys
echo    (ela comeca com gsk_) e cole aqui embaixo.
echo.
echo    Para jogar SEM a inteligencia, e so dar Enter.
echo.
set /p "CHAVE=   Cole a chave e tecle Enter: "
echo.

if "%CHAVE%"=="" goto semchave

REM Tira aspas, caso venham coladas junto.
set "CHAVE=%CHAVE:"=%"

REM A redirecao vem ANTES do echo de proposito: assim nao entra espaco
REM sobrando no fim do valor, que faria a chave ser recusada.
> .env echo XBW_CHAVE_GROQ=%CHAVE%
>> .env echo XBW_MODELO_GROQ=llama-3.3-70b-versatile
>> .env echo NODE_ENV=production
set "CHAVE="

echo    Pronto. A chave ficou guardada nesta maquina, so aqui.
echo.
goto carregarchave

:semchave
echo    Beleza, jogando so com as falas do bairro.
echo.
goto subir

:carregarchave
REM O Node nao le o arquivo .env sozinho. Existe o --env-file, mas ele so
REM funciona em Node novo; lendo aqui funciona em qualquer versao, e um
REM Node velho deixaria de subir o jogo em vez de so ficar sem a chave.
for /f "usebackq eol=# tokens=1* delims==" %%A in (".env") do (
  if not "%%A"=="" set "%%A=%%B"
)
if "%XBW_CHAVE_GROQ%"=="" (
  echo    Aviso: o arquivo .env existe mas esta sem chave.
  echo    O jogo sobe igual, so sem a inteligencia.
  echo.
)
goto subir

:subir
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
