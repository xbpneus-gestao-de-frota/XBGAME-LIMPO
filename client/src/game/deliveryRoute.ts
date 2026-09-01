/**
 * A entrega, desenhada em cima do circuito de verdade.
 *
 * O entregador sai da Base XB, para num comercio para coletar, e leva ate uma
 * residencia. Nada disto e escolhido no escuro: as distancias vem medidas do
 * proprio arquivo do mapa, entao mudar uma peca de lugar no Unreal muda o
 * percurso sozinho, sem ninguem reescrever numero nenhum.
 *
 * O modulo e puro de proposito — sem cena, sem Babylon. Assim a regra da
 * entrega pode ser conferida em teste, que e onde ela tem de reprovar.
 */
import type { LugarNaVolta } from "./CircuitTrack";

/**
 * Espaco minimo entre a coleta e a entrega. Abaixo disto o jogador nem termina
 * de sair do comercio e ja chegou: nao da tempo de nada acontecer.
 */
export const MINIMO_ATE_A_ENTREGA = 60;
/**
 * Teto do trecho de entrega. Sem ele o sorteio as vezes escolhia uma casa
 * quase uma volta inteira depois, e a corrida virava passeio.
 */
export const MAXIMO_ATE_A_ENTREGA = 420;

export interface Rota {
  origem: LugarNaVolta;
  coleta: LugarNaVolta;
  entrega: LugarNaVolta;
  /** Da origem ate a coleta, andando no sentido da volta. */
  ateColeta: number;
  /** Da coleta ate a entrega. */
  ateEntrega: number;
  /** Percurso inteiro, em unidades do jogo. */
  total: number;
}

/** Quanto falta andar de `de` ate `para`, sempre para a frente na volta. */
export function distanciaAdiante(
  de: number,
  para: number,
  comprimento: number
): number {
  if (comprimento <= 0) return 0;
  let d = (para - de) % comprimento;
  if (d < 0) d += comprimento;
  return d;
}

/**
 * Monta uma entrega. `sorteio` devolve de 0 a 1 e vem de fora para o teste
 * poder fixar o resultado — sorteio dentro da funcao e regra que ninguem
 * consegue conferir.
 */
export function montarRota(
  lugares: readonly LugarNaVolta[],
  comprimento: number,
  sorteio: () => number
): Rota | null {
  const origem = lugares.find(lugar => lugar.papel === "base");
  const comercios = lugares.filter(lugar => lugar.papel === "comercio");
  const casas = lugares.filter(lugar => lugar.papel === "casa");
  if (!origem || comercios.length === 0 || casas.length === 0) return null;

  const coleta =
    comercios[Math.floor(sorteio() * comercios.length) % comercios.length]!;

  // So valem casas que ficam adiante da coleta, com espaco para a corrida
  // acontecer. A janela e medida no sentido da volta, entao uma casa "antes"
  // do comercio continua valendo: ela esta adiante, na volta seguinte.
  const candidatas = casas.filter(casa => {
    const d = distanciaAdiante(coleta.distancia, casa.distancia, comprimento);
    return d >= MINIMO_ATE_A_ENTREGA && d <= MAXIMO_ATE_A_ENTREGA;
  });
  const lista = candidatas.length > 0 ? candidatas : casas;
  const entrega = lista[Math.floor(sorteio() * lista.length) % lista.length]!;

  const ateColeta = distanciaAdiante(
    origem.distancia,
    coleta.distancia,
    comprimento
  );
  const ateEntrega = distanciaAdiante(
    coleta.distancia,
    entrega.distancia,
    comprimento
  );
  return {
    origem,
    coleta,
    entrega,
    ateColeta,
    ateEntrega,
    total: ateColeta + ateEntrega,
  };
}

/** Em qual etapa o jogador esta, dado quanto ja andou desde a origem. */
export type EtapaDaEntrega = "indo-coletar" | "indo-entregar" | "entregue";

export function etapaEm(rota: Rota, andado: number): EtapaDaEntrega {
  if (andado < rota.ateColeta) return "indo-coletar";
  if (andado < rota.total) return "indo-entregar";
  return "entregue";
}
