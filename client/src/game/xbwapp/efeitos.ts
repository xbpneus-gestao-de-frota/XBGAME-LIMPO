/**
 * O QUE A CONVERSA MEXE NO JOGO — e o unico lugar onde esses numeros moram.
 *
 * Ele escolheu "mexe em tudo": prazo, pagamento, gorjeta e reputacao saem da
 * conversa. Isso e potente e e perigoso pelo mesmo motivo — se cada tela puder
 * dar cinco minutos aqui e dois reais ali, ninguem mais consegue dizer quanto
 * vale falar bem com o cliente, e o jogo desanda sem que se saiba onde.
 *
 * Entao vale a mesma regra que ja vale para o prazo das entregas: TODO NUMERO
 * DE EQUILIBRIO MORA AQUI, marcado como decisao dele. As telas leem; nao
 * inventam.
 *
 * ── OS TETOS EXISTEM PARA A CONVERSA NAO VIRAR O JOGO ─────────────────────
 *
 * Sem teto, a pessoa descobre que conversar bem paga mais do que pedalar bem, e
 * a partir dai o jogo de entrega vira um jogo de escolher frases. Os tetos
 * dizem: a conversa AJUDA, ate certo ponto. O trabalho continua sendo o
 * trabalho.
 */
import type { Efeito } from "./tipos";

/** DECISAO DELE: o quanto uma conversa inteira pode esticar o prazo, em minutos. */
export const TETO_DE_PRAZO_MIN = 8;

/** DECISAO DELE: o quanto uma conversa pode apertar o prazo, em minutos. */
export const PISO_DE_PRAZO_MIN = -6;

/** DECISAO DELE: a maior gorjeta que uma entrega consegue juntar conversando. */
export const TETO_DE_GORJETA = 12;

/** DECISAO DELE: quantos pontos percentuais a conversa pode somar a fatia do entregador. */
export const TETO_DE_PARTE_DO_FRETE = 5;

/** DECISAO DELE: reputacao vai de 0 a 100 e comeca no meio. */
export const REPUTACAO_INICIAL = 50;
export const REPUTACAO_MAXIMA = 100;
export const REPUTACAO_MINIMA = 0;

/** O que uma entrega carrega de vantagem conquistada na conversa. */
export interface Acumulado {
  minutosDePrazo: number;
  gorjeta: number;
  parteDoFrete: number;
}

export const ACUMULADO_ZERADO: Acumulado = {
  minutosDePrazo: 0,
  gorjeta: 0,
  parteDoFrete: 0,
};

function entre(valor: number, minimo: number, maximo: number): number {
  return Math.max(minimo, Math.min(maximo, valor));
}

/**
 * Soma um efeito ao que ja foi conquistado, respeitando os tetos.
 *
 * Somar antes e cortar depois (e nao cortar cada parcela) e o que faz duas
 * respostas boas valerem menos que a soma delas — que e exatamente o freio
 * desejado: a segunda gentileza rende menos que a primeira.
 */
export function somarEfeito(
  atual: Acumulado,
  efeito: Efeito | undefined
): Acumulado {
  if (!efeito) return atual;
  return {
    minutosDePrazo: entre(
      atual.minutosDePrazo + (efeito.minutosDePrazo ?? 0),
      PISO_DE_PRAZO_MIN,
      TETO_DE_PRAZO_MIN
    ),
    gorjeta: entre(atual.gorjeta + (efeito.gorjeta ?? 0), 0, TETO_DE_GORJETA),
    parteDoFrete: entre(
      atual.parteDoFrete + (efeito.parteDoFrete ?? 0),
      0,
      TETO_DE_PARTE_DO_FRETE
    ),
  };
}

/** A reputacao nova depois de um efeito. Nunca sai da regua. */
export function somarReputacao(
  atual: number,
  efeito: Efeito | undefined
): number {
  return entre(
    atual + (efeito?.reputacao ?? 0),
    REPUTACAO_MINIMA,
    REPUTACAO_MAXIMA
  );
}

/**
 * COMO A REPUTACAO APARECE PARA A PESSOA.
 *
 * Numero cru nao diz nada — "62 de reputacao" nao muda decisao nenhuma. A
 * palavra muda: quem esta em "de confianca" entende por que a loja ofereceu a
 * corrida boa primeiro.
 */
export function comoEstaAReputacao(pontos: number): string {
  if (pontos >= 85) return "de confiança";
  if (pontos >= 65) return "bem falado";
  if (pontos >= 40) return "normal";
  if (pontos >= 20) return "em observação";
  return "queimado";
}
