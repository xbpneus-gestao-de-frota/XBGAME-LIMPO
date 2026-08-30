# Ativos visuais

Todos os ativos usados em execução fazem parte do projeto, em `client/public/assets`. Não há scripts, fontes ou recursos visuais remotos: desenvolvimento, preview e produção funcionam de forma autônoma.

| Arquivo                                      | Formato | Uso principal                       |
| -------------------------------------------- | ------- | ----------------------------------- |
| `logo-xb-mark-v3.webp`                       | WebP    | Marca compacta e favicon            |
| `logo-xb-metal-v3.webp`                      | WebP    | Lockup metálico XB PNEUS            |
| `driver-mascot-v3.webp`                      | WebP    | Mascote XB com fundo transparente   |
| `fleet-key-art-v3.webp`                      | WebP    | Arte principal da evolução da frota |
| `logo-symbol.svg` / `app-icon.svg`           | SVG     | Fallback técnico regenerável        |
| `reference.svg`                              | SVG     | Referência vetorial da corrida      |
| `tire-token.svg`                             | SVG     | Coletável de pneu                   |
| `billboard.svg`                              | SVG     | Placa de pista                      |
| `asphalt.svg`                                | SVG     | Textura da pista                    |
| `vehicle-progression.svg`                    | SVG     | Evolução da frota                   |
| `garage-hub.svg`                             | SVG     | Garagem e oficina                   |
| `base-local.svg`, `base-regional.svg`        | SVG     | Centrais local e regional           |
| `base-global.svg`, `base-planetary.svg`      | SVG     | Centrais global e planetária        |
| `planetary-hub.svg`                          | SVG     | Conclusão da campanha               |
| `building-evolution.svg`                     | SVG     | Evolução dos edifícios              |
| `tire-compounds.svg`, `route-conditions.svg` | SVG     | Compostos, clima e terreno          |
| `daily-missions.svg`                         | SVG     | Missões diárias                     |

## Regeneração

```bash
pnpm run assets:generate
```

O comando executa `scripts/generate-assets.mjs` e recria os 17 SVGs. Os quatro WebPs autorais são preservados. O build também executa essa etapa, evitando dependência de arquivos gerados fora do repositório.

## Direção visual XB

A versão 2.2 segue as referências fornecidas para o projeto e não usa amarelo como cor de marca.

| Papel                 | Cor       |
| --------------------- | --------- |
| Azul-marinho base     | `#0D1B33` |
| Meia-noite            | `#091222` |
| Azul aço              | `#12547A` |
| Azul elétrico / ciano | `#18BFEA` |
| Branco-gelo           | `#EDF5F6` |

Grafite, borracha e cromo frio completam os materiais. O mascote mantém boné e uniforme azul-marinho; veículos, interface, iluminação e artes usam ciano somente como energia, foco e telemetria. Cores de alerta continuam semânticas e não funcionam como assinatura da marca.

O Turbo Borracha XB é procedural: pneu vivo, sulcos luminosos, energia e aura 6x2 são meshes locais criados em tempo de execução, sem imagens ou modelos externos.

## Pacote FBX real — opcional desde a 3.2.0

O pacote convertido a partir dos FBX enviados continua no repositório, continua servido localmente e continua coberto por testes. O que mudou na 3.2 é que ele **não é mais o padrão**: só entra em cena com `?assets=real` na URL.

### Por que ele saiu do padrão

O pacote cobre exatamente dois objetos: a rua e o entregador. A bicicleta, os carros e as árvores foram enviados apenas como `.uasset`, formato do Unreal que o navegador não carrega, e por isso não existem no pacote convertido.

Ligado por padrão, o carregador escondia a pista procedural inteira e a substituía pelos módulos FBX da rua. O resultado, em tela, era uma pista preta sem cenário e sem ciclista visível: o entregador real dependia do `driver-rig`, e a bicicleta sob ele nunca chegou. O cenário procedural — que está completo, com bairro, comércio, garagem, parque, ponto de ônibus e marco de destino — voltou a ser o padrão porque é o único dos dois que está inteiro.

### Estado de cada fonte

| Fonte original | Estado no runtime web 3.2 |
| --- | --- |
| `RUAS/XB_Road_Straight.fbx` | Convertido em asfalto, guia, calçada e faixa em `assets/real-v310/assets.bin`; entra apenas com `?assets=real` |
| `ENTREGADOR/A_XB_Pedal.fbx` | Convertido com malha, cores da textura e 12 quadros de pedalada; entra apenas com `?assets=real` |
| Outros 13 FBX | Preservados em `source-assets/original` para integrações futuras |
| 862 arquivos `.uasset` | Preservados como fonte Unreal; não são carregados pelo navegador |
| Bicicleta XB | Procedural, inclusive com `?assets=real`, pois não foi recebido FBX nem GLB da bicicleta |
| Carros e árvores | Procedurais; só existem como `.uasset` |

### Como observar o estado

O runtime declara o que está ativo no elemento raiz do documento:

| Marca | Significado |
| --- | --- |
| `data-xb-real-assets="opt-in"` | Padrão: o pacote não foi solicitado e o cenário procedural está em uso |
| `data-xb-real-assets="active"` | `?assets=real` presente e o pacote carregou |
| `data-xb-real-assets="fallback"` | `?assets=real` presente, o carregamento falhou e o cenário procedural continua |
| `data-xb-bike-asset="procedural-fallback-no-source-fbx"` | Declaração honesta de que a bicicleta não é um asset real |

Com `active`, o documento também expõe `data-xb-asset-release`, `data-xb-road-source` e `data-xb-courier-source`.

### Comportamento do carregador

`client/src/game/RealAssetRuntime.ts` valida tipo, alinhamento e limites de cada array do binário contra o manifesto antes de criar qualquer malha; um manifesto e um binário publicados fora de sincronia viram erro nomeado em vez de leitura fora dos limites do buffer. O registro de limpeza é montado antes da primeira criação, de modo que uma falha no meio da instalação não deixa malhas órfãs na cena. `installRealAssets` devolve um handle com `dispose()`, que remove o que criou e religa a pista procedural.

A pista procedural a esconder é selecionada por `RoadSystem.roadSurfaceNodes()`, que lê a marca estrutural `metadata.xbLayer` em vez de adivinhar por nome de mesh — o nome original não sobrevive à fusão por material, e era por isso que a pista procedural continuava desenhada sob a rua FBX, produzindo faixas duplicadas com z-fighting.

### Origem e conversão

O conversor reproduzível está em `scripts/convert_real_fbx_assets.py`. O manifesto binário informa offsets, tipos, contagens, bounds e arquivos-fonte. O pacote em `assets/real-v310` não foi regerado na 3.2 e continua declarando `"release": "3.1.0"`; o carregador deixou de exigir que essa versão acompanhe a release do jogo e passou a validar apenas o formato `xb-real-assets-v1`. O inventário completo, com SHA-256 por arquivo, está em `INVENTARIO_ASSETS_ORIGINAIS_3.1.0.json`.
