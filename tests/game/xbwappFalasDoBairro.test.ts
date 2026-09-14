/**
 * AS FALAS DO BAIRRO — as tres regras, a memoria que desbota e a saida.
 *
 * Estes testes seguram as coisas que quebram CALADAS. Fala repetida nao
 * explode em teste nenhum: ela sai na tela, o jogador sente que e maquina, e
 * ninguem descobre ate alguem jogar dez minutos. Por isso cada regra aqui e
 * medida rodando centenas de vezes, e nao olhando uma frase.
 */
import { describe, expect, it } from "vitest";

import {
  montarFala,
  deveSair,
  falaDeSaida,
  prateleiraDe,
  NAO_REPETIR_AS_ULTIMAS,
  type Situacao,
} from "@/game/xbwapp/falasDoBairro";
import { CASAS, fichaDe, jeitosDistintos } from "@/game/xbwapp/fichas";
import { CASAS as CASAS_DO_BAIRRO, QUANTAS_CASAS } from "@/game/addresses";
import {
  MEMORIA_NOVA,
  intimidade,
  memoriaDe,
  registrarEntrega,
  resumoPara,
  type MemoriaDoBairro,
  type MemoriaDoContato,
} from "@/game/xbwapp/memoriaDoMorador";
import { momentoExtremo } from "@/game/xbwapp/momentoExtremo";

/** Uma amostra grande da mesma pessoa dizendo a mesma coisa. */
function amostra(
  id: string,
  frase: string,
  quantas: number,
  situacao: Situacao = {},
  memoria: MemoriaDoContato = MEMORIA_NOVA
): string[] {
  const vistas: string[] = [];
  const ultimas: string[] = [];
  for (let i = 0; i < quantas; i++) {
    const f = montarFala({
      frase,
      boca: "pessoa",
      ficha: fichaDe(id),
      memoria,
      situacao,
      ultimas,
    });
    vistas.push(f.texto);
    ultimas.push(f.texto);
  }
  return vistas;
}

describe("o elenco do bairro", () => {
  /*
   * QUEM CONTA AS CASAS E O DESENHO DO BAIRRO, E NAO ESTE TESTE.
   *
   * Ja escrevi aqui "47" na mao, e era mentira: o bairro tem 48 portas de
   * casa desde que o desenho foi medido. Numero escrito a mao envelhece calado
   * — o dia em que entrar a casa 49 este teste teria de ser lembrado, e
   * ninguem lembra. Agora ele pergunta ao mapa.
   */
  it("tem ficha para TODA casa que existe no desenho do bairro", () => {
    expect(Object.keys(CASAS)).toHaveLength(QUANTAS_CASAS);
    const semFicha = CASAS_DO_BAIRRO.filter(c => !CASAS[c.numero!]).map(
      c => c.nome
    );
    expect(semFicha).toEqual([]);
  });

  it("nao deixa nenhuma casa sem desculpa propria para sair", () => {
    const sem = Object.values(CASAS).filter(f => !f.compromisso);
    expect(sem).toEqual([]);
  });

  it("espalha jeitos diferentes em vez de repetir dois ou tres", () => {
    expect(jeitosDistintos()).toBeGreaterThanOrEqual(15);
  });

  it("nunca poe dois vizinhos com o mesmo jeito", () => {
    const numeros = Object.keys(CASAS)
      .map(Number)
      .sort((a, b) => a - b);
    const iguais = numeros.filter(
      (n, i) =>
        i > 0 &&
        CASAS[numeros[i - 1]].jeito.join("·") === CASAS[n].jeito.join("·")
    );
    expect(iguais).toEqual([]);
  });
});

describe("a concordancia — ninguem fala no genero errado", () => {
  const FEMININO = /\bobrigada\b|\bquerida\b/i;
  const MASCULINO = /\bobrigado\b|\bquerido\b/i;
  const FRASES = ["vou atrasar", "to indo", "valeu", "cheguei", "bom dia"];

  function tudoQueDiz(id: string): string[] {
    const falas: string[] = [];
    for (const frase of FRASES) {
      const ultimas: string[] = [];
      for (let i = 0; i < 60; i++) {
        const f = montarFala({
          frase,
          boca: "pessoa",
          ficha: fichaDe(id),
          memoria: MEMORIA_NOVA,
          ultimas,
        });
        falas.push(f.texto);
        ultimas.push(f.texto);
      }
    }
    return falas;
  }

  it("homem nunca agradece no feminino", () => {
    const homens = Object.entries(CASAS).filter(([, f]) => !f.ela);
    expect(homens.length).toBeGreaterThan(10);
    for (const [numero] of homens) {
      const errados = tudoQueDiz(`casa${numero}`).filter(t => FEMININO.test(t));
      expect(errados).toEqual([]);
    }
  });

  it("mulher nunca agradece no masculino", () => {
    const mulheres = Object.entries(CASAS).filter(([, f]) => f.ela);
    expect(mulheres.length).toBeGreaterThan(10);
    for (const [numero] of mulheres) {
      const errados = tudoQueDiz(`casa${numero}`).filter(t =>
        MASCULINO.test(t)
      );
      expect(errados).toEqual([]);
    }
  });

  it("nao sobra marca de flexao na tela", () => {
    for (const id of ["casa4", "casa34", "teo", "grupo-bairro"]) {
      const comChaves = tudoQueDiz(id).filter(t => t.includes("{"));
      expect(comChaves).toEqual([]);
    }
  });
});

describe("regra 1 — o jeito filtra os pedacos", () => {
  it("quem e seco nunca cumprimenta e nunca se despede", () => {
    const falas = amostra("casa34", "vou atrasar", 200);
    expect(
      falas.filter(t => /^(Ah|Olha|Ô moço|Que bom|Oi|Opa|Beleza)/.test(t))
    ).toEqual([]);
    expect(
      falas.filter(t => /(viu\?|tá bom\?|beleza\?|valeu|abençoe)/.test(t))
    ).toEqual([]);
  });

  it("a tagarela tempera a fala com a mania dela", () => {
    const falas = amostra("casa4", "vou atrasar", 200);
    const comMania = falas.filter(t => t.includes("bolo tá no forno"));
    expect(comMania.length).toBeGreaterThan(30);
  });
});

describe("regra 2 — nunca repetir as tres ultimas", () => {
  it("nao repete nenhuma fala dentro da janela", () => {
    const seq = amostra("casa4", "vou atrasar", 300);
    const repetidas = seq.filter((t, i) =>
      i >= NAO_REPETIR_AS_ULTIMAS
        ? seq.slice(i - NAO_REPETIR_AS_ULTIMAS, i).includes(t)
        : false
    );
    expect(repetidas).toEqual([]);
  });
});

describe("regra 3 — a situacao troca o miolo", () => {
  it("prazo apertado, chuva e tempo bom nao compartilham frase", () => {
    const tranquilo = new Set(
      amostra("casa4", "vou atrasar", 120, { prazoMin: 20 })
    );
    const apertado = new Set(
      amostra("casa4", "vou atrasar", 120, { prazoMin: 3 })
    );
    const chuva = new Set(
      amostra("casa4", "vou atrasar", 120, { chovendo: true })
    );

    expect([...apertado].filter(t => tranquilo.has(t))).toEqual([]);
    expect([...chuva].filter(t => tranquilo.has(t))).toEqual([]);
  });

  it("quem foi deixado na mao fala disso antes de falar do tempo", () => {
    let bairro: MemoriaDoBairro = {};
    bairro = registrarEntrega(bairro, "casa4", "atrasada");
    const memoria = memoriaDe(bairro, "casa4");

    expect(prateleiraDe({ chovendo: true, prazoMin: 2 }, memoria)).toBe(
      "deu-errado"
    );

    const tranquilo = new Set(
      amostra("casa4", "vou atrasar", 120, { prazoMin: 20 })
    );
    const chateada = new Set(amostra("casa4", "vou atrasar", 120, {}, memoria));
    expect([...chateada].filter(t => tranquilo.has(t))).toEqual([]);
  });

  it("da dezenas de respostas diferentes para a mesma frase", () => {
    const todas = new Set<string>();
    for (const s of [{ prazoMin: 20 }, { prazoMin: 3 }, { chovendo: true }]) {
      for (const t of amostra("casa4", "vou atrasar", 400, s)) todas.add(t);
    }
    expect(todas.size).toBeGreaterThan(100);
  });
});

describe("a memoria desbota — uma entrega ruim nao envenena para sempre", () => {
  it("zera o rancor numa entrega boa e apaga a lembranca velha", () => {
    let bairro: MemoriaDoBairro = {};
    bairro = registrarEntrega(
      bairro,
      "casa12",
      "falhou",
      "ele me deixou sem o jantar dos meninos"
    );
    expect(memoriaDe(bairro, "casa12").seguidasRuins).toBe(1);
    expect(memoriaDe(bairro, "casa12").fatos).toHaveLength(1);

    bairro = registrarEntrega(bairro, "casa12", "no-prazo");
    expect(memoriaDe(bairro, "casa12").seguidasRuins).toBe(0);

    for (let i = 0; i < 6; i++)
      bairro = registrarEntrega(bairro, "casa12", "no-prazo");

    const m = memoriaDe(bairro, "casa12");
    expect(m.fatos).toEqual([]);
    expect(m.entregas).toBe(8);
    expect(intimidade(m)).toBe("de-casa");
  });

  it("resume em poucas linhas o que a pessoa tem na cabeca", () => {
    let bairro: MemoriaDoBairro = {};
    for (let i = 0; i < 4; i++)
      bairro = registrarEntrega(bairro, "casa37", "no-prazo");
    bairro = registrarEntrega(bairro, "casa37", "atrasada");

    const resumo = resumoPara(memoriaDe(bairro, "casa37"));
    expect(resumo).toContain("5 vezes");
    expect(resumo).toContain("ultima atrasou");
    expect(resumo.length).toBeLessThan(240);
  });

  it("quem nunca recebeu nada diz isso, e nao inventa historico", () => {
    expect(resumoPara(MEMORIA_NOVA)).toBe("Nunca recebeu uma entrega dele.");
  });
});

describe("a saida por compromisso", () => {
  const seco = fichaDe("casa34");
  const tagarela = fichaDe("casa4");

  it("quem so fala de trabalho sai antes da tagarela", () => {
    expect(deveSair(2, seco, false)).toBe(true);
    expect(deveSair(2, tagarela, false)).toBe(false);
    expect(deveSair(5, tagarela, false)).toBe(true);
  });

  it("com entrega correndo todo mundo corta mais cedo", () => {
    expect(deveSair(4, tagarela, true)).toBe(true);
    expect(deveSair(4, tagarela, false)).toBe(false);
  });

  it("usa a mania da propria pessoa como desculpa", () => {
    expect(falaDeSaida(tagarela, false, () => 0.1)).toContain("bolo");
    expect(falaDeSaida(seco, false, () => 0.1)).toContain("saindo");
  });

  it("com entrega correndo, empurra o jogador de volta ao trabalho", () => {
    const fala = falaDeSaida(tagarela, true, () => 0.1);
    expect(fala).toMatch(/tá tarde|relógio|some daqui/);
  });

  it("quem e seco sai sem se despedir", () => {
    expect(falaDeSaida(seco, false, () => 0.1)).not.toContain(
      "depois a gente conversa"
    );
  });
});

describe("o portao da inteligencia — so nos momentos extremos", () => {
  const comHistorico = { ...MEMORIA_NOVA, entregas: 5 };

  it("abre na primeira conversa", () => {
    expect(
      momentoExtremo({
        frase: "oi",
        memoria: MEMORIA_NOVA,
        jaConversaram: false,
      })
    ).toBe("primeira-conversa");
  });

  it("abre quando deu errado", () => {
    expect(
      momentoExtremo({
        frase: "to indo",
        memoria: { ...comHistorico, ultima: "falhou", seguidasRuins: 1 },
        jaConversaram: true,
      })
    ).toBe("deu-errado");
  });

  it("abre na pergunta que o bairro nao entende", () => {
    expect(
      momentoExtremo({
        frase: "a senhora torce pra qual time?",
        memoria: comHistorico,
        jaConversaram: true,
      })
    ).toBe("nao-entendeu");
  });

  it("abre nas viradas do jogo", () => {
    expect(
      momentoExtremo({
        frase: "to indo",
        memoria: comHistorico,
        jaConversaram: true,
        viradaDoJogo: true,
      })
    ).toBe("virada-do-jogo");
  });

  it("FICA FECHADO na conversa de trabalho comum", () => {
    for (const frase of ["to indo", "vou atrasar", "quanto paga", "valeu"]) {
      expect(
        momentoExtremo({ frase, memoria: comHistorico, jaConversaram: true })
      ).toBeNull();
    }
  });

  it("deixa passar menos de um quarto das mensagens de uma partida", () => {
    const ids = Object.keys(CASAS).map(n => `casa${n}`);
    const frases = [
      "to indo",
      "vou atrasar",
      "quanto paga",
      "onde e",
      "valeu",
      "bom dia",
      "aceito",
      "nao vai dar",
      "a senhora gosta de futebol?",
    ];
    let bairro: MemoriaDoBairro = {};
    let passaram = 0;
    const total = 1000;

    /*
     * A ENTREGA E CONTADA POR CASA, E NAO PELA VOLTA DO LACO.
     *
     * Antes era "a cada tres mensagens, uma entrega" — e isso escondia uma
     * armadilha de aritmetica: quando o numero de casas e multiplo de tres, os
     * dois ciclos entram em fase e DOIS TERCOS DAS CASAS nunca recebem entrega
     * nenhuma. Todas elas ficam para sempre na primeira conversa, o portao
     * abre em todas, e o teste acusa um defeito que nao existe no jogo — foi
     * exatamente o que aconteceu no dia em que o bairro passou de 47 para 48.
     *
     * Contando as visitas de cada casa, o ritmo e o mesmo para todo mundo,
     * tenha o bairro 47, 48 ou 300 portas.
     */
    const visitas: Record<string, number> = {};

    for (let i = 0; i < total; i++) {
      const id = ids[i % ids.length];
      const m = memoriaDe(bairro, id);
      if (
        momentoExtremo({
          frase: frases[i % frases.length],
          memoria: m,
          jaConversaram: m.entregas > 0,
        })
      )
        passaram++;
      visitas[id] = (visitas[id] ?? 0) + 1;
      if (visitas[id] % 3 === 0)
        bairro = registrarEntrega(bairro, id, "no-prazo");
    }

    expect(passaram / total).toBeLessThan(0.25);
  });
});

/**
 * NENHUM PEDACO DITO DUAS VEZES NA MESMA FRASE.
 *
 * Achado em 13/09/2026 ao gerar o arquivo do elenco: "To aqui, como sempre" +
 * o tempero "como sempre" saía como "To aqui, como sempre, como sempre".
 * Quatro falas em 650. Nada denuncia mais depressa que a frase e montada por
 * maquina do que um pedaco repetido — e o conserto foi tirar da sacola, antes
 * do sorteio, o que o miolo ja disse.
 */
const DE_CASA = {
  entregas: 12,
  ultima: "no-prazo" as const,
  seguidasRuins: 0,
  fatos: [],
  maniaJaDita: true,
};
const RUIM = {
  entregas: 5,
  ultima: "falhou" as const,
  seguidasRuins: 2,
  fatos: [],
  maniaJaDita: true,
};

describe("nenhuma fala repete um pedaco de si mesma", () => {
  it("nas falas de todo o elenco, em todas as prateleiras", () => {
    const repetidas: string[] = [];
    let sorteio = 0.12345;
    const proximo = () => {
      sorteio = (sorteio * 9301 + 0.49297) % 1;
      return sorteio;
    };

    for (const numero of Object.keys(CASAS)) {
      const ficha = CASAS[Number(numero)]!;
      for (const situacao of [
        {},
        { prazoMin: 3 },
        { chovendo: true },
        { hora: 7 },
      ]) {
        for (const memoria of [MEMORIA_NOVA, DE_CASA, RUIM]) {
          for (let i = 0; i < 4; i += 1) {
            const fala = montarFala({
              frase: "to indo",
              boca: "pessoa",
              ficha,
              memoria,
              situacao,
              sorteio: proximo,
            });
            const pedacos = fala.texto
              .split(/,\s*/)
              .map(p => p.trim().toLowerCase())
              .filter(Boolean);
            const vistos = new Set<string>();
            for (const pedaco of pedacos) {
              if (vistos.has(pedaco)) repetidas.push(fala.texto);
              vistos.add(pedaco);
            }
          }
        }
      }
    }

    expect(repetidas.slice(0, 5)).toEqual([]);
  });
});
