/**
 * OS MORADORES NA PORTA DE CASA.
 *
 * Ordem dele, 13/09/2026: "coloque um morador na frente de sua casa, e vamos
 * começar a dar vida maior ao game, aplique morador bem pequeno, quando for
 * aumentado zoom dê pra ver".
 *
 * Estes testes seguram as quatro coisas que quebram CALADO nesta peça — todas
 * elas some da tela sem estourar erro nenhum:
 *
 *   · DESENHO QUE NÃO EXISTE. Vira um buraco branco na calçada e ninguém
 *     percebe até dar zoom naquela casa.
 *   · MORADOR FORA DA PORTA. Ele tem de estar onde o entregador PARA, e não
 *     dois metros ao lado — senão a entrega chega e a pessoa está adiante.
 *   · MORADOR PINTADO DEPOIS DA LUZ. Fica com a cor do meio-dia enquanto o
 *     bairro entardece, e aí parece adesivo colado.
 *   · MORADOR FORA DE ESCALA. Desde 14/09 ele tem o tamanho do Cabeça de
 *     Prego, e isso é uma CONTA e não um número copiado — se alguém copiar,
 *     acertar o vilão passa a deixar o bairro com gente de dois tamanhos, e
 *     ninguém terá mudado nada para isso acontecer.
 *   · MORADOR COM PISO DE TELA. Ele cresceu, mas continua sendo cenário: com
 *     piso de tela ele vira boneco na calçada e disputa com o entregador.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  ALTURA_DO_MORADOR,
  MARGEM_DA_PAREDE,
  MORADORES_NA_RUA,
  PASSO_ATE_A_CALCADA,
} from "@/game/osMoradoresNaRua";
import { ALTURA_DELE_EM_PE } from "@/game/oCabecaDePrego";
import { ENDERECOS } from "@/game/addresses";
import { MORADORES } from "@/game/xbwapp/contatos";

const CSS = readFileSync("client/src/index.css", "utf8");
const MAPA = readFileSync("client/src/components/MapaDoBairro.tsx", "utf8");
const PECA = readFileSync("client/src/components/MoradoresNaPorta.tsx", "utf8");

describe("os moradores na porta de casa", () => {
  it("tem gente na rua", () => {
    expect(MORADORES_NA_RUA.length).toBeGreaterThanOrEqual(16);
  });

  it("todo desenho de corpo aponta para um arquivo que existe", () => {
    /*
     * O motivo de a lista ser escrita e nao derivada: aqui um nome errado
     * estoura, e na tela ele so sumiria.
     */
    const semArquivo: string[] = [];
    for (const m of MORADORES_NA_RUA) {
      try {
        readFileSync(resolve("client/public", m.corpo.replace(/^\//, "")));
      } catch {
        semArquivo.push(`${m.nome} → ${m.corpo}`);
      }
    }
    expect(semArquivo).toEqual([]);
  });

  it("cada um esta na calcada da propria casa: um passo curto da porta para dentro", () => {
    /*
     * A porta fica no MEIO DO ASFALTO — ela foi feita para o entregador
     * encostar nela. Morador parado no meio da rua e a primeira coisa que o
     * olho estranha, entao ele da um passo na direcao da propria casa.
     *
     * O passo NAO e obrigatorio. Em 14/09 duas pessoas apareceram em pe no
     * telhado — as casas 6 e 8 sao as mais coladas na rua do bairro, e meio
     * caminho ate o meio do telhado ja era a cumeeira. Onde a casa esta a
     * menos de uma parede da porta, o passo certo e nenhum passo.
     */
    for (const m of MORADORES_NA_RUA) {
      const numero = m.id.replace("casa", "");
      const casa = ENDERECOS.find(e => e.id === `casa-${numero}`);
      expect(casa, `${m.nome} sem porta no bairro`).toBeTruthy();

      const daPorta = Math.hypot(m.em.x - casa!.em[0]!, m.em.y - casa!.em[1]!);
      const daPortaAoTelhado = Math.hypot(
        casa!.telhado[0]! - casa!.em[0]!,
        casa!.telhado[1]! - casa!.em[1]!,
      );

      // nunca para tras: o passo e para dentro ou e zero
      expect(daPorta).toBeGreaterThanOrEqual(0);
      // e o passo e curto: nunca passa do meio do caminho ate a casa
      expect(daPorta).toBeLessThanOrEqual(PASSO_ATE_A_CALCADA + 1e-9);
      expect(daPorta).toBeLessThanOrEqual(daPortaAoTelhado / 2 + 1e-9);
    }
  });

  it("ninguem pisa no telhado: para-se a uma parede do meio da casa", () => {
    /*
     * A REGRA QUE FALTAVA, E O DEFEITO QUE ELA CONSERTOU.
     *
     * A marca do telhado e o MEIO do telhado, e nao a beirada. Enquanto o
     * morador tinha um por cento de altura, ninguem via que a Dona Marlene e a
     * Dona Divina andavam para dentro da casa; quando ele cresceu para o
     * tamanho do vilao, as duas apareceram em pe na cumeeira.
     *
     * A excecao escrita na conta e honesta: quando a porta JA esta mais perto
     * que uma parede, nao ha onde parar antes — entao para-se na porta, e o
     * que sobra e a distancia inteira. E o caso da casa 11.
     */
    for (const m of MORADORES_NA_RUA) {
      const casa = ENDERECOS.find(
        e => e.id === `casa-${m.id.replace("casa", "")}`,
      )!;
      const ate = Math.hypot(
        casa.telhado[0]! - casa.em[0]!,
        casa.telhado[1]! - casa.em[1]!,
      );
      const sobrou = Math.hypot(
        casa.telhado[0]! - m.em.x,
        casa.telhado[1]! - m.em.y,
      );
      expect(
        sobrou,
        `${m.nome} parou a ${sobrou.toFixed(2)} do meio do telhado`,
      ).toBeGreaterThanOrEqual(Math.min(MARGEM_DA_PAREDE, ate) - 1e-9);
    }
  });

  it("o passo e para DENTRO, na linha entre a porta e a casa", () => {
    /*
     * Um passo para qualquer outro lado poe o morador no quintal do vizinho.
     */
    for (const m of MORADORES_NA_RUA) {
      const casa = ENDERECOS.find(
        e => e.id === `casa-${m.id.replace("casa", "")}`,
      )!;
      const ate = Math.hypot(
        casa.telhado[0]! - casa.em[0]!,
        casa.telhado[1]! - casa.em[1]!,
      );
      const sobrou = Math.hypot(
        casa.telhado[0]! - m.em.x,
        casa.telhado[1]! - m.em.y,
      );
      const andou = Math.hypot(m.em.x - casa.em[0]!, m.em.y - casa.em[1]!);
      // porta → morador → telhado em linha reta: o que andou mais o que sobrou
      // e exatamente a distancia inteira.
      expect(andou + sobrou).toBeCloseTo(ate, 6);
    }
  });

  it("uma casa, um morador — endereco que troca de dono nao vira endereco", () => {
    const ids = MORADORES_NA_RUA.map(m => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("o nome na calcada e o mesmo nome da agenda do celular", () => {
    /*
     * Se o bairro chamar de Dona Marlene quem o aplicativo chama de outra
     * coisa, a pessoa entrega para um nome e ve outro na porta.
     */
    for (const m of MORADORES_NA_RUA) {
      const contato = MORADORES.find(c => c.id === m.id);
      expect(contato, `${m.id} nao esta na agenda`).toBeTruthy();
      expect(contato!.nome).toBe(m.nome);
    }
  });

  it("tem o tamanho do Cabeca de Prego, e tem porque e a MESMA conta", () => {
    /*
     * Ordem dele, 14/09/2026: "analisar moradores deixar com mesmo tamanho de
     * cabeca de prego".
     *
     * O teste nao confere um numero: confere que os dois numeros sao UM SO. Um
     * "toBeCloseTo(2.52)" passaria hoje e mentiria no dia em que alguem
     * acertasse o vilao — os moradores continuariam do tamanho de um vilao que
     * nao existe mais, com o teste verde.
     */
    expect(ALTURA_DO_MORADOR).toBe(ALTURA_DELE_EM_PE);
    const fonte = readFileSync("client/src/game/osMoradoresNaRua.ts", "utf8");
    expect(
      fonte,
      "o morador voltou a ter altura escrita a mao"
    ).toContain("ALTURA_DO_MORADOR = ALTURA_DELE_EM_PE");
  });

  it("e gente adulta ao lado do garoto da praca, e nao um predio", () => {
    /*
     * A cerca dos dois lados. Por baixo: um adulto nao pode ficar menor que um
     * menino de quinze anos. Por cima: o morador e CENARIO — se ele passar de
     * um garoto e meio, dezesseis deles tomam o bairro e brigam com o
     * entregador, que e a unica peca que precisa ser achada de longe.
     */
    const garoto = Number(/const GAROTO_ALTURA = ([\d.]+);/.exec(MAPA)![1]);
    expect(ALTURA_DO_MORADOR).toBeGreaterThan(garoto);
    expect(ALTURA_DO_MORADOR).toBeLessThan(garoto * 1.5);
  });

  it("nao tem piso de tela: de longe e um pontinho, de perto e uma pessoa", () => {
    /*
     * "Quando for aumentado zoom de pra ver." Piso de tela (min-height, clamp,
     * max) serve para a peca que a pessoa precisa ACHAR de longe — o
     * entregador. O morador e o contrario disso de proposito.
     */
    const bloco = CSS.split("\n.morador {")[1]!.split("\n}")[0]!;
    expect(bloco).not.toMatch(/min-height|clamp\(|max\(/);
    expect(bloco).toContain("--zoom-raiz");
  });

  it("e pendurado pelo PE, e tem sombra achatada embaixo", () => {
    const bloco = CSS.split("\n.morador {")[1]!.split("\n}")[0]!;
    expect(bloco).toContain("translate(-50%, -100%)");
    const sombra = CSS.split("\n.morador::after {")[1]!.split("\n}")[0]!;
    expect(sombra).toContain("radial-gradient");
    expect(Number(sombra.match(/aspect-ratio: ([\d.]+)/)![1])).toBeGreaterThan(2);
  });

  it("nao atrapalha o toque no mapa", () => {
    const bloco = CSS.split("\n.morador {")[1]!.split("\n}")[0]!;
    expect(bloco).toContain("pointer-events: none");
  });

  it("e pintado ANTES da luz do dia, e por isso entardece com o bairro", () => {
    const luz = MAPA.indexOf('className="mapa__luz"');
    const moradores = MAPA.indexOf("<MoradoresNaPorta />");
    expect(moradores).toBeGreaterThan(0);
    expect(moradores).toBeLessThan(luz);
  });

  it("tem chave para desligar, como toda peca do mapa", () => {
    expect(MAPA).toMatch(/const MORADORES_NAS_PORTAS = (true|false);/);
    expect(MAPA).toContain("{MORADORES_NAS_PORTAS && <MoradoresNaPorta />}");
  });

  it("nao se mexe: presenca, e nao animacao", () => {
    /*
     * Dezesseis desenhos animados na calcada disputariam atencao com a unica
     * coisa que precisa ser achada de longe, que e o entregador.
     */
    expect(PECA).not.toContain("animation");
    expect(PECA).not.toContain("useEffect");
  });
});
