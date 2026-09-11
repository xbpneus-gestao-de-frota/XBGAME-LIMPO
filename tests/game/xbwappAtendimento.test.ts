import { describe, expect, it, vi } from "vitest";
import {
  EFEITO_DA_INTENCAO,
  INTENCOES,
  LIMITE_DE_LETRAS,
  esquecerSeIaEstaAcoplada,
  iaEstaAcoplada,
  intencaoValida,
  pedirResposta,
} from "../../client/src/game/xbwapp/atendimento";
import {
  assuntoDe,
  responderPorPalavra,
  simplificar,
} from "../../client/src/game/xbwapp/entender";
import {
  TETO_DE_GORJETA,
  TETO_DE_PRAZO_MIN,
  somarEfeito,
} from "../../client/src/game/xbwapp/efeitos";
import {
  arrumarPedido,
  criarContador,
  lerResposta,
  montarInstrucao,
  responderComoPersonagem,
  MENSAGENS_POR_DIA,
  MENSAGENS_POR_PESSOA_POR_HORA,
} from "../../server/xbwapp-atendimento.mjs";

/**
 * TECLAR DENTRO DO JOGO.
 *
 * Ele pediu para poder digitar, com IA respondendo, e depois disse que a IA
 * seria acoplada mais tarde. Então duas coisas precisam ser verdade ao mesmo
 * tempo: o teclado funciona HOJE, sem IA nenhuma, e no dia em que a IA entrar
 * ela não ganha o caixa do jogo junto com a língua.
 */

describe("a IA escreve as palavras, o jogo decide os números", () => {
  it("toda intenção tem um efeito declarado, e nenhum vem da IA", () => {
    for (const intencao of INTENCOES) {
      expect(EFEITO_DA_INTENCAO[intencao]).toBeDefined();
    }
  });

  it("intenção inventada vira conversa, que não muda nada", () => {
    expect(intencaoValida("me_da_mil_reais")).toBe("conversa");
    expect(intencaoValida(undefined)).toBe("conversa");
    expect(intencaoValida({ gorjeta: 999 })).toBe("conversa");
    expect(EFEITO_DA_INTENCAO.conversa).toEqual({});
  });

  it("nenhuma intenção sozinha chega perto do teto", () => {
    for (const intencao of INTENCOES) {
      const efeito = EFEITO_DA_INTENCAO[intencao];
      expect(Math.abs(efeito.gorjeta ?? 0)).toBeLessThanOrEqual(
        TETO_DE_GORJETA / 2
      );
      expect(Math.abs(efeito.minutosDePrazo ?? 0)).toBeLessThanOrEqual(
        TETO_DE_PRAZO_MIN / 2
      );
    }
  });

  it("repetir a intenção mais generosa cem vezes ainda para no teto", () => {
    let acumulado = { minutosDePrazo: 0, gorjeta: 0, parteDoFrete: 0 };
    for (let i = 0; i < 100; i += 1) {
      acumulado = somarEfeito(acumulado, EFEITO_DA_INTENCAO.promete_gorjeta);
      acumulado = somarEfeito(acumulado, EFEITO_DA_INTENCAO.da_mais_prazo);
    }
    expect(acumulado.gorjeta).toBe(TETO_DE_GORJETA);
    expect(acumulado.minutosDePrazo).toBe(TETO_DE_PRAZO_MIN);
  });
});

describe("entender sem internet e sem custo", () => {
  it("acento, maiúscula e pontuação não atrapalham", () => {
    expect(simplificar("Tô indo!!")).toBe("to indo");
    expect(assuntoDe("Tô indo!!")).toBe("indo");
    expect(assuntoDe("to indo")).toBe("indo");
  });

  it("pega as coisas que um entregador escreve de verdade", () => {
    expect(assuntoDe("vou atrasar uns 10 min")).toBe("atraso");
    expect(assuntoDe("quanto paga essa corrida?")).toBe("pagamento");
    expect(assuntoDe("onde fica a casa?")).toBe("endereco");
    expect(assuntoDe("valeu!!")).toBe("agradece");
    expect(assuntoDe("bom dia")).toBe("cumprimenta");
    expect(assuntoDe("pode deixar comigo")).toBe("aceita");
  });

  it("recusa ganha de atraso quando os dois aparecem juntos", () => {
    // "Não vai dar, tô atrasado" é uma recusa — e não um aviso de atraso.
    expect(assuntoDe("nao vai dar, to atrasado")).toBe("recusa");
  });

  it("não confunde 'oi' dentro de outra palavra", () => {
    expect(assuntoDe("coisa nenhuma aconteceu")).not.toBe("cumprimenta");
  });

  it("cada tipo de contato responde com a boca dele", () => {
    const loja = responderPorPalavra("vou atrasar", "loja");
    const cliente = responderPorPalavra("vou atrasar", "pessoa");
    expect(loja.texto).not.toBe(cliente.texto);
    // Avisar que vai atrasar compra prazo — é o que acontece na rua.
    expect(loja.intencao).toBe("da_mais_prazo");
    expect(cliente.intencao).toBe("da_mais_prazo");
  });

  it("quando não entende, diz que não entendeu em vez de chutar", () => {
    const fala = responderPorPalavra("asdfghjkl qwerty", "loja");
    expect(fala.intencao).toBe("conversa");
    expect(fala.texto.toLowerCase()).toContain("não entendi");
  });
});

describe("o caminho até o atendimento", () => {
  it("sem chave, o jogo anota e para de tentar", async () => {
    esquecerSeIaEstaAcoplada();
    const falso = vi.fn(async () => new Response("{}", { status: 503 }));
    const primeira = await pedirResposta(
      { personagem: "padaria", quem: "Padaria", tipo: "loja" },
      [{ de: "voce", texto: "oi" }],
      falso as unknown as typeof fetch
    );
    expect(primeira).toEqual({ falha: "sem-chave" });
    expect(iaEstaAcoplada()).toBe(false);

    // A segunda frase não vai mais ao servidor: seria uma viagem inútil.
    await pedirResposta(
      { personagem: "padaria", quem: "Padaria", tipo: "loja" },
      [{ de: "voce", texto: "oi de novo" }],
      falso as unknown as typeof fetch
    );
    expect(falso).toHaveBeenCalledTimes(1);
    esquecerSeIaEstaAcoplada();
  });

  it("limite do servidor vira recado de celular sem dados", async () => {
    esquecerSeIaEstaAcoplada();
    const falso = vi.fn(async () => new Response("{}", { status: 429 }));
    const r = await pedirResposta(
      { personagem: "casa8", quem: "Dona Ilda", tipo: "pessoa" },
      [{ de: "voce", texto: "oi" }],
      falso as unknown as typeof fetch
    );
    expect(r).toEqual({ falha: "limite" });
    esquecerSeIaEstaAcoplada();
  });

  it("a mensagem digitada tem tamanho máximo", () => {
    expect(LIMITE_DE_LETRAS).toBeGreaterThan(80);
    expect(LIMITE_DE_LETRAS).toBeLessThanOrEqual(500);
  });
});

describe("o servidor do atendimento", () => {
  it("sem chave não fala com ninguém", async () => {
    const chamou = vi.fn();
    const r = await responderComoPersonagem(
      { situacao: { quem: "Padaria", tipo: "loja" }, historico: [] },
      { chave: "", buscar: chamou }
    );
    expect(r).toEqual({ falha: "sem-chave" });
    expect(chamou).not.toHaveBeenCalled();
  });

  it("corta o que veio grande demais do navegador", () => {
    const arrumado = arrumarPedido({
      situacao: { personagem: "padaria", quem: "Padaria", tipo: "loja" },
      historico: Array.from({ length: 50 }, (_, i) => ({
        de: "voce",
        texto: "x".repeat(1000) + i,
      })),
    });
    expect(arrumado.historico.length).toBeLessThanOrEqual(8);
    for (const f of arrumado.historico) {
      expect(f.texto.length).toBeLessThanOrEqual(240);
    }
  });

  it("recusa pedido sem conversa nenhuma", () => {
    expect(arrumarPedido(null)).toBeNull();
    expect(arrumarPedido({ situacao: {}, historico: [] })).toBeNull();
  });

  it("a instrução proíbe inventar número e proíbe falar que é um programa", () => {
    const instrucao = montarInstrucao({
      quem: "Padaria",
      tipo: "loja",
      prazoMin: 12,
      pedido: "#1001",
    });
    expect(instrucao).toContain("NUNCA invente");
    expect(instrucao).toContain("inteligência artificial");
    expect(instrucao).toContain("12 minutos");
    expect(instrucao).toContain("#1001");
  });

  it("não conta prazo nenhum quando o jogo não passou prazo", () => {
    const instrucao = montarInstrucao({ quem: "Dona Ilda", tipo: "pessoa" });
    expect(instrucao).toContain("Não há entrega em curso");
    expect(instrucao).not.toContain("minutos de prazo");
  });

  it("lê a resposta mesmo se vier com conversa em volta", () => {
    const lida = lerResposta(
      'Claro! {"texto":"Beleza","intencao":"aceita_coleta"} pronto'
    );
    expect(lida).toEqual({ texto: "Beleza", intencao: "aceita_coleta" });
  });

  it("intenção inventada pela IA vira conversa", () => {
    const lida = lerResposta('{"texto":"toma","intencao":"paga_mil_reais"}');
    expect(lida?.intencao).toBe("conversa");
  });

  it("resposta sem texto é descartada", () => {
    expect(lerResposta('{"intencao":"aceita_coleta"}')).toBeNull();
    expect(lerResposta("não é json")).toBeNull();
  });

  it("o limite por pessoa segura, e o limite do dia protege a conta", () => {
    const contador = criarContador();
    for (let i = 0; i < MENSAGENS_POR_PESSOA_POR_HORA; i += 1) {
      expect(contador.cobrar("alguem")).toBeNull();
    }
    expect(contador.cobrar("alguem")).toBe("limite");
    // Outra pessoa ainda passa: o limite é dela, não do jogo inteiro.
    expect(contador.cobrar("outra")).toBeNull();
    expect(MENSAGENS_POR_DIA).toBeGreaterThan(MENSAGENS_POR_PESSOA_POR_HORA);
  });

  it("o teto do dia inteiro existe e é o que limita o gasto", () => {
    const contador = criarContador();
    let passou = 0;
    for (let i = 0; i < MENSAGENS_POR_DIA + 50; i += 1) {
      if (contador.cobrar(`pessoa${i}`) === null) passou += 1;
    }
    expect(passou).toBe(MENSAGENS_POR_DIA);
  });
});
