/**
 * AS LUVAS XB E AS DUAS LUPAS.
 *
 * Ordem dele, 09/09/2026: "novos moradores, e luvas para clicar na tela,
 * aumentar zomm, diminuir" — com a folha das luvas junto.
 *
 * Vale lembrar de onde isso vem. Em 08/09 uma mao foi DESENHADA aqui dentro
 * para dizer onde tocar, ficou ruim, ficou obscena e foi apagada no mesmo dia
 * ("meu deus a mao que vc criou ta ate obscena, exclua isso"). O lugar ficou
 * vazio de proposito ate chegar desenho de verdade. Chegou.
 *
 * O que estes testes seguram:
 *
 *   · AS CINCO PECAS EXISTEM COMO ARQUIVO. Caminho errado de imagem nao
 *     quebra teste nenhum: a mao simplesmente nao aparece, e ninguem percebe
 *     ate rodar o jogo e ficar sem a dica de onde clicar.
 *   · O AVISO USA A LUVA, e nao volta a desenhar mao com codigo.
 *   · O MAPA TEM OS DOIS BOTOES, cada um com a sua lupa e com o seu nome dito
 *     em voz alta para quem usa leitor de tela.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { GAME_ASSETS } from "@/game/assets";

function arquivo(caminho: string): Buffer {
  return readFileSync(resolve("client/public", caminho.replace(/^\//, "")));
}

function fonte(caminho: string): string {
  return readFileSync(resolve(caminho), "utf8");
}

describe("as luvas XB", () => {
  it("as cinco pecas da folha existem como arquivo", () => {
    const pecas = [
      GAME_ASSETS.luvaToque,
      GAME_ASSETS.luvaAponta,
      GAME_ASSETS.luvaJoia,
      GAME_ASSETS.lupaMais,
      GAME_ASSETS.lupaMenos,
    ];
    for (const p of pecas) {
      expect(() => arquivo(p)).not.toThrow();
      expect(arquivo(p).byteLength).toBeGreaterThan(2000);
    }
  });

  it("as duas lupas sao arquivos DIFERENTES — uma aumenta, a outra diminui", () => {
    /*
     * Na folha as duas lupas chegaram identicas, sem sinal nenhum dentro. O
     * "+" e o "-" foram pintados na lente. Se um dia alguem apontar os dois
     * botoes para a mesma imagem, o mapa volta a ter dois botoes iguais que
     * fazem coisas contrarias — que e exatamente o defeito que este teste
     * existe para pegar.
     */
    expect(GAME_ASSETS.lupaMais).not.toBe(GAME_ASSETS.lupaMenos);
    expect(arquivo(GAME_ASSETS.lupaMais).equals(arquivo(GAME_ASSETS.lupaMenos))).toBe(
      false
    );
  });

  it("o aviso da tela mostra a luva, e ninguem desenhou mao de novo", () => {
    const tela = fonte("client/src/components/GameCanvas.tsx");
    expect(tela).toContain("xbw-avisinho__luva");
    expect(tela).toContain("GAME_ASSETS.luvaToque");
  });

  it("a luva do aviso e enfeite: nao rouba o clique nem fala com o leitor de tela", () => {
    const estilo = fonte("client/src/styles/xbwapp.css");
    /*
     * A JANELA E FOLGADA DE PROPOSITO: o bloco tem comentario dentro, e
     * comentario cresce. Uma janela curta reprova quando alguem so EXPLICA
     * melhor a regra — que e o oposto do que este teste quer proteger.
     */
    const bloco = estilo.slice(estilo.indexOf(".xbw-avisinho__luva"));
    expect(bloco.slice(0, 1600)).toContain("pointer-events: none");
    expect(fonte("client/src/components/GameCanvas.tsx")).toContain(
      'className="xbw-avisinho__luva"'
    );
  });

  it("o mapa tem os dois botoes de zoom, com nome dito em voz alta", () => {
    const mapa = fonte("client/src/components/MapaDoBairro.tsx");
    expect(mapa).toContain('aria-label="Aproximar o mapa"');
    expect(mapa).toContain('aria-label="Afastar o mapa"');
    expect(mapa).toContain("GAME_ASSETS.lupaMais");
    expect(mapa).toContain("GAME_ASSETS.lupaMenos");
  });

  it("os botoes param nos mesmos limites do gesto — nao ha zoom de duas verdades", () => {
    /*
     * A rodinha do mouse ja parava em ZOOM_MAXIMO e no mapa cheio. Se o botao
     * usasse outro limite, o mapa teria dois fins diferentes conforme o jeito
     * de mexer.
     */
    const mapa = fonte("client/src/components/MapaDoBairro.tsx");
    expect(mapa).toContain("disabled={zoom >= ZOOM_MAXIMO - 0.001}");
    expect(mapa).toContain("disabled={zoom <= 1.001}");
    expect(mapa).toContain("const PASSO_DA_LUPA = 1.15");
  });
});
