/**
 * O ENTREGADOR ANDANDO NO MAPA.
 *
 * Ele segue o tracado das ruas ponto a ponto. Nunca corta quarteirao porque o
 * caminho que recebe nao tem um unico ponto fora do asfalto — quem garante
 * isso e quem monta a rota, e nao esta tela.
 *
 * ── O DESENHO NAO GIRA: ELE TROCA ─────────────────────────────────────────
 *
 * Sao oito rumos e seis desenhos. Girar um desenho feito de tres quartos
 * entorta a bicicleta e derrete o rosto; entao cada rumo tem o seu, e a troca
 * acontece quando o entregador passa da metade do angulo. Subir a direita e
 * subir a esquerda usam a vista de costas — de cima, quem sobe some do mesmo
 * jeito para os dois lados.
 *
 * ── VIDA SEM QUADRO A QUADRO ──────────────────────────────────────────────
 *
 * Nao ha animacao de pedalada: sao imagens paradas. O que da vida e um
 * sobe-e-desce curto no corpo e a sombra achatando junto, fora de fase. E
 * barato e engana bem — a pessoa le "pedalando" sem que ninguem tenha
 * desenhado uma perna se mexendo.
 *
 * ── O TAMANHO E DO MUNDO, NAO DA TELA ─────────────────────────────────────
 *
 * Ao contrario do pino, que e recado, o entregador MORA no bairro: ele cresce
 * e encolhe junto com o mapa. Uma pessoa de verdade, na escala do desenho,
 * teria oito pixels e sumiria — entao ele e uma peca de jogo, maior que a
 * pessoa que representa, do mesmo jeito que a peca de um tabuleiro e maior
 * que a casinha impressa nele.
 *
 * MAS PECA GRANDE DEMAIS DEIXA DE SER PECA. Ele nasceu com trinta e um
 * milesimos da largura do bairro e ficava mais largo que uma casa inteira —
 * o Fernando viu aproximado: "so achei entregador fora do dimensionamento".
 * A regua que faltava e a CASA: a casa mediana do desenho tem 2,3% da largura
 * do mapa. Dois por cento poe o entregador em quase noventa por cento de uma
 * casa, que e o tamanho de peca que cabe na faixa da rua sem tapar a porta
 * para onde ele esta indo.
 *
 * O piso de tela mora no CSS, e nao aqui: afastado ate o bairro inteiro, a
 * conta do mundo o reduziria a um ponto, e a pessoa perderia o proprio
 * entregador de vista.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { GAME_ASSETS } from "@/game/assets";
import { MAPA } from "@/game/streets";
import type { PontoNoMapa } from "@/game/streets";
import { METROS_POR_SEGUNDO, RELOGIO_DO_MAPA } from "@/game/pedalada";
import type { ParadaDaEntrega } from "@/game/aParada";
import {
  ESPERA_DA_POEIRA_MS,
  MACIEZ_DA_INCLINACAO,
  inclinacaoDaCurva,
  levantaPoeira,
  type Poeira,
} from "@/game/aCurva";
import {
  POSE_DO_PAPEL,
  geometriaDaCena,
  ladoDaCena,
  type LadoDaCena,
  type PapelDaCena,
  type TempoDaCena,
} from "@/game/asCenasParadas";
import {
  COSTURA_GRAUS,
  ESPERA_MS,
  FOLGA_GRAUS,
  diferencaDeAngulo,
  confirmarTroca,
  escolherRumo,
  olhadaPara,
  montarPassos,
  proximoNoGiro,
  PASSO_DO_GIRO_MS,
  pontoEm,
  rumoSuavizado,
  virarPara,
  rumoDaFatia,
  type EscolhaDeRumo,
  type TrocaPendente,
} from "@/game/rumoDoEntregador";
import {
  DESENHOS_DE,
  type OsDesenhosDe,
  type QuemPedala,
} from "@/game/osQuePedalam";

/**
 * Se o desenho do meio de um giro nao aparecer (imagem que falhou), o giro
 * segue assim mesmo depois deste tempo — nunca fica preso.
 */
const ESPERA_MAXIMA_DO_GIRO_MS = 600;

/** Quantos por cento da largura do mapa o entregador ocupa. */
/*
 * A MOLDURA MUDOU, ENTAO O NUMERO MUDOU JUNTO — e o menino continua do mesmo
 * tamanho.
 *
 * Os desenhos antigos vinham cortados rente ao contorno; os novos vem todos na
 * mesma moldura, para que trocar de pose nao mude o tamanho do menino. So que
 * a moldura nova e mais alta em relacao a largura, e o jogo dimensiona pela
 * LARGURA: mantido o 2,0 de antes, ele cresceria um terco de uma vez.
 *
 * 2,536 e o numero que deixa a altura do menino na tela igual a que ele tinha na
 * moldura aprovada. Ele mudou duas vezes em 06/09/2026, e sempre pela mesma
 * razao: A MOLDURA MUDOU.
 *
 * Primeiro era um recorte justo, colado no contorno. Agora e a moldura QUADRADA
 * inteira da folha, com o ar em volta — e e assim que tem de ser: as folhas de
 * cada rumo tem o menino em posicoes diferentes dentro do quadro, e e o quadro
 * que garante que ele nao mude de tamanho ao virar. Como o menino ocupa em
 * media 80% da altura desse quadro, a moldura precisa ser maior para ele sair do
 * mesmo tamanho. Ha teste guardando essa conta — trocar a moldura sem
 * trocar isto aqui e o jeito silencioso de o entregador mudar de tamanho.
 */
const TAMANHO_APROVADO = 2.536;

/**
 * O AUMENTO PARA OLHAR — temporario, e por isso mora sozinho aqui.
 *
 * Ordem dele em 06/09/2026, ao ver o entregador no mapa: "aumente jogador para
 * tamanho visivel depois redimensionamos". No tamanho de mundo ele tem vinte e
 * poucos pixels — anda, mas nao da para julgar desenho nenhum.
 *
 * Fica separado do TAMANHO_APROVADO de proposito. Assim o numero que ele
 * aprovou continua guardado e testado, e voltar ao tamanho de mundo e por 1
 * aqui — nao e caçar de onde veio o aumento.
 *
 * O piso de tela no CSS acompanha este numero: sao a mesma decisao em dois
 * lugares, e ha teste ligando os dois.
 */
const AUMENTO_PARA_OLHAR = 1.6;

const TAMANHO = TAMANHO_APROVADO * AUMENTO_PARA_OLHAR;

/**
 * Quanto quem chega depois se afasta, quando dois param na mesma porta: em %
 * do proprio desenho, para a direita e um pouco para a frente (ver aoLado).
 */
const AO_LADO = ["70%", "6%"] as const;

/** Quanto tempo ele fica parado na porta antes de recomecar a volta. */
const PAUSA_NA_PORTA = 1600;

/** Quanto da roda entra no chao, em % da moldura. Anda junto com o CSS. */
const ENTERRAR = 3;

/**
 * AS POSES QUE O JOGO PINTA HOJE.
 *
 * Sao noventa e seis desenhos ao todo — oito rumos por doze poses — e so estes
 * quatro entram por enquanto. Andar ate a porta e comemorar dependem do
 * relogio, que ainda nao corre.
 */
export type PoseDoEntregador =
  | "pedalando1"
  | "parado"
  | "entregando"
  | "coletando"
  | "comemorando";

/**
 * A VERSAO DO DESENHO — o remedio para "troquei a folha e continua a velha".
 *
 * O nome do arquivo do entregador nao muda quando o desenho muda: quem troca a
 * arte salva por cima. So que o navegador guarda a imagem por uma hora, entao
 * quem ja jogou continua vendo a folha antiga — e a gente fica olhando a tela
 * achando que o codigo nao pegou. Aconteceu em 06/09/2026.
 *
 * SUBIR ESTE NUMERO EM UMA UNIDADE A CADA TROCA DE FOLHA. E o unico passo
 * manual, e e barato: o pedido vira outro endereco e o navegador vai buscar.
 */
/**
 * O CRUZAMENTO — quanto tempo um desenho leva para virar o outro.
 *
 * "Precisamos melhorar e muito a alteracao de posicao do entregador."
 *
 * Ate aqui a troca era um CORTE: num quadro ele apontava para um lado, no
 * quadro seguinte para outro, com quarenta e cinco graus de diferenca. Nao ha
 * numero de freio que conserte isso — o freio decide QUANDO trocar, e o
 * problema e o COMO. Um corte a quarenta e cinco graus le como teleporte,
 * mesmo espacado de cinco em cinco segundos.
 *
 * Aqui os dois desenhos convivem por um instante: o velho sai enquanto o novo
 * entra. O olho le a passagem como uma virada, e nao como um pulo. E o mesmo
 * truque que faz um relogio de ponteiro parecer contínuo.
 *
 * Cento e sessenta milissegundos: mais curto nao le como passagem, mais longo
 * deixa dois meninos na tela tempo demais. E menor que a espera minima entre
 * duas trocas, entao nunca ha tres desenhos ao mesmo tempo.
 */
const CRUZAMENTO_MS = 160;

/**
 * O CRUZAMENTO FICA DESLIGADO — e a troca de desenho vira troca SECA, com o
 * desenho novo ja pronto na memoria.
 *
 * Ordem dele, 10/09/2026: "analise melhorias que deixem uma animacao
 * profissional sem ficar piscando".
 *
 * Medido no jogo montado, quadro a quadro, setenta e cinco segundos de corrida:
 * durante o cruzamento os dois desenhos ficam MEIO TRANSPARENTES ao mesmo tempo
 * (19% do tempo o menino estava apagado em parte), e no primeiro quadro de cada
 * troca a camada nova nascia apagada antes de a velha aparecer — dezenove vezes
 * o menino ficou INVISIVEL por um quadro, sete delas por um quarto de segundo,
 * quando a troca caia em cima de um engasgo do jogo. Era o pisca.
 *
 * Com trinta desenhos em volta do relogio, dois vizinhos diferem uns treze
 * graus: a troca seca entre eles le como giro, que e como se faz animacao de
 * boneco em jogo 2D. O cruzamento continua escrito, atras desta chave.
 */
const CRUZAR_A_TROCA = false;

/**
 * A CENA PARADA TEM DOIS TEMPOS. Na coleta ele pega a caixa e depois guarda na
 * mochila; na entrega ele estende a caixa e depois fica com a mao aberta. O
 * primeiro tempo dura isto; o segundo, o resto da parada.
 */
const TEMPO_DO_PRIMEIRO_QUADRO_MS = 900;

const VERSAO_DO_DESENHO = 12;

/**
 * De uma fatia de rumo para o desenho que a mostra.
 *
 * ── O ANGULO QUE ESCOLHE A FATIA E O DA TELA, E ISSO TEM CONSEQUENCIA NO
 *    ATELIE ──────────────────────────────────────────────────────────────
 *
 * O que decide a fatia e o quanto a rua sobe e anda NA TELA. O mapa e visto de
 * cima a 31 graus, entao o chao aparece achatado: ir para o fundo encolhe a
 * pouco mais da metade, atravessar de lado nao encolhe nada.
 *
 * Logo, GIRAR O MENINO DE IGUAL NAO DA PASSOS IGUAIS AQUI. Quem gerar os
 * desenhos de 15 em 15 graus de corpo poe cada um ate 18,7 graus fora da
 * fatia em que ele vai ser usado — com vinte e quatro desenhos, e mostrar o
 * vizinho errado. Os angulos de corpo certos estao na bussola, em
 * NOTAS DE TRABALHO/notas/A_BUSSOLA.md, e sao desiguais de proposito.
 *
 * QUEM ESCOLHE A FATIA E QUANDO ELA PODE TROCAR mora em game/rumoDoEntregador.
 * Aqui so se pinta o que ja foi decidido.
 */
function desenhoDoRumo(
  fatia: number,
  pose: PoseDoEntregador,
  d: OsDesenhosDe = DESENHOS_DE.renan
): string {
  const RUMOS = d.moldes.rumos;
  const quantos = RUMOS.length;
  const qual = ((fatia % quantos) + quantos) % quantos;
  /*
   * PARADO E PEDALANDO SAO O MESMO DESENHO — e agora o mesmo ARQUIVO.
   *
   * Sempre foram a mesma imagem (o recorte salvava duas copias). Duas copias
   * eram duas imagens para guardar na memoria e uma troca de endereco toda vez
   * que ele parava — troca que nao muda pixel nenhum, mas que o navegador trata
   * como imagem nova. O que separa os dois e o balanco, que some quando ele para.
   */
  void pose;
  return `/assets/${d.prefixo}_pedalando1_${RUMOS[qual] ?? RUMOS[0]}.webp?d=${VERSAO_DO_DESENHO}`;
}

/**
 * O DESENHO DA CENA PARADA — indexado pelo PAPEL e pelo LADO, e nao pelo rumo.
 *
 * Parado ele nao vai a lugar nenhum, entao rumo nao diz nada aqui. O que diz e
 * o que ele faz — na coleta a encomenda entra na mochila, na entrega ela sai da
 * mao dele — e para que lado. Ver game/asCenasParadas.
 */
function desenhoDaCena(
  papel: PapelDaCena,
  lado: LadoDaCena,
  tempo: TempoDaCena = 1,
  d: OsDesenhosDe = DESENHOS_DE.renan
): string {
  return `/assets/${d.prefixo}_${POSE_DO_PAPEL[papel]}_${lado}_${tempo}.webp?d=${VERSAO_DO_DESENHO}`;
}

/**
 * TODOS OS DESENHOS NA MEMORIA ANTES DO PRIMEIRO PEDAL.
 *
 * Sem isto, a primeira vez que ele vira para um rumo novo o navegador vai
 * buscar o arquivo e o menino some por um instante. Sao umas trinta e cinco
 * imagens pequenas: cabem de sobra, e o custo e uma vez so.
 */
const desenhosProntos = new Set<string>();
const desenhosGuardados: HTMLImageElement[] = [];

function guardarOsDesenhos(
  aoFicarPronto: () => void,
  d: OsDesenhosDe = DESENHOS_DE.renan
): void {
  if (typeof Image === "undefined") return;
  const todos: string[] = [];
  for (let f = 0; f < d.moldes.rumos.length; f += 1)
    todos.push(desenhoDoRumo(f, "pedalando1", d));
  // As cenas paradas entram junto: a troca acontece no instante em que ele
  // encosta no meio-fio, e buscar a imagem nessa hora e o menino sumir.
  for (const papel of ["coleta", "entrega"] as const)
    for (const lado of ["esquerda", "direita"] as const)
      for (const tempo of [1, 2] as const)
        todos.push(desenhoDaCena(papel, lado, tempo, d));
  for (const endereco of todos) {
    if (desenhosProntos.has(endereco)) continue;
    const img = new Image();
    img.decoding = "async";
    img.src = endereco;
    // Guardada numa lista para o navegador nao jogar fora a imagem ja pronta.
    desenhosGuardados.push(img);
    const pronto = () => {
      desenhosProntos.add(endereco);
      aoFicarPronto();
    };
    /*
     * PRONTO E DECODIFICADO, e nao so baixado. Imagem baixada ainda precisa
     * virar pixel na primeira vez que aparece — e esse primeiro quadro sai
     * vazio. decode() faz esse trabalho antes, fora da tela.
     */
    if (typeof img.decode === "function") img.decode().then(pronto, pronto);
    else img.onload = pronto;
  }
}

/**
 * OS NUMEROS DO RUMO ATUAL, PRONTOS PARA O CSS.
 *
 * Alem dos pontos de encosto e do pouso, sai daqui o poligono do CORTE: a reta
 * que passa pelas duas rodas, levantada pelo --enterrar e esticada para fora da
 * moldura, para o corte nao ter ponta. Quando as duas rodas encostam quase na
 * mesma coluna — que e o caso da folha vista de frente — a reta vira horizontal,
 * senao a inclinacao explodiria.
 */
function variaveisDoRumo(
  fatia: number,
  d: OsDesenhosDe = DESENHOS_DE.renan
): React.CSSProperties {
  const g = d.moldes.geometria[rumoDaFatia(fatia, d.moldes)]!;
  const meioX = (g.frenteX + g.trasX) / 2;
  const meioY = (g.frenteY + g.trasY) / 2;
  const vao = g.frenteX - g.trasX;
  const inclinacao = Math.abs(vao) < 6 ? 0 : (g.frenteY - g.trasY) / vao;
  const linha = (x: number) => g.trasY + inclinacao * (x - g.trasX) - ENTERRAR;
  const corte = `polygon(-20% -30%, 120% -30%, 120% ${linha(120).toFixed(1)}%, -20% ${linha(-20).toFixed(1)}%)`;
  return {
    "--frente-x": `${g.frenteX}%`,
    "--frente-y": `${g.frenteY}%`,
    "--tras-x": `${g.trasX}%`,
    "--tras-y": `${g.trasY}%`,
    "--pouso-x": `${-meioX}%`,
    "--pouso-y": `${-meioY}%`,
    // O eixo em que ele pende na curva: o meio da pegada dos dois pneus. Girar
    // por qualquer outro ponto tira os pneus do chao.
    "--giro-x": `${meioX}%`,
    "--giro-y": `${meioY}%`,
    "--corte": corte,
  } as React.CSSProperties;
}

/**
 * OS NUMEROS DA CENA PARADA, PRONTOS PARA O CSS.
 *
 * A diferenca para variaveisDoRumo esta no CORTE: la a linha do chao e
 * inclinada, porque as duas rodas encostam em alturas diferentes na moldura;
 * aqui ela e RETA. A bicicleta esta parada em piso plano.
 */
function variaveisDaCena(
  papel: PapelDaCena,
  lado: LadoDaCena,
  tempo: TempoDaCena = 1,
  d: OsDesenhosDe = DESENHOS_DE.renan
): React.CSSProperties {
  const g = geometriaDaCena(papel, lado, tempo, d.cenas);
  const linha = (g.chaoY - ENTERRAR).toFixed(1);
  /*
   * O POUSO E O MEIO DAS RODAS DA BICICLETA PARADA, quando a cena sabe onde
   * elas estao: a bicicleta fica onde estava quando ele desce, e so o menino
   * aparece ao lado. Sem essa medida, vale o meio das duas manchas do chao.
   */
  const pousoX = g.pousoX ?? (g.frenteX + g.trasX) / 2;
  const pousoY = g.pousoY ?? (g.frenteY + g.trasY) / 2;
  return {
    "--frente-x": `${g.frenteX}%`,
    "--frente-y": `${g.frenteY}%`,
    "--tras-x": `${g.trasX}%`,
    "--tras-y": `${g.trasY}%`,
    "--pouso-x": `${-pousoX}%`,
    "--pouso-y": `${-pousoY}%`,
    "--giro-x": `${pousoX}%`,
    "--giro-y": `${pousoY}%`,
    "--corte": `polygon(-20% -30%, 120% -30%, 120% ${linha}%, -20% ${linha}%)`,
  } as React.CSSProperties;
}

/**
 * QUEM MANDA NELE, quando alguem manda — o balcao de Entrega Rapida.
 *
 * Ordem dele, 10/09/2026: "retire a bola azul do game, a bola azul deve ser
 * Renan coletando e entregando".
 *
 * Ate aqui havia DOIS entregadores no mapa: a bola azul, que seguia o relogio do
 * balcao e era quem de fato fechava o pedido, e este desenho, que dava voltas
 * sozinho com relogio proprio. Um mentia para o outro. Com o comando, o desenho
 * deixa de ter relogio: ele fica exatamente onde o balcao diz, desce da
 * bicicleta quando o balcao diz que ele chegou, e nao da volta nenhuma.
 */
export interface ComandoDoEntregador {
  /** Quantos metros do caminho ele ja andou, pela conta do balcao. */
  metros: number;
  /**
   * Onde esta perna acaba (ele nunca passa daqui), e a que velocidade ele anda
   * nela. Com os dois o desenho anda LISO entre um segundo e outro do balcao,
   * sem esperar o proximo tique: a conta do balcao e reta no tempo, entao da
   * para saber onde ele esta em qualquer instante.
   */
  ate?: number;
  metrosPorSegundo?: number;
  /** A parada em que ele esta descido agora — coleta ou entrega — ou nenhuma. */
  naPorta: ParadaDaEntrega | null;
  /** Sem pedido na mao: em pe com a bicicleta, esperando. */
  parado: boolean;
}

/**
 * QUANTO ELE PODE FICAR PARA TRAS antes de pular direto para onde o balcao diz.
 *
 * O balcao avanca de segundo em segundo e o desenho anda macio entre um e
 * outro. Se a distancia passar disto — pedido novo, volta ao jogo depois de um
 * tempo com o aplicativo aberto — correr atras seria o menino disparando pela
 * rua; entao ele simplesmente aparece onde deve estar.
 */
const SALTO_MAXIMO_METROS = 60;

export default function Entregador({
  caminho,
  paradas = [],
  andando = true,
  comando,
  aoLevantarPoeira,
  quem = "renan",
  aoLado = false,
}: {
  caminho: readonly PontoNoMapa[];
  /**
   * QUEM ESTA PEDALANDO — e com isso, que desenhos e que medidas valem.
   *
   * Ordem dele, 11/09/2026: "devemos ter os dois na tela coletando e
   * entregando". Cada um tem as suas folhas; a regra de rumo e de cena e a
   * mesma para os dois. Quem chama da uma chave por pessoa, entao o "quem" de
   * um desenho montado nunca muda.
   */
  quem?: QuemPedala;
  /**
   * DOIS NA MESMA PORTA: este fica ao lado do outro, e nao em cima dele.
   *
   * Medido na bancada em 11/09/2026: o Renan e a Lorena coletaram na mesma
   * loja ao mesmo tempo e ficaram a 16 pixels um do outro — na tela, um so.
   * O deslocamento e em % do proprio desenho (vale em qualquer zoom) e desliza
   * no CSS, nao pula.
   */
  aoLado?: boolean;
  /** Quando vem, o balcao manda: sem relogio proprio e sem volta. */
  comando?: ComandoDoEntregador;
  /**
   * ONDE ELE DESCE DA BICICLETA — em ordem, pelo metro do caminho.
   *
   * Sem isto ele passava reto pela loja: pegava a encomenda em movimento e so
   * parava no fim da corrida. A parada do meio nao existia.
   */
  paradas?: readonly ParadaDaEntrega[];
  /**
   * AVISA QUE O PNEU DE TRAS LEVANTOU POEIRA NUMA CURVA.
   *
   * Sai daqui para fora porque a poeira FICA NO CHAO onde nasceu, e o
   * entregador segue andando. Pintada aqui dentro, ela viajaria junto com ele —
   * que e o contrario de poeira.
   */
  aoLevantarPoeira?: (poeira: Poeira) => void;
  andando?: boolean;
}) {
  /** O caminho com a conta de quanto se andou em cada ponto, feita uma vez. */
  const passos = useMemo(() => montarPassos(caminho), [caminho]);
  const distanciaTotal = passos[passos.length - 1]?.ate ?? 0;
  /** Os desenhos e as medidas de quem pedala (ver osQuePedalam). */
  const d = DESENHOS_DE[quem];
  const moldes = d.moldes;

  const caixa = useRef<HTMLDivElement | null>(null);

  /*
   * O PASSO NAO PASSA POR ESTADO DO REACT — E ISSO E METADE DO CONSERTO.
   *
   * Antes, cada quadro guardava a distancia andada num useState. Sessenta
   * vezes por segundo o componente inteiro era refeito, e o endereco da imagem
   * era montado de novo a cada vez. Era caro por nada: quem muda sessenta
   * vezes por segundo e a POSICAO, que e um numero no estilo, e nao a arvore
   * da tela.
   *
   * Agora a posicao e escrita direto no elemento e o React so entra quando
   * muda algo que ele precisa saber: a fatia do rumo e a parada na porta —
   * ambas raras.
   */
  const andado = useRef(0);
  const relogio = useRef(0);
  const desde = useRef(0);
  const pausaAte = useRef(0);
  /** Qual e a proxima parada da lista, e em qual ele esta agora. */
  const proximaParada = useRef(0);
  const paradoEm = useRef<ParadaDaEntrega | null>(null);
  const escolha = useRef<EscolhaDeRumo | null>(null);
  /** A troca de desenho que esta esperando confirmar (ver confirmarTroca). */
  const pendente = useRef<TrocaPendente | null>(null);
  /** O rumo mostrado, que persegue o do caminho com limite de guidao. */
  const rumo = useRef<number | null>(null);
  /*
   * O DESENHO NA TELA, que pode estar a caminho do escolhido. Quando o
   * escolhido esta a dois desenhos ou mais, a tela passa pelos do meio (ver
   * proximoNoGiro) — e o giro, e nao um pulo de forma.
   */
  const mostrada = useRef<number | null>(null);
  const mostradaEm = useRef(0);
  /*
   * A CURVA: o quanto o guidao esta girando, e o quanto ele pende por causa
   * disso.
   *
   * Sao dois numeros e nao um porque a velocidade de giro pula de quadro a
   * quadro — o tracado das ruas tem trechos de vinte e quatro centimetros. O
   * primeiro e a media macia dessa velocidade; o segundo persegue a inclinacao
   * que ela pede. Sem os dois, o menino tremeria em vez de pender.
   */
  const giroSuave = useRef(0);
  const inclinacao = useRef(0);
  const poeiraAte = useRef(0);
  const proximaPoeira = useRef(1);
  const poeirar = useRef(aoLevantarPoeira);
  poeirar.current = aoLevantarPoeira;
  /*
   * O COMANDO MORA NUM REF, e nao na lista do efeito: ele muda todo segundo, e
   * refazer o efeito a cada segundo zeraria a pedalada — o menino voltaria ao
   * comeco do caminho sessenta vezes por minuto.
   */
  const ordem = useRef(comando);
  /**
   * QUANDO A ORDEM CHEGOU. O balcao fala uma vez por segundo; entre uma fala e
   * outra o desenho sabe onde ele esta pela velocidade da perna e pelo tempo
   * que passou desde a ultima — e anda liso, e nao aos degraus de um segundo.
   */
  const ordemChegouEm = useRef(0);
  if (ordem.current !== comando) {
    ordem.current = comando;
    ordemChegouEm.current =
      typeof performance !== "undefined" ? performance.now() : 0;
  }
  const comandado = comando !== undefined;
  /** O ultimo ponto que o balcao mandou, e a velocidade para chegar nele. */
  const ultimoAlvo = useRef<number | null>(null);
  const velocidade = useRef(0);

  const [fatia, setFatia] = useState(0);
  /*
   * PARADO NA PORTA — a primeira pose nova que o jogo pode usar de verdade.
   *
   * Ela nao e enfeite: ate agora ele chegava na porta e continuava pedalando
   * no lugar, o que e a coisa que mais denuncia um boneco. Aqui ele desce.
   */
  const [naPorta, setNaPorta] = useState(false);
  /*
   * QUAL CENA PARADA ESTA VALENDO: o que ele faz ali, e para que lado.
   *
   * Fica ao lado do naPorta, e nao dentro dele, porque as duas coisas mudam em
   * momentos diferentes: o naPorta volta a ser falso no quadro em que ele monta
   * de novo, e a cena so importa enquanto ele esta parado.
   *
   * Fica nula na pausa do fim da volta, na base: ali ele nao coleta nem
   * entrega. Sem cena, vale a folha de "parado" em cima da bicicleta — que e o
   * que ele esta fazendo mesmo.
   */
  const [cena, setCena] = useState<{
    papel: PapelDaCena;
    lado: LadoDaCena;
    tempo: TempoDaCena;
  } | null>(null);
  /** Quando a cena comecou — para passar do primeiro tempo ao segundo. */
  const cenaDesde = useRef(0);
  /*
   * QUAL DESENHO ESTA NA TELA AGORA.
   *
   * Parado ou pedalando, e sempre o molde do rumo — a diferenca entre os dois e
   * o balanco, que some quando ele para.
   */
  const naCena = naPorta && cena !== null;
  const desenhoPedido = naCena
    ? desenhoDaCena(cena.papel, cena.lado, cena.tempo, d)
    : desenhoDoRumo(fatia, naPorta ? "parado" : "pedalando1", d);
  /*
   * DUAS IMAGENS: A DA FRENTE, QUE ESTA NA TELA, E A DE TRAS, QUE RECEBE O
   * DESENHO NOVO.
   *
   * Trocar o endereco da imagem que esta na tela para um desenho que ainda nao
   * virou pixel deixa o lugar vazio por um quadro — medido: dezessete quadros
   * assim em setenta e cinco segundos. Aqui a imagem da tela nunca troca de
   * endereco. O desenho novo entra na de tras, escondida; quando ele fica
   * pronto (decode), as duas trocam de lugar no mesmo quadro — e os numeros do
   * desenho (pouso, corte, manchas) trocam junto, senao o desenho velho ficaria
   * um quadro no pouso do novo, um pulinho de lado a cada troca.
   */
  const [, setDesenhosProntos] = useState(0);
  const variaveisPedidas = naCena
    ? variaveisDaCena(cena.papel, cena.lado, cena.tempo, d)
    : variaveisDoRumo(fatia, d);
  const pedido = useRef({
    desenho: desenhoPedido,
    variaveis: variaveisPedidas,
  });
  pedido.current = { desenho: desenhoPedido, variaveis: variaveisPedidas };
  const [telas, setTelas] = useState<{
    enderecos: [string, string | null];
    frente: 0 | 1;
    variaveis: React.CSSProperties;
  }>(() => ({
    enderecos: [desenhoPedido, null],
    frente: 0,
    variaveis: variaveisPedidas,
  }));
  const imagemUm = useRef<HTMLImageElement | null>(null);
  const imagemDois = useRef<HTMLImageElement | null>(null);
  const imagens = [imagemUm, imagemDois] as const;

  // Pediu desenho novo: ele vai para a imagem de tras.
  useLayoutEffect(() => {
    setTelas(t => {
      if (t.enderecos[t.frente] === desenhoPedido) return t;
      const tras = t.frente === 0 ? 1 : 0;
      /*
       * VOLTAR PARA O DESENHO DE ONDE ACABOU DE SAIR. Depois de uma virada, o
       * desenho que saiu fica guardado na imagem de tras. Se ele e pedido de
       * novo, a imagem de tras ja o tem — e devolver o mesmo estado nao
       * acordava a virada: o menino ficava preso no desenho errado ate outro
       * ser pedido, e ai pulava por cima. Uma lista nova acorda a virada.
       */
      if (t.enderecos[tras] === desenhoPedido)
        return { ...t, enderecos: [t.enderecos[0], t.enderecos[1]] };
      const enderecos: [string, string | null] = [...t.enderecos];
      enderecos[tras] = desenhoPedido;
      return { ...t, enderecos };
    });
  }, [desenhoPedido]);

  // A imagem de tras ficou pronta: vira a da frente, se ainda for a pedida.
  useEffect(() => {
    const tras = telas.frente === 0 ? 1 : 0;
    const endereco = telas.enderecos[tras];
    const el = imagens[tras].current;
    if (!endereco || !el) return;
    let vivo = true;
    const virar = () => {
      if (!vivo || pedido.current.desenho !== endereco) return;
      setTelas(t => {
        const tr = t.frente === 0 ? 1 : 0;
        if (t.enderecos[tr] !== endereco) return t;
        return { ...t, frente: tr, variaveis: pedido.current.variaveis };
      });
    };
    if (typeof el.decode === "function") el.decode().then(virar, virar);
    else if (el.complete) virar();
    else el.onload = virar;
    return () => {
      vivo = false;
    };
  }, [telas.enderecos, telas.frente]);

  const desenhoAgora = telas.enderecos[telas.frente]!;

  /*
   * QUAL DESENHO ESTA DE FATO NA TELA, E DESDE QUANDO. O giro pelos desenhos
   * do meio so da o proximo passo depois que o de agora apareceu e ficou o
   * tempo dele — sem isso, num quadro lento, o passo do meio era pulado e o
   * giro voltava a ser pulo.
   */
  const naTela = useRef({ desenho: desenhoAgora, desde: 0 });
  useEffect(() => {
    naTela.current = { desenho: desenhoAgora, desde: performance.now() };
  }, [desenhoAgora]);

  /*
   * O DESENHO QUE ESTA SAINDO, e o relogio que o apaga.
   *
   * Guardado pelo ENDERECO da imagem, e nao pelo numero da fatia. Enquanto so
   * havia troca de rumo os dois davam no mesmo; agora nao: descer da bicicleta
   * troca o desenho SEM trocar de fatia, e pelo numero essa troca passava reta,
   * como corte seco. Pelo endereco, toda troca de imagem cruza — a de rumo e a
   * de descer da bicicleta.
   */
  const [saindo, setSaindo] = useState<string | null>(null);
  const desenhoAnterior = useRef<string | null>(null);
  const apagarSaindo = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!CRUZAR_A_TROCA) return;
    if (desenhoAnterior.current === desenhoAgora) return;
    const velho = desenhoAnterior.current;
    desenhoAnterior.current = desenhoAgora;
    // O primeiro desenho da tela nao cruza com nada: nao havia nada antes dele.
    if (velho === null) return;
    setSaindo(velho);
    if (apagarSaindo.current) clearTimeout(apagarSaindo.current);
    apagarSaindo.current = setTimeout(() => setSaindo(null), CRUZAMENTO_MS);
    return () => {
      if (apagarSaindo.current) clearTimeout(apagarSaindo.current);
    };
  }, [desenhoAgora]);

  /** Os desenhos entram na memoria, prontos, antes do primeiro pedal. */
  useEffect(() => {
    let vivo = true;
    guardarOsDesenhos(() => {
      if (vivo) setDesenhosProntos(n => n + 1);
    }, d);
    return () => {
      vivo = false;
    };
  }, [d]);

  useEffect(() => {
    if (distanciaTotal <= 0 || passos.length < 2) return;
    let vivo = true;
    let quadro = 0;
    relogio.current = 0;
    desde.current = 0;
    andado.current = 0;
    escolha.current = null;
    pendente.current = null;
    rumo.current = null;
    mostrada.current = null;
    giroSuave.current = 0;
    inclinacao.current = 0;
    proximaParada.current = 0;
    paradoEm.current = null;
    ultimoAlvo.current = null;
    velocidade.current = 0;

    const pintar = (parado: boolean) => {
      const onde = pontoEm(passos, andado.current);
      const el = caixa.current;
      if (!onde || !el) return;
      el.style.left = `${onde[0]}%`;
      el.style.top = `${onde[1]}%`;
      // O sobe-e-desce: curto, e amarrado a distancia andada, para ele nao
      // "respirar" parado quando a volta termina. Parado na porta, some de vez.
      const balanco = parado ? 0 : Math.sin(andado.current * 0.9) * 0.22;
      const pende = parado ? 0 : inclinacao.current;
      const giro = `rotate(${pende.toFixed(2)}deg) translateY(${balanco}%)`;
      for (const imagem of imagens)
        if (imagem.current) imagem.current.style.transform = giro;
    };

    const passo = (agora: number) => {
      if (!vivo) return;
      if (relogio.current === 0) {
        relogio.current = agora;
        desde.current = agora;
      }
      const dt = Math.min(0.1, (agora - relogio.current) / 1000);
      relogio.current = agora;
      const ms = agora - desde.current;

      /*
       * ── MANDADO PELO BALCAO ─────────────────────────────────────────────
       *
       * Aqui nao ha relogio proprio nem volta: ou ele esta descido na porta que
       * o balcao disse, ou esta parado esperando pedido, ou esta indo — macio —
       * ate o metro que o balcao mandou.
       */
      const c = ordem.current;
      if (c) {
        if (c.naPorta) {
          andado.current = Math.min(c.naPorta.ate, distanciaTotal);
          if (paradoEm.current !== c.naPorta) {
            paradoEm.current = c.naPorta;
            cenaDesde.current = agora;
            setCena({
              papel: c.naPorta.papel,
              lado: ladoDaCena(c.naPorta, rumo.current ?? 0),
              tempo: 1,
            });
          } else if (agora - cenaDesde.current >= TEMPO_DO_PRIMEIRO_QUADRO_MS) {
            setCena(atual =>
              atual && atual.tempo === 1 ? { ...atual, tempo: 2 } : atual
            );
          }
          setNaPorta(atual => (atual ? atual : true));
          ultimoAlvo.current = andado.current;
          velocidade.current = 0;
          pintar(true);
          quadro = requestAnimationFrame(passo);
          return;
        }
        if (paradoEm.current) {
          // Montou de novo depois da cena: a proxima perna comeca aqui.
          paradoEm.current = null;
          setCena(null);
          /*
           * E ELE MONTA JA VIRADO PARA ONDE VAI. A volta na porta acontece
           * enquanto ele esta a pe, dentro da cena; ao montar, o desenho ja e o
           * da saida. Antes ele montava virado para onde tinha chegado e, meio
           * segundo depois, pulava de uma vez para o outro lado — o pulo de 137
           * e 180 graus medido no PC dele.
           */
          const saida = rumoSuavizado(
            passos,
            andado.current,
            olhadaPara(c.metrosPorSegundo ?? 0)
          );
          if (saida !== null) {
            rumo.current = saida;
            const nova = escolherRumo(
              null,
              saida,
              ms,
              FOLGA_GRAUS,
              ESPERA_MS,
              COSTURA_GRAUS,
              moldes
            );
            escolha.current = nova;
            pendente.current = null;
            mostrada.current = nova.fatia;
            mostradaEm.current = agora;
            setFatia(anterior =>
              anterior === nova.fatia ? anterior : nova.fatia
            );
          }
        }
        if (c.parado) {
          andado.current = Math.min(Math.max(0, c.metros), distanciaTotal);
          setCena(atual => (atual === null ? atual : null));
          setNaPorta(atual => (atual ? atual : true));
          /*
           * Mesmo parado ele precisa estar VIRADO para algum lado: o rumo sai do
           * trecho de rua a frente dele, uma vez, sem freio nenhum.
           */
          if (rumo.current === null) {
            const alvo = rumoSuavizado(passos, andado.current);
            if (alvo !== null) {
              rumo.current = alvo;
              const nova = escolherRumo(
                null,
                alvo,
                ms,
                FOLGA_GRAUS,
                ESPERA_MS,
                COSTURA_GRAUS,
                moldes
              );
              escolha.current = nova;
              mostrada.current = nova.fatia;
              mostradaEm.current = agora;
              setFatia(anterior =>
                anterior === nova.fatia ? anterior : nova.fatia
              );
            }
          }
          pintar(true);
          quadro = requestAnimationFrame(passo);
          return;
        }
        setNaPorta(atual => (atual ? false : atual));
        if (c.metrosPorSegundo !== undefined && c.ate !== undefined) {
          /*
           * ANDAR LISO: onde o balcao disse, mais o que ele pedalou desde entao.
           *
           * A conta do balcao e reta no tempo — a mesma velocidade do comeco ao
           * fim da perna —, entao da para saber onde ele esta em qualquer
           * instante, e nao so no tique de cada segundo. Nunca passa do fim da
           * perna, e nunca vai mais de um segundo alem da ultima ordem (se o
           * balcao parar, ele para junto).
           */
          const passou = Math.min(
            1.05,
            Math.max(0, (agora - ordemChegouEm.current) / 1000)
          );
          const alvo = Math.min(
            c.ate,
            distanciaTotal,
            Math.max(0, c.metros + c.metrosPorSegundo * passou)
          );
          if (
            ultimoAlvo.current === null ||
            alvo < andado.current - 1 ||
            alvo - andado.current > SALTO_MAXIMO_METROS
          ) {
            // Comeco de caminho novo, ou volta de verdade: vai direto.
            andado.current = alvo;
          } else {
            // O tique chegando um tiquinho atrasado nao o faz dar re.
            andado.current = Math.max(andado.current, alvo);
          }
          ultimoAlvo.current = alvo;
        } else {
          const alvo = Math.min(Math.max(0, c.metros), distanciaTotal);
          if (ultimoAlvo.current !== alvo) {
            const falta = alvo - andado.current;
            if (
              ultimoAlvo.current === null ||
              falta < -0.5 ||
              falta > SALTO_MAXIMO_METROS
            ) {
              andado.current = alvo;
              velocidade.current = 0;
            } else {
              // Chega no ponto novo em um segundo, que e o passo do balcao.
              velocidade.current = Math.max(0, falta);
            }
            ultimoAlvo.current = alvo;
          }
          andado.current = Math.min(
            alvo,
            andado.current + velocidade.current * dt
          );
        }
      } else {
        if (agora < pausaAte.current) {
          if (
            paradoEm.current &&
            agora - cenaDesde.current >= TEMPO_DO_PRIMEIRO_QUADRO_MS
          ) {
            setCena(atual =>
              atual && atual.tempo === 1 ? { ...atual, tempo: 2 } : atual
            );
          }
          pintar(true);
          quadro = requestAnimationFrame(passo);
          return;
        }

        if (!andando) {
          pintar(true);
          quadro = requestAnimationFrame(passo);
          return;
        }

        // Montou de novo: quem estava desenhando a caminhada pode apagar.
        paradoEm.current = null;
        setNaPorta(atual => (atual ? false : atual));
        const proximo =
          andado.current + METROS_POR_SEGUNDO * RELOGIO_DO_MAPA * dt;

        /*
         * A PARADA DO MEIO — a que faltava.
         *
         * Ele chega no meio-fio do lugar, desce, e a bicicleta fica ali o tempo
         * da caminhada de ida e volta. So depois disso a pedalada continua.
         */
        const aqui = paradas[proximaParada.current];
        if (aqui && proximo >= aqui.ate) {
          andado.current = Math.min(aqui.ate, distanciaTotal);
          pausaAte.current = agora + aqui.ms;
          proximaParada.current += 1;
          paradoEm.current = aqui;
          cenaDesde.current = agora;
          setCena({
            papel: aqui.papel,
            lado: ladoDaCena(aqui, rumo.current ?? 0),
            tempo: 1,
          });
          setNaPorta(true);
          pintar(true);
          quadro = requestAnimationFrame(passo);
          return;
        }

        if (proximo >= distanciaTotal) {
          // Acabou a volta: recomeca do inicio, com as paradas de novo pela frente.
          andado.current = 0;
          proximaParada.current = 0;
          pausaAte.current = agora + PAUSA_NA_PORTA;
          // Na base ele nao coleta nem entrega: fica parado em cima da bicicleta.
          setCena(null);
          escolha.current = null;
          pendente.current = null;
          rumo.current = null;
          mostrada.current = null;
          setNaPorta(true);
        } else {
          andado.current = proximo;
        }
      }

      /*
       * O RUMO, COM OS TRES FREIOS. A regra inteira mora no modulo; aqui so se
       * pergunta e se compara. Quando a resposta e a mesma de antes, o React
       * nem fica sabendo — e o endereco da imagem nao muda, entao o navegador
       * nao tem o que redesenhar.
       */
      const velocidadeAgora = c
        ? (c.metrosPorSegundo ?? 0)
        : METROS_POR_SEGUNDO * RELOGIO_DO_MAPA;
      const alvo = rumoSuavizado(
        passos,
        andado.current,
        olhadaPara(velocidadeAgora)
      );
      if (alvo !== null) {
        const antes = rumo.current;
        rumo.current = virarPara(rumo.current, alvo, dt);

        /*
         * A CURVA — quanto ele esta girando agora, alisado.
         *
         * A velocidade crua nao serve: o tracado do bairro tem trechos
         * curtissimos e ela pula de zero a duzentos e volta em dois quadros. A
         * media macia e o que o olho leria como "esta fazendo uma curva".
         */
        if (antes !== null && dt > 0) {
          const cru = diferencaDeAngulo(rumo.current, antes) / dt;
          const passoDaMedia = Math.min(1, dt / MACIEZ_DA_INCLINACAO);
          giroSuave.current += (cru - giroSuave.current) * passoDaMedia;
          const quer = inclinacaoDaCurva(giroSuave.current, rumo.current);
          inclinacao.current += (quer - inclinacao.current) * passoDaMedia;

          if (levantaPoeira(giroSuave.current) && agora >= poeiraAte.current) {
            poeiraAte.current = agora + ESPERA_DA_POEIRA_MS;
            const onde = pontoEm(passos, andado.current);
            const g =
              moldes.geometria[
                rumoDaFatia(escolha.current?.fatia ?? 0, moldes)
              ];
            if (onde && g && poeirar.current) {
              /*
               * Onde o pneu de tras esta, em ponto do MAPA.
               *
               * A moldura e QUADRADA em pixels, entao ela vale TAMANHO por
               * cento da largura do mapa e outro tanto da altura — o mapa nao e
               * quadrado. Confundir os dois poe a poeira longe do pneu, que e o
               * mesmo defeito da sombra fora de lugar.
               */
              const larguraNoMapa = TAMANHO;
              const alturaNoMapa = (TAMANHO * MAPA.largura) / MAPA.altura;
              const meioX = (g.frenteX + g.trasX) / 2;
              const meioY = (g.frenteY + g.trasY) / 2;
              poeirar.current({
                id: proximaPoeira.current,
                x: onde[0] + ((g.trasX - meioX) / 100) * larguraNoMapa,
                y: onde[1] + ((g.trasY - meioY) / 100) * alturaNoMapa,
              });
              proximaPoeira.current += 1;
            }
          }
        }

        const proposta = escolherRumo(
          escolha.current,
          rumo.current,
          ms,
          FOLGA_GRAUS,
          ESPERA_MS,
          COSTURA_GRAUS,
          moldes
        );
        const decidido = escolha.current
          ? confirmarTroca(escolha.current, proposta, pendente.current, ms)
          : { escolha: proposta, pendente: null };
        pendente.current = decidido.pendente;
        escolha.current = decidido.escolha;

        // A tela vai ate o escolhido — de uma vez se e vizinho, girando pelos
        // do meio se esta mais longe.
        const quer = escolha.current.fatia;
        const tela = mostrada.current;
        let mostrar = tela;
        if (tela === null) {
          mostrar = quer;
        } else if (tela !== quer) {
          const visto = naTela.current;
          const apareceu =
            visto.desenho === desenhoDoRumo(tela, "pedalando1", d);
          const ficouOTempo = apareceu
            ? agora - visto.desde >= PASSO_DO_GIRO_MS
            : agora - mostradaEm.current >= ESPERA_MAXIMA_DO_GIRO_MS;
          if (ficouOTempo) mostrar = proximoNoGiro(tela, quer, moldes);
        }
        if (mostrar !== tela && mostrar !== null) {
          mostrada.current = mostrar;
          mostradaEm.current = agora;
          const agoraNaTela = mostrar;
          setFatia(anterior =>
            anterior === agoraNaTela ? anterior : agoraNaTela
          );
        }
      }

      pintar(false);
      quadro = requestAnimationFrame(passo);
    };

    quadro = requestAnimationFrame(passo);
    return () => {
      vivo = false;
      cancelAnimationFrame(quadro);
    };
  }, [andando, comandado, distanciaTotal, paradas, passos]);

  if (passos.length === 0) return null;

  return (
    <div
      ref={caixa}
      className="entregador"
      data-quem={quem}
      /*
       * CADA RUMO TRAZ A SUA PROPRIA GEOMETRIA.
       *
       * Onde a roda encosta muda com a direcao — de lado sao dois pontos bem
       * separados, de frente eles quase se juntam. Entao a sombra, o ponto que
       * pousa no mapa e a linha do corte nao podem ser numeros fixos no CSS:
       * eles vem daqui, medidos folha por folha.
       */
      style={{
        /*
         * O TAMANHO DE MUNDO — quanto do bairro ele cobre, antes do zoom.
         *
         * Quem divide isto pela aproximacao e o CSS, e nao esta linha: o numero
         * do zoom mora no mapa e desce por heranca. Ver a regra .entregador.
         */
        ["--tamanho-de-mundo" as string]: `${TAMANHO}%`,
        ["--cruzamento" as string]: `${CRUZAMENTO_MS}ms`,
        ["--ao-lado-x" as string]: aoLado ? AO_LADO[0] : "0%",
        ["--ao-lado-y" as string]: aoLado ? AO_LADO[1] : "0%",
        ...telas.variaveis,
      }}
      aria-hidden="true"
    >
      {/*
        DUAS CAMADAS: a que sai e a que entra. A de baixo e o desenho velho,
        apagando; a de cima e o novo, acendendo. Fora do instante da troca so
        existe a de cima, e a tela fica igual ao que era antes.
      */}
      {/*
        O CORTE DO CHAO FICA NA CAIXA, E A INCLINACAO NA IMAGEM.
        Sao dois elementos por camada de proposito. O corte guarda o que esta
        acima da linha do chao; se ele estivesse na mesma peca que gira, giraria
        junto e a linha do chao penderia com o menino — a seis graus isso come
        cinco por cento da moldura de um lado e deixa o pneu do outro lado
        pendurado no ar. Na caixa, o corte fica onde o chao esta.
      */}
      {CRUZAR_A_TROCA && saindo !== null && saindo !== desenhoAgora && (
        <span
          key={`sai-${saindo}`}
          className="entregador__camada entregador__camada--sai"
        >
          <img
            className="entregador__desenho"
            src={saindo}
            alt=""
            draggable={false}
          />
        </span>
      )}
      {/*
        UMA IMAGEM SO, QUE TROCA DE DESENHO NO LUGAR — sem cruzamento, o mesmo
        elemento fica na tela o tempo todo e so o endereco muda (para um desenho
        ja pronto). Com a chave presa ao desenho, cada troca apagava o elemento
        e criava outro, que nascia vazio.
      */}
      <span
        key={CRUZAR_A_TROCA ? `entra-${desenhoAgora}` : "entra"}
        className={
          CRUZAR_A_TROCA
            ? "entregador__camada entregador__camada--entra"
            : "entregador__camada"
        }
      >
        {imagens.map((imagem, i) => (
          <img
            key={i}
            ref={imagem}
            className={
              i === 0
                ? "entregador__desenho"
                : "entregador__desenho entregador__desenho--reserva"
            }
            src={telas.enderecos[i] ?? undefined}
            style={{ visibility: telas.frente === i ? "visible" : "hidden" }}
            alt=""
            draggable={false}
          />
        ))}
      </span>
      {/*
        O CONTATO DO PNEU COM O CHAO — pintado POR CIMA do desenho.

        Sombra atras do menino nunca cola pneu nenhum: o pneu continua com a
        borda limpa, recortada, e borda limpa em cima de uma foto de rua le
        como adesivo. O que prende e a mancha que INVADE a base do pneu — a
        mesma coisa que a gente ve num carro parado: os ultimos dedos de
        borracha somem dentro da propria sombra.

        Por isso esta peca vem depois da imagem, e nao antes.
      */}
      <span className="entregador__contato" aria-hidden="true" />
    </div>
  );
}
