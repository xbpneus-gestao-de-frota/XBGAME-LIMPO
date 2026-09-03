/**
 * Quem o jogador diz que e.
 *
 * O nome digitado e o unico texto do jogo inteiro que vem de fora — tudo o
 * mais foi escrito por nos. E texto que vem de fora, colado de qualquer lugar,
 * e onde nascem os defeitos que ninguem ve: um nome feito so de caracteres
 * invisiveis passa por qualquer validacao de tamanho e depois aparece EM
 * BRANCO no jogo inteiro, sem erro nenhum para explicar por que.
 */
import { describe, expect, it } from "vitest";
import {
  ENTREGADORES,
  ENTREGADOR_PADRAO,
  LIMITE_DO_NOME,
  MINIMO_DO_NOME,
  acharEntregador,
  ehEntregador,
  limparNome,
  nomeValido,
  precisaSeApresentar,
} from "../../client/src/game/identity";
import { CampaignStore } from "../../client/src/game/GameState";
import { installBrowserWindow, seedCampaign } from "./harness";

describe("os oito entregadores", () => {
  it("existem, sem id repetido e sem ninguem mudo", () => {
    expect(ENTREGADORES).toHaveLength(8);
    const ids = new Set(ENTREGADORES.map(pessoa => pessoa.id));
    expect(ids.size).toBe(8);
    ENTREGADORES.forEach(pessoa => {
      expect(pessoa.nome.trim().length).toBeGreaterThan(0);
      // O jeito nao e enfeite: e a voz que o balao de fala vai usar.
      expect(pessoa.jeito.trim().length).toBeGreaterThan(8);
      expect(pessoa.arte).toMatch(/^\/assets\/.+\.webp$/);
    });
  });

  it("cada um tem a sua arte, e nenhuma repetida", () => {
    // Dois entregadores com a mesma imagem seriam a escolha mais frustrante
    // possivel: a pessoa escolhe e nada muda.
    const artes = new Set(ENTREGADORES.map(pessoa => pessoa.arte));
    expect(artes.size).toBe(8);
  });

  it("o padrao e um deles de verdade", () => {
    expect(ehEntregador(ENTREGADOR_PADRAO)).toBe(true);
  });

  it("id inventado nao vira entregador, e nao derruba a tela", () => {
    expect(ehEntregador("chuck-norris")).toBe(false);
    expect(ehEntregador(undefined)).toBe(false);
    expect(ehEntregador(42)).toBe(false);
    // Mesmo assim sempre volta alguem: tela sem retrato seria pior que tela
    // com o retrato errado.
    expect(acharEntregador("chuck-norris")).toBe(ENTREGADORES[0]);
  });
});

describe("o nome que a pessoa digita", () => {
  it("perde espaco sobrando e espaco repetido no meio", () => {
    expect(limparNome("  Fernando  ")).toBe("Fernando");
    expect(limparNome("Ana   Paula")).toBe("Ana Paula");
  });

  it("guarda acento: e nome de gente", () => {
    expect(limparNome("Téo")).toBe("Téo");
    expect(limparNome("Conceição")).toBe("Conceição");
  });

  it("nao passa do limite", () => {
    const gigante = "a".repeat(500);
    expect(limparNome(gigante)).toHaveLength(LIMITE_DO_NOME);
  });

  it("come os invisiveis que vem colados de outro lugar", () => {
    /*
     * Este e o defeito silencioso: com zero-width e marca de direcao, o nome
     * tem "tamanho" e nao tem letra. Ele passaria por qualquer checagem de
     * comprimento e apareceria vazio na central, no save e nos baloes.
     */
    const soInvisivel = "\u200b\u200b\ufeff\u200e\u00ad";
    expect(limparNome(soInvisivel)).toBe("");
    expect(nomeValido(soInvisivel)).toBe(false);

    expect(limparNome("Du\u200bda")).toBe("Duda");
    expect(limparNome("\ufeffLia")).toBe("Lia");
    expect(limparNome("Ni\u00adno")).toBe("Nino");
  });

  it("quebra de linha colada vira espaco, e nao buraco", () => {
    expect(limparNome("Ana\nPaula")).toBe("Ana Paula");
    expect(limparNome("Ana\t\tPaula")).toBe("Ana Paula");
  });

  it("recusa o que nao e nome", () => {
    expect(nomeValido("")).toBe(false);
    expect(nomeValido("   ")).toBe(false);
    expect(nomeValido("a")).toBe(false);
    expect(nomeValido(null)).toBe(false);
    expect(nomeValido(123)).toBe(false);
    expect(nomeValido("Ab")).toBe(true);
    expect(MINIMO_DO_NOME).toBe(2);
  });
});

describe("a apresentacao dentro do jogo", () => {
  const abrir = () => {
    const storage = installBrowserWindow();
    seedCampaign(storage, {});
    return new CampaignStore();
  };

  it("comeca pedindo apresentacao", () => {
    const store = abrir();
    expect(store.value.playerName).toBe("");
    expect(store.value.playerAvatarId).toBe("");
    expect(precisaSeApresentar(store.value)).toBe(true);
  });

  it("guarda o nome limpo e o entregador escolhido", () => {
    const store = abrir();
    expect(store.definirJogador("  Fernando  ", "lia").ok).toBe(true);
    expect(store.value.playerName).toBe("Fernando");
    expect(store.value.playerAvatarId).toBe("lia");
    expect(precisaSeApresentar(store.value)).toBe(false);
  });

  it("recusa nome curto e entregador inventado, sem gravar nada", () => {
    const store = abrir();
    const semNome = store.definirJogador("a", "lia");
    expect(semNome.ok).toBe(false);
    expect(semNome.message).toContain("2 letras");

    const semPessoa = store.definirJogador("Fernando", "ninguem");
    expect(semPessoa.ok).toBe(false);

    // Nenhuma das duas recusas pode ter deixado metade da escolha gravada.
    expect(store.value.playerName).toBe("");
    expect(store.value.playerAvatarId).toBe("");
    expect(precisaSeApresentar(store.value)).toBe(true);
  });

  it("a escolha sobrevive a recarregar o jogo", () => {
    const store = abrir();
    store.definirJogador("Duda", "manu");
    const depois = new CampaignStore();
    expect(depois.value.playerName).toBe("Duda");
    expect(depois.value.playerAvatarId).toBe("manu");
    expect(precisaSeApresentar(depois.value)).toBe(false);
  });

  it("save mexido a mao nao entra sujo no jogo", () => {
    /*
     * O save e um arquivo no computador da pessoa. Um nome gigante quebraria
     * o layout da central inteira, e um entregador inexistente deixaria a tela
     * sem retrato — os dois voltam ao estado de "ainda nao se apresentou", que
     * o jogo sabe tratar.
     */
    const storage = installBrowserWindow();
    seedCampaign(storage, {
      playerName: "  " + "x".repeat(400) + "  ",
      playerAvatarId: "entregador-que-nao-existe",
    } as never);
    const store = new CampaignStore();
    expect(store.value.playerName).toHaveLength(LIMITE_DO_NOME);
    expect(store.value.playerAvatarId).toBe("");
    expect(precisaSeApresentar(store.value)).toBe(true);
  });

  it("save com nome so de invisiveis pede a apresentacao de novo", () => {
    const storage = installBrowserWindow();
    seedCampaign(storage, {
      playerName: "\u200b\u200b\u200b",
      playerAvatarId: "teo",
    } as never);
    const store = new CampaignStore();
    expect(store.value.playerName).toBe("");
    expect(precisaSeApresentar(store.value)).toBe(true);
  });
});
