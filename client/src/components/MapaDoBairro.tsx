/**
 * A TELA DO MAPA — a tela principal do jogo.
 *
 * O bairro visto de cima nao e uma tela de passagem: e onde a pessoa vive. Ela
 * abre o jogo e esta no bairro, nao numa planilha. Por isso esta tela NAO
 * desaparece sozinha depois de aparecer uma vez, como o filme faz.
 *
 * ── O QUE A PESSOA PODE FAZER COM O MAPA ──────────────────────────────────
 *
 * Arrastar para os lados, aproximar e afastar. Com o dedo: um dedo arrasta,
 * dois dedos aproximam. Com o mouse: arrastar arrasta, a rodinha aproxima.
 *
 * ── DUAS TRAVAS, E POR QUE CADA UMA EXISTE ────────────────────────────────
 *
 * 1. NAO DA PARA AFASTAR ALEM DO MAPA CHEIO. O menor tamanho e aquele em que o
 *    desenho ainda cobre a tela inteira. Sem essa trava apareceria tarja preta
 *    em volta do bairro, e um mundo com borda preta parece um adesivo colado
 *    na tela em vez de um lugar.
 *
 * 2. NAO DA PARA APROXIMAR ALEM DO DESENHO. O maior tamanho para onde o
 *    desenho ainda tem o que mostrar; passando disso a pessoa so veria pixel
 *    esticado, e um mapa borrado parece defeito, nao zoom.
 *
 * E o arrasto tambem e travado nas bordas: nao da para empurrar o bairro para
 * fora da tela e ficar olhando o vazio.
 *
 * ── POR QUE A CONTA E EM PIXEL, E NAO EM PORCENTAGEM ──────────────────────
 *
 * Porque o quanto o desenho precisa crescer depende da FORMA da tela, e a tela
 * muda de forma entre um celular em pe e um tablet deitado. Duas versoes
 * anteriores tentaram fazer isso so com porcentagem de CSS: uma deixou tarja
 * preta, a outra jogou o bairro inteiro para fora da tela. A moldura passou a
 * ser medida, e o problema sumiu junto.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GAME_ASSETS } from "@/game/assets";
import type { ChaveDaFaixa } from "@/game/xbwapp/entregaRapida";
import type { ComandoDoEntregador } from "@/components/Entregador";
import type { QuemPedala } from "@/game/osQuePedalam";
import IconeDoMapa from "./iconesDoMapa";
import Entregador from "./Entregador";
import type { ParadaDaEntrega } from "@/game/aParada";
import { DURACAO_DA_POEIRA_MS, type Poeira } from "@/game/aCurva";
import { fracaoDoDia } from "@/game/oRelogioDoBairro";
import VidaDoMapa from "@/components/VidaDoMapa";
import CabecaDePrego from "@/components/CabecaDePrego";
import MoradoresNaPorta from "@/components/MoradoresNaPorta";
import ODrone, { CaixaNoChao } from "./ODrone";
import { ESPERA_PARA_ABRIR_MS } from "@/game/oDrone";

/** O corpo de cada pino, por papel na corrida. */
const CORPO_DO_PINO: Record<ParadaNoMapa["papel"], string> = {
  base: GAME_ASSETS.pinoBase,
  coleta: GAME_ASSETS.pinoColeta,
  entrega: GAME_ASSETS.pinoEntrega,
};

/**
 * OS PINOS EXISTEM, MAS O JOGADOR AINDA NAO OS VE.
 *
 * Ordem do Fernando, com estas palavras: "pinos devem existir mas invisivel
 * ao jogador por enquanto". A diferenca nao e detalhe — e o oposto de nao
 * ter pino nenhum.
 *
 * Eles sao montados na tela, no lugar exato que a conta deu, ligados a rua e
 * a distancia a pe. So nao sao pintados. Assim da para conferir cada porta
 * antes de mostra-la, e o dia de mostrar e virar esta chave, nao construir
 * uma tela nova.
 *
 * Por que continuam apagados: um pino aponta uma porta. Enquanto as portas
 * estiverem em posicao aproximada, cada pino e uma afirmacao errada em cima
 * de um desenho certo — a pessoa ve "Pizzaria" apontando para uma casa
 * qualquer e, dali em diante, nao confia em mais nada que a tela disser.
 * Mapa sem pino nao mente; mapa com pino no lugar errado, sim.
 *
 * Invisivel aqui e invisivel de verdade: nao aparece, nao e lido em voz alta
 * por leitor de tela e nao rouba o toque de quem esta arrastando o mapa.
 *
 * LIGADOS AGORA, de proposito e por tempo determinado: o Fernando pediu para
 * olha-los DENTRO do jogo — "deve aplicar ao game para que possa analisar
 * como estara in game" — e uma imagem solta nao responde as perguntas que
 * importam (o pino tapa a casa? a etiqueta some no telhado claro? ainda da
 * para arrastar por baixo dele?). Volta para false assim que ele decidir o
 * formato, ou fica ligado se ele preferir ver as portas erradas enquanto
 * marcamos as certas.
 */
const PINOS_VISIVEIS = true;

/**
 * SE A BASE GANHA PINO.
 *
 * Desligada por ora: "não vejo necessidade do ícone da base no momento". A
 * base continua existindo e continua sendo de onde sai toda distancia — ela
 * so nao se anuncia no mapa. E ela agora tem lugar: a PRACA DA FONTE, que o
 * Fernando registrou como a base da equipe.
 */
const PINO_DA_BASE = false;

/** Tamanho do desenho do bairro, para a conta guardar a proporcao. */
const MAPA_LARGURA = 1448;
const MAPA_ALTURA = 1086;
const PROPORCAO = MAPA_LARGURA / MAPA_ALTURA;

/**
 * Quanto da para aproximar, contado a partir do mapa cheio.
 *
 * 3,5 vezes e mais ou menos onde o desenho para de ter o que mostrar num
 * celular: passando disso a pessoa ve pixel esticado, que parece defeito.
 */
const ZOOM_MAXIMO = 3.5;

/**
 * COM QUANTO DE APROXIMACAO O MAPA ABRE.
 *
 * Nao abre no tamanho minimo, e este numero e a correcao de um defeito real: no
 * minimo o desenho cobre a tela EXATAMENTE, e cobrir exatamente quer dizer que
 * nao sobra nada para arrastar. Numa janela estreita sobrava bastante e o
 * arrasto funcionava; numa janela larga nao sobrava nada e o mapa parecia
 * travado — o Fernando testou e nao arrastava.
 *
 * Abrindo ja aproximado sempre ha para onde ir, e afastar ate o mapa cheio
 * continua sendo um gesto a distancia.
 */
const ZOOM_INICIAL = 1.8;

/**
 * SE O PAINEL DE BAIXO APARECE.
 *
 * Desligado por decisao do Fernando, olhando a tela: por enquanto ele quer o
 * mapa e mais nada. O painel (quem fala, a corrida, a distancia, o quanto
 * recebe e o botao de sair) NAO foi apagado — fica aqui inteiro, atras desta
 * chave, para voltar quando ele disser o que vai em cima do mapa.
 *
 * Apagar seria mais limpo de ler e pior de viver: era jogar fora a unica
 * versao pronta de uma tela que ele ainda vai querer.
 */
const PAINEL_VISIVEL = false;

/**
 * SE OS PINOS APARECEM.
 *
 * Desligado a pedido dele em 07/09/2026, junto com o entregador: "esconda
 * entregador atual, e pinos". Pela mesma razao do painel — por enquanto ele quer
 * ver o BAIRRO, e pino e entregador sao as duas coisas que puxam o olho para
 * fora do desenho.
 *
 * A vida do mapa continua ligada: a luz do dia, as nuvens, a fonte, a chamine e
 * as luzinhas do entardecer sao bairro, e nao recado. Com o resto escondido, sao
 * elas que sobram para olhar — que e o ponto.
 *
 * Nada foi apagado: os pinos, a rota e a parada continuam sendo calculados
 * normalmente atras desta chave.
 *
 * ── RELIGADOS EM 08/09/2026 ───────────────────────────────────────────────
 *
 * Ordem dele: "ao clicar em aceitar, apareca o icone de coleta, e entrega e
 * entregador comece percurso". Agora os pinos tem quando aparecer e quando
 * sumir: eles sao as paradas do pedido ACEITO, e some sozinho o que ja foi
 * passado. Nao ha mais pino permanente enfeitando o bairro — o que era o
 * motivo de terem sido desligados.
 */
const PINOS_NO_MAPA = true;

/**
 * O GAROTO EM PE NA PRACA — o dono das bicicletas, olhando o bairro.
 *
 * "Aplique o garoto redimensionado ao lado da fonte." Ele fica ao lado da fonte
 * da praca, que e a base da corrida e o unico ponto de agua do bairro.
 *
 * ── O TAMANHO ─────────────────────────────────────────────────────────────
 *
 * Dois vírgula quatro por cento da ALTURA do mapa, escolhido olhando quatro
 * tamanhos lado a lado no desenho de verdade. Nessa medida ele fica mais ou
 * menos da altura da fonte: da para ver que e um menino, e ele nao passa por
 * cima do coreto — que era o que acontecia em quatro por cento.
 *
 * Nao e escala real, e nem podia ser: o bairro tem mil e duzentos metros de
 * ponta a ponta, e um menino de verdade teria menos de dois pixels. Ele e peca
 * de jogo, como o entregador — e, como ele, encolhe pela raiz do zoom.
 *
 * Trocar o tamanho e trocar este numero.
 */
const GAROTO_NA_PRACA = true;
const GAROTO_ALTURA = 2.4;
const GAROTO_ONDE = { x: 48.5, y: 41.4 };

/**
 * OS MORADORES NA PORTA DE CASA.
 *
 * Ordem dele, 13/09/2026: "coloque um morador na frente de sua casa". Cada
 * morador desenhado fica em pe na porta da propria casa — o mesmo ponto que o
 * jogo ja usa como destino da entrega, entao o entregador para exatamente onde
 * a pessoa esta, e nao dois metros ao lado dela.
 *
 * Quem e cada um e o tamanho deles moram em client/src/game/osMoradoresNaRua.ts.
 * Aqui fica so a chave de ligar e desligar, junto das outras chaves do mapa.
 */
const MORADORES_NAS_PORTAS = true;

/**
 * O CABECA DE PREGO NA PRACINHA — o primeiro vilao.
 *
 * Ordem dele, 14/09/2026: "bem no ponto amarelo, crie uma animacao do primeiro
 * vilao que apresentaremos cabeca de prego, deixe a animacao rodando neste
 * local pintado de amarelo".
 *
 * Ele levanta peso na beira do parquinho, para sempre, e nao faz mais nada:
 * por enquanto e cenario, e nao jogo. O ponto, o tamanho e o compasso moram em
 * client/src/game/oCabecaDePrego.ts. Aqui fica so a chave de ligar e desligar,
 * junto das outras chaves do mapa.
 */
const O_VILAO_NA_PRACINHA = true;

/**
 * EM QUE PE ESTA A PARADA — e o que decide se o pino aparece vivo ou apagado.
 *
 * Ordem dele: "modos de mudanca de cores, conforme modo de game, cores mais
 * vivas, ou apagadas dependendo da situacao". O papel (base, coleta, entrega)
 * diz O QUE o lugar e; a situacao diz SE E AGORA. Sao duas perguntas
 * diferentes e por isso sao dois dados, e nao um so.
 */
export type SituacaoDaParada = "agora" | "espera" | "feito" | "urgente";

/**
 * O ENTREGADOR NO MAPA — RELIGADO EM 09/09/2026, COM O RENAN.
 *
 * Ficou desligado enquanto nao havia desenho: ele pediu para tirar as imagens
 * do jogador e refazer mirando so o percurso. Os desenhos novos chegaram
 * (quinze rumos e as quatro cenas paradas, em client/public/assets, com o
 * relogio medido em game/data/moldes-entregador.json), e ele mandou aplicar:
 * "vamos aplicar, deixar funcional o Renan primeiro".
 *
 * Se um dia os desenhos sairem de novo, esta chave volta para false — a peca
 * nao pode ficar meio montada, pedindo arquivo que nao existe.
 */
const ENTREGADOR_NO_MAPA = true;

/**
 * A BOLA AZUL — o marcador provisorio do percurso. DESLIGADA em 10/09/2026.
 *
 * Ordem dele: "preciso que retire a bola azul do game, a bola azul deve ser
 * Renan coletando e entregando". Ela existia porque o desenho do entregador
 * ainda nao sabia seguir o balcao; agora sabe — o Renan anda exatamente onde a
 * bola andava, e desce da bicicleta na coleta e na entrega.
 *
 * Nao foi apagada: fica aqui, atras desta chave, para conferir o Renan contra
 * a conta do balcao se um dia os dois parecerem discordar.
 */
const BOLA_AZUL = false;

/**
 * AS LUPAS DE APROXIMAR E AFASTAR. DESLIGADAS em 10/09/2026.
 *
 * Ordem dele: "retire tambem as lupas". O mapa continua aproximando com dois
 * dedos e com a rodinha do mouse; o que sai e so o par de botoes. Como o
 * painel e os pinos antes dele, fica guardado atras desta chave — nao apagado.
 */
const LUPAS_VISIVEIS = false;

/** Um ponto do mapa, em porcentagem (0-100) — a mesma regua das ruas. */
export interface ParadaNoMapa {
  papel: "base" | "coleta" | "entrega";
  nome: string;
  /** Sem dizer nada, a parada e a da vez: em partida sao so as tres. */
  situacao?: SituacaoDaParada;
  /**
   * O DEGRAU DO RELOGIO DESTE PEDIDO — a cor da bolinha.
   *
   * E a MESMA escada do cartao do pedido dentro do aplicativo: no tempo, ate
   * 10%, 25%, 50%, 100% e perdeu. Uma cor so pode querer dizer uma coisa so no
   * jogo inteiro; duas escadas diferentes para a mesma pergunta ensinariam a
   * pessoa duas vezes, e errado.
   *
   * Sem degrau a bolinha fica neutra — que e o certo para um lugar sem relogio
   * correndo (a base, ou um pedido que ja fechou).
   */
  bolinha?: ChaveDaFaixa;
  /**
   * Onde o PINO pousa: QUASE NA FRENTE do lugar.
   *
   * Foram duas ordens seguidas, e a segunda corrigiu a primeira olhando a
   * tela. "aplicar pino sobre o teto do local" tirou o pino do meio-fio, onde
   * ele parecia apontar a rua. Mas no meio do telhado ele sentou em cima da
   * casa grande e tapou justamente o que apontava: "precisamos que pino fique
   * quase na frente de local".
   *
   * Entao ele pousa no caminho entre o telhado e a porta, puxado para perto do
   * predio. A porta continua existindo no endereco e e ela que manda na
   * distancia a pe — este ponto so manda no desenho.
   */
  em: readonly [number, number];
}

/** Mais alguem pedalando no bairro, alem do Renan (ver outrosEntregadores). */
export interface OutroEntregadorNoMapa {
  quem: QuemPedala;
  caminho: readonly (readonly [number, number])[];
  paradas: readonly ParadaDaEntrega[];
  comando: ComandoDoEntregador;
  /** Parado na mesma porta que outro: fica ao lado (ver Entregador). */
  aoLado?: boolean;
}

export default function MapaDoBairro({
  nomeDoJogador,
  paradas,
  caminho,
  paradasDaEntrega = [],
  metros,
  pagamento,
  entregaDoDrone = false,
  entregadorEm,
  comandoDoEntregador,
  outrosEntregadores = [],
  aoAbrirAMala,
  pracaLimpa = false,
  relogioDoBalcao = 0,
  aoSair,
}: {
  nomeDoJogador: string;
  paradas: readonly ParadaNoMapa[];
  /** O tracado que o entregador percorre, ponto a ponto, em cima das ruas. */
  caminho: readonly (readonly [number, number])[];
  /** Onde ele desce da bicicleta, e a caminhada de cada uma. */
  paradasDaEntrega?: readonly ParadaDaEntrega[];
  metros: number;
  pagamento: number;
  /*
   * O RELOGIO DO BAIRRO, de onde sai a hora do dia.
   *
   * Entra por fora e nao e calculado aqui: a luz do mapa e o balcao tem de
   * viver o MESMO dia, e a unica forma de garantir isso e os dois lerem o mesmo
   * numero. Ver `oRelogioDoBairro`.
   */
  relogioDoBalcao?: number;
  /** O drone da XB desce a primeira encomenda: a resposta ao "vamos resolver isso". */
  entregaDoDrone?: boolean;
  /**
   * ONDE O ENTREGADOR ESTA AGORA, em porcentagem da tela.
   *
   * Quem calcula e o balcao, e nao este mapa: e a mesma conta que decide
   * quando o pedido fecha. Se o desenho tivesse conta propria, o boneco
   * chegaria antes ou depois da entrega ser dada como feita.
   *
   * E um marcador simples, e nao o desenho do entregador — ele pediu para
   * tirar as imagens antigas e refazer mirando o percurso, e desenho que ainda
   * nao existe nao se inventa. O marcador serve para o percurso ser testado
   * hoje; quando os desenhos novos chegarem, ele da lugar a eles.
   */
  entregadorEm?: readonly [number, number];
  /**
   * QUEM MANDA NO DESENHO DO RENAN — o balcao, com metro e parada.
   *
   * Sem isto ele anda sozinho no caminho recebido (o jeito antigo). Com isto
   * ele fica onde o balcao diz, e desce da bicicleta na coleta e na entrega.
   */
  comandoDoEntregador?: ComandoDoEntregador;
  /**
   * OS OUTROS QUE PEDALAM — cada um com o seu caminho, as suas paradas e o seu
   * comando.
   *
   * Ordem dele, 11/09/2026: "devemos ter os dois na tela coletando e
   * entregando". O Renan continua nas props de sempre (caminho,
   * paradasDaEntrega, comandoDoEntregador); aqui entra quem mais estiver na
   * rua, cada um com os desenhos dele.
   */
  outrosEntregadores?: readonly OutroEntregadorNoMapa[];
  /*
   * A MALA ABRIU — o instante em que a encomenda deixa de ser uma caixa
   * fechada no chao e vira o que veio dentro.
   *
   * Quem avisa e este mapa, porque so ele sabe a hora: o drone sai de vista,
   * espera-se um instante, e so entao a mala abre. Quem escuta e o jogo, que
   * usa este instante para o Renan mandar a foto.
   */
  aoAbrirAMala?: () => void;
  /*
   * ── A PRACA VOLTA A SER SO A PRACA ───────────────────────────────────────
   *
   * Ordem dele, 08/09/2026: ao voltar do XBWAPP, o bau e o Renan nao devem
   * mais estar na praca.
   *
   * Faz sentido na historia: a conversa terminou com quem joga mandando ele
   * ir buscar a pizza. Ele foi. Deixar o menino parado ao lado de uma caixa
   * aberta seria contar que ele continua ali esperando, e a cena ja acabou.
   *
   * Eles saem DESAPARECENDO devagar, e nao sumindo de um quadro para o
   * outro: some de repente parece defeito; some devagar parece que foram
   * embora.
   */
  pracaLimpa?: boolean;
  aoSair(): void;
}) {
  const molduraRef = useRef<HTMLDivElement>(null);
  const [moldura, setMoldura] = useState({ w: 0, h: 0 });

  /*
   * A CENA DO DRONE: duas coisas separadas, porque tem tempos diferentes.
   *
   * O VOO acaba — o aparelho sai de vista e a camada inteira sai com ele. A
   * CAIXA nao: ela encostou no chao e fica no bairro. Um estado so apagaria a
   * encomenda junto com o drone, e o motivo da cena existir e justamente a
   * encomenda ficar la.
   */
  const [oVooAcabou, setOVooAcabou] = useState(false);
  const [caixaNoChao, setCaixaNoChao] = useState(false);
  const soltouACaixa = useCallback(() => setCaixaNoChao(true), []);
  const acabouOVoo = useCallback(() => setOVooAcabou(true), []);

  /*
   * E ENTAO A MALA ABRE, ali mesmo, do tamanho que esta.
   *
   * Ordem dele, 07/09/2026: "apenas uma animacao simples da caixa abrindo ao
   * lado do garoto, nada de zoom da caixa."
   *
   * Espera o drone sumir de vista antes: as duas coisas juntas na tela seriam
   * duas coisas para olhar, e cada uma tem um recado. Primeiro quem trouxe,
   * depois o que veio.
   */
  const [malaAberta, setMalaAberta] = useState(false);
  useEffect(() => {
    if (!oVooAcabou || malaAberta) return;
    const relogio = window.setTimeout(
      () => setMalaAberta(true),
      ESPERA_PARA_ABRIR_MS,
    );
    return () => window.clearTimeout(relogio);
  }, [oVooAcabou, malaAberta]);

  /* Abriu: avisa o jogo uma vez so. */
  const jaAvisouDaMala = useRef(false);
  useEffect(() => {
    if (!malaAberta || jaAvisouDaMala.current) return;
    jaAvisouDaMala.current = true;
    aoAbrirAMala?.();
  }, [malaAberta, aoAbrirAMala]);

  /*
   * A POEIRA QUE O PNEU DE TRAS LEVANTA NA CURVA.
   *
   * Ela mora AQUI, e nao no entregador, porque fica no chao onde nasceu
   * enquanto ele segue andando. Pintada dentro dele, viajaria junto — que e o
   * contrario de poeira.
   *
   * A lista se limpa sozinha: cada poeira sai quando a animacao dela acaba. Sao
   * duas por minuto, entao ela nunca passa de dois ou tres itens.
   */
  const [poeiras, setPoeiras] = useState<readonly Poeira[]>([]);
  const aoLevantarPoeira = useCallback((nova: Poeira) => {
    setPoeiras((atual) => [...atual, nova]);
    setTimeout(
      () => setPoeiras((atual) => atual.filter((p) => p.id !== nova.id)),
      DURACAO_DA_POEIRA_MS,
    );
  }, []);

  useEffect(() => {
    const alvo = molduraRef.current;
    if (!alvo) return;
    const medir = () =>
      setMoldura({ w: alvo.clientWidth, h: alvo.clientHeight });
    medir();
    // Sem observador o mapa ficaria certo so no primeiro desenho, e torto
    // depois de girar o aparelho.
    if (typeof ResizeObserver === "undefined") return;
    const observador = new ResizeObserver(medir);
    observador.observe(alvo);
    return () => observador.disconnect();
  }, []);

  /** O menor tamanho em que o desenho ainda cobre a tela inteira. */
  const larguraCheia = useMemo(() => {
    const { w, h } = moldura;
    if (w <= 0 || h <= 0) return 0;
    return Math.max(w, h * PROPORCAO);
  }, [moldura]);

  /** Quanto o mapa esta aproximado, contado a partir do mapa cheio. */
  const [zoom, setZoom] = useState(ZOOM_INICIAL);
  /**
   * Que ponto do desenho esta no meio da tela, em porcentagem (0-100).
   *
   * Comeca onde a pessoa trabalha — na base, se ela estiver entre as paradas —
   * e nao no meio geometrico do desenho, que nao quer dizer nada para ninguem.
   */
  const [centro, setCentro] = useState<[number, number]>(() => {
    const base = paradas.find((p) => p.papel === "base");
    return base ? [base.em[0], base.em[1]] : [50, 50];
  });

  /**
   * Trava o centro para o desenho nunca sair de baixo da tela.
   *
   * Sem isto daria para empurrar o bairro para o canto e ficar olhando o
   * vazio — a pessoa se perderia e nao teria como voltar.
   */
  const travar = useCallback(
    (c: [number, number], z: number): [number, number] => {
      const { w, h } = moldura;
      if (w <= 0 || h <= 0 || larguraCheia <= 0) return c;
      const largura = larguraCheia * z;
      const altura = largura / PROPORCAO;
      // Metade da tela, medida em porcentagem do desenho.
      const meioX = (w / 2 / largura) * 100;
      const meioY = (h / 2 / altura) * 100;
      const prender = (v: number, meio: number) =>
        meio >= 50 ? 50 : Math.min(100 - meio, Math.max(meio, v));
      return [prender(c[0], meioX), prender(c[1], meioY)];
    },
    [moldura, larguraCheia],
  );

  useEffect(() => {
    setCentro((c) => travar(c, zoom));
  }, [travar, zoom]);

  /** Onde o desenho fica desenhado, em pixels dentro da moldura. */
  const caixa = useMemo(() => {
    const { w, h } = moldura;
    if (w <= 0 || h <= 0 || larguraCheia <= 0)
      return { width: 0, height: 0, left: 0, top: 0 };
    const largura = larguraCheia * zoom;
    const altura = largura / PROPORCAO;
    return {
      width: largura,
      height: altura,
      left: w / 2 - (centro[0] / 100) * largura,
      top: h / 2 - (centro[1] / 100) * altura,
    };
  }, [moldura, larguraCheia, zoom, centro]);

  /* ── O DEDO E O MOUSE ────────────────────────────────────────────────── */

  const dedos = useRef(new Map<number, { x: number; y: number }>());
  const arrasto = useRef<{
    x: number;
    y: number;
    centro: [number, number];
  } | null>(null);
  const pinca = useRef<{ distancia: number; zoom: number } | null>(null);

  /** Quantos por cento do desenho cabem em um pixel da tela, agora. */
  const porcentoPorPixel = useCallback(
    (z: number) => {
      const largura = larguraCheia * z;
      const altura = largura / PROPORCAO;
      return { x: 100 / largura, y: 100 / altura };
    },
    [larguraCheia],
  );

  const aoDescer = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dedos.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (dedos.current.size === 1) {
      arrasto.current = { x: e.clientX, y: e.clientY, centro };
    } else if (dedos.current.size === 2) {
      const [a, b] = [...dedos.current.values()];
      pinca.current = {
        distancia: Math.hypot(a!.x - b!.x, a!.y - b!.y),
        zoom,
      };
      arrasto.current = null;
    }
  };

  const aoMover = (e: React.PointerEvent) => {
    if (!dedos.current.has(e.pointerId)) return;
    dedos.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (dedos.current.size >= 2 && pinca.current) {
      const [a, b] = [...dedos.current.values()];
      const agora = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      if (pinca.current.distancia > 0) {
        const novo = Math.min(
          ZOOM_MAXIMO,
          Math.max(1, (pinca.current.zoom * agora) / pinca.current.distancia),
        );
        setZoom(novo);
      }
      return;
    }

    if (!arrasto.current) return;
    const passo = porcentoPorPixel(zoom);
    const dx = (e.clientX - arrasto.current.x) * passo.x;
    const dy = (e.clientY - arrasto.current.y) * passo.y;
    // Arrastar para a direita traz o mapa junto: o centro anda ao contrario.
    setCentro(
      travar(
        [arrasto.current.centro[0] - dx, arrasto.current.centro[1] - dy],
        zoom,
      ),
    );
  };

  const aoSubir = (e: React.PointerEvent) => {
    dedos.current.delete(e.pointerId);
    if (dedos.current.size < 2) pinca.current = null;
    if (dedos.current.size === 0) arrasto.current = null;
  };

  /**
   * AS DUAS LUPAS — aproximar e afastar sem gesto nenhum.
   *
   * Ordem dele, 09/09/2026, junto com a folha das luvas: "luvas para clicar na
   * tela, aumentar zomm, diminuir". O mapa ja aproximava com a rodinha e com
   * dois dedos; faltava o jeito de quem esta com UMA mao no mouse, ou com o
   * jogo num aparelho sem rodinha e sem vontade de fazer pinca.
   *
   * O passo e o MESMO da rodinha (15%), de proposito: dois jeitos de mexer no
   * mapa que andam em tamanhos diferentes fazem a pessoa achar que um dos dois
   * esta quebrado.
   *
   * Aqui o ponto que fica parado e o MEIO DA TELA, e nao o ponteiro — o botao
   * nao fica em cima do lugar que a pessoa quer olhar.
   */
  const PASSO_DA_LUPA = 1.15;
  const mexerNaLupa = (paraPerto: boolean) => {
    setZoom((z) => {
      const novo = Math.min(
        ZOOM_MAXIMO,
        Math.max(1, paraPerto ? z * PASSO_DA_LUPA : z / PASSO_DA_LUPA),
      );
      if (novo !== z) setCentro((c) => travar(c, novo));
      return novo;
    });
  };

  /** A rodinha do mouse aproxima em cima do ponteiro, e nao do meio da tela. */
  const aoRodar = (e: React.WheelEvent) => {
    const alvo = molduraRef.current;
    if (!alvo) return;
    const r = alvo.getBoundingClientRect();
    const novo = Math.min(
      ZOOM_MAXIMO,
      Math.max(1, zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15)),
    );
    if (novo === zoom) return;
    // Mantem sob o ponteiro o mesmo ponto do desenho antes e depois.
    const antes = porcentoPorPixel(zoom);
    const px = e.clientX - r.left - r.width / 2;
    const py = e.clientY - r.top - r.height / 2;
    const sob: [number, number] = [
      centro[0] + px * antes.x,
      centro[1] + py * antes.y,
    ];
    const depois = porcentoPorPixel(novo);
    setZoom(novo);
    setCentro(travar([sob[0] - px * depois.x, sob[1] - py * depois.y], novo));
  };

  const coleta = paradas.find((p) => p.papel === "coleta");
  const entrega = paradas.find((p) => p.papel === "entrega");

  return (
    <section
      className={[
        "mapa",
        PAINEL_VISIVEL ? "" : "mapa--so-mapa",
        PINOS_VISIVEIS ? "" : "mapa--pinos-ocultos",
      ]
        .filter(Boolean)
        .join(" ")}
      {...(PAINEL_VISIVEL
        ? { "aria-labelledby": "mapa-titulo" }
        : { "aria-label": "Mapa do bairro" })}
    >
      <div
        className="mapa__moldura"
        ref={molduraRef}
        onPointerDown={aoDescer}
        onPointerMove={aoMover}
        onPointerUp={aoSubir}
        onPointerCancel={aoSubir}
        onWheel={aoRodar}
        role="application"
        aria-label="Mapa do bairro. Arraste para andar, aproxime para ver de perto."
      >
        <div
          className="mapa__caixa"
          style={
            {
              width: `${caixa.width}px`,
              height: `${caixa.height}px`,
              left: `${caixa.left}px`,
              top: `${caixa.top}px`,
              /*
               * O QUANTO O PINO ACOMPANHA A APROXIMACAO.
               *
               * O entregador tem tamanho de mundo e o pino tinha tamanho de
               * tela: duas regras brigando, e a briga aparecia justamente ao
               * aproximar e afastar. Afastado, o pino parado cobria mais chao
               * que uma casa; aproximado, ele sumia ao lado do entregador.
               *
               * A raiz do zoom poe os dois na mesma conversa sem igualar: o
               * bairro cresce inteiro, o pino cresce a metade disso. Quem
               * decide o tamanho final e o CSS — aqui so vai o numero.
               */
              "--zoom-raiz": Math.sqrt(zoom).toFixed(3),
              /*
               * O ZOOM INTEIRO, para o que tem tamanho de TELA.
               *
               * A raiz serve para as pecas do mundo, que crescem com o bairro
               * pela metade. O drone passando rente a camera nao e peca do
               * mundo: ele tem que cobrir a mesma fatia da TELA em qualquer
               * aproximacao, e para isso o CSS precisa do zoom cheio.
               */
              "--zoom": zoom.toFixed(3),
              /*
               * EM QUE PONTO DO DIA O BAIRRO ESTA, de 0 a 1.
               *
               * Antes descia daqui quanto DURAVA um dia, e a luz corria sozinha
               * com esse tempo — o que fazia o sol nascer duas vezes e meia por
               * dia de balcao. Agora desce a HORA, e a luz so obedece.
               */
              "--luz-em": fracaoDoDia(relogioDoBalcao).toFixed(4),
            } as React.CSSProperties
          }
        >
          <img
            className="mapa__foto"
            src={GAME_ASSETS.bairroMapa}
            alt="O bairro visto de cima"
            draggable={false}
          />

          {/*
            AS DUAS CAMADAS QUE FAZEM O BAIRRO RESPIRAR.

            Sao a primeira coisa da lista de vida do mapa, e a unica que da vida
            ao bairro INTEIRO sem mexer um pixel do desenho: copa, telhado,
            asfalto e pedra mudam juntos porque a luz que cai neles muda.

            Ficam entre o desenho e os pinos DE PROPOSITO. O menino e o bairro
            recebem a mesma luz, senao ele parece recortado e colado; os pinos
            ficam por cima e nao mudam de cor, porque pino e recado e recado nao
            pode entardecer junto com o quintal.
          */}
          {/*
            O GAROTO E A ENCOMENDA VEM ANTES DA LUZ — de proposito.

            Pintados depois das camadas de luz, os dois ficavam com a cor com que
            foram desenhados enquanto o bairro inteiro mudava de cor do amanhecer
            ao entardecer. E e exatamente isso que faz uma peca parecer COLADA
            por cima de um desenho: nao a forma, nem o tamanho — a luz errada.
            Ao meio-dia eles estavam certos e as cinco da tarde continuavam ao
            meio-dia, com o bairro todo laranja em volta.

            Aqui embaixo eles recebem a mesma luz do dia e a mesma sombra de
            nuvem que passa pelos telhados. Nao ha um numero para acertar: eles
            escurecem e esquentam com o bairro porque estao DENTRO dele.

            O garoto e pendurado pelo PE — a imagem e recortada rente ao
            contorno, entao a linha de baixo dela e a sola do tenis, e o ponto do
            mapa e onde ele pisa. A encomenda, pela base, pelo mesmo motivo.

            Os pontos de vida do mapa continuam ACIMA da luz: janela que acende
            ao entardecer nao pode ser escurecida pelo entardecer.
          */}
          {GAROTO_NA_PRACA && (
            <div
              className={pracaLimpa ? "garoto garoto--foi-embora" : "garoto"}
              style={{
                left: `${GAROTO_ONDE.x}%`,
                top: `${GAROTO_ONDE.y}%`,
                ["--garoto-altura" as string]: `${GAROTO_ALTURA}%`,
              }}
              aria-hidden="true"
            >
              <img
                className="garoto__desenho"
                src={GAME_ASSETS.garotoEmPe}
                alt=""
                draggable={false}
              />
            </div>
          )}

          {caixaNoChao && (
            <CaixaNoChao aberta={malaAberta} foiEmbora={pracaLimpa} />
          )}

          {/*
            OS MORADORES — antes da luz, pela mesma razao do garoto: quem esta
            DENTRO do bairro entardece junto com ele.
          */}
          {MORADORES_NAS_PORTAS && <MoradoresNaPorta />}

          {/*
            O VILAO — antes da luz, pela mesma razao do garoto e dos moradores:
            quem esta DENTRO do bairro entardece junto com ele.
          */}
          {O_VILAO_NA_PRACINHA && <CabecaDePrego />}

          <span className="mapa__luz" aria-hidden="true" />
          <span className="mapa__nuvens" aria-hidden="true" />

          {/*
            OS PONTOS QUE GANHAM VIDA: a fonte, as petalas, a chamine sorteada,
            o passarinho e as luzes que acendem ao entardecer. Ficam junto das
            camadas de luz, pela mesma razao — sao bairro, e nao recado.
          */}
          <VidaDoMapa />

          {/*
            O PINO RENDERIZADO.

            O balao de traco virou uma peca: bisel de cromo com a luz vindo
            de cima, esmalte azul-noite por dentro e fio de neon com brilho
            de verdade — feito quatro vezes maior e reduzido, que e o que da
            aresta limpa em vez de escada de pixel.

            O CORPO e imagem; o SIMBOLO vem por cima, desenhado. Assim um
            comercio novo e um desenho novo, e nao um render novo de tudo.

            A ponta encosta na porta e a peca sobe dali: marcador centrado no
            alvo tapa justamente o que aponta.
          */}
          {paradas
            .filter(
              (p) => PINOS_NO_MAPA && (PINO_DA_BASE || p.papel !== "base"),
            )
            .map((p) => (
              <div
                key={p.papel + p.nome}
                className="mapa__pino"
                data-papel={p.papel}
                data-situacao={p.situacao ?? "agora"}
                data-bolinha={p.bolinha ?? "sem-relogio"}
                style={{ left: `${p.em[0]}%`, top: `${p.em[1]}%` }}
                aria-hidden={PINOS_VISIVEIS ? undefined : true}
              >
                <img
                  className="mapa__corpo"
                  src={CORPO_DO_PINO[p.papel]}
                  alt=""
                  draggable={false}
                />
                <span className="mapa__bolinha" aria-hidden="true" />
                <IconeDoMapa papel={p.papel} nome={p.nome} />
                <span className="mapa__nome">{p.nome}</span>
              </div>
            ))}

          {/*
            O ENTREGADOR EM PERCURSO — marcador provisorio.

            Ele anda um passo por segundo, que e o compasso do balcao. A
            transicao de um segundo no CSS e o que transforma esses passos em
            movimento continuo: sem ela o marcador pularia de metro em metro.
          */}
          {BOLA_AZUL && entregadorEm && (
            <div
              className="mapa__entregador-xb"
              style={{ left: `${entregadorEm[0]}%`, top: `${entregadorEm[1]}%` }}
              aria-hidden="true"
            >
              <span />
            </div>
          )}

          {/*
            O entregador vem DEPOIS dos pinos, de proposito: ele anda por baixo
            deles e por cima do desenho. Pino e recado, entregador e mundo.

            RELIGADO EM 06/09/2026, com a PRIMEIRA das 24 imagens novas: ele
            pediu para por o jogador de volta "como estava antes".

            E andaime, e a nota diz por que: existe um desenho so, o das 4
            horas, mais o espelho dele para as 8. Cada uma das oito fatias de
            hoje recebe a mais parecida das duas. O percurso da primeira
            corrida desce a tela quase inteiro, das 4h as 9h, que e onde os
            dois servem — as fatias de cima ficam erradas e quase nao entram.

            Quando as 24 chegarem, some o espelho e some o remendo: a lista de
            rumos cresce e o resto ja funciona.
          */}
          {ENTREGADOR_NO_MAPA && caminho.length > 1 && (
            <Entregador
              key="renan"
              quem="renan"
              caminho={caminho}
              paradas={paradasDaEntrega}
              comando={comandoDoEntregador}
              aoLevantarPoeira={aoLevantarPoeira}
            />
          )}
          {ENTREGADOR_NO_MAPA &&
            outrosEntregadores.map((o) =>
              o.caminho.length > 1 ? (
                <Entregador
                  key={o.quem}
                  quem={o.quem}
                  caminho={o.caminho}
                  paradas={o.paradas}
                  comando={o.comando}
                  aoLado={o.aoLado}
                  aoLevantarPoeira={aoLevantarPoeira}
                />
              ) : null,
            )}

          {/*
            A poeira vem DEPOIS do entregador na ordem, mas ela nasce atras dele
            e some antes de ele voltar — nao ha o que tapar.
          */}
          {poeiras.map((p) => (
            <span
              key={p.id}
              className="mapa__poeira"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                ["--poeira" as string]: `${DURACAO_DA_POEIRA_MS}ms`,
              }}
              aria-hidden="true"
            />
          ))}
        </div>

        {/*
          O VOO DO DRONE — fora da foto do bairro, DENTRO da moldura.

          Aqui a regua e a da tela: ele passa rente aos nossos olhos, entrando
          por fora de uma borda e saindo pela outra. Dentro da foto, "borda"
          seria a borda do BAIRRO — com o mapa aproximado o aparelho comecaria e
          terminaria em algum canto que ninguem esta vendo.

          Onde ele PARA continua sendo um ponto do bairro: a janela vai junto, e
          aReguaDoVoo traduz o ponto para a tela.
        */}
        {entregaDoDrone && !oVooAcabou && (
          <ODrone
            janela={{
              esquerda: caixa.left,
              topo: caixa.top,
              largura: caixa.width,
              altura: caixa.height,
              telaLargura: moldura.w,
              telaAltura: moldura.h,
              zoom,
            }}
            aoSoltar={soltouACaixa}
            aoTerminar={acabouOVoo}
          />
        )}
      </div>

      {/*
        AS LUPAS FICAM FORA DA MOLDURA de proposito.
        Dentro dela todo toque vira arrasto do mapa — o dedo que encostasse no
        botao sairia empurrando o bairro junto.
      */}
      {LUPAS_VISIVEIS && (
        <div className="mapa__lupas">
          <button
            type="button"
            className="mapa__lupa"
            onClick={() => mexerNaLupa(true)}
            disabled={zoom >= ZOOM_MAXIMO - 0.001}
            aria-label="Aproximar o mapa"
            title="Aproximar"
          >
            <img src={GAME_ASSETS.lupaMais} alt="" draggable={false} />
          </button>
          <button
            type="button"
            className="mapa__lupa"
            onClick={() => mexerNaLupa(false)}
            disabled={zoom <= 1.001}
            aria-label="Afastar o mapa"
            title="Afastar"
          >
            <img src={GAME_ASSETS.lupaMenos} alt="" draggable={false} />
          </button>
        </div>
      )}

      {PAINEL_VISIVEL && (
        <div className="mapa__painel">
          <p className="mapa__quem">XB TECHNOLOGY</p>
          <h1 id="mapa-titulo" className="mapa__fala">
            {nomeDoJogador ? `${nomeDoJogador}, sua` : "Sua"} primeira corrida:{" "}
            <strong>pega na {coleta?.nome ?? "loja"}</strong> e deixa na{" "}
            <strong>{entrega?.nome ?? "casa"}</strong>.
          </h1>

          <dl className="mapa__conta">
            <div>
              <dt>DISTÂNCIA</dt>
              <dd>{Math.round(metros)} m</dd>
            </div>
            <div>
              <dt>VOCÊ RECEBE</dt>
              <dd>XB$ {pagamento}</dd>
            </div>
          </dl>

          <button className="mapa__acao" type="button" onClick={aoSair}>
            SAIR PARA A ENTREGA →
          </button>
        </div>
      )}
    </section>
  );
}
