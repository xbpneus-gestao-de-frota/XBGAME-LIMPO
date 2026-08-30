# XBPNEUS Racing 2.5.0 — Release Completo

## Objetivo

Entregar um ZIP autocontido do game com código-fonte, build jogável imediato, servidor sem dependências, inicializadores locais, HUD móvel corrigido, minimapa e sequência de entrega aprimorados, suporte PWA e validação reproduzível.

## Decisões

- Preservar o build 3D estável já compilado como núcleo executável imediato.
- Aplicar a camada 2.5.0 em JavaScript e CSS locais para corrigir responsividade e enriquecer a entrega sem depender de nova instalação.
- Manter no código-fonte as melhorias 3D do bairro, destino e câmera para a próxima compilação Vite.
- Incluir servidor Node baseado apenas em módulos nativos para que `npm start` funcione sem `node_modules`.
- Não publicar, não enviar ao GitHub e não incluir credenciais.

## Componentes

1. Runtime Gold 2.5: minimapa, etapas, animação visual da entrega, posicionamento móvel dinâmico e registro do service worker.
2. Shell PWA: manifest, cache local e metadados de instalação.
3. Servidor autônomo: arquivos estáticos, SPA fallback, health check, cache e cabeçalhos de segurança.
4. Inicializadores: Windows, PowerShell e Linux/macOS.
5. Verificação: testes offline, checagem de sintaxe, smoke test HTTP e varredura de release.

## Critérios de aceite

- O build abre com Node sem instalar dependências.
- `/healthz` responde 200.
- A tela inicial e o Modo Piloto carregam sem erro JavaScript em Chromium com WebGL.
- No viewport 390 × 844, minimapa e painel operacional não se sobrepõem.
- O pacote não contém segredos, arquivos compactados aninhados ou referências externas obrigatórias.
- ZIP e checksum SHA-256 são gerados após todas as verificações.
