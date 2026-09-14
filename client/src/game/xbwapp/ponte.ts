/**
 * A PONTE — o unico lugar onde o aplicativo encosta no jogo.
 *
 * Ordem dele, 07/09/2026: "sua funcao e apenas criar esse app para acoplamento
 * ao game (...) eu irei decidir como ele vai funcionar depois".
 *
 * ── POR QUE UMA PONTE, E NAO IMPORTAR O JOGO DIRETO ───────────────────────
 *
 * Um aplicativo que importa o jogo em dez arquivos nao e um aplicativo: e um
 * pedaco do jogo com cara de aplicativo. Ele nao abre sozinho, nao da para
 * testar sem montar o bairro inteiro, e mudar uma regra do jogo quebra uma
 * tela de conversa — o que nao faz sentido nenhum para quem olha de fora.
 *
 * Entao o aplicativo NAO CONHECE o jogo. Ele conhece esta ponte: quatro
 * perguntas que alguem de fora responde. Quando o jogo esta acoplado, quem
 * responde e o jogo. Quando nao esta, respondem as respostas de casa aqui
 * embaixo — e o aplicativo abre e funciona igual, so que sem bairro.
 *
 * ── O QUE ATRAVESSA A PONTE, E EM QUE SENTIDO ─────────────────────────────
 *
 * DO JOGO PARA O APLICATIVO: que horas sao no jogo, quanto e a distancia entre
 * dois lugares, quem e o jogador.
 *
 * DO APLICATIVO PARA O JOGO: avisos do que aconteceu — aceitou uma coleta,
 * recusou, o prazo mudou, a gorjeta subiu. O aplicativo ANUNCIA; quem decide o
 * que fazer com isso e o jogo. Se ninguem estiver ouvindo, nada acontece e
 * nada quebra.
 *
 * Ele decide depois como cada aviso vira coisa no jogo. Esta ponte existe para
 * que essa decisao seja UMA mudanca, num arquivo, e nao uma caçada.
 */
import type { BikePartId, BikePartLevels } from "../asPecasDaBicicleta";
import { EMPTY_BIKE_PART_LEVELS } from "../asPecasDaBicicleta";
import type { IdDoAcessorio, NiveisDosAcessorios } from "../osAcessorios";
import { ACESSORIOS_ZERADOS } from "../osAcessorios";
import type { Efeito, IdContato } from "./tipos";

/** O que o jogo responde quando esta acoplado. */
export interface Ponte {
  /** Que horas sao no jogo, em minutos do dia. */
  minutoDoDia(): number;
  /**
   * GRAVA O JOGO AGORA.
   *
   * Existe por causa do descanso do celular: quando a bateria acaba, o jogo
   * para de fora para dentro, e parar sem gravar seria tirar do jogador uma
   * entrega que ele ja fez. Sem jogo acoplado nao ha o que gravar, e a
   * resposta de casa nao faz nada — que e a resposta honesta.
   */
  salvarTudo(): void;
  /** A distancia em quilometros da base ate a loja e da loja ate a casa. */
  kmDaCorrida(loja: IdContato, cliente: IdContato): number;
  /** So o trecho da entrega, que e o que o cliente ve. */
  kmDaEntrega(loja: IdContato, cliente: IdContato): number;
  /** O prazo honesto daquela corrida, em minutos. */
  prazoEmMinutos(loja: IdContato, cliente: IdContato): number;
  /**
   * Quanto o cliente paga por esta corrida, em reais.
   *
   * A quinta pergunta. Entrou com o balcao de Entrega Rapida: a tela precisa
   * mostrar quanto vale cada pedido ANTES de alguem aceitar, e o preco nao
   * pode ser inventado pelo aplicativo — ele sai da mesma tabela de frete que
   * paga todo o resto do jogo, com as fontes anotadas.
   */
  freteDaCorrida(km: number, volumes: number): number;
  /** Quem o jogador e: o nome e o retrato escolhidos no portao. */
  jogador(): { nome: string; foto?: string };
  /**
   * Quanto ha no caixa da empresa, em reais.
   *
   * A ficha do entregador precisa disto por um motivo so: um botao de comprar
   * que nao sabe se da para comprar mente duas vezes — deixa apertar o que
   * nao da, e esconde o que da. Com o valor na mao, a ficha mostra o preco e
   * apaga o botao quando falta dinheiro, sem nunca decidir a compra.
   */
  dinheiro(): number;
  /** Em que nivel a empresa esta. E o que libera cada peca. */
  nivelDaEmpresa(): number;
  /** Em que nivel esta cada peca da bicicleta, de zero a cinco. */
  pecasDaBicicleta(): BikePartLevels;
  /**
   * Em que nivel esta cada acessorio, de zero a tres.
   *
   * O folego pergunta isto a cada segundo de rota: e o protetor solar e o
   * cinto que decidem quanto o meio-dia e a bolsa cheia pesam agora.
   */
  acessorios(): NiveisDosAcessorios;
  /** O aplicativo avisa que alguma coisa aconteceu. */
  aconteceu(aviso: Aviso): void;
}

/** Tudo que o aplicativo tem a dizer para o jogo. */
export type Aviso =
  | { o: "coleta-aceita"; conversa: IdContato; pedido?: string }
  | { o: "coleta-recusada"; conversa: IdContato; pedido?: string }
  | { o: "pedido-fechado"; pedido: string; loja: IdContato; cliente: IdContato }
  | { o: "efeito"; conversa: IdContato; efeito: Efeito }
  | {
      o: "chamada";
      contato: IdContato;
      tipo: "voz" | "video";
      segundos: number;
    }
  | { o: "abriu-o-mapa" }
  /*
   * MELHORAR UMA PECA. O aplicativo NAO compra: ele avisa qual peca a pessoa
   * escolheu. Quem tira o dinheiro do caixa, confere o nivel e sobe a peca e
   * o jogo — que ja fazia isso pela garagem, com as mesmas regras.
   */
  | { o: "melhorar-peca"; peca: BikePartId }
  | { o: "melhorar-acessorio"; acessorio: IdDoAcessorio };

/**
 * AS RESPOSTAS DE CASA.
 *
 * Sao o que o aplicativo usa quando ninguem acoplou nada. Elas nao inventam
 * bairro: a distancia e zero, e distancia zero faz o frete cair para a parte
 * fixa — que e uma resposta honesta ("nao sei") e nao um numero bonito.
 *
 * O relogio anda de verdade, porque conversa sem hora fica estranha; ele
 * comeca as nove da manha, que e a hora em que o jogo comeca.
 */
const COMECO_DO_DIA = 9 * 60;
let relogioDeCasa = COMECO_DO_DIA;

export const PONTE_DE_CASA: Ponte = {
  minutoDoDia: () => relogioDeCasa,
  kmDaCorrida: () => 0,
  kmDaEntrega: () => 0,
  prazoEmMinutos: () => 20,
  freteDaCorrida: () => 0,
  jogador: () => ({ nome: "Entregador" }),
  /*
   * Sem jogo acoplado nao ha caixa: zero. E uma resposta honesta — a ficha
   * mostra as pecas e os precos, e nenhum botao de comprar fica aceso.
   */
  dinheiro: () => 0,
  nivelDaEmpresa: () => 1,
  pecasDaBicicleta: () => EMPTY_BIKE_PART_LEVELS,
  acessorios: () => ACESSORIOS_ZERADOS,
  salvarTudo: () => {},
  aconteceu: () => {},
};

let atual: Ponte = PONTE_DE_CASA;

/** O jogo acopla a ponte dele. Chamar de novo troca; chamar com nada solta. */
export function acoplar(ponte: Partial<Ponte> | null): void {
  atual = ponte ? { ...PONTE_DE_CASA, ...ponte } : PONTE_DE_CASA;
}

/** A ponte em uso agora. */
export function ponte(): Ponte {
  return atual;
}

/** Anda o relogio de casa. So serve enquanto o jogo nao acoplou o dele. */
export function andarRelogioDeCasa(minutos: number): void {
  relogioDeCasa += minutos;
}

/** Volta tudo ao começo. Os testes usam para nao dependerem uns dos outros. */
export function soltarAPonte(): void {
  atual = PONTE_DE_CASA;
  relogioDeCasa = COMECO_DO_DIA;
}
