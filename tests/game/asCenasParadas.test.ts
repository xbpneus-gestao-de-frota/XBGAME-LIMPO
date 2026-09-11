import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CENAS,
  POSE_DO_PAPEL,
  chaveDaCena,
  geometriaDaCena,
  ladoDaCena,
  ondeAcontece,
} from "../../client/src/game/asCenasParadas";
import type { ParadaDaEntrega } from "../../client/src/game/aParada";
import type { PontoNoMapa } from "../../client/src/game/streets";

const COMPONENTE = readFileSync("client/src/components/Entregador.tsx", "utf8");
const GERADOR = readFileSync("scripts/entregador/grades.py", "utf8");

/** Uma parada de mentira, com o papel e a caminhada que o teste quer. */
function paradaCom(
  aPe: readonly PontoNoMapa[],
  papel: "coleta" | "entrega" = "entrega"
): ParadaDaEntrega {
  return { papel, nome: "teste", ate: 100, aPe, ms: 2000 };
}

/**
 * AS CENAS PARADAS — ele desce da bicicleta, e a cena acontece na porta.
 *
 * Duas ordens dele, uma em cima da outra: "o entregador, quando for fazer
 * coleta ou entrega, ira parar a bicicleta, e depois geraremos animacao dele
 * fora da bicicleta" (06/09) e "as imagens devem ser aplicadas nao na rua, mas
 * na porta da coleta ou entrega" (07/09).
 */
describe("as cenas paradas", () => {
  it("sao quatro: coleta e entrega, cada uma de dois lados", () => {
    /*
     * Duas perguntas diferentes, e as duas importam. O QUE ele faz ali ja
     * estava escrito em cada parada e nao mudava nada na tela — pegar e largar
     * encomenda usavam o mesmo desenho. Agora usam o seu.
     *
     * Pedalando sao vinte moldes porque o rumo importa. Parado ele nao vai a
     * lugar nenhum: se esta lista crescer para vinte, alguem confundiu as duas
     * perguntas.
     */
    expect(Object.keys(CENAS).sort()).toEqual([
      "coleta:direita",
      "coleta:esquerda",
      "entrega:direita",
      "entrega:esquerda",
    ]);
    /*
     * CADA CENA TEM DOIS TEMPOS — folha de 10/09/2026. Na coleta ele pega a
     * caixa e guarda na mochila; na entrega ele estende e fica de mao aberta.
     */
    for (const papel of ["coleta", "entrega"] as const)
      for (const lado of ["esquerda", "direita"] as const)
        for (const tempo of [1, 2] as const)
          expect(
            existsSync(
              `client/public/assets/XB_Entregador_${POSE_DO_PAPEL[papel]}_${lado}_${tempo}.webp`
            )
          ).toBe(true);
  });

  it("a cena aparece onde a bicicleta parou", () => {
    /*
     * ISTO ANDOU TRES VEZES, E O LUGAR ONDE PAROU E O MAIS SIMPLES DE TODOS.
     *
     * Nasceu no meio-fio, mas com a folha de PEDALADA parada — ele entregava
     * sentado na bicicleta. Foi para a porta: "as imagens devem ser aplicadas
     * nao na rua, mas na porta". Ali subiu em cima do predio, porque o mapa e
     * visto de cima e um boneco em pe cresce para cima na tela: "esta muito
     * proximo do local", "esta muito perto da casa". Recuar um pedaco do risco
     * nao resolveu — o desenho ocupa quase cinquenta metros de mapa e o risco a
     * pe mediano tem trinta e um.
     *
     * Com o pontilhado retirado a pedido dele, sobrou o ponto que sempre
     * existiu: o do caminho, onde a bicicleta encostou. Nao ha funcao nem conta
     * para isso — a cena so troca o desenho, e o lugar continua sendo o mesmo
     * que ele ja ocupava pedalando.
     */
    expect(COMPONENTE).toContain("const naCena = naPorta && cena !== null;");
    expect(COMPONENTE).toContain("const onde = pontoEm(passos, andado.current);");
    // e nao ha mais nenhum ponto especial para a parada
    expect(COMPONENTE).not.toContain("ondeAcontece");
  });

  it("o lado sai do traco da caminhada, e nao de um palpite", () => {
    /*
     * A caminhada ja existia e ja comecava exatamente onde a bicicleta ficou.
     * Entao o lado da porta esta ali dentro, de graca: o primeiro ponto e a
     * bicicleta, o ultimo e a porta.
     */
    expect(ladoDaCena(paradaCom([[40, 50], [46, 44]]), 0)).toBe("direita");
    expect(ladoDaCena(paradaCom([[40, 50], [34, 44]]), 0)).toBe("esquerda");
  });

  it("sem caminhada, ele nao da meia-volta so por parar", () => {
    /*
     * 0 grau e ir para a direita da tela; 180 e para a esquerda.
     */
    expect(ladoDaCena(null, 0)).toBe("direita");
    expect(ladoDaCena(null, 180)).toBe("esquerda");
    // porta exatamente em cima: tambem cai no rumo, sem sortear
    expect(ladoDaCena(paradaCom([[40, 50], [40, 30]]), 180)).toBe("esquerda");
  });

  it("na base ele nao coleta nem entrega", () => {
    /*
     * A pausa do fim da volta nao e uma parada da corrida: nao ha porta e nao
     * ha encomenda. Inventar uma cena ali seria mostrar o menino estendendo
     * pacote para ninguem.
     */
    expect(COMPONENTE).toContain("setCena(null);");
    expect(COMPONENTE).toContain('desenhoDoRumo(fatia, naPorta ? "parado" : "pedalando1")');
  });

  it("as duas manchas do chao ficam espalhadas, e no chao", () => {
    /*
     * Pedalando, as manchas vao onde os pneus encostam, medido pixel a pixel.
     * Parado nao da: nestas folhas nao ha uma linha de chao unica — numa delas
     * os dois pontos mais baixos sao os DOIS TENIS, a quatro por cento um do
     * outro. Duas manchas coladas viram uma so embaixo do pe dele, e a
     * bicicleta ao lado fica sem sombra nenhuma.
     */
    for (const papel of ["coleta", "entrega"] as const)
      for (const lado of ["esquerda", "direita"] as const) {
        const c = CENAS[chaveDaCena(papel, lado)]!;
        expect(c.frenteY).toBe(c.chaoY);
        expect(c.trasY).toBe(c.chaoY);
        expect(Math.abs(c.frenteX - c.trasX)).toBeGreaterThan(25);
        // a mancha maior fica do lado onde a acao acontece
        if (lado === "direita") expect(c.frenteX).toBeGreaterThan(c.trasX);
        else expect(c.frenteX).toBeLessThan(c.trasX);
      }
  });

  it("parado, o corte do chao e reto", () => {
    /*
     * Nas folhas de pedalada a linha do chao e inclinada, porque as duas rodas
     * encostam em alturas diferentes. Aqui a bicicleta esta em piso plano:
     * esticar uma inclinacao ate a borda da moldura comeria quinze por cento do
     * desenho de um lado.
     */
    const corpo = COMPONENTE.split("function variaveisDaCena")[1]!.split("\n}")[0]!;
    expect(corpo).toContain("g.chaoY - ENTERRAR");
    const poligono = corpo.match(/polygon\([^`]*\)/)![0];
    expect([...poligono.matchAll(/\$\{linha\}%/g)]).toHaveLength(2);
  });

  it("descer da bicicleta nao mexe a bicicleta de lugar", () => {
    /*
     * A TROCA E SECA (ver entregadorPoses: o cruzamento deixava o menino
     * transparente e era o pisca). Para uma troca seca nao parecer um pulo, o
     * que nao muda tem de ficar parado: a bicicleta. Cada tempo da cena pousa
     * no MEIO DAS RODAS da bicicleta parada — o mesmo tipo de ponto que o
     * desenho pedalando usa. Ele desce e so o menino aparece ao lado.
     */
    for (const papel of ["coleta", "entrega"] as const)
      for (const lado of ["esquerda", "direita"] as const)
        for (const tempo of [1, 2] as const) {
          const g = geometriaDaCena(papel, lado, tempo);
          expect(g.pousoX, `${papel} ${lado} ${tempo}`).toBeDefined();
          expect(g.pousoY, `${papel} ${lado} ${tempo}`).toBeDefined();
        }
    // e os dois tempos de uma cena pousam quase no mesmo ponto
    for (const papel of ["coleta", "entrega"] as const)
      for (const lado of ["esquerda", "direita"] as const) {
        const um = geometriaDaCena(papel, lado, 1);
        const dois = geometriaDaCena(papel, lado, 2);
        expect(Math.abs(um.pousoX! - dois.pousoX!)).toBeLessThan(4);
      }
    const corpo = COMPONENTE.split("function variaveisDaCena")[1]!.split("\n}")[0]!;
    expect(corpo).toContain("g.pousoX ??");
  });

  it("a regua da altura vem das folhas de pedalada", () => {
    /*
     * O MENINO NAO PODE MUDAR DE TAMANHO AO DESCER.
     *
     * Se a escala das cenas fosse calculada entre elas mesmas, uma folha nova
     * de cena mudaria o tamanho do menino PEDALANDO pelas costas — e ninguem
     * procuraria o culpado ali. Entao a regua sai da pedalada, e as cenas
     * entram nela: a bicicleta parada tem o aro do tamanho da bicicleta de
     * perfil da folha de frente para a direita.
     */
    expect(GERADOR).toContain('s["paradas"] = s["frente_direita"]');
  });
});
