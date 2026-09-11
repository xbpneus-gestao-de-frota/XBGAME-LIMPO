/**
 * AS CENAS PARADAS — o menino fora da bicicleta, na porta do lugar.
 *
 * Regra dele, 06/09/2026: "o entregador, quando for fazer coleta ou entrega,
 * ira parar a bicicleta, e depois geraremos animacao dele fora da bicicleta".
 * E a correcao de 07/09: "as imagens devem ser aplicadas nao na rua, mas na
 * porta da coleta ou entrega".
 *
 * ── DUAS PERGUNTAS, E NAO UMA ─────────────────────────────────────────────
 *
 * O QUE ele faz ali: coleta ou entrega. Ja estava escrito em cada parada da
 * corrida — o campo `papel` — e ate agora nao mudava nada na tela: pegar e
 * largar encomenda usavam o mesmo desenho. Agora usam o seu. Na coleta a
 * encomenda ENTRA na mochila; na entrega ela SAI da mao dele.
 *
 * PARA QUE LADO ele estende: esquerda ou direita de quem olha. Sai do proprio
 * traco da caminhada, que ja existia — o primeiro ponto e onde a bicicleta
 * ficou, o ultimo e a porta. Nao ha adivinhacao.
 *
 * Sao quatro cenas. Pedalando sao vinte moldes porque o rumo importa; parado
 * ele nao vai a lugar nenhum, e rumo nao diz nada.
 *
 * ── ONDE A CENA APARECE ───────────────────────────────────────────────────
 *
 * Onde a bicicleta parou, e nao ha mais escolha a fazer. Isto andou tres vezes
 * em um dia — meio-fio, porta, comeco do risco — e a razao de nenhuma posicao
 * ficar boa nao era conta, era tamanho: o desenho ocupa quase cinquenta metros
 * de mapa e a caminhada mediana do bairro tem trinta e um. Com o risco
 * pontilhado retirado a pedido dele, sobrou o unico ponto que sempre existiu: o
 * ponto do caminho onde a bicicleta encostou. Nao ha funcao para isso — e o
 * mesmo ponto que o entregador ja usa quando esta andando.
 */
import cenasDoArquivo from "./data/cenas-paradas.json";
import cenasDaLorena from "./data/cenas-lorena.json";
import type { ParadaDaEntrega } from "./aParada";

export type LadoDaCena = "esquerda" | "direita";
export type PapelDaCena = "coleta" | "entrega";

export interface GeometriaDaCena {
  /**
   * As duas manchas do chao, em % da moldura.
   *
   * NAO sao apoios medidos, como nas folhas de pedalada. Parado nao ha uma
   * linha de chao unica no desenho — numa das folhas os dois pontos mais
   * baixos sao os dois tenis, a quatro por cento um do outro, o que deixaria a
   * bicicleta ao lado sem sombra nenhuma. Entao as manchas sao espalhadas a
   * 30% e 70% da largura: parado, a pegada e a cena inteira.
   */
  frenteX: number;
  frenteY: number;
  trasX: number;
  trasY: number;
  /**
   * A linha do chao. Aqui o corte e RETO, e nao inclinado como nas folhas de
   * pedalada: a bicicleta esta parada em piso plano.
   */
  chaoY: number;
  /**
   * O ponto que fica em cima do caminho: o meio das duas rodas da bicicleta
   * parada. Assim a bicicleta nao se mexe quando ele desce. Cena sem esta
   * medida pousa no meio das duas manchas do chao, como era antes.
   */
  pousoX?: number;
  pousoY?: number;
}

/**
 * OS DOIS TEMPOS DE CADA CENA — ordem dele, 10/09/2026, com a folha nova.
 *
 * Na coleta: 1 pega a caixa do chao, 2 guarda na mochila. Na entrega: 1
 * estende a caixa, 2 fica com a mao aberta, ja entregue.
 */
export type TempoDaCena = 1 | 2;

type CenaDoArquivo = {
  papel: PapelDaCena;
  lado: LadoDaCena;
  quadros?: GeometriaDaCena[];
} & GeometriaDaCena;

const lidas = cenasDoArquivo.cenas as ReadonlyArray<CenaDoArquivo>;

/** A chave de uma cena: o que ele faz, e para que lado. */
export function chaveDaCena(papel: PapelDaCena, lado: LadoDaCena): string {
  return `${papel}:${lado}`;
}

/** O nome da pose no arquivo do desenho. */
export const POSE_DO_PAPEL: Readonly<Record<PapelDaCena, string>> = {
  coleta: "coletando",
  entrega: "entregando",
};

export const CENAS: Readonly<Record<string, GeometriaDaCena>> =
  Object.fromEntries(
    lidas.map(c => [
      chaveDaCena(c.papel, c.lado),
      {
        frenteX: c.frenteX,
        frenteY: c.frenteY,
        trasX: c.trasX,
        trasY: c.trasY,
        chaoY: c.chaoY,
      },
    ])
  );

const QUADROS: Readonly<Record<string, readonly GeometriaDaCena[]>> =
  Object.fromEntries(
    lidas.map(c => [chaveDaCena(c.papel, c.lado), c.quadros ?? []])
  );

/** A geometria de um tempo da cena; sem o tempo medido, vale a da cena. */
/*
 * ── CADA ENTREGADOR TEM AS SUAS CENAS (11/09/2026) ─────────────────────────
 *
 * A Lorena desce da bicicleta dela, com o corpo dela: a folha das cenas dela
 * tem outras medidas (onde a bicicleta parada fica, onde o pe encosta). As
 * listas de cima continuam sendo as do Renan; a de cada pessoa mora aqui.
 */
export interface ConjuntoDeCenas {
  cenas: Readonly<Record<string, GeometriaDaCena>>;
  quadros: Readonly<Record<string, readonly GeometriaDaCena[]>>;
}

function montarCenas(lista: ReadonlyArray<CenaDoArquivo>): ConjuntoDeCenas {
  return {
    cenas: Object.fromEntries(
      lista.map(c => [
        chaveDaCena(c.papel, c.lado),
        {
          frenteX: c.frenteX,
          frenteY: c.frenteY,
          trasX: c.trasX,
          trasY: c.trasY,
          chaoY: c.chaoY,
        },
      ])
    ),
    quadros: Object.fromEntries(
      lista.map(c => [chaveDaCena(c.papel, c.lado), c.quadros ?? []])
    ),
  };
}

/** As cenas do Renan — o padrao de quem nao diz de quem e. */
export const CENAS_DO_RENAN: ConjuntoDeCenas = {
  cenas: CENAS,
  quadros: QUADROS,
};

/** As cenas da Lorena — a folha "paradas" dela, de 11/09/2026. */
export const CENAS_DA_LORENA: ConjuntoDeCenas = montarCenas(
  cenasDaLorena.cenas as ReadonlyArray<CenaDoArquivo>
);

export function geometriaDaCena(
  papel: PapelDaCena,
  lado: LadoDaCena,
  tempo: TempoDaCena = 1,
  de: ConjuntoDeCenas = CENAS_DO_RENAN
): GeometriaDaCena {
  const chave = chaveDaCena(papel, lado);
  return de.quadros[chave]?.[tempo - 1] ?? de.cenas[chave]!;
}

/** Uma diferenca menor que isto, em % do mapa, nao decide lado nenhum. */
const DESEMPATE = 0.05;

/**
 * Para que lado ele estende a encomenda.
 *
 * @param parada a parada em que ele esta, ou null na pausa da base
 * @param rumoEmGraus a direcao na tela em que ele vinha, para o desempate
 */
export function ladoDaCena(
  parada: ParadaDaEntrega | null,
  rumoEmGraus: number
): LadoDaCena {
  const aPe = parada?.aPe;
  if (aPe && aPe.length >= 2) {
    const daBicicleta = aPe[0]!;
    const naPorta = aPe[aPe.length - 1]!;
    const dx = naPorta[0] - daBicicleta[0];
    if (Math.abs(dx) > DESEMPATE) return dx >= 0 ? "direita" : "esquerda";
  }
  // Porta bem em cima ou bem embaixo, ou parada sem caminhada: segue o rumo em
  // que ele vinha, para nao dar meia-volta so por parar.
  return Math.cos((rumoEmGraus * Math.PI) / 180) >= 0 ? "direita" : "esquerda";
}
