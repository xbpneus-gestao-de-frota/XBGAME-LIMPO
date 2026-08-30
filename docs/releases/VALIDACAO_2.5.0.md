# Validação — XBPNEUS Racing 2.5.0 Release Completo

Data: 2026-08-16

## Resultado

O pacote contém o código-fonte do game, a distribuição jogável, servidor autônomo, inicializadores locais, PWA, testes, documentação e arquivos de validação.

## Verificações automatizadas

| Verificação | Resultado |
| --- | --- |
| Núcleo Modo Piloto Gold e release 2.5 | 14/14 testes aprovados |
| Segurança e configuração | 4/4 testes aprovados |
| Integridade do código-fonte | `SOURCE_INTEGRITY_OK` |
| Sintaxe do runtime 2.5 | Aprovada |
| Sintaxe do service worker | Aprovada |
| Sintaxe do servidor autônomo | Aprovada |
| Servidor `/healthz` | Aprovado |
| HTML, manifest, CSS, JavaScript e service worker | HTTP 200 |
| Asset inexistente | HTTP 404 |
| Content-Security-Policy | Presente |
| Segredos e artefatos privados | Nenhum detectado |

## Testes reais em navegador

Chromium com Babylon.js/WebGL2 foi executado sobre o servidor incluído.

| Cenário | Resultado |
| --- | --- |
| Desktop 1440 × 900 | Home, Central e Modo Piloto carregados |
| Mobile 390 × 844 | Home, Central, Modo Piloto e controles táteis carregados |
| Release declarada no DOM | `2.5.0` |
| Erros de página | 0 |
| Sobreposição minimapa × telemetria | 0 |
| Sobreposição minimapa × progresso da rota | 0 |
| Etapas observadas | Em rota e Retorno |

Medições em 390 × 844:

- Painel operacional direito: `x 267.61`, `y 143.47`, `112 × 165.89`.
- Runtime 2.5: `x 241.61`, `y 317.00`, `138 × 211.03`.
- Barra de rota: `x 23.86`, `y 744.73`, `342.28 × 5`.

O runtime começa oito pixels abaixo do painel operacional e termina antes da barra de rota.

## Execução local

Windows: `INICIAR_GAME_WINDOWS.bat`

Terminal:

```bash
node dist/standalone-server.mjs
```

Endereço padrão: `http://127.0.0.1:3000`

## Limite do ambiente desta auditoria

A instalação pelo registry do npm não estava disponível, portanto o comando completo `pnpm verify`, que recompila React/Babylon/Vite, não foi executado neste ambiente. Para eliminar dependência desse processo na avaliação do usuário, o pacote inclui uma distribuição jogável testada e um servidor Node.js sem dependências externas. O código-fonte 2.5 permanece incluído para recompilação em ambiente com acesso ao registry.
