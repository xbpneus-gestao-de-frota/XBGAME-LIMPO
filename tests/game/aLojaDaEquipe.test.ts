/**
 * A LOJA DA EQUIPE.
 *
 * Ordem dele, 13/09/2026: "retirar pegar pedido daí (...) ao clicar em
 * bicicleta devemos ter duas caixas apenas loja, upgrade (...) nesta loja
 * teremos bicicleta, patins, triciclo, patinete, caiaque, skate, ao clicar em
 * cada item abrir telas ainda vazias mas com veículos do nv 1 ao 5 (...) todas
 * telas devem ter rolagem se necessário".
 *
 * O que estes testes guardam: a prateleira certa, a escada igual para todos, e
 * a honestidade de uma tela que ainda não tem preço nenhum.
 */
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  AINDA_SEM_PRECO,
  DEGRAUS_POR_ITEM,
  LOJA_DA_EQUIPE,
  itemDaLoja,
} from "@/game/xbwapp/aLojaDaEquipe";

const TELA = readFileSync(
  "client/src/components/xbwapp/TelaEntregaRapida.tsx",
  "utf8"
);

describe("a prateleira", () => {
  it("tem os seis que ele pediu, nessa ordem", () => {
    expect(LOJA_DA_EQUIPE.map(i => i.id)).toEqual([
      "bicicleta",
      "patins",
      "triciclo",
      "patinete",
      "caiaque",
      "skate",
    ]);
  });

  /*
   * A regua dele — "do nv 1 ao 5, da bicicleta normal a eletrica, siga mesmo
   * exemplo para todos" — so ensina de primeira se valer para os seis. Se um
   * item tivesse quatro degraus, a pessoa teria de reaprender a ler a loja.
   */
  it("todos tem cinco degraus, numerados de um a cinco", () => {
    for (const item of LOJA_DA_EQUIPE) {
      expect(item.degraus).toHaveLength(DEGRAUS_POR_ITEM);
      expect(item.degraus.map(d => d.nivel)).toEqual([1, 2, 3, 4, 5]);
    }
  });

  it("o ultimo degrau de todos e eletrico", () => {
    for (const item of LOJA_DA_EQUIPE) {
      const ultimo = item.degraus[DEGRAUS_POR_ITEM - 1]!;
      expect(ultimo.nome.toLowerCase()).toContain("elétric");
    }
  });

  it("nome de fora que nao existe cai no primeiro, e nao quebra", () => {
    expect(itemDaLoja("bicicleta").nome).toBe("Bicicleta");
    // @ts-expect-error — de proposito: o que chega de fora nem sempre e valido.
    expect(itemDaLoja("foguete").id).toBe("bicicleta");
  });

  /*
   * Cinco nomes sem aviso nenhum parecem uma loja quebrada. A frase faz a tela
   * vazia dizer que esta vazia — e ninguem confunde lugar pronto com loja viva.
   */
  it("a tela vazia admite que esta vazia", () => {
    expect(AINDA_SEM_PRECO).toBe("ainda sem preço");
    expect(TELA).toContain("AINDA_SEM_PRECO");
  });

  it("nenhum degrau tem preco ou efeito ainda", () => {
    for (const item of LOJA_DA_EQUIPE) {
      for (const degrau of item.degraus) {
        expect(Object.keys(degrau).sort()).toEqual(["nivel", "nome"]);
      }
    }
  });
});

describe("o caminho ate a loja", () => {
  /*
   * ── AS DUAS CAIXAS VIRARAM DESENHO EM 14/09/2026 ────────────────────────
   *
   * Ordem dele: "ao clicar em bicicleta devemos ter uma tela nesse formato
   * seguinte, sem renan e duas caixas no lugar como botoes".
   *
   * O nome e a frase de cada uma estao PINTADOS dentro do desenho — entao a
   * tela nao escreve mais "Loja" nem "Upgrade" em lugar nenhum. O que este
   * teste segura passou a ser o que nao pode sumir: os dois caminhos e o
   * rotulo falado, que e a unica coisa que chega em quem nao enxerga a tela.
   */
  it("a bicicleta passa por uma portaria de duas caixas", () => {
    expect(TELA).toContain('tela: "portaria"');
    expect(TELA).toContain("XBW_ICONES.portariaLoja");
    expect(TELA).toContain("XBW_ICONES.portariaOficina");
    expect(TELA).toContain('aria-label="Loja:');
    expect(TELA).toContain('aria-label="Acessórios e oficina:');
  });

  /* Desenho sem rotulo e botao mudo: as duas caixas nao tem texto por cima. */
  it("as duas caixas desenhadas existem na pasta do jogo", () => {
    for (const arte of ["loja", "oficina"]) {
      expect(
        existsSync(`client/public/assets/xbwapp/XBW_portaria_${arte}.webp`),
        arte
      ).toBe(true);
    }
  });

  /* Mochila e acessorios nao tem o que comprar: so o que melhorar. */
  it("so a bicicleta ganha portaria", () => {
    expect(TELA).toContain('caixa === "bicicleta"');
  });

  it("a loja abre a prateleira de um item", () => {
    expect(TELA).toContain('tela: "loja"');
    expect(TELA).toContain('tela: "lojaItem"');
  });

  /*
   * Desligado, e nao apagado: o balcao continua inteiro atras do interruptor,
   * com a regra de prazo e frete que ja funcionava.
   */
  it("pegar pedido saiu da ficha, mas por interruptor", () => {
    expect(TELA).toContain("const MOSTRAR_PEGAR_PEDIDO = false");
    expect(TELA).toContain("{MOSTRAR_PEGAR_PEDIDO && (");
    expect(TELA).toContain("function Balcao(");
  });

  /*
   * A PORTARIA SAIU DA CONTA em 14/09/2026: com duas caixas desenhadas e nada
   * mais na tela, nao ha o que rolar. As da loja e da prateleira continuam.
   */
  it("as telas da loja rolam", () => {
    const daLoja = TELA.indexOf("function Loja(");
    const doFim = TELA.indexOf("/* ── A CAIXA:");
    const trecho = TELA.slice(daLoja, doFim);
    expect(trecho.match(/<Rolagem/g) ?? []).toHaveLength(2);
  });
});
