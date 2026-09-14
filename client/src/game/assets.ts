export const GAME_ASSETS = {
  // Arte de abertura: o entregador e os dois mascotes no portao da trilha.
  reference: "/assets/XB_Abertura_Jornada.webp",
  // A mesma cena continuada para os lados e para cima e para baixo. Servem de
  // fundo para a arte nunca ficar cercada de preto: em tela deitada entra a
  // larga, em tela em pe entra a alta.
  referenceWide: "/assets/XB_Abertura_Larga.webp",
  referenceTall: "/assets/XB_Abertura_Alta.webp",
  // Arte em pe: a mesma trilha com a cidade XB ao fundo, feita na proporcao do
  // celular. Entra no lugar da quadrada quando a tela e mais alta que larga.
  referenceVertical: "/assets/XB_Abertura_Vertical.webp",
  referenceVerticalTall: "/assets/XB_Abertura_Vertical_Alta.webp",
  soundtrack: "/assets/XB_Trilha_Abertura.mp3",
  // Filme de abertura: roda uma vez so, na primeira vez que a pessoa entra.
  openingClip: "/assets/XB_Abertura_Cena.mp4",
  // Mesmo filme em outro formato: ha navegador que nao traz o codec do mp4.
  openingClipWebm: "/assets/XB_Abertura_Cena.webm",
  openingClipPoster: "/assets/XB_Abertura_Cena.webp",
  driver: "/assets/driver-mascot-v3.webp",
  /** O bairro visto de cima: o mundo do jogo. */
  bairroMapa: "/assets/XB_Bairro_Mapa.webp",
  /*
   * O GAROTO EM PE — o dono das bicicletas, parado na praca.
   *
   * Este mora na lista, ao contrario das folhas do entregador: e um desenho so,
   * com um endereco so. O entregador saiu daqui porque virou vinte e quatro
   * desenhos achados por pose e rumo; um nome escrito a mao para cada um seria
   * uma lista que ninguem mantem.
   */
  garotoEmPe: "/assets/XB_Garoto_em_pe.webp",
  /*
   * O CABECA DE PREGO — o primeiro vilao, levantando peso na pracinha.
   *
   * Ordem dele, 14/09/2026: "bem no ponto amarelo, crie uma animacao do
   * primeiro vilao que apresentaremos cabeca de prego, deixe a animacao rodando
   * neste local pintado de amarelo".
   *
   * UM arquivo com os QUATRO quadros lado a lado, e nao quatro arquivos. Quem
   * troca de quadro e o CSS, mexendo a posicao do fundo — entao o primeiro giro
   * nao pisca por quadro que ainda esta baixando, o mapa nao se redesenha a cada
   * passo e o navegador para sozinho com a aba escondida.
   *
   * Quem monta a tira: scripts/vilao/a_tira_do_cabeca_de_prego.py
   */
  cabecaDePregoTira: "/assets/XB_Cabeca_De_Prego_tira.webp",
  /** O retrato do Renan, para a chamada que abre o jogo. */
  renanRetrato: "/assets/XB_Renan_retrato.webp",
  /** O mesmo Renan, redondo e com o anel verde, para o alto da conversa. */
  renanAvatar: "/assets/XB_Renan_avatar.webp",
  /*
   * O MESMO RENAN, DEPOIS DE RECEBER O EQUIPAMENTO.
   *
   * Ordem dele, 08/09/2026: "renan so muda de desenho no aplicativo, apos
   * receber equipamentos".
   *
   * O retrato saiu da propria selfie que ele manda na conversa — a do "To
   * pronto!!", com o uniforme, a luva e a bicicleta ao lado. Nao ha desenho
   * novo aqui: e o rosto daquela foto, recortado redondo no mesmo tamanho e
   * com o mesmo anel do retrato antigo.
   *
   * Usar a selfie tem um motivo alem da economia: e a MESMA imagem que a
   * pessoa acabou de ver chegar na conversa. Quando o retrato da lista muda,
   * ela reconhece de onde veio, e a troca vira consequencia em vez de
   * enfeite.
   */
  renanEquipado: "/assets/XB_Renan_equipado.webp",
  /** A Lorena na lista da equipe (recorte da imagem dela com a bicicleta, 11/09/2026). */
  lorenaRetrato: "/assets/XB_Lorena_retrato.webp",
  /*
   * OS DOIS DE CORPO INTEIRO, SEM BICICLETA — para a ficha do entregador.
   *
   * Ordem dele, 12/09/2026: "onde mostra imagem de entregador (...) sem a
   * bicicleta". Recorte da vista de frente das folhas de personagem que ele
   * mandou: maos no bolso da blusa, a mochila XB nas costas, fundo vago.
   *
   * Sao altos e estreitos de proposito. A ficha e uma tela de celular em pe:
   * um desenho quadrado ou deitado obrigaria a cortar a pessoa no joelho, e a
   * pessoa inteira e justamente o que ele pediu.
   */
  renanFicha: "/assets/XB_Renan_ficha.webp",
  lorenaFicha: "/assets/XB_Lorena_ficha.webp",
  /** Os rabiscos do fundo da conversa, recortados do desenho dele. */
  conversaFundo: "/assets/XB_conversa_fundo.webp",
  /*
   * O DRONE DA XBPNEUS, e a caixa que ele desce.
   *
   * Sao duas vistas do MESMO aparelho, recortadas da folha dele por
   * scripts/drone/o_drone.py: a de frente, com a camera do gimbal apontada para
   * quem joga, e a de tres quartos vista de cima, que e como um drone aparece
   * sobre um bairro desenhado a 31 graus do chao. A de frente entra quando ele
   * passa rente aos olhos e quando volta; a de cima, no sobrevoo.
   */
  droneFrente: "/assets/XB_drone_frente.webp",
  droneVoando: "/assets/XB_drone_voando.webp",
  droneCaixa: "/assets/XB_caixa.webp",
  /*
   * A MESMA MALA, ABERTA — a bicicleta, o capacete, o uniforme, os tenis, o
   * telefone, a bolsa, a bomba e as ferramentas. E o que ele ganha, e por isso
   * ela abre em tela cheia: no chao do bairro a mala tem vinte pixels, e vinte
   * pixels nao mostram nada.
   */
  caixaAberta: "/assets/XB_caixa_aberta.webp",
  /*
   * Os corpos dos pinos do mapa, renderizados: bisel de cromo com luz de
   * cima, esmalte azul-noite e fio de neon com brilho de verdade. So o
   * CORPO — o simbolo vem por cima na tela, para um comercio novo nao
   * exigir um render novo.
   */
  pinoBase: "/assets/XB_Pino_base.png",
  pinoColeta: "/assets/XB_Pino_coleta.png",
  pinoEntrega: "/assets/XB_Pino_entrega.png",
  /*
   * AS LUVAS XB — a mao do jogo, agora desenhada por ele.
   *
   * Folha dele, 09/09/2026. Vale lembrar por que estas chegaram: em 08/09 uma
   * mao foi DESENHADA aqui dentro para dizer onde tocar, ficou ruim e depois
   * ficou obscena, e foi apagada no mesmo dia. O lugar ficou vazio de
   * proposito, esperando desenho de verdade. E este.
   *
   * A luva de toque ja vem com as ondinhas do toque no proprio desenho — por
   * isso a tela nao precisa mais inventar halo nenhum em volta dela.
   */
  luvaToque: "/assets/XB_luva_toque.webp",
  luvaAponta: "/assets/XB_luva_aponta.webp",
  luvaJoia: "/assets/XB_luva_joia.webp",
  /*
   * AS DUAS LUPAS: aproximar e afastar o mapa.
   *
   * Vieram na mesma folha, iguaizinhas e SEM sinal nenhum dentro — duas lupas
   * identicas nao dizem qual aumenta e qual diminui. O "+" e o "-" foram
   * pintados dentro da lente, no mesmo azul de neon do resto da folha, porque
   * botao de zoom sem sinal e adivinhacao.
   */
  lupaMais: "/assets/XB_lupa_mais.webp",
  lupaMenos: "/assets/XB_lupa_menos.webp",
  /*
   * O ENTREGADOR NAO MORA MAIS NESTA LISTA.
   *
   * Eram oito enderecos escritos a mao, um por rumo, porque era um desenho por
   * rumo. Agora sao oito rumos VEZES as poses — e serao mais quando o relogio
   * e o trecho a pe existirem. Trinta e dois nomes escritos a mao viram uma
   * lista que ninguem mantem, entao o desenho passou a ser achado pelo par
   * POSE + RUMO, dentro do proprio componente que o pinta.
   *
   * As folhas do Fernando ficam inteiras em assets-source/entregador, e
   * scripts/entregador/recortar.py e quem recorta.
   */
  logo: "/assets/logo-xb-mark-v3.webp",
  brandLockup: "/assets/logo-xb-metal-v3.webp",
  tireToken: "/assets/tire-token.svg",
  billboard: "/assets/billboard.svg",
  asphalt: "/assets/asphalt.svg",
  vehicleProgression: "/assets/vehicle-progression.svg",
  garage: "/assets/garage-hub.svg",
  planetary: "/assets/planetary-hub.svg",
  baseLocal: "/assets/base-local.svg",
  baseRegional: "/assets/base-regional.svg",
  baseGlobal: "/assets/base-global.svg",
  basePlanetary: "/assets/base-planetary.svg",
  buildingEvolution: "/assets/building-evolution.svg",
  tireCompounds: "/assets/tire-compounds.svg",
  routeConditions: "/assets/route-conditions.svg",
  dailyMissions: "/assets/daily-missions.svg",
} as const;
