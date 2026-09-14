/**
 * A FICHA DO ENTREGADOR — as caixas, e o que cada peca muda em palavras.
 *
 * O que estes testes protegem: que as caixas nao percam nem repitam peca (uma
 * peca fora de qualquer caixa fica invisivel no jogo, e ninguem descobre por
 * olhar a tela), e que a frase de efeito continue saindo do numero real — e
 * nao de um texto escrito a mao que envelhece quando o numero muda.
 */
import { describe, expect, it } from "vitest";

import {
  BIKE_PARTS,
  EMPTY_BIKE_PART_LEVELS,
  MAX_BIKE_PART_LEVEL,
  type BikePartLevels,
} from "@/game/asPecasDaBicicleta";
import {
  CAIXAS_DA_FICHA,
  caixaDaFicha,
  faltaNaCaixa,
  oQueEstaMontado,
  oQueMuda,
  pecasDaCaixa,
  quantoDaCaixa,
} from "@/game/xbwapp/aFicha";

const cheio: BikePartLevels = {
  tire: MAX_BIKE_PART_LEVEL,
  cargo: MAX_BIKE_PART_LEVEL,
  chain: MAX_BIKE_PART_LEVEL,
  brake: MAX_BIKE_PART_LEVEL,
  wheels: MAX_BIKE_PART_LEVEL,
};

describe("as caixas da ficha", () => {
  it("cobrem todas as pecas da bicicleta, sem sobrar nenhuma", () => {
    const nasCaixas = CAIXAS_DA_FICHA.flatMap(c => c.pecas);
    expect([...nasCaixas].sort()).toEqual(BIKE_PARTS.map(p => p.id).sort());
  });

  it("nao poem a mesma peca em duas caixas", () => {
    const nasCaixas = CAIXAS_DA_FICHA.flatMap(c => c.pecas);
    expect(new Set(nasCaixas).size).toBe(nasCaixas.length);
  });

  it("separa o bau das outras quatro, porque ele troca volume por velocidade", () => {
    expect(pecasDaCaixa("mochila").map(p => p.id)).toEqual(["cargo"]);
    expect(pecasDaCaixa("bicicleta")).toHaveLength(4);
  });

  it("acessorios nao tem peca de bicicleta: o que mora la e do corpo", () => {
    expect(caixaDaFicha("acessorios").pecas).toHaveLength(0);
    expect(caixaDaFicha("acessorios").acessorios).toEqual([
      "agua",
      "sol",
      "carga",
    ]);
  });

  it("nenhuma caixa ficou vazia — toda caixa na tela abre em alguma coisa", () => {
    for (const c of CAIXAS_DA_FICHA) {
      expect(
        c.pecas.length + c.acessorios.length,
        `a caixa ${c.nome} nao abre em nada`
      ).toBeGreaterThan(0);
    }
  });
});

describe("quanto de cada caixa ja foi feito", () => {
  it("comeca em zero e termina em um", () => {
    expect(quantoDaCaixa("bicicleta", EMPTY_BIKE_PART_LEVELS)).toBe(0);
    expect(quantoDaCaixa("bicicleta", cheio)).toBe(1);
  });

  it("os acessorios contam pelo teto deles, e nao pelo da bicicleta", () => {
    /* Sem acessorio nenhum, a caixa esta em zero mesmo com a bike no maximo. */
    expect(quantoDaCaixa("acessorios", cheio)).toBe(0);
    expect(
      quantoDaCaixa("acessorios", cheio, { agua: 3, sol: 3, carga: 3 })
    ).toBe(1);
    expect(
      quantoDaCaixa("acessorios", cheio, { agua: 3, sol: 0, carga: 0 })
    ).toBeCloseTo(1 / 3, 5);
  });

  it("conta quantas pecas ainda dao para subir", () => {
    expect(faltaNaCaixa("bicicleta", EMPTY_BIKE_PART_LEVELS)).toBe(4);
    expect(faltaNaCaixa("bicicleta", cheio)).toBe(0);
    expect(faltaNaCaixa("mochila", { ...EMPTY_BIKE_PART_LEVELS })).toBe(1);
    expect(
      faltaNaCaixa("acessorios", cheio, { agua: 3, sol: 1, carga: 0 })
    ).toBe(2);
  });
});

describe("o que a peca muda, em palavras", () => {
  it("diz mais rapido quando o numero sobe", () => {
    expect(oQueMuda({ level: 1, name: "x", cost: 1, speedBonus: 0.1 })).toContain(
      "10% mais rápido"
    );
  });

  it("diz mais LENTO quando o numero desce — o bau pesa, e a tela avisa", () => {
    expect(
      oQueMuda({ level: 1, name: "x", cost: 1, speedBonus: -0.05 })
    ).toContain("5% mais lento");
  });

  it("traduz o desgaste para cansaco, que e a palavra dele", () => {
    expect(
      oQueMuda({ level: 1, name: "x", cost: 1, wearReduction: 0.16 })
    ).toContain("cansa 16% menos");
  });

  it("nao inventa frase quando a peca nao mexe em nada", () => {
    expect(oQueMuda({ level: 1, name: "x", cost: 1 })).toEqual([]);
  });

  it("a frase sai do numero de verdade da tabela", () => {
    const pneu = BIKE_PARTS.find(p => p.id === "tire")!;
    const primeiro = pneu.tiers[0]!;
    const frases = oQueMuda(primeiro);
    expect(frases[0]).toBe(
      `${Math.round((primeiro.speedBonus ?? 0) * 100)}% mais rápido`
    );
  });
});

describe("o que esta montado agora", () => {
  it("sem nivel, e o que veio de fabrica", () => {
    const pneu = BIKE_PARTS.find(p => p.id === "tire")!;
    expect(oQueEstaMontado(pneu, 0)).toBe("De fábrica");
  });

  it("com nivel, e o nome da peca daquele nivel", () => {
    const pneu = BIKE_PARTS.find(p => p.id === "tire")!;
    expect(oQueEstaMontado(pneu, 1)).toBe(pneu.tiers[0]!.name);
  });
});

/**
 * O NOME DA TELA NAO PODE JA SER DE OUTRA.
 *
 * Custou uma tela: `.xbw-ficha` ja era a etiqueta de categoria do Guia de
 * negocios, e o perfil do entregador nasceu com o mesmo nome — as duas telas
 * passariam a se pintar uma a outra, e nada no codigo diria isso em voz alta.
 *
 * A regra que este teste guarda e estreita de proposito: so vale para classe
 * que tem filhos com `__`, que e como uma tela inteira se chama por aqui.
 * Peca compartilhada (.xbw-topo, .xbw-botao) continua podendo aparecer em
 * quantas telas quiser — e para isso que ela existe.
 */
import { readFileSync, readdirSync } from "node:fs";

describe("cada tela tem um nome só dela", () => {
  it("nenhuma raiz de bloco aparece em duas telas diferentes", () => {
    const folha = readFileSync("client/src/styles/xbwapp.css", "utf8");
    const raizes = new Set(
      [...folha.matchAll(/\.(xbw-[a-z0-9-]+)__/g)].map(m => m[1]!)
    );

    const pasta = "client/src/components/xbwapp";
    const arquivos = readdirSync(pasta).filter(n => n.endsWith(".tsx"));
    const donos = new Map<string, string[]>();
    for (const arquivo of arquivos) {
      const texto = readFileSync(`${pasta}/${arquivo}`, "utf8");
      for (const raiz of raizes) {
        // A raiz sozinha, sem ser prefixo de outra e sem contar os filhos.
        if (new RegExp(`["'\\s]${raiz}(?![\\w-])`).test(texto)) {
          donos.set(raiz, [...(donos.get(raiz) ?? []), arquivo]);
        }
      }
    }

    /*
     * AS PECAS QUE SAO DE TODO MUNDO, DE PROPOSITO.
     *
     * Estas cinco nasceram para ser reaproveitadas: o cabecalho, a folha de
     * opcoes, o cartao, a caixa e o bloco de perfil aparecem em tela nenhuma
     * e em todas. Ficam listadas aqui, e nao escondidas numa regra esperta,
     * porque a lista E a documentacao: quem quiser somar uma tem que escrever
     * o nome dela e explicar para si mesmo por que.
     */
    const deTodoMundo = new Set([
      "xbw-topo",
      "xbw-folha",
      "xbw-cartao",
      "xbw-caixa",
      "xbw-perfil",
      /*
       * A TELA QUE AVISA QUE NAO TEM NADA — entrou na lista em 14/09/2026.
       *
       * Ela ja servia as abas guardadas ("Nenhum recibo disponivel ainda") e
       * passou a servir tambem os ajustes do entregador, que ele mandou abrir
       * vazios ate decidir o que mora la dentro. Sao a mesma coisa dita para
       * lugares diferentes: "existe, abre, e ainda nao tem conteudo".
       */
      "xbw-vazia",
    ]);

    const repetidas = [...donos.entries()].filter(
      ([raiz, quais]) => quais.length > 1 && !deTodoMundo.has(raiz)
    );
    expect(
      repetidas.map(([raiz, quais]) => `${raiz}: ${quais.join(", ")}`)
    ).toEqual([]);
  });
});
