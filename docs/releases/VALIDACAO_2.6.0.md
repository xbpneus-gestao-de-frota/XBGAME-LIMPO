# Validação — XBPNEUS Racing 2.6.0

Data da validação: 22 de agosto de 2026.

## Escopo

A versão 2.6.0 preserva o jogo, a campanha, o save e a simulação da versão 2.5.0 e adiciona o Modo Piloto Fusion como camada visual. A integração não cria segundo canvas, segundo motor Babylon, segunda economia ou novo armazenamento de campanha.

## Ciclo de teste dirigido

O contrato `tests/game/v26-pilot-fusion.test.mjs` foi executado antes da integração e falhou por ausência dos arquivos, marcadores, service worker e servidor 2.6. Após a implementação, a mesma suíte passou. Também foi criado um teste de compatibilidade para garantir que a camada Gold registra o release e o service worker atuais.

## Verificações automatizadas

Comando consolidado:

```bash
node scripts/verify-offline-release.mjs
```

A rotina cobre:

- 20 testes de regras, entrega, câmera, minimapa, bairro, base Gold, PWA, servidor e Modo Piloto Fusion;
- 4 testes de segurança;
- integridade do código-fonte;
- compatibilidade das camadas runtime Gold e Fusion;
- sintaxe dos runtimes, service worker e servidores;
- varredura de arquivos, segredos, referências externas e ativos locais;
- execução real do servidor distribuído em porta isolada;
- `/healthz` na versão 2.6.0 e cabeçalho `X-XBPNEUS-Release`;
- entrega do HTML, manifest, runtimes Gold e Fusion e service worker;
- CSP em todas as respostas testadas;
- `HEAD` do runtime Fusion, fallback da SPA e 404 de ativo inexistente;
- `no-store` no service worker.

O resultado final e os totais devem ser lidos diretamente da execução mais recente do comando acima antes da publicação.

## Execução local

A distribuição incluída não exige instalação das dependências do projeto. Requer Node.js 22:

```bash
node dist/standalone-server.mjs
```

No Windows, use `INICIAR_GAME_WINDOWS.bat`. Em ambiente virtual, configure `HOST=0.0.0.0`, defina a variável `PORT` fornecida pela plataforma e inicie com `node dist/standalone-server.mjs`.

## Modos de homologação

- `?demo`: corrida automática no Modo Piloto Fusion.
- `?demo&pilot=classic`: corrida automática com a apresentação anterior.
- `?fresh&screen=base`: campanha inicial efêmera.
- `?screen=routes`, `?screen=garage` e `?screen=complete`: telas avançadas de inspeção.

## Limite declarado

Os testes automatizados validam contratos, sintaxe, arquivos, segurança e servidor real. A política administrativa do navegador disponível neste ambiente impede navegação headless local; portanto, este documento não declara aprovação visual por captura de tela. A homologação visual deve ser feita no ambiente virtual em desktop e celular antes de substituir uma publicação existente.
