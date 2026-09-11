import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BASE, CASAS, COMERCIOS } from "../../client/src/game/addresses";
import { rota } from "../../client/src/game/rotas";
import type { PontoNoMapa } from "../../client/src/game/streets";
import {
  DA_LORENA,
  DO_RENAN,
  MOLDES,
  confirmarTroca,
  desenhosAte,
  escolherRumo,
  fatiaDoAngulo,
  montarPassos,
  olhadaPara,
  proximoNoGiro,
  rumoSuavizado,
  virarPara,
  COSTURA_GRAUS,
  ESPERA_MS,
  FOLGA_GRAUS,
  PASSO_DO_GIRO_MS,
  type EscolhaDeRumo,
  type TrocaPendente,
} from "../../client/src/game/rumoDoEntregador";
import {
  CENAS_DA_LORENA,
  CENAS_DO_RENAN,
  geometriaDaCena,
} from "../../client/src/game/asCenasParadas";
import {
  DESENHOS_DE,
  LORENA,
  LORENA_JA_NA_EQUIPE,
  quemPedalaPeloNome,
} from "../../client/src/game/osQuePedalam";
import { CANDIDATOS, retratoDoCandidato } from "../../client/src/game/candidatos";
import { GAME_ASSETS } from "../../client/src/game/assets";
import { CampaignStore } from "../../client/src/game/GameState";
import { REPASSE } from "../../client/src/game/freight";

/*
 * A LORENA NO MAPA — 11/09/2026.
 *
 * Ordens dele: "esta sera nossa segunda integrante da equipe Lorena", "a Lorena
 * entre no lugar da menina de rabo de cavalo" e "por enquanto gere mesmo
 * formato de renan, devemos ter os dois na tela coletando e entregando".
 */

const ASSETS = "client/public/assets";
const JOGO = readFileSync("client/src/components/GameCanvas.tsx", "utf8");
const MAPA = readFileSync("client/src/components/MapaDoBairro.tsx", "utf8");
const COMPONENTE = readFileSync("client/src/components/Entregador.tsx", "utf8");

const DT = 1 / 60;

function todasAsRotas(): PontoNoMapa[][] {
  const saida: PontoNoMapa[][] = [];
  for (const destino of [...COMERCIOS, ...CASAS]) saida.push(rota(BASE.em, destino.em));
  for (let i = 0; i < COMERCIOS.length; i += 1)
    for (let j = 0; j < CASAS.length; j += 7)
      saida.push(rota(COMERCIOS[i]!.em, CASAS[j]!.em));
  return saida.filter(c => c.length > 1);
}

describe("a Lorena tem os desenhos dela", () => {
  it("cada rumo dela tem o arquivo dela, com o nome dela", () => {
    expect(DA_LORENA.moldes.length).toBeGreaterThanOrEqual(20);
    for (const nome of DA_LORENA.rumos)
      expect(existsSync(`${ASSETS}/XB_Lorena_pedalando1_${nome}.webp`)).toBe(true);
  });

  it("as oito cenas na porta sao dela, e o retrato tambem", () => {
    for (const pose of ["coletando", "entregando"])
      for (const lado of ["esquerda", "direita"])
        for (const tempo of [1, 2])
          expect(existsSync(`${ASSETS}/XB_Lorena_${pose}_${lado}_${tempo}.webp`)).toBe(true);
    expect(existsSync(`client/public${GAME_ASSETS.lorenaRetrato}`)).toBe(true);
  });

  it("os dois lados da folha (costas e frente) vieram das folhas dela", () => {
    const lados = new Set(DA_LORENA.moldes.map(m => m.lado));
    expect(lados.has("costas")).toBe(true);
    expect(lados.has("frente")).toBe(true);
  });

  it("as cenas dela tem as medidas dela, e nao as do Renan", () => {
    const dela = geometriaDaCena("coleta", "direita", 1, CENAS_DA_LORENA);
    const dele = geometriaDaCena("coleta", "direita", 1, CENAS_DO_RENAN);
    expect(dela).not.toEqual(dele);
    expect(dela.pousoX).toBeDefined();
  });
});

describe("o Renan nao mudou nada", () => {
  it("quem nao diz de quem e recebe os moldes do Renan", () => {
    expect(DO_RENAN.moldes).toBe(MOLDES);
    for (let g = 0; g < 360; g += 7)
      expect(fatiaDoAngulo(g)).toBe(fatiaDoAngulo(g, undefined, DO_RENAN));
    expect(DESENHOS_DE.renan.prefixo).toBe("XB_Entregador");
  });
});

describe("a regra do giro vale para ela tambem", () => {
  it(
    "na velocidade do balcao, a tela dela nunca pula mais de um desenho",
    () => {
      const c = DA_LORENA;
      const rapido = 50;
      let pulos = 0;
      let passosDeGiro = 0;
      for (const caminho of todasAsRotas()) {
        const passos = montarPassos(caminho);
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
            const proposta = escolherRumo(
              escolha,
              rumo,
              ms,
              FOLGA_GRAUS,
              ESPERA_MS,
              COSTURA_GRAUS,
              c
            );
            if (escolha) {
              const d = confirmarTroca(escolha, proposta, pendente, ms);
              pendente = d.pendente;
              escolha = d.escolha;
            } else escolha = proposta;
            if (tela === null) {
              tela = escolha.fatia;
              telaEm = ms;
            } else if (tela !== escolha.fatia && ms - telaEm >= PASSO_DO_GIRO_MS) {
              const prox = proximoNoGiro(tela, escolha.fatia, c);
              if (Math.abs(desenhosAte(tela, prox, c)) > 1) pulos += 1;
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
      expect(passosDeGiro).toBeGreaterThan(100);
    },
    60_000
  );
});

describe("ela esta na equipe, no lugar da menina de rabo de cavalo", () => {
  it("e a segunda da lista do bairro, sem veiculo proprio, com o retrato dela", () => {
    expect(CANDIDATOS[1]!.id).toBe(LORENA.id);
    expect(CANDIDATOS[1]!.nome).toBe("Lorena");
    /*
     * Ordem dele, 11/09/2026: "bicicleta e minha ainda, todos entregadores
     * entraram com veiculos meus no inicio". Ela nao traz bicicleta nenhuma.
     */
    expect(CANDIDATOS[1]!.veiculoProprio).toBe(false);
    expect(CANDIDATOS.some(c => c.nome === "Marlene")).toBe(false);
    expect(retratoDoCandidato(LORENA.id)).toBe(GAME_ASSETS.lorenaRetrato);
  });

  it("entra sem preco, com uma bicicleta da XB, e uma vez so", () => {
    const store = new CampaignStore();
    store.entregarAPrimeiraBike("Renan", "renan");
    const antes = store.value.credits;
    const r = store.chegarNaEquipe(LORENA.id);
    expect(r.ok).toBe(true);
    expect(store.value.credits).toBe(antes);
    const ela = store.value.hiredCouriers.find(c => c.candidatoId === LORENA.id);
    expect(ela?.name).toBe("Lorena");
    /*
     * FROTISTA como o Renan: a bicicleta e da empresa, entao ela leva a fatia
     * de quem dirige veiculo da XB e a XB paga a rodagem.
     */
    expect(ela?.veiculoProprio).toBe(false);
    expect(ela?.wageRate).toBe(REPASSE.transportadora);
    // a bicicleta dela E da garagem da XB: a empresa passa a ter duas
    expect(store.value.vehicleFleet.bike).toBe(2);
    expect(ela?.vehicleUnitId).toBe("bike-2");
    expect(store.chegarNaEquipe(LORENA.id).ok).toBe(false);
    expect(store.value.hiredCouriers).toHaveLength(2);
  });

  it("por enquanto ela ja comeca na equipe, e isso e um interruptor", () => {
    expect(LORENA_JA_NA_EQUIPE).toBe(true);
    expect(JOGO).toContain("handleRef.current?.chegarNaEquipe(LORENA.id)");
  });
});

describe("os dois na tela, coletando e entregando", () => {
  it("o mapa desenha mais de um entregador, cada um com os desenhos dele", () => {
    expect(MAPA).toContain("outrosEntregadores.map(");
    expect(MAPA).toContain("quem={o.quem}");
    expect(COMPONENTE).toContain("data-quem={quem}");
    expect(JOGO).toContain('quem: "lorena"');
  });

  it("cada um segue a rota dele — o Renan nao segue a rota de quem tem desenho", () => {
    expect(quemPedalaPeloNome("Renan")).toBe("renan");
    expect(quemPedalaPeloNome("Lorena")).toBe("lorena");
    expect(quemPedalaPeloNome("Operador XB 03")).toBeNull();
    expect(JOGO).toContain("quemPedalaPeloNome(r.nome) === null");
    expect(JOGO).toContain("rotaDe(estadoDoApp, LORENA.nome)");
  });

  it("os pinos dos dois vao para o mapa, sem repetir o mesmo lugar", () => {
    expect(JOGO).toContain("paradas={pinosNoMapa}");
  });

  it("na mesma porta, ela fica ao lado dele — e desliza, nao pula", () => {
    // medido na bancada: coletando na mesma loja, os dois ficavam a 16 px
    expect(JOGO).toContain("aoLado: lorenaAoLado");
    expect(MAPA).toContain("aoLado={o.aoLado}");
    const CSS = readFileSync("client/src/index.css", "utf8");
    expect(CSS).toContain("translate: var(--ao-lado-x, 0%) var(--ao-lado-y, 0%);");
    expect(CSS).toContain("transition: translate 0.45s ease-out;");
  });
});
