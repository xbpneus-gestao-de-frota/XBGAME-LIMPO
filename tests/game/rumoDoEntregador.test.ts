import { describe, expect, it } from "vitest";
import { BASE, CASAS, COMERCIOS } from "../../client/src/game/addresses";
import { rota } from "../../client/src/game/rotas";
import { METROS_POR_SEGUNDO, RELOGIO_DO_MAPA } from "../../client/src/game/pedalada";
import type { PontoNoMapa } from "../../client/src/game/streets";
import {
  ESPERA_MS,
  GIRO_MAXIMO_POR_SEGUNDO,
  VOLTA_MINIMA_MS,
  confirmarTroca,
  olhadaPara,
  type TrocaPendente,
  OLHADA_METROS,
  MOLDES,
  COSTURA_GRAUS,
  PASSO_DO_GIRO_MS,
  desenhosAte,
  ficarDoMesmoLado,
  proximoNoGiro,
  diferencaDeAngulo,
  escolherRumo,
  montarPassos,
  rumoSuavizado,
  virarPara,
  type EscolhaDeRumo,
} from "../../client/src/game/rumoDoEntregador";

/*
 * O DEFEITO QUE ESTE ARQUIVO IMPEDE DE VOLTAR.
 *
 * "Temos muito lag, e mudanca de tela para jogador, mudancas em milesimos de
 * segundos sendo a mesma direcao." O tracado real das ruas tem trechos de 24
 * centimetros; a 10,8 m/s isso e um quadro. Lendo o rumo do trecho de baixo do
 * pe, o desenho ia e voltava de um quadro para o outro.
 *
 * Estes testes NAO conferem uma rota escolhida a dedo: eles andam o bairro
 * inteiro — da base a cada um dos 67 enderecos, e uma amostra de comercio para
 * casa, que e a rota de verdade do jogo — e medem quadro a quadro o que o
 * jogador veria.
 */

const VELOCIDADE = METROS_POR_SEGUNDO * RELOGIO_DO_MAPA;
const QUADROS_POR_SEGUNDO = 60;
const DT = 1 / QUADROS_POR_SEGUNDO;

interface Medida {
  nome: string;
  segundos: number;
  trocas: number;
  menorIntervaloMs: number | null;
  /** O giro mais violento do rumo nesta rota, em graus por segundo. */
  piorGiro: number;
  /** Trocas que voltaram para o desenho de antes em menos da volta minima. */
  idasEVoltas: number;
}

function andar(nome: string, caminho: readonly PontoNoMapa[]): Medida | null {
  const passos = montarPassos(caminho);
  const total = passos[passos.length - 1]?.ate ?? 0;
  if (total <= 0 || passos.length < 2) return null;

  let andado = 0;
  let quadros = 0;
  let escolha: EscolhaDeRumo | null = null;
  let trocas = 0;
  let ultimaTrocaMs: number | null = null;
  let menor: number | null = null;
  let rumo: number | null = null;
  let anterior: number | null = null;
  let piorGiro = 0;
  let idasEVoltas = 0;
  let penultima: { fatia: number; ms: number } | null = null;

  while (andado < total) {
    const ms = quadros * DT * 1000;
    const alvo = rumoSuavizado(passos, andado, OLHADA_METROS);
    if (alvo !== null) {
      rumo = virarPara(rumo, alvo, DT);
      if (anterior !== null) {
        piorGiro = Math.max(piorGiro, Math.abs(diferencaDeAngulo(rumo, anterior)) / DT);
      }
      anterior = rumo;
      const graus = rumo;
      const nova = escolherRumo(escolha, graus, ms);
      if (escolha && nova !== escolha) {
        trocas += 1;
        if (
          penultima &&
          nova.fatia === penultima.fatia &&
          ultimaTrocaMs !== null &&
          ms - ultimaTrocaMs < VOLTA_MINIMA_MS
        )
          idasEVoltas += 1;
        penultima = { fatia: escolha.fatia, ms };
        if (ultimaTrocaMs !== null) {
          const intervalo = ms - ultimaTrocaMs;
          menor = menor === null ? intervalo : Math.min(menor, intervalo);
        }
        ultimaTrocaMs = ms;
      }
      escolha = nova;
    }
    andado += VELOCIDADE * DT;
    quadros += 1;
  }
  return {
    nome,
    segundos: quadros * DT,
    trocas,
    menorIntervaloMs: menor,
    piorGiro,
    idasEVoltas,
  };
}

/** Todas as rotas do bairro: da base a cada porta, e comercio -> casa. */
function todasAsRotas(): { nome: string; caminho: PontoNoMapa[] }[] {
  const saida: { nome: string; caminho: PontoNoMapa[] }[] = [];
  for (const destino of [...COMERCIOS, ...CASAS]) {
    saida.push({
      nome: `base -> ${destino.nome}`,
      caminho: rota(BASE.em, destino.em),
    });
  }
  for (let i = 0; i < COMERCIOS.length; i += 1) {
    for (let j = 0; j < CASAS.length; j += 7) {
      saida.push({
        nome: `${COMERCIOS[i]!.nome} -> ${CASAS[j]!.nome}`,
        caminho: rota(COMERCIOS[i]!.em, CASAS[j]!.em),
      });
    }
  }
  return saida;
}

describe("o rumo do entregador, medido no bairro inteiro", () => {
  const medidas = todasAsRotas()
    .map(r => andar(r.nome, r.caminho))
    .filter((m): m is Medida => m !== null);

  it("anda o bairro inteiro, e nao uma rota escolhida a dedo", () => {
    expect(medidas.length).toBeGreaterThan(150);
    expect(medidas.reduce((a, m) => a + m.segundos, 0)).toBeGreaterThan(1000);
  });

  /*
   * O TESTE QUE GUARDA O DEFEITO. Sem os freios, a menor distancia entre duas
   * trocas era 17 milissegundos — um quadro. Aqui nenhuma rota do bairro pode
   * trocar duas vezes mais rapido do que a espera minima.
   */
  it("nunca troca de desenho duas vezes dentro da espera minima", () => {
    const apertadas = medidas.filter(
      m => m.menorIntervaloMs !== null && m.menorIntervaloMs < ESPERA_MS
    );
    expect(
      apertadas.map(m => `${m.nome}: ${Math.round(m.menorIntervaloMs!)} ms`)
    ).toEqual([]);
  });

  /*
   * E O RITMO GERAL FICA CIVILIZADO — mas o teto subiu, e de proposito.
   *
   * Com a regra antiga eram 0,50 trocas por segundo no bairro todo; com os
   * freios, 0,25, com OITO desenhos.
   *
   * Em 06/09/2026 os desenhos passaram de oito para dezessete, e o ritmo subiu
   * para 0,46 — quase o dobro. Isso NAO e regressao: e o preco, e ele estava
   * na conta. Mais desenhos querem dizer mais divisas para cruzar; o que eles
   * compram e o TAMANHO da troca. Medido nas mesmas 67 rotas, o desenho passou
   * a errar 5,1 graus na media em vez de 12,0, e parou de passar de 25 graus —
   * antes passava em meio por cento do tempo.
   *
   * Uma troca pequena e frequente le melhor que uma grande e rara, ainda mais
   * com o cruzamento de 160 ms que faz uma virar a outra em vez de cortar.
   *
   * O teto continua existindo para pegar REGRESSAO GRANDE — um freio que
   * parou de frear —, e nao para brigar com decimo. Com vinte e quatro
   * desenhos a conta chega perto de 0,72, e ai este numero sobe de novo.
   */
  it("nao troca de desenho mais de uma vez por segundo", () => {
    const segundos = medidas.reduce((a, m) => a + m.segundos, 0);
    const trocas = medidas.reduce((a, m) => a + m.trocas, 0);
    expect(trocas / segundos).toBeLessThan(1);
  });

  /*
   * O GUIDAO TEM LIMITE, E ISSO E O QUE MATA O TREMOR.
   *
   * Antes desta trava, medindo o bairro inteiro, o rumo chegava a girar NOVE
   * MIL graus por segundo em 21 lugares — sempre em curva fechada, onde a corda
   * que da o rumo encolhe e vira ruido. Ninguem gira assim, e o olho le como
   * tremor. Agora o rumo mostrado persegue o do caminho sem nunca passar do
   * limite, e isso vale por construcao em qualquer tracado.
   */
  it("o rumo nunca gira mais rapido que um menino de bicicleta", () => {
    const violentas = medidas.filter(
      m => m.piorGiro > GIRO_MAXIMO_POR_SEGUNDO + 1
    );
    expect(
      violentas.map(m => `${m.nome}: ${Math.round(m.piorGiro)} gr/s`)
    ).toEqual([]);
  });

  /*
   * IR E VOLTAR NAO E VIRAR — E PISCAR.
   *
   * Medido no jogo montado em 10/09/2026: dez idas-e-voltas em setenta e cinco
   * segundos (de um desenho para o vizinho e de volta em menos de seis decimos
   * de segundo), com trinta desenhos isso tende a crescer. Aqui, no bairro
   * inteiro, nenhuma.
   */
  it("nao volta para o desenho de onde acabou de sair", () => {
    const comVolta = medidas.filter(m => m.idasEVoltas > 0);
    expect(comVolta.map(m => `${m.nome}: ${m.idasEVoltas}`)).toEqual([]);
  });

  /*
   * ANDAR EM LINHA RETA NAO TROCA NADA. E o caso que ele descreveu com todas
   * as letras: "sendo a mesma direcao".
   */
  it("em linha reta o desenho nao troca nenhuma vez", () => {
    const reta: PontoNoMapa[] = [
      [20, 50],
      [30, 50],
      [45, 50],
      [70, 50],
    ];
    const m = andar("reta", reta);
    expect(m?.trocas).toBe(0);
  });

  /*
   * E UM TREMIDO DE MEIO GRAU EM CIMA DA DIVISA TAMBEM NAO. E o tremido do
   * proprio tracado do bairro, que era o que fazia o desenho piscar.
   */
  it("tremido em cima da divisa das fatias nao faz o desenho piscar", () => {
    const tremido: PontoNoMapa[] = [];
    for (let i = 0; i < 400; i += 1) {
      tremido.push([20 + i * 0.15, 50 + (i % 2 === 0 ? 0.02 : -0.02)]);
    }
    const m = andar("tremido", tremido);
    expect(m?.trocas).toBe(0);
  });

  /*
   * NA VELOCIDADE DO BALCAO — cinquenta metros de mapa por segundo.
   *
   * Os freios acima foram afinados no passo antigo (uns onze metros por
   * segundo). Com o balcao mandando ele anda quatro vezes e meia mais rapido, e
   * cada entortadinha do tracado virava troca. Aqui o bairro inteiro e
   * percorrido nesse passo, com e sem a confirmacao: ela tem de cortar as
   * idas-e-voltas (de um desenho ao vizinho e de volta em menos de um segundo)
   * a menos de um terco.
   */
  it(
    "na velocidade do balcao, a confirmacao corta as idas-e-voltas",
    () => {
      const rapido = 50;
      const voltas = (confirmar: boolean) => {
        let total = 0;
        for (const r of todasAsRotas()) {
          const passos = montarPassos(r.caminho);
          const fim = passos[passos.length - 1]?.ate ?? 0;
          let andado = 0;
          let q = 0;
          let escolha: EscolhaDeRumo | null = null;
          let pendente: TrocaPendente | null = null;
          let rumo: number | null = null;
          const trocas: { f: number; ms: number }[] = [];
          while (andado < fim) {
            const ms = q * DT * 1000;
            const alvo = rumoSuavizado(
              passos,
              andado,
              confirmar ? olhadaPara(rapido) : OLHADA_METROS
            );
            if (alvo !== null) {
              rumo = virarPara(rumo, alvo, DT);
              const proposta = escolherRumo(escolha, rumo, ms);
              let nova = proposta;
              if (escolha && confirmar) {
                const d = confirmarTroca(escolha, proposta, pendente, ms);
                pendente = d.pendente;
                nova = d.escolha;
              }
              if (escolha && nova.fatia !== escolha.fatia) {
                const n = trocas.length;
                if (
                  n >= 2 &&
                  nova.fatia === trocas[n - 2]!.f &&
                  ms - trocas[n - 1]!.ms < 1000
                )
                  total += 1;
                trocas.push({ f: nova.fatia, ms });
              } else if (!escolha) trocas.push({ f: nova.fatia, ms });
              escolha = nova;
            }
            andado += rapido * DT;
            q += 1;
          }
        }
        return total;
      };
      const sem = voltas(false);
      const com = voltas(true);
      expect(sem).toBeGreaterThan(0);
      expect(com / sem).toBeLessThan(1 / 3);
    },
    60_000
  );

  it("a troca proposta so vale se continuar a melhor pelo tempo de confirmar", () => {
    const atual: EscolhaDeRumo = { fatia: 3, trocadoEmMs: 0 };
    const proposta: EscolhaDeRumo = { fatia: 4, trocadoEmMs: 500, vinhaDe: 3 };
    const a = confirmarTroca(atual, proposta, null, 500);
    expect(a.escolha).toBe(atual);
    expect(a.pendente).toEqual({ fatia: 4, desde: 500 });
    const b = confirmarTroca(atual, proposta, a.pendente, 550);
    expect(b.escolha).toBe(atual);
    const c = confirmarTroca(atual, proposta, b.pendente, 610);
    expect(c.escolha.fatia).toBe(4);
    expect(c.escolha.trocadoEmMs).toBe(610);
    expect(c.pendente).toBeNull();
    // se no meio o melhor volta a ser o atual, a espera recomeca
    const d = confirmarTroca(atual, atual, a.pendente, 560);
    expect(d.pendente).toBeNull();
    // e o olhar adiante cresce com a velocidade, sem passar de 25 m
    expect(olhadaPara(5)).toBe(OLHADA_METROS);
    expect(olhadaPara(50)).toBeCloseTo(15, 6);
    expect(olhadaPara(500)).toBe(25);
  });

  /*
   * 11/09/2026 — "APENAS UMA SITUACAO QUE DA PRA VER RENAN MUDANDO DE FORMA".
   *
   * Medido no PC dele: 19 de 67 trocas pulavam 45 graus ou mais — um desenho
   * de costas virando de frente de um quadro para o outro. O desenho escolhido
   * continua o mesmo; a TELA passa pelos do meio.
   */
  it("o giro passa pelos desenhos do meio, pelo lado mais curto", () => {
    const i = (nome: string) => MOLDES.findIndex(m => m.nome === nome);
    /*
     * QUANTOS DESENHOS HA NO CAMINHO — tirado da lista, nao escrito a mao.
     * Este numero era 2 ate 12/09/2026, quando o espelho de 05h00 entrou
     * justamente no meio deste trecho. Um desenho novo nao pode quebrar um
     * teste que fala de girar pelos do meio: o que importa e que o giro conte
     * os desenhos que existem, sejam quantos forem.
     */
    const entre = (de: string, ate: string) => {
      const volta = (MOLDES[i(de)]!.graus - MOLDES[i(ate)]!.graus + 360) % 360;
      return MOLDES.filter(m => {
        const d = (MOLDES[i(de)]!.graus - m.graus + 360) % 360;
        return d > 0 && d < volta;
      }).length;
    };
    expect(desenhosAte(i("04h14"), i("06h00"))).toBe(-(entre("04h14", "06h00") + 1));
    expect(MOLDES[proximoNoGiro(i("04h14"), i("06h00"))]!.nome).toBe("04h34");
    // vizinho com vizinho troca na hora — quem e o vizinho sai do relogio, e
    // nao de um nome escrito a mao (antes de 12/09/2026 era o 04h34; com o
    // espelho de 05h00 no meio, o vizinho de 06h00 passou a ser ele)
    const vizinhoAcima = (nome: string) => {
      const g = MOLDES[i(nome)]!.graus;
      let melhor = i(nome);
      let dist = 360;
      MOLDES.forEach((m, k) => {
        const d = (m.graus - g + 360) % 360;
        if (d > 0 && d < dist) {
          dist = d;
          melhor = k;
        }
      });
      return melhor;
    };
    expect(proximoNoGiro(vizinhoAcima("06h00"), i("06h00"))).toBe(i("06h00"));
    // atravessando o zero do relogio, vai pelo lado curto
    expect(desenhosAte(i("03h08"), i("02h27"))).toBe(2);
    expect(MOLDES[proximoNoGiro(i("03h08"), i("02h27"))]!.nome).toBe("02h59");
    // meia volta: nunca mais que metade do relogio
    for (let a = 0; a < MOLDES.length; a += 1)
      for (let b = 0; b < MOLDES.length; b += 1)
        expect(Math.abs(desenhosAte(a, b))).toBeLessThanOrEqual(MOLDES.length / 2);
  });

  it(
    "na velocidade do balcao, a tela nunca pula mais de um desenho",
    () => {
      const rapido = 50;
      let pulos = 0;
      let passosDeGiro = 0;
      for (const r of todasAsRotas()) {
        const passos = montarPassos(r.caminho);
        const fim = passos[passos.length - 1]?.ate ?? 0;
        let andado = 0;
        let q = 0;
        let escolha: EscolhaDeRumo | null = null;
        let pendente: TrocaPendente | null = null;
        let rumo: number | null = null;
        let tela: number | null = null;
        let telaEm = 0;
        while (andado < fim) {
          const ms = q * DT * 1000;
          const alvo = rumoSuavizado(passos, andado, olhadaPara(rapido));
          if (alvo !== null) {
            rumo = virarPara(rumo, alvo, DT);
            const proposta = escolherRumo(escolha, rumo, ms);
            if (escolha) {
              const d = confirmarTroca(escolha, proposta, pendente, ms);
              pendente = d.pendente;
              escolha = d.escolha;
            } else escolha = proposta;
            if (tela === null) {
              tela = escolha.fatia;
              telaEm = ms;
            } else if (tela !== escolha.fatia && ms - telaEm >= PASSO_DO_GIRO_MS) {
              const prox = proximoNoGiro(tela, escolha.fatia);
              if (Math.abs(desenhosAte(tela, prox)) > 1) pulos += 1;
              if (prox !== escolha.fatia) passosDeGiro += 1;
              tela = prox;
              telaEm = ms;
            }
          }
          andado += rapido * DT;
          q += 1;
        }
      }
      expect(pulos).toBe(0);
      // e o giro de fato acontece no bairro — nao e uma regra que nunca roda
      expect(passosDeGiro).toBeGreaterThan(100);
    },
    60_000
  );

  it("para virar do avesso (costas para frente) o outro lado tem de ganhar pela costura", () => {
    const i = (nome: string) => MOLDES.findIndex(m => m.nome === nome);
    expect(MOLDES[i("02h59")]!.lado).toBe("costas");
    expect(MOLDES[i("03h08")]!.lado).toBe("frente");
    // de costas, andando um pouco para perto da camera: continua de costas
    expect(ficarDoMesmoLado(i("02h59"), i("03h08"), 356)).toBe(i("02h59"));
    // quando a rua vira de verdade para perto da camera, vira de frente
    const longe = MOLDES[i("02h59")]!.graus - COSTURA_GRAUS - 10;
    expect(ficarDoMesmoLado(i("02h59"), i("03h42"), longe)).toBe(i("03h42"));
    // do mesmo lado, nada muda
    expect(ficarDoMesmoLado(i("02h27"), i("02h03"), 28)).toBe(i("02h03"));
  });
});
