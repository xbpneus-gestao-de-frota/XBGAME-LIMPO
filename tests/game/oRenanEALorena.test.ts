/**
 * O RENAN E A LORENA — as duas memórias de personagem, aplicadas.
 *
 * Ele escreveu uma memória para cada um em 14/09/2026 e perguntou se dava para
 * aplicar. Dava — mas não entregando os documentos para a inteligência: a
 * maior parte virou dado fixo, que é grátis, instantâneo e garantido.
 *
 * Estes testes seguram as quatro coisas que, se quebrarem, quebram calado:
 *
 *   · o contraste entre os dois — que é o que os dois documentos têm de mais
 *     valioso, e que sai de um eixo da ficha, sem inteligência nenhuma;
 *   · a piada do Padrinho, que não pode escorregar nem uma vez em cem;
 *   · a vida deles (a Maya, o balé, o futebol) aparecendo sem que nada
 *     aconteça que o jogo não saiba;
 *   · a Lorena existindo na agenda, que é o que faz o resto ser possível.
 */
import { describe, expect, it } from "vitest";
import { CASAS, EQUIPE, fichaDe } from "@/game/xbwapp/fichas";
import { montarFala } from "@/game/xbwapp/falasDoBairro";
import { MEMORIA_NOVA } from "@/game/xbwapp/memoriaDoMorador";
import { PIADA_DO_PADRINHO, perguntaDoPadrinho } from "@/game/xbwapp/oPadrinho";
import {
  precisaDaInteligencia,
  respostaDoBairro,
  respostaTravada,
} from "@/game/xbwapp/aFalaDoContato";
import { CONTATOS, contato } from "@/game/xbwapp/contatos";

/** Um jogo parado, que é tudo o que estes testes precisam. */
const JOGO = { minuto: 600, historico: [], pedidos: [] };

function conversaCom(quem: string, frase: string) {
  return {
    jogo: JOGO,
    contato: quem,
    boca: "pessoa" as const,
    frase,
    mensagens: [{ de: quem, texto: "oi" }],
  };
}

describe("o par: o contraste é o que vale", () => {
  /*
   * A seção 29 do documento dela não descreve a Lorena — descreve um sistema:
   * ela olha para a possibilidade, ele olha para o risco. E o jogo já sabia
   * fazer isso: é o eixo de pressa. Se um dia os dois virarem iguais nesse
   * eixo, os dois personagens viram um só, e ninguém vai perceber por quê.
   */
  it("ela é a apressada e ele é o calmo — e isso não pode se perder", () => {
    expect(EQUIPE.lorena!.jeito[0]).toBe("apressado");
    expect(EQUIPE.renan!.jeito[0]).toBe("calmo");
    expect(EQUIPE.lorena!.jeito[0]).not.toBe(EQUIPE.renan!.jeito[0]);
  });

  it("os dois têm 16 anos, como ele escreveu", () => {
    expect(EQUIPE.renan!.idade).toBe(16);
    expect(EQUIPE.lorena!.idade).toBe(16);
  });

  it("a Lorena está na agenda — sem isso, metade do documento dela não acontece", () => {
    expect(contato("lorena")).toBeDefined();
    expect(CONTATOS.some(c => c.id === "lorena")).toBe(true);
  });

  it("cada um sai da conversa com a frase que é dele", () => {
    expect(EQUIPE.renan!.compromisso).toBe("já tô na rua");
    expect(EQUIPE.lorena!.compromisso).toBe("vou dar uma girada");
  });
});

describe("a piada do Padrinho não escorrega", () => {
  const PERGUNTAS = [
    "quem é o padrinho?",
    "quem e o Padrinho",
    "vc conhece o padrinho?",
    "quem criou o jogo?",
    "quem fez esse game?",
    "qual o nome do padrinho",
    "quem é o dono do jogo",
    "me fala quem inventou o jogo",
  ];

  it("reconhece as maneiras de perguntar, com acento e sem", () => {
    for (const p of PERGUNTAS) {
      expect(perguntaDoPadrinho(p), p).toBe(true);
    }
  });

  it("não confunde com conversa normal", () => {
    for (const p of ["to indo", "quanto paga", "onde é", "valeu", "bom dia"]) {
      expect(perguntaDoPadrinho(p), p).toBe(false);
    }
  });

  /*
   * A parte que importa: a pergunta NUNCA chega na inteligência. Não é
   * economia — é que o segredo do jogo não pode depender de um modelo lembrar
   * de uma instrução, e quem pergunta dez vezes seguidas está testando isso.
   */
  it("o portão da inteligência fecha antes, e a resposta é sempre a mesma", () => {
    for (const quem of ["renan", "lorena"]) {
      for (const p of PERGUNTAS) {
        const c = conversaCom(quem, p);
        expect(precisaDaInteligencia(c), `${quem}: ${p}`).toBeNull();
        expect(respostaTravada(c)).toBe(PIADA_DO_PADRINHO);
        expect(respostaDoBairro(c).texto).toBe(PIADA_DO_PADRINHO);
      }
    }
  });

  it("a resposta é a frase dele, letra por letra", () => {
    expect(PIADA_DO_PADRINHO).toBe("Você não conhece O Padrinho? Kkkkkk 😂😂");
  });

  /*
   * E só de quem sabe. Perguntar do Padrinho para a Dona Sebastiana não pode
   * devolver piada de dentro: ela não faz ideia do que você está falando.
   */
  it("quem não sabe do Padrinho não responde a piada", () => {
    for (const quem of ["casa4", "casa20", "padaria", "teo"]) {
      expect(fichaDe(quem).sabeDoPadrinho).toBeFalsy();
      expect(
        respostaTravada(conversaCom(quem, "quem é o padrinho?"))
      ).toBeNull();
    }
  });
});

describe("a vida deles aparece, e nada acontece que o jogo não saiba", () => {
  /*
   * O documento dela avisa: "nunca inventar que a Maya fez alguma coisa
   * específica". Com falas fechadas isso é garantido — a Maya só pode dizer o
   * que está escrito aqui.
   */
  it("a vida de cada um é uma lista fechada, não um assunto livre", () => {
    expect(EQUIPE.renan!.vida!.length).toBeGreaterThanOrEqual(4);
    expect(EQUIPE.lorena!.vida!.length).toBeGreaterThanOrEqual(4);
    expect(EQUIPE.lorena!.vida!.some(v => v.includes("Maya"))).toBe(true);
    expect(EQUIPE.renan!.vida!.some(v => v.includes("jogo"))).toBe(true);
  });

  it("a vida dela chega mesmo na fala, e não fica só na ficha", () => {
    const ditas = new Set<string>();
    let semente = 0.4242;
    const sorteio = () => {
      semente = (semente * 9301 + 0.49297) % 1;
      return semente;
    };
    for (let i = 0; i < 400; i += 1) {
      ditas.add(
        montarFala({
          frase: "to indo",
          boca: "pessoa",
          ficha: EQUIPE.lorena,
          memoria: MEMORIA_NOVA,
          situacao: {},
          sorteio,
        }).texto
      );
    }
    const tudo = [...ditas].join(" | ");
    expect(tudo).toContain("Maya");
    expect(tudo).toContain("na pontinha do pé");
  });

  it("a frase de assinatura dele aparece no aperto, e não em qualquer lugar", () => {
    const noAperto = new Set<string>();
    const normal = new Set<string>();
    let semente = 0.777;
    const sorteio = () => {
      semente = (semente * 9301 + 0.49297) % 1;
      return semente;
    };
    for (let i = 0; i < 400; i += 1) {
      noAperto.add(
        montarFala({
          frase: "to indo",
          boca: "pessoa",
          ficha: EQUIPE.renan,
          memoria: MEMORIA_NOVA,
          situacao: { prazoMin: 3 },
          sorteio,
        }).texto
      );
      normal.add(
        montarFala({
          frase: "quanto paga",
          boca: "pessoa",
          ficha: EQUIPE.renan,
          memoria: MEMORIA_NOVA,
          situacao: {},
          sorteio,
        }).texto
      );
    }
    expect([...noAperto].join(" | ")).toContain("segundo tempo");
    expect([...normal].join(" | ")).not.toContain("segundo tempo");
  });

  /*
   * A frase de assinatura concorre, não manda: se ela saísse sempre, viraria
   * bordão — e bordão denuncia a máquina tão rápido quanto repetir resposta.
   */
  it("a assinatura não vira bordão: no aperto ela divide espaço com as outras", () => {
    const ditas = new Set<string>();
    let semente = 0.31337;
    const sorteio = () => {
      semente = (semente * 9301 + 0.49297) % 1;
      return semente;
    };
    for (let i = 0; i < 300; i += 1) {
      ditas.add(
        montarFala({
          frase: "to indo",
          boca: "pessoa",
          ficha: EQUIPE.lorena,
          memoria: MEMORIA_NOVA,
          situacao: { prazoMin: 3 },
          sorteio,
        }).texto
      );
    }
    const semAssinatura = [...ditas].filter(
      f => !f.includes("na pontinha do pé")
    );
    expect(semAssinatura.length).toBeGreaterThan(3);
  });
});

describe("o briefing que vai para a inteligência é curto", () => {
  /*
   * Os documentos têm 24 e 32 seções. Modelo pequeno se perde em instrução
   * longa — já aprendemos isso aqui. O que sobe são poucas linhas.
   */
  it("cabem em poucas linhas, e não no documento inteiro", () => {
    for (const quem of ["renan", "lorena"]) {
      const briefing = EQUIPE[quem]!.briefing!;
      expect(briefing.length).toBeLessThanOrEqual(8);
      const letras = briefing.join(" ").length;
      expect(letras).toBeLessThan(700);
    }
  });

  it("nenhum briefing entrega o nome do Padrinho", () => {
    for (const ficha of Object.values(EQUIPE)) {
      const texto = (ficha.briefing ?? []).join(" ").toLowerCase();
      expect(texto).not.toMatch(/o padrinho (é|e) \w+/);
    }
  });

  it("os dois lembram de não inventar acontecimento", () => {
    for (const quem of ["renan", "lorena"]) {
      expect(EQUIPE[quem]!.briefing!.join(" ")).toContain("Nunca invente");
    }
  });
});

describe("o molde serve para os 65, não só para os dois", () => {
  it("os campos novos são opcionais: as 48 casas continuam válidas sem eles", () => {
    expect(Object.keys(CASAS).length).toBeGreaterThanOrEqual(48);
    for (const ficha of Object.values(CASAS)) {
      expect(ficha.nome).toBeTruthy();
      expect(ficha.compromisso).toBeTruthy();
    }
  });
});
