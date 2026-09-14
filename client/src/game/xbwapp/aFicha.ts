/**
 * A FICHA DO ENTREGADOR — a foto dele, e as caixas do que da para melhorar.
 *
 * Ordem dele, 12/09/2026:
 *
 *   "ao clicar no cartao abre uma tela, onde mostra imagem de entregador, com
 *    caixas que te falei, depois clicando nessas caixas chegamos ate caixas
 *    finais para upar entregador (...) ao clicar em bicicleta deve aparecer
 *    outra tela, e ali ter itens para melhorar bicicleta, novos pneus,
 *    corrente, banco, freios, cada item melhorado pode aumentar volume de
 *    entregas, velocidade, diminuir cansasso dos entregadores."
 *
 * ── POR QUE TRES CAIXAS, E NAO UMA LISTA DE CINCO PECAS ───────────────────
 *
 * Porque as cinco pecas nao sao a mesma pergunta. Pneu, corrente, freio e
 * roda respondem "a bicicleta anda melhor?"; o bau responde "cabe mais
 * servico?" — e essa segunda e a unica que PIORA a velocidade de proposito,
 * em troca de volume. Misturar as duas numa lista so faz a pessoa comparar
 * coisas que nao competem entre si.
 *
 * Acessorios fica de fora por enquanto, e vazio na tela. Uma caixa vazia que
 * diz que esta vazia e honesta; uma caixa escondida faz a pessoa achar que o
 * jogo acabou ali.
 *
 * ── OS NUMEROS NAO SAO DAQUI ──────────────────────────────────────────────
 *
 * Sao os mesmos da garagem do jogo, lidos de asPecasDaBicicleta. Este arquivo
 * so decide em que caixa cada peca aparece e como o efeito dela vira frase.
 */
import {
  BIKE_PARTS,
  MAX_BIKE_PART_LEVEL,
  type BikePartConfig,
  type BikePartId,
  type BikePartLevels,
  type BikePartTier,
} from "../asPecasDaBicicleta";
import {
  ACESSORIOS,
  MAX_NIVEL_DO_ACESSORIO,
  type AcessorioConfig,
  type IdDoAcessorio,
  type NiveisDosAcessorios,
  type NivelDoAcessorio,
} from "../osAcessorios";

/** As caixas da ficha, na ordem em que aparecem. */
export type IdDaCaixa = "bicicleta" | "mochila" | "acessorios";

export interface CaixaDaFicha {
  id: IdDaCaixa;
  nome: string;
  /** Uma linha dizendo para que serve, em palavras de trabalho. */
  sobre: string;
  /** Quais pecas da bicicleta moram nesta caixa. */
  pecas: readonly BikePartId[];
  /** Quais acessorios moram nesta caixa. */
  acessorios: readonly IdDoAcessorio[];
  /*
   * O DESENHO DA CAIXA — a arte que ele mandou em 14/09/2026.
   *
   * O nome e a frase de baixo estao PINTADOS dentro do desenho, e continuam
   * escritos aqui em cima. Nao e repeticao por descuido: o desenho e o que a
   * pessoa ve, e o texto e o que o leitor de tela fala e o que os testes leem.
   * Um desenho que diz "Bicicleta" e um rotulo que diz outra coisa e o tipo de
   * desencontro que so aparece para quem nao enxerga a tela.
   */
  desenho: string;
}

/** A pasta dos desenhos das caixas. */
const DESENHO = "/assets/xbwapp/XBW_caixa_";

export const CAIXAS_DA_FICHA: readonly CaixaDaFicha[] = [
  {
    id: "bicicleta",
    nome: "Bicicleta",
    sobre: "Anda mais rápido e cansa menos",
    pecas: ["tire", "chain", "brake", "wheels"],
    acessorios: [],
    desenho: `${DESENHO}bicicleta.webp`,
  },
  {
    id: "mochila",
    nome: "Mochila",
    sobre: "Cabe mais serviço de uma vez",
    pecas: ["cargo"],
    acessorios: [],
    desenho: `${DESENHO}mochila.webp`,
  },
  /*
   * ACESSORIOS — ordem dele, 13/09/2026: "podem entrar como garrafa de agua
   * maior, protetor solar, etc, isso sendo melhorado".
   *
   * A caixa nasceu vazia de proposito e encheu no dia seguinte. O que mora
   * aqui e o que a pessoa leva NO CORPO, e os tres mexem no folego — nao na
   * bicicleta. Por isso sao uma caixa separada e nao mais quatro linhas na
   * caixa da bicicleta: quem entra aqui esta cuidando do entregador.
   */
  {
    id: "acessorios",
    nome: "Acessórios",
    sobre: "Cuida de quem pedala",
    pecas: [],
    acessorios: ["agua", "sol", "carga"],
    desenho: `${DESENHO}acessorios.webp`,
  },
];

/**
 * O DESENHO DE CADA PECA — a arte que ele mandou em 14/09/2026.
 *
 * Ordem dele: "na tela acessorios e oficina aplicar as imagens do itens".
 *
 * Mora AQUI, e nao em asPecasDaBicicleta, porque aquele arquivo e a tabela do
 * JOGO — preco, velocidade, desgaste — e e lida tambem pela garagem, que nao
 * tem aplicativo nenhum. Desenho de tela do aplicativo e assunto do aplicativo.
 *
 * Quem nao tem desenho aparece sem desenho, e a linha continua inteira: o
 * nome, o efeito e o preco nunca dependeram da figura.
 */
const DESENHOS_DAS_PECAS: Partial<Record<BikePartId, string>> = {
  tire: "/assets/xbwapp/XBW_peca_tire.webp",
  chain: "/assets/xbwapp/XBW_peca_chain.webp",
  brake: "/assets/xbwapp/XBW_peca_brake.webp",
  wheels: "/assets/xbwapp/XBW_peca_wheels.webp",
};

export const desenhoDaPeca = (id: BikePartId): string | undefined =>
  DESENHOS_DAS_PECAS[id];

export const caixaDaFicha = (id: IdDaCaixa): CaixaDaFicha =>
  CAIXAS_DA_FICHA.find(c => c.id === id) ?? CAIXAS_DA_FICHA[0]!;

/** As pecas de uma caixa, com a configuracao inteira de cada uma. */
export function pecasDaCaixa(id: IdDaCaixa): readonly BikePartConfig[] {
  const caixa = caixaDaFicha(id);
  return caixa.pecas
    .map(p => BIKE_PARTS.find(b => b.id === p))
    .filter((b): b is BikePartConfig => Boolean(b));
}

/**
 * QUANTO DESTA CAIXA JA FOI FEITO, de zero a um.
 *
 * Serve para a ficha mostrar uma barrinha em cada caixa sem a pessoa precisar
 * entrar para descobrir se ha o que fazer ali dentro.
 */
export function quantoDaCaixa(
  id: IdDaCaixa,
  niveis: BikePartLevels,
  dosAcessorios?: Readonly<NiveisDosAcessorios>
): number {
  const pecas = pecasDaCaixa(id);
  const itens = acessoriosDaCaixa(id);
  const teto =
    pecas.length * MAX_BIKE_PART_LEVEL +
    itens.length * MAX_NIVEL_DO_ACESSORIO;
  if (teto === 0) return 0;
  const feito =
    pecas.reduce((t, p) => t + (niveis[p.id] ?? 0), 0) +
    itens.reduce((t, a) => t + (dosAcessorios?.[a.id] ?? 0), 0);
  return Math.max(0, Math.min(1, feito / teto));
}

/** Quantos itens desta caixa ainda dao para subir. */
export function faltaNaCaixa(
  id: IdDaCaixa,
  niveis: BikePartLevels,
  dosAcessorios?: Readonly<NiveisDosAcessorios>
): number {
  return (
    pecasDaCaixa(id).filter(p => (niveis[p.id] ?? 0) < MAX_BIKE_PART_LEVEL)
      .length +
    acessoriosDaCaixa(id).filter(
      a => (dosAcessorios?.[a.id] ?? 0) < MAX_NIVEL_DO_ACESSORIO
    ).length
  );
}

/** Os acessorios de uma caixa, com a configuracao inteira de cada um. */
export function acessoriosDaCaixa(id: IdDaCaixa): readonly AcessorioConfig[] {
  const caixa = caixaDaFicha(id);
  return caixa.acessorios
    .map(a => ACESSORIOS.find(x => x.id === a))
    .filter((a): a is AcessorioConfig => Boolean(a));
}

/**
 * O QUE ESTE ACESSORIO MUDA, EM PALAVRAS.
 *
 * Mesma ideia da peca de bicicleta, e de proposito com as MESMAS palavras
 * onde o assunto e o mesmo: "cansa menos" quer dizer a mesma coisa vindo de
 * um pneu ou de um cinto, e quem le nao deveria ter que reparar na diferenca.
 */
export function oQueMudaNoAcessorio(
  degrau: NivelDoAcessorio
): readonly string[] {
  const frases: string[] = [];
  if (degrau.aguaPorSegundo)
    /*
     * O numero cru (0,022 por segundo) nao diz nada. O que diz e a comparacao
     * com o que ele ja recupera parado hoje — "recupera o dobro" e uma frase
     * que a pessoa usa para decidir.
     */
    frases.push(
      `recupera ${(1 + degrau.aguaPorSegundo / 0.02)
        .toFixed(1)
        .replace(".0", "")
        .replace(".", ",")}x parado`
    );
  if (degrau.alivioDoSol)
    frases.push(`o sol pesa ${Math.round(degrau.alivioDoSol * 100)}% menos`);
  if (degrau.alivioDaCarga)
    frases.push(`a bolsa pesa ${Math.round(degrau.alivioDaCarga * 100)}% menos`);
  return frases;
}

/** O nome do acessorio montado agora. Sem nivel, nao tem nenhum. */
export function oQueEstaNoCorpo(
  item: AcessorioConfig,
  nivel: number
): string {
  const atual = item.tiers.find(t => t.level === Math.floor(nivel));
  return atual?.name ?? "Não tem";
}

/**
 * O QUE ESTA PECA MUDA, EM PALAVRAS.
 *
 * Uma peca melhorada mexe em ate seis numeros de uma vez, e numero nenhum
 * ajuda a decidir: "0.13 de bonus de velocidade" nao se compara com "4 kg a
 * mais". O que decide e a frase. Entao a tela mostra frases, e guarda os
 * numeros para quem cuida da conta.
 *
 * A ordem e a de peso para quem joga: velocidade e volume mudam a entrega de
 * hoje; cansaco muda o dia inteiro; o resto muda o bolso no fim do mes.
 */
export function oQueMuda(tier: BikePartTier): readonly string[] {
  const frases: string[] = [];
  const velocidade = tier.speedBonus ?? 0;
  if (velocidade > 0) frases.push(`${Math.round(velocidade * 100)}% mais rápido`);
  if (velocidade < 0)
    frases.push(`${Math.round(Math.abs(velocidade) * 100)}% mais lento`);
  if (tier.payloadBonusKg) frases.push(`leva ${tier.payloadBonusKg} kg a mais`);
  if (tier.wearReduction)
    frases.push(`cansa ${Math.round(tier.wearReduction * 100)}% menos`);
  if (tier.controlBonus) frases.push("mais firme na curva");
  if (tier.maintenanceDiscount) frases.push("conserto mais barato");
  if (tier.operatingCostReduction) frases.push("custa menos para rodar");
  return frases;
}

/** O nome do que esta montado agora. Sem nivel, e o que veio de fabrica. */
export function oQueEstaMontado(
  peca: BikePartConfig,
  nivel: number
): string {
  const atual = peca.tiers.find(t => t.level === Math.floor(nivel));
  return atual?.name ?? "De fábrica";
}
