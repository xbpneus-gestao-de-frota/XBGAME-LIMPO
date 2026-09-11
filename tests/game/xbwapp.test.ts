import { describe, expect, it } from "vitest";
import {
  TETO_DE_GORJETA,
  TETO_DE_PRAZO_MIN,
  REPUTACAO_MAXIMA,
  REPUTACAO_MINIMA,
  comoEstaAReputacao,
  somarEfeito,
  somarReputacao,
} from "../../client/src/game/xbwapp/efeitos";
import {
  abrirConversa,
  apagar,
  conversasOrdenadas,
  estadoInicial,
  hora,
  mensagensDa,
  passoAtual,
  porNoCarrinho,
  responder,
  semear,
  totalNaoLidas,
} from "../../client/src/game/xbwapp/estado";
import {
  cabeNaMochila,
  catalogoDa,
  freteDoPedido,
  pesoDoCarrinho,
} from "../../client/src/game/xbwapp/catalogo";
import {
  PRAZO_MINIMO_MIN,
  prazoEmMinutos,
} from "../../client/src/game/xbwapp/distancias";
import { ROTEIROS, roteiroDe } from "../../client/src/game/xbwapp/roteiros";
import { CONTATOS } from "../../client/src/game/xbwapp/contatos";

/**
 * As regras do XBWAPP.
 *
 * Ele pediu o aplicativo completo e escolheu que a conversa "mexe em tudo" —
 * prazo, pagamento, gorjeta e reputacao. Conversa que mexe em dinheiro precisa
 * de teto, e teto so vale se alguem cobrar. E o que este arquivo faz.
 */

describe("o aplicativo por dentro", () => {
  it("acorda com recado esperando, para a lista ter o que mostrar", () => {
    const estado = semear(estadoInicial(), ["padaria", "grupo-bairro", "xb"]);
    expect(totalNaoLidas(estado)).toBe(3);
    expect(conversasOrdenadas(estado).length).toBe(3);
  });

  it("nao entrega a mesma fala duas vezes ao abrir a conversa", () => {
    const estado = semear(estadoInicial(), ["padaria"]);
    // A contagem de falas entregues mora no estado justamente para isto.
    expect(estado.entregues.padaria).toBe(1);
    expect(mensagensDa(estado, "padaria")).toHaveLength(1);
  });

  it("abrir a conversa zera as nao lidas, e so as daquela conversa", () => {
    const estado = semear(estadoInicial(), ["padaria", "xb"]);
    const depois = abrirConversa(estado, "padaria");
    expect(depois.naoLidas.padaria).toBeUndefined();
    expect(depois.naoLidas.xb).toBe(1);
  });

  it("responder poe a sua fala na conversa, soma o efeito e anda o roteiro", () => {
    const inicio = estadoInicial();
    const resposta = {
      texto: "Tô indo agora",
      efeito: { gorjeta: 3 },
      vaiPara: "aceitou",
    };
    const depois = responder(inicio, "padaria", resposta);
    expect(mensagensDa(depois, "padaria")[0]?.de).toBe("voce");
    expect(depois.acumulado.gorjeta).toBe(3);
    expect(passoAtual(depois, "padaria")).toBe("aceitou");
    // Passo novo, contagem nova: o passo seguinte comeca do zero.
    expect(depois.entregues.padaria).toBe(0);
  });

  it("apagar deixa rastro em vez de abrir buraco na conversa", () => {
    const estado = semear(estadoInicial(), ["padaria"]);
    const id = mensagensDa(estado, "padaria")[0]!.id;
    const depois = apagar(estado, id);
    expect(mensagensDa(depois, "padaria")[0]?.texto).toBe("Mensagem apagada");
  });

  it("as conversas fixadas ficam em cima das mais recentes", () => {
    const estado = semear(estadoInicial(), ["padaria", "xb"]);
    // O Renan ja nasce fixado; a padaria e a xb, nao.
    const comRenan = semear(estado, ["renan"]);
    expect(conversasOrdenadas(comRenan)[0]).toBe("renan");
  });

  it("o relogio do jogo vira hora de tela", () => {
    expect(hora(9 * 60)).toBe("09:00");
    expect(hora(750)).toBe("12:30");
  });
});

describe("o que a conversa mexe no jogo", () => {
  it("segura a gorjeta no teto, por mais que a pessoa fale bonito", () => {
    let acumulado = { minutosDePrazo: 0, gorjeta: 0, parteDoFrete: 0 };
    for (let i = 0; i < 10; i += 1)
      acumulado = somarEfeito(acumulado, { gorjeta: 5 });
    expect(acumulado.gorjeta).toBe(TETO_DE_GORJETA);
  });

  it("segura o prazo esticado no teto", () => {
    let acumulado = { minutosDePrazo: 0, gorjeta: 0, parteDoFrete: 0 };
    for (let i = 0; i < 10; i += 1)
      acumulado = somarEfeito(acumulado, { minutosDePrazo: 6 });
    expect(acumulado.minutosDePrazo).toBe(TETO_DE_PRAZO_MIN);
  });

  it("a reputacao nunca sai da regua", () => {
    expect(somarReputacao(98, { reputacao: 20 })).toBe(REPUTACAO_MAXIMA);
    expect(somarReputacao(3, { reputacao: -50 })).toBe(REPUTACAO_MINIMA);
  });

  it("a reputacao vira palavra, porque numero cru nao muda decisao", () => {
    expect(comoEstaAReputacao(90)).toBe("de confiança");
    expect(comoEstaAReputacao(50)).toBe("normal");
    expect(comoEstaAReputacao(5)).toBe("queimado");
  });

  it("efeito ausente nao mexe em nada", () => {
    const zero = { minutosDePrazo: 0, gorjeta: 0, parteDoFrete: 0 };
    expect(somarEfeito(zero, undefined)).toEqual(zero);
  });
});

describe("a loja", () => {
  it("o carrinho e de uma loja so: trocar de loja limpa o que estava la", () => {
    const comPao = porNoCarrinho(estadoInicial(), "padaria", "pao", 2);
    const trocou = porNoCarrinho(comPao, "farmacia", "remedio", 1);
    expect(trocou.carrinho).toHaveLength(1);
    expect(trocou.lojaDoCarrinho).toBe("farmacia");
  });

  it("tirar o ultimo item apaga a linha em vez de deixar quantidade zero", () => {
    const um = porNoCarrinho(estadoInicial(), "padaria", "pao", 1);
    const nenhum = porNoCarrinho(um, "padaria", "pao", -1);
    expect(nenhum.carrinho).toHaveLength(0);
  });

  it("o peso e que decide se cabe na mochila, nao a quantidade", () => {
    // Seis caixas de leite pesam 6 kg; a mochila de nivel 1 leva 4.
    const pesado = [{ produto: "leite", quantidade: 1 }];
    expect(pesoDoCarrinho(pesado)).toBeCloseTo(6, 5);
    expect(cabeNaMochila(pesado, 1)).toBe(false);
    expect(cabeNaMochila(pesado, 2)).toBe(true);
  });

  it("o frete vem da conta do jogo: mais quilometro, mais frete", () => {
    const itens = [{ produto: "pao", quantidade: 1 }];
    expect(freteDoPedido(itens, 3)).toBeGreaterThan(freteDoPedido(itens, 1));
  });

  it("toda loja do aplicativo tem catalogo", () => {
    for (const loja of CONTATOS.filter(c => c.tipo === "loja")) {
      expect(catalogoDa(loja.id).length).toBeGreaterThan(0);
    }
  });
});

describe("o prazo sai do bairro, e nao da cabeca de alguem", () => {
  it("nunca fica abaixo do minimo, nem na porta ao lado", () => {
    expect(prazoEmMinutos("padaria", "casa8")).toBeGreaterThanOrEqual(
      PRAZO_MINIMO_MIN
    );
  });

  it("a casa mais longe nunca tem prazo menor que a mais perto", () => {
    const perto = prazoEmMinutos("padaria", "casa8");
    const longe = prazoEmMinutos("padaria", "casa34");
    expect(longe).toBeGreaterThanOrEqual(perto);
  });
});

describe("os roteiros", () => {
  it("toda resposta aponta para um passo que existe", () => {
    for (const roteiro of ROTEIROS) {
      expect(roteiro.passos[roteiro.inicio]).toBeDefined();
      for (const passo of Object.values(roteiro.passos)) {
        for (const resposta of passo.respostas ?? []) {
          if (!resposta.vaiPara) continue;
          expect(
            roteiro.passos[resposta.vaiPara],
            `${roteiro.conversa}: "${resposta.texto}" leva a um passo que nao existe`
          ).toBeDefined();
        }
      }
    }
  });

  it("toda conversa com roteiro existe na lista de contatos", () => {
    const ids = new Set(CONTATOS.map(c => c.id));
    for (const roteiro of ROTEIROS)
      expect(ids.has(roteiro.conversa)).toBe(true);
  });

  it("nenhum passo fica sem saida e sem fim: ou tem resposta, ou termina a fala", () => {
    for (const roteiro of ROTEIROS) {
      for (const [nome, passo] of Object.entries(roteiro.passos)) {
        expect(
          passo.falas.length,
          `${roteiro.conversa}/${nome} nao fala nada`
        ).toBeGreaterThan(0);
      }
    }
  });

  it("a padaria e a farmacia sabem aceitar e recusar a coleta", () => {
    for (const conversa of ["padaria", "farmacia"]) {
      const respostas = Object.values(roteiroDe(conversa)!.passos).flatMap(
        p => p.respostas ?? []
      );
      expect(respostas.some(r => r.efeito?.aceitaColeta)).toBe(true);
      expect(respostas.some(r => r.efeito?.recusaColeta)).toBe(true);
    }
  });

  it("nenhum efeito de uma resposta estoura sozinho os tetos do equilibrio", () => {
    for (const roteiro of ROTEIROS) {
      for (const passo of Object.values(roteiro.passos)) {
        for (const r of passo.respostas ?? []) {
          expect(Math.abs(r.efeito?.gorjeta ?? 0)).toBeLessThanOrEqual(
            TETO_DE_GORJETA
          );
          expect(Math.abs(r.efeito?.minutosDePrazo ?? 0)).toBeLessThanOrEqual(
            TETO_DE_PRAZO_MIN
          );
        }
      }
    }
  });
});
