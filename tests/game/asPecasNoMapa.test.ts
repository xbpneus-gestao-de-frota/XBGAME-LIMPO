import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const CSS = readFileSync("client/src/index.css", "utf8");
const MAPA = readFileSync("client/src/components/MapaDoBairro.tsx", "utf8");

/**
 * O GAROTO E A ENCOMENDA PARECEM ESTAR DENTRO DO BAIRRO.
 *
 * Ordem dele, 07/09/2026: "precisamos so ajustar as cores da mala e do garoto
 * para parecerem dentro do mapa realmente."
 *
 * O que faz uma peca parecer COLADA por cima de um desenho quase nunca e a forma
 * nem o tamanho — e a LUZ ERRADA. Ao meio-dia elas estavam certas; as cinco da
 * tarde continuavam ao meio-dia, com o bairro inteiro laranja em volta.
 */
describe("as pecas dentro do bairro", () => {
  it("sao pintadas ANTES da luz do dia, e por isso mudam de cor com ele", () => {
    /*
     * Este e o ajuste de verdade, e nao ha numero para acertar nele: as duas
     * escurecem e esquentam junto com o bairro porque a mesma camada de luz
     * passa por cima delas. Se um dia alguem mover as duas para depois da luz,
     * elas voltam a ser adesivos.
     */
    /*
     * A busca e pela PECA, e nao pela linha inteira: o menino e a encomenda
     * ganharam em 08/09/2026 uma saida de cena (a praca esvazia depois da
     * conversa), e o texto da linha mudou. A regra que este teste guarda nao
     * mudou — as duas continuam tendo de vir antes da luz.
     */
    const luz = MAPA.indexOf('className="mapa__luz"');
    const garoto = MAPA.indexOf('className={pracaLimpa ? "garoto');
    const encomenda = MAPA.indexOf("<CaixaNoChao");
    expect(garoto).toBeGreaterThan(0);
    expect(encomenda).toBeGreaterThan(0);
    expect(garoto).toBeLessThan(luz);
    expect(encomenda).toBeLessThan(luz);
  });

  it("as janelas que acendem continuam DEPOIS da luz", () => {
    /*
     * Elas sao o contrario: janela que acende ao entardecer nao pode ser
     * escurecida pelo entardecer.
     */
    const luz = MAPA.indexOf('className="mapa__luz"');
    expect(MAPA.indexOf("<VidaDoMapa />")).toBeGreaterThan(luz);
  });

  it("a encomenda nao tem numero de camada — era ele que a tirava do bairro", () => {
    /*
     * Peca com numero de camada pula na frente de tudo que nao tem, e a luz do
     * dia nao tem. Sem o numero, quem manda e a ordem do desenho.
     */
    const bloco = CSS.split("\n.caixa-no-chao {")[1]!.split("\n}")[0]!;
    expect(bloco).not.toMatch(/z-index:\s*\d/);
  });

  it("as duas tem uma sombra achatada embaixo", () => {
    /*
     * E o cuidado que mais rende: sem uma mancha por baixo, o desenho recortado
     * FLUTUA por mais certa que esteja a cor, porque o olho procura onde o
     * objeto toca o chao e nao acha. Achatada porque o bairro e visto de cima, a
     * 31 graus do chao.
     */
    for (const alvo of [".garoto::after", ".caixa-no-chao::before"]) {
      const bloco = CSS.split(`\n${alvo} {`)[1]!.split("\n}")[0]!;
      expect(bloco).toContain("radial-gradient");
      expect(Number(bloco.match(/aspect-ratio: ([\d.]+)/)![1])).toBeGreaterThan(
        2,
      );
    }
  });

  it("as duas sao rebaixadas para o ar da pintura, e a mala mais que ele", () => {
    /*
     * O bairro e uma pintura ao sol com um veu de ar: nele nada tem preto puro
     * nem cor cheia. A mala apanha mais porque veio com azul de catalogo e neon
     * ciano, que nao existem em lugar nenhum daquele desenho.
     */
    const saturacoes = [
      ...CSS.matchAll(
        /\.caixa-no-chao__desenho \{\s*filter:[^}]*?saturate\(([\d.]+)\)/g,
      ),
    ].map((m) => Number(m[1]));
    // a primeira e a regra dos dois; a segunda, a que so vale para a mala
    expect(saturacoes).toHaveLength(2);
    const [saturacaoDosDois, saturacaoDaMala] = saturacoes as [number, number];
    const daMala = CSS.split("\n.caixa-no-chao__desenho {")
      .at(-1)!
      .split("\n}")[0]!;
    expect(saturacaoDosDois).toBeLessThan(1);
    expect(saturacaoDaMala).toBeLessThan(saturacaoDosDois);
    expect(daMala).toContain("sepia(");
  });
});
