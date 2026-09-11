/**
 * A ORDEM DA ENTRADA: nada de central antes de saber quem esta jogando.
 *
 * Este arquivo existe por um motivo so, e vale dizer em voz alta: a tela de
 * escolha do jogador nao pode ser pulada. Ela vem depois do filme e ANTES da
 * central, sempre.
 *
 * O perigo nao e alguem apagar a tela de proposito — e alguem, daqui a dois
 * meses, ligar um caminho novo direto para a central (um atalho, um botao de
 * "continuar", um link de teste que ficou) e nao perceber que acabou de criar
 * uma porta dos fundos. Quem entrar por ela chega numa central que nao sabe o
 * nome de quem esta ali, e o jogo passa a tratar por "" uma pessoa que nunca
 * foi apresentada.
 *
 * Por isso a regra nao mora num comentario: mora aqui, e quebra o teste.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { CampaignStore } from "../../client/src/game/GameState";
import { precisaSeApresentar } from "../../client/src/game/identity";
import { installBrowserWindow, seedCampaign } from "./harness";

const TELA = readFileSync(
  new URL("../../client/src/components/GameCanvas.tsx", import.meta.url),
  "utf-8"
);

describe("a tela vem antes da central", () => {
  it("um jogo novo precisa se apresentar antes de qualquer coisa", () => {
    const storage = installBrowserWindow();
    seedCampaign(storage, {});
    const store = new CampaignStore();
    expect(precisaSeApresentar(store.value)).toBe(true);
  });

  it("depois de se apresentar, o jogo nao pergunta de novo", () => {
    const storage = installBrowserWindow();
    seedCampaign(storage, {});
    const store = new CampaignStore();
    store.definirJogador("Fernando", "lia");
    expect(precisaSeApresentar(store.value)).toBe(false);

    // E continua sem perguntar quando o jogo e aberto de novo amanha.
    expect(precisaSeApresentar(new CampaignStore().value)).toBe(false);
  });

  it("quem entra no jogo passa pela pergunta, e nao direto para a central", () => {
    /*
     * A funcao que leva alguem para dentro do jogo tem de CONSULTAR a pergunta
     * antes de abrir a central. Se um dia ela abrir a central sem consultar,
     * este teste cai — e cai com o nome da funcao na mensagem, para quem
     * quebrou saber onde olhar.
     */
    const entrada = TELA.match(
      /const entrarNoJogo = useCallback\(\(\) => \{[\s\S]*?\n {2}\}, \[\]\);/
    );
    expect(
      entrada,
      "a funcao que leva para dentro do jogo sumiu ou mudou de nome"
    ).not.toBeNull();

    const corpo = entrada![0];
    expect(
      corpo.includes("precisaSeApresentar"),
      "entrarNoJogo deixou alguem entrar sem antes perguntar quem esta jogando"
    ).toBe(true);

    /*
     * A pergunta vem ANTES de deixar entrar — seja qual for a porta.
     *
     * O destino ja mudou uma vez: era a central, virou o mapa quando o mapa
     * passou a ser a tela principal. O teste passou a olhar a ORDEM e nao o
     * nome do destino, senao ele quebraria de novo na proxima mudanca sem que
     * a regra tivesse mudado.
     */
    const entrou = Math.max(
      corpo.indexOf("goBase"),
      corpo.indexOf("setMostrandoMapa")
    );
    expect(entrou, "entrarNoJogo nao leva a lugar nenhum").toBeGreaterThan(-1);
    expect(corpo.indexOf("precisaSeApresentar")).toBeLessThan(entrou);
  });

  it("o fim do filme tambem cai na pergunta, e nao na central", () => {
    /*
     * Inclui o caso em que o filme FALHA (rede ruim, video que nao carrega):
     * ali o jogo tambem chama o fim da abertura, e esse caminho nao pode ser
     * um atalho para dentro.
     */
    const fim = TELA.match(
      /const encerrarAbertura = useCallback\([\s\S]*?\n {2}\}, \[[^\]]*\]\);/
    );
    expect(fim, "o fim da abertura sumiu ou mudou de nome").not.toBeNull();
    expect(
      fim![0].includes("entrarNoJogo"),
      "o fim do filme abriu a central direto, pulando a pergunta"
    ).toBe(true);
    expect(fim![0].includes("goBase")).toBe(false);
  });

  it("sair da tela sem o motor aceitar nao leva ninguem para a central", () => {
    /*
     * Se o nome for recusado, a pessoa CONTINUA na tela. Sair assim deixaria
     * alguem na central sem nome — o mesmo estrago da porta dos fundos, so que
     * pela porta da frente.
     */
    const store = (() => {
      const storage = installBrowserWindow();
      seedCampaign(storage, {});
      return new CampaignStore();
    })();

    expect(store.definirJogador("a", "lia").ok).toBe(false);
    expect(precisaSeApresentar(store.value)).toBe(true);

    expect(store.definirJogador("Fernando", "nao-existe").ok).toBe(false);
    expect(precisaSeApresentar(store.value)).toBe(true);
  });
});
