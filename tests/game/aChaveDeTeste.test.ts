/**
 * O CAMPO DA CHAVE NA TELA DE AJUSTES — e o que ele nunca pode deixar escapar.
 *
 * Ordem dele, 13/09/2026: "COMO O GAME AINDA ESTA EM TESTE, CRIE UM CAMPO
 * NESSA PAGINA PARA INSERIR CHAVE".
 *
 * Campo de chave é o tipo de coisa que funciona na primeira tarde e vaza na
 * terceira. Estes testes seguram as quatro maneiras de isso acontecer:
 *
 *   · a chave voltar inteira para a tela depois de guardada;
 *   · uma "chave" com quebra de linha dentro virar cabeçalho extra no pedido
 *     ao fornecedor — a falha clássica de quem monta cabeçalho com texto de
 *     fora;
 *   · a chave entrar no pedido que vai para a inteligência, onde ela poderia
 *     sair escrita dentro de uma resposta;
 *   · o jogo parar de tentar para sempre depois de uma recusa, e a chave nova
 *     só valer na próxima partida.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  COMECO_DA_CHAVE,
  LETRAS_MAXIMAS,
  LETRAS_MINIMAS,
  chaveDeTeste,
  esquecerChaveDeTeste,
  fimDaChave,
  guardarChaveDeTeste,
  pareceChave,
} from "../../client/src/game/xbwapp/aChaveDeTeste";
import {
  esquecerSeIaEstaAcoplada,
  pedirResposta,
} from "../../client/src/game/xbwapp/atendimento";
import { arrumarPedido } from "../../server/xbwapp-atendimento.mjs";
import {
  LETRAS_MAXIMAS_DA_CHAVE,
  chaveDoPedido,
  instrucaoComMemoria,
} from "../../server/xbwapp-ia-gratuita.mjs";

/** Uma chave com a cara de uma chave de verdade — e que não é uma. */
const CHAVE_DE_MENTIRA = COMECO_DA_CHAVE + "a".repeat(40) + "9ZqT";

/** A gaveta do navegador não existe no Node: aqui vai uma de mentira. */
function gavetaDeMentira(): Storage {
  const dentro = new Map<string, string>();
  return {
    get length() {
      return dentro.size;
    },
    clear: () => dentro.clear(),
    getItem: (k: string) => dentro.get(k) ?? null,
    key: (i: number) => [...dentro.keys()][i] ?? null,
    removeItem: (k: string) => void dentro.delete(k),
    setItem: (k: string, v: string) => void dentro.set(k, v),
  } as Storage;
}

describe("a chave digitada na tela", () => {
  beforeEach(() => {
    (globalThis as { localStorage?: Storage }).localStorage = gavetaDeMentira();
    esquecerSeIaEstaAcoplada();
  });

  afterEach(() => {
    delete (globalThis as { localStorage?: Storage }).localStorage;
  });

  it("guarda e devolve a chave", () => {
    expect(chaveDeTeste()).toBe("");
    expect(guardarChaveDeTeste(CHAVE_DE_MENTIRA)).toBe(true);
    expect(chaveDeTeste()).toBe(CHAVE_DE_MENTIRA);
    esquecerChaveDeTeste();
    expect(chaveDeTeste()).toBe("");
  });

  it("recusa o que não é chave, em vez de guardar lixo", () => {
    for (const engano of [
      "",
      "   ",
      "minha chave",
      "gsk_curta",
      "sk-de-outro-lugar-com-tamanho-suficiente",
      COMECO_DA_CHAVE + "a".repeat(LETRAS_MAXIMAS + 10),
      COMECO_DA_CHAVE + "abc\ndef" + "x".repeat(30),
    ]) {
      expect(pareceChave(engano), engano).toBe(false);
      expect(guardarChaveDeTeste(engano), engano).toBe(false);
    }
    expect(chaveDeTeste()).toBe("");
  });

  it("uma chave curta demais não passa", () => {
    const curta = COMECO_DA_CHAVE + "a".repeat(LETRAS_MINIMAS - 10);
    expect(pareceChave(curta)).toBe(false);
  });

  /*
   * Esta é a que importa: depois de guardada, a chave não volta para a tela.
   * Mostrar o fim dela basta para conferir qual está ligada.
   */
  it("nunca mostra a chave inteira de volta", () => {
    guardarChaveDeTeste(CHAVE_DE_MENTIRA);
    const mostrado = fimDaChave();
    expect(mostrado).not.toContain(CHAVE_DE_MENTIRA);
    expect(mostrado).not.toContain(COMECO_DA_CHAVE);
    expect(mostrado.length).toBeLessThan(10);
    expect(mostrado.endsWith(CHAVE_DE_MENTIRA.slice(-4))).toBe(true);
  });

  it("sem chave guardada não mostra nada", () => {
    expect(fimDaChave()).toBe("");
  });
});

describe("a chave viaja com o pedido", () => {
  beforeEach(() => {
    (globalThis as { localStorage?: Storage }).localStorage = gavetaDeMentira();
    esquecerSeIaEstaAcoplada();
  });

  afterEach(() => {
    delete (globalThis as { localStorage?: Storage }).localStorage;
  });

  const situacao = {
    personagem: "casa4",
    quem: "Dona Sebastiana",
    tipo: "pessoa",
  };
  const historico = [{ de: "voce" as const, texto: "oi" }];

  function fingirServidor(): {
    buscar: typeof fetch;
    corpos: () => unknown[];
  } {
    const corpos: unknown[] = [];
    const buscar = (async (_url: string, opcoes: RequestInit) => {
      corpos.push(JSON.parse(String(opcoes.body)));
      return {
        ok: true,
        status: 200,
        json: async () => ({ texto: "oi, tudo bem?", intencao: "conversa" }),
      };
    }) as unknown as typeof fetch;
    return { buscar, corpos: () => corpos };
  }

  it("leva a chave quando existe uma guardada", async () => {
    guardarChaveDeTeste(CHAVE_DE_MENTIRA);
    const servidor = fingirServidor();
    await pedirResposta(situacao, historico, servidor.buscar);
    const corpo = servidor.corpos()[0] as { chave?: string };
    expect(corpo.chave).toBe(CHAVE_DE_MENTIRA);
  });

  it("não leva campo nenhum quando não há chave", async () => {
    const servidor = fingirServidor();
    await pedirResposta(situacao, historico, servidor.buscar);
    const corpo = servidor.corpos()[0] as Record<string, unknown>;
    expect("chave" in corpo).toBe(false);
  });

  /*
   * O jogo desiste da inteligência na primeira recusa por falta de chave, para
   * não bater no servidor a cada frase digitada. Com a chave na mão, essa
   * desistência não pode valer — senão a chave nova só funcionaria na próxima
   * partida, e quem está testando não entenderia por quê.
   */
  it("a chave desfaz a desistência de quem já ouviu 'sem chave'", async () => {
    const recusar = (async () => ({
      ok: false,
      status: 503,
      json: async () => ({ falha: "sem-chave" }),
    })) as unknown as typeof fetch;

    const primeira = await pedirResposta(situacao, historico, recusar);
    expect(primeira).toEqual({ falha: "sem-chave" });

    // Sem chave, nem tenta de novo: nem chega a chamar o servidor.
    let bateu = 0;
    const contar = (async () => {
      bateu += 1;
      return {
        ok: true,
        status: 200,
        json: async () => ({ texto: "oi", intencao: "conversa" }),
      };
    }) as unknown as typeof fetch;
    await pedirResposta(situacao, historico, contar);
    expect(bateu).toBe(0);

    // Com chave, volta a tentar.
    guardarChaveDeTeste(CHAVE_DE_MENTIRA);
    await pedirResposta(situacao, historico, contar);
    expect(bateu).toBe(1);
  });
});

describe("o servidor confere a chave antes de usar", () => {
  it("aceita uma chave de formato normal", () => {
    expect(chaveDoPedido({ chave: CHAVE_DE_MENTIRA })).toBe(CHAVE_DE_MENTIRA);
    expect(chaveDoPedido({ chave: "  " + CHAVE_DE_MENTIRA + "  " })).toBe(
      CHAVE_DE_MENTIRA
    );
  });

  /*
   * A chave vira um cabeçalho no pedido ao fornecedor, e cabeçalho aceita
   * quebra de linha. Um texto com "\n" dentro poderia acrescentar cabeçalhos
   * que ninguém pediu. Por isso só passa letra, número, traço e sublinhado.
   */
  it("recusa quebra de linha e tudo que não é chave", () => {
    for (const engano of [
      undefined,
      null,
      42,
      "",
      "   ",
      "gsk_boa\nauthorization: Bearer outra",
      "gsk_boa\r\nx-coisa: 1",
      "gsk com espaço",
      "gsk_" + "a".repeat(LETRAS_MAXIMAS_DA_CHAVE + 1),
    ]) {
      expect(chaveDoPedido({ chave: engano }), String(engano)).toBe("");
    }
    expect(chaveDoPedido(null)).toBe("");
    expect(chaveDoPedido("texto solto")).toBe("");
  });

  /*
   * A chave não pode nem encostar no que vai para a inteligência: de lá ela
   * poderia voltar escrita dentro de uma resposta, na tela do jogador.
   */
  it("a chave não entra no pedido que vai para a inteligência", () => {
    const pedido = arrumarPedido({
      chave: CHAVE_DE_MENTIRA,
      situacao: {
        personagem: "casa4",
        quem: "Dona Sebastiana",
        tipo: "pessoa",
      },
      historico: [{ de: "voce", texto: "oi" }],
    });
    expect(pedido).not.toBeNull();
    expect(JSON.stringify(pedido)).not.toContain(CHAVE_DE_MENTIRA);
    expect(JSON.stringify(pedido)).not.toContain("chave");
  });
});

/**
 * O CONSERTO QUE APARECEU JUNTO.
 *
 * A memória do morador é guardada DENTRO de `situacao` por quem arruma o
 * pedido, e o caminho da inteligência gratuita a lia um nível acima — num
 * campo que nunca existiu. Resultado: a lembrança, que é justamente o que
 * dispensa a inteligência de deduzir qualquer coisa, nunca chegava nela.
 */
describe("a lembrança do morador chega na instrução", () => {
  it("a instrução carrega o que a pessoa lembra e por que está falando", () => {
    const instrucao = instrucaoComMemoria(
      { quem: "Dona Sebastiana", tipo: "pessoa" },
      "Você já entregou 9 vezes para ela. A última foi no prazo.",
      "É a primeira vez que vocês conversam."
    );
    expect(instrucao).toContain("Você já entregou 9 vezes");
    expect(instrucao).toContain("É a primeira vez");
    // O bloco do JSON tem de continuar sendo a última coisa que o modelo lê.
    expect(instrucao.indexOf("Responda SOMENTE")).toBeGreaterThan(
      instrucao.indexOf("Você já entregou 9 vezes")
    );
  });

  it("quem arruma o pedido guarda a lembrança dentro de situacao", () => {
    const pedido = arrumarPedido({
      situacao: {
        personagem: "casa4",
        quem: "Dona Sebastiana",
        tipo: "pessoa",
        lembranca: "Você já entregou 9 vezes para ela.",
        momento: "É a primeira vez que vocês conversam.",
      },
      historico: [{ de: "voce", texto: "oi" }],
    }) as { situacao: { lembranca?: string; momento?: string } } | null;
    expect(pedido?.situacao.lembranca).toContain("9 vezes");
    expect(pedido?.situacao.momento).toContain("primeira vez");
  });
});
