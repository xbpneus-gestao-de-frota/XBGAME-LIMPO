# Validação — XBPNEUS Racing 2.7.0

## Escopo

A versão 2.7.0 preserva a campanha, a economia, o save, o `GameWorld`, o canvas e o motor Babylon da versão anterior e substitui a apresentação Fusion 2.6 pelo **HUD Focus**. A distribuição ativa utiliza `v250-runtime` como camada operacional compatível e `v270-hud-focus` como camada visual de baixa obstrução. Os arquivos Fusion 2.6 permanecem apenas como histórico e não são carregados pelo HTML.

## Alterações homologadas

- objetivo da rota abre completo e compacta após 3,8 segundos;
- controles contextuais: teclado no desktop e toque em dispositivos móveis;
- velocidade exibida coerente por categoria, começando em 26 km/h na bicicleta;
- seis perfis de câmera: bicicleta, moto, van, caminhão, frota e planetário;
- Pneu Urbano no nível 2 por XB$ 30;
- Mochila Pequena no nível 3 por XB$ 60;
- minimapa único e compacto; sequência detalhada recolhida durante condução normal;
- topo móvel, áreas seguras e botão de pausa compactados;
- PWA, servidor e cabeçalhos atualizados para 2.7.0;
- `?pilot=classic` mantém o HUD Gold como contingência.

## Verificação automatizada

Execute:

```bash
node scripts/verify-offline-release.mjs
```

A rotina confirma:

- 27 testes do game;
- 4 testes de segurança e configuração;
- integridade do código-fonte;
- compatibilidade das camadas Gold 2.5 e HUD Focus 2.7;
- sintaxe dos runtimes, bundles, service worker e servidores;
- varredura de arquivos, ativos e possíveis segredos;
- servidor autônomo, `/healthz`, CSP, HTML, PWA, `HEAD`, fallback SPA e 404 real.

Resultado esperado:

```text
VERIFICACAO_OFFLINE_2_7_OK
```

## Execução

```bash
node dist/standalone-server.mjs
```

Abra `http://127.0.0.1:3000`.

Atalhos:

- `?demo`: operação automática para inspeção;
- `?fresh`: campanha temporária nova;
- `?pilot=classic`: interface Gold anterior.

## Limite da reemissão

O ambiente desta reemissão possui Node 22.16.0, enquanto o projeto fixa Node 22.18.0, e não contém `node_modules`. Por isso, não foi executada uma nova compilação completa Vite/pnpm. O código-fonte correspondente foi atualizado e a distribuição existente foi atualizada diretamente, submetida à validação sintática, testes offline, auditoria HTTP e verificação de integridade. Para recompilar integralmente:

```bash
corepack enable
corepack prepare pnpm@10.15.1 --activate
pnpm install --frozen-lockfile
pnpm verify
```
