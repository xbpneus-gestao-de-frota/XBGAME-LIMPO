/**
 * A DECISAO DE QUEM RESPONDE — provada fora da tela.
 */
import { describe, expect, it } from "vitest";
import {
  memoriaDoContato,
  minutosDePrazo,
  precisaDaInteligencia,
  respostaDoBairro,
  situacaoDaConversa,
  trocasSeguidas,
  ultimasFalasDele,
  vestirRespostaDaInteligencia,
  type AConversa,
  type OQueOJogoSabe,
} from "@/game/xbwapp/aFalaDoContato";

const JOGO_VAZIO: OQueOJogoSabe = { minuto: 8 * 60, historico: [], pedidos: [] };

function conversa(p: Partial<AConversa> = {}): AConversa {
  return {
    jogo: JOGO_VAZIO,
    contato: "casa4",
    boca: "pessoa",
    frase: "vou atrasar",
    mensagens: [{ de: "casa4", texto: "oi" }],
    ...p,
  };
}

describe("a memoria lida do historico da carteira", () => {
  it("quem nunca recebeu nada nao tem historico inventado", () => {
    expect(memoriaDoContato(JOGO_VAZIO, "casa4").entregas).toBe(0);
  });

  it("conta as entregas e classifica a ultima pela nota", () => {
    const jogo: OQueOJogoSabe = {
      ...JOGO_VAZIO,
      historico: [
        { dia: 1, cliente: "casa4", estrelas: 5, reclamou: false },
        { dia: 2, cliente: "casa9", estrelas: 5, reclamou: false },
        { dia: 3, cliente: "casa4", estrelas: 2, reclamou: false },
      ],
    };
    const m = memoriaDoContato(jogo, "casa4");
    expect(m.entregas).toBe(2);
    expect(m.ultima).toBe("atrasada");
    expect(m.seguidasRuins).toBe(1);
  });

  it("uma entrega boa zera as seguidas ruins", () => {
    const jogo: OQueOJogoSabe = {
      ...JOGO_VAZIO,
      historico: [
        { dia: 1, cliente: "casa4", estrelas: 1, reclamou: true },
        { dia: 2, cliente: "casa4", estrelas: 2, reclamou: false },
        { dia: 3, cliente: "casa4", estrelas: 5, reclamou: false },
      ],
    };
    expect(memoriaDoContato(jogo, "casa4").seguidasRuins).toBe(0);
    expect(memoriaDoContato(jogo, "casa4").ultima).toBe("no-prazo");
  });

  it("nao conta linha de bloqueio como entrega", () => {
    const jogo: OQueOJogoSabe = {
      ...JOGO_VAZIO,
      historico: [
        { dia: 1, cliente: "casa4", estrelas: 5, reclamou: false },
        { dia: 2, cliente: "casa4", estrelas: 1, reclamou: false, bloqueio: true },
      ],
    };
    expect(memoriaDoContato(jogo, "casa4").entregas).toBe(1);
  });
});

describe("o prazo que esta correndo", () => {
  const jogo: OQueOJogoSabe = {
    minuto: 500,
    historico: [],
    pedidos: [
      { numero: "A1", loja: "padaria", cliente: "casa4", minuto: 490, prazoMin: 15, estado: "aceito" },
    ],
  };

  it("conta o que sobra do prazo", () => {
    expect(minutosDePrazo(jogo, "casa4")).toBe(5);
    expect(minutosDePrazo(jogo, "padaria")).toBe(5);
  });

  it("nao inventa prazo para quem nao tem pedido", () => {
    expect(minutosDePrazo(jogo, "casa9")).toBeUndefined();
  });

  it("pedido entregue nao segura prazo nenhum", () => {
    const fechado = { ...jogo, pedidos: [{ ...jogo.pedidos[0], estado: "entregue" }] };
    expect(minutosDePrazo(fechado, "casa4")).toBeUndefined();
  });

  it("prazo estourado para em zero, nunca vira negativo", () => {
    expect(minutosDePrazo({ ...jogo, minuto: 600 }, "casa4")).toBe(0);
  });

  it("a situacao leva prazo, chuva e hora", () => {
    const s = situacaoDaConversa({ ...jogo, chovendo: true }, "casa4");
    expect(s).toEqual({ prazoMin: 5, chovendo: true, hora: 8 });
  });
});

describe("o que a tela passa para as regras", () => {
  it("conta as idas e vindas do jogador", () => {
    expect(trocasSeguidas([
      { de: "casa4", texto: "oi" },
      { de: "voce", texto: "to indo" },
      { de: "casa4", texto: "beleza" },
      { de: "voce", texto: "cheguei" },
    ])).toBe(2);
  });

  it("pega so as tres ultimas falas DELE", () => {
    expect(ultimasFalasDele([
      { de: "casa4", texto: "a" },
      { de: "voce", texto: "x" },
      { de: "casa4", texto: "b" },
      { de: "casa4", texto: "c" },
      { de: "casa4", texto: "d" },
    ])).toEqual(["b", "c", "d"]);
  });
});

describe("quem responde", () => {
  it("a inteligencia e chamada na primeira conversa", () => {
    expect(precisaDaInteligencia(conversa({ mensagens: [] }))).toBe("primeira-conversa");
  });

  it("a inteligencia NAO e chamada na conversa de trabalho comum", () => {
    const jogo: OQueOJogoSabe = {
      ...JOGO_VAZIO,
      historico: [{ dia: 1, cliente: "casa4", estrelas: 5, reclamou: false }],
    };
    expect(precisaDaInteligencia(conversa({ jogo }))).toBeNull();
  });

  it("as falas do bairro sempre respondem alguma coisa", () => {
    const r = respostaDoBairro(conversa());
    expect(r.texto.length).toBeGreaterThan(0);
    expect(r.veioDe).toBe("falas-do-bairro");
  });

  it("a resposta da inteligencia ganha a mesma despedida", () => {
    const c = conversa({
      mensagens: [
        { de: "voce", texto: "oi" },
        { de: "casa4", texto: "oi" },
        { de: "voce", texto: "e ai" },
        { de: "casa4", texto: "tudo bem" },
        { de: "voce", texto: "legal" },
        { de: "casa4", texto: "pois e" },
        { de: "voce", texto: "sei" },
      ],
      sorteio: () => 0.1,
    });
    const r = vestirRespostaDaInteligencia(c, "Ah, que bom", "conversa");
    expect(r.veioDe).toBe("inteligencia");
    expect(r.despedida).toContain("bolo");
  });

  it("nao se despede no comeco da conversa", () => {
    expect(respostaDoBairro(conversa()).despedida).toBeUndefined();
  });

  it("com entrega correndo, a despedida empurra de volta ao trabalho", () => {
    const jogo: OQueOJogoSabe = {
      minuto: 500,
      historico: [],
      pedidos: [{ numero: "A1", loja: "padaria", cliente: "casa4", minuto: 495, prazoMin: 10, estado: "aceito" }],
    };
    const c = conversa({
      jogo,
      sorteio: () => 0.1,
      mensagens: [
        { de: "voce", texto: "oi" }, { de: "casa4", texto: "oi" },
        { de: "voce", texto: "e ai" }, { de: "casa4", texto: "oi" },
        { de: "voce", texto: "blz" }, { de: "casa4", texto: "oi" },
      ],
    });
    expect(respostaDoBairro(c).despedida).toMatch(/tá tarde|relógio|some daqui/);
  });
});
