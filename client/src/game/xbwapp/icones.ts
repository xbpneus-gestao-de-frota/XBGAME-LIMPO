/**
 * OS DESENHOS DO APLICATIVO — recortados da folha que ele mandou.
 *
 * Ele entregou duas folhas prontas de pecas de interface. Elas foram cortadas
 * peca a peca e cada uma virou um arquivo proprio, transparente. Nao ha
 * desenho inventado aqui: tudo que aparece no aplicativo saiu da mao dele.
 *
 * ── O QUE NAO VIROU IMAGEM, E POR QUE ─────────────────────────────────────
 *
 * Os BALOES, a BARRA DE MENSAGEM e as etiquetas ("Hoje", "online") estavam na
 * folha e continuam sendo FEITOS em CSS. O motivo ja foi aprendido antes neste
 * projeto: balao que e imagem nao estica com o texto sem entortar as pontas —
 * o rabinho vira um triangulo esparramado assim que a frase passa de uma
 * linha. A forma e o desenho dele; o tamanho e do texto.
 *
 * O mesmo vale para o teclado da segunda folha: teclado que e imagem nao
 * digita.
 */
const P = "/assets/xbwapp/XBW_";

export const XBW_ICONES = {
  // O alto da conversa
  voltar: `${P}voltar.webp`,
  video: `${P}video.webp`,
  telefone: `${P}telefone.webp`,
  busca: `${P}busca.webp`,
  menu: `${P}menu.webp`,
  pontoOnline: `${P}ponto-online.webp`,

  // O que se faz com uma conversa
  silenciar: `${P}silenciar.webp`,
  fixar: `${P}fixar.webp`,
  arquivar: `${P}arquivar.webp`,
  lixeira: `${P}lixeira.webp`,
  estrela: `${P}estrela.webp`,
  encaminhar: `${P}encaminhar.webp`,
  responder: `${P}responder.webp`,

  // A barra de baixo
  microfone: `${P}microfone.webp`,
  enviar: `${P}enviar.webp`,
  mais: `${P}mais.webp`,
  figurinha: `${P}figurinha.webp`,
  gif: `${P}gif.webp`,

  // O que da para anexar
  camera: `${P}camera.webp`,
  galeria: `${P}galeria.webp`,
  documento: `${P}documento.webp`,
  contato: `${P}contato.webp`,
  local: `${P}local.webp`,
  audio: `${P}audio.webp`,
  enquete: `${P}enquete.webp`,
  pagamento: `${P}pagamento.webp`,

  // O estado de cada mensagem
  tique: `${P}tique.webp`,
  tiqueDuplo: `${P}tique-duplo.webp`,
  tiqueLido: `${P}tique-lido.webp`,
  relogio: `${P}relogio.webp`,
  digitando: `${P}digitando.webp`,

  // Audio, contagem e vazios
  play: `${P}play.webp`,
  onda: `${P}onda.webp`,
  contador: `${P}contador.webp`,
  avatarVazio: `${P}avatar-vazio.webp`,
  imagemVazia: `${P}imagem-vazia.webp`,
  anelStatus: `${P}anel-status.webp`,

  // As abas de baixo
  abaConversas: `${P}aba-conversas.webp`,
  abaStatus: `${P}aba-status.webp`,
  abaGrupos: `${P}aba-grupos.webp`,
  abaChamadas: `${P}aba-chamadas.webp`,
  abaAjustes: `${P}aba-ajustes.webp`,
  abaSino: `${P}aba-sino.webp`,
  abaCadeado: `${P}aba-cadeado.webp`,
  abaQr: `${P}aba-qr.webp`,

  // ── AS PECAS QUE ELE RECORTOU E ENTREGOU (07/09/2026) ───────────────────
  //
  // Ordem dele: "CRIEI E DESMONTEI TODO APP, AGORA APLIQUE, A CADA TELA CADA
  // DETALHE TUDO QUE TE ENTREGUEI". Estas sao as pecas soltas das folhas
  // dele, recortadas uma a uma e guardadas com transparencia.
  //
  // Alguns SELOS tem o texto desenhado dentro ("Encaminhada", "Editada",
  // "Mensagem apagada", "online", "Hoje"). Esses so podem ser usados onde a
  // frase e sempre a mesma — e por isso o contador de nao lidas, que muda de
  // numero, continua sendo feito em CSS.
  selo: `${P}selo-online.webp`,
  seloHoje: `${P}selo-hoje.webp`,
  seloDigitando: `${P}selo-digitando.webp`,
  seloApagada: `${P}selo-apagada.webp`,
  seloEncaminhada: `${P}selo-encaminhada.webp`,
  seloEditada: `${P}selo-editada.webp`,

  clipe: `${P}clipe.webp`,
  semMicrofone: `${P}sem-microfone.webp`,
  desligar: `${P}desligar.webp`,

  anexoCamera: `${P}anexo-camera.webp`,
  anexoFigurinha: `${P}anexo-figurinha.webp`,

  topoVideo: `${P}topo-video.webp`,
  topoTelefone: `${P}topo-telefone.webp`,
  topoMenu: `${P}topo-menu.webp`,

  logoMarca: `${P}logo-marca.webp`,

  /*
   * OS DOIS SELOS DE MENSAGEM NOVA — folhas dele, 08/09/2026.
   *
   * Sao a MESMA marca em duas cores, e cada cor quer dizer uma coisa no alto
   * da tela: o VERDE e gente falando com voce; o PRATA e a propria XB avisando
   * (sistema, dinheiro, manutencao). Duas cores resolvem, num relance, a
   * pergunta que o aviso sempre gera: "isso e uma pessoa ou e o sistema?".
   *
   * Antes o aviso usava a marca azul achatada para branco por CSS. Marca
   * branca some no meio de um bairro claro e joga a cor da XB fora; estas duas
   * entram inteiras, do jeito que ele desenhou.
   */
  avisoVerde: `${P}aviso-verde.webp`,
  avisoPrata: `${P}aviso-prata.webp`,
  logoNome: `${P}logo-nome.webp`,
  logoInteiro: `${P}logo-inteiro.webp`,
  anelChamada: `${P}anel-chamada.webp`,
  anelRetrato: `${P}anel-retrato.webp`,

  atender: `${P}atender.webp`,
  recusar: `${P}recusar.webp`,
  btCamera: `${P}bt-camera.webp`,
  btSilenciar: `${P}bt-silenciar.webp`,
  btMensagem: `${P}bt-mensagem.webp`,

  // As palavras embaixo dos botoes, desenhadas por ele
  rotCamera: `${P}rot-camera.webp`,
  rotSilenciar: `${P}rot-silenciar.webp`,
  rotMensagem: `${P}rot-mensagem.webp`,
  rotRecusar: `${P}rot-recusar.webp`,
  rotAtender: `${P}rot-atender.webp`,
} as const;

export type NomeDeIcone = keyof typeof XBW_ICONES;
