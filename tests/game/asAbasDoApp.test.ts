/**
 * AS ABAS DO RODAPE — o que esta no ar, e o desenho de cada uma.
 *
 * O que estes testes protegem e o defeito que quase passou: o desenho de cada
 * aba vinha da POSICAO dela na barra. Tirar tres abas do ar teria trocado
 * todos os icones de lugar — a barra ficaria com as figuras erradas e nenhum
 * erro apareceria em lugar nenhum.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  ABAS_DO_APP,
  ESCONDIDAS,
  NO_AR,
  abaValida,
  estaNoAr,
} from "@/game/xbwapp/asAbasDoApp";

const FOLHA = readFileSync("client/src/styles/xbwapp.css", "utf8");
const TELA = readFileSync(
  "client/src/components/xbwapp/XBWApp.tsx",
  "utf8"
);

describe("quais abas aparecem", () => {
  it("as tres que ele mandou tirar estao fora do ar", () => {
    expect([...ESCONDIDAS].sort()).toEqual([
      "atualizacoes",
      "ligacoes",
      "recibo",
    ]);
    /*
     * PEDIDOS entrou em 14/09/2026 e fica no MEIO da barra, e nao no fim: e o
     * polegar que decide a ordem, e o meio e onde ele cai parado.
     */
    expect(NO_AR.map(a => a.nome)).toEqual([
      "conversas",
      "contatos",
      "pedidos",
      "ferramentas",
      "entregaRapida",
    ]);
  });

  it("escondida nao e apagada: as guardadas continuam existindo", () => {
    expect(ABAS_DO_APP).toHaveLength(8);
    for (const escondida of ESCONDIDAS) {
      expect(ABAS_DO_APP.some(a => a.nome === escondida)).toBe(true);
    }
  });

  it("abrir numa aba escondida cai na primeira que existe", () => {
    expect(abaValida("recibo")).toBe("conversas");
    expect(abaValida(undefined)).toBe("conversas");
    expect(abaValida("entregaRapida")).toBe("entregaRapida");
  });

  it("estaNoAr responde pelas duas pontas", () => {
    expect(estaNoAr("conversas")).toBe(true);
    expect(estaNoAr("ligacoes")).toBe(false);
  });
});

describe("o desenho de cada aba", () => {
  it("e escolhido pelo NOME, e nunca pela posicao na barra", () => {
    expect(
      FOLHA,
      "voltou a escolher o icone por posicao: tirar uma aba troca todos"
    ).not.toMatch(/\.xbw-abas .xbw-aba:nth-child\(\d\)/);
    for (const aba of ABAS_DO_APP) {
      expect(FOLHA, `sem desenho para ${aba.nome}`).toContain(
        `.xbw-aba[data-aba="${aba.nome}"]`
      );
    }
  });

  it("a tela escreve o nome da aba, que e o que o desenho procura", () => {
    expect(TELA).toContain("data-aba={nome}");
  });
});

describe("o icone que chama", () => {
  it("a aba avisa quando tem recado esperando", () => {
    expect(TELA).toContain('data-chamando={aviso ? "sim" : undefined}');
  });

  it("o piscar so existe com recado, e para sozinho quando zera", () => {
    expect(FOLHA).toContain('.xbw-aba[data-chamando="sim"] .xbw-aba__icone');
    expect(FOLHA).toContain("@keyframes xbw-aba-chamando");
  });

  it("quem pede menos movimento recebe a cor, e nao o pulo", () => {
    const reduzido = FOLHA.slice(FOLHA.indexOf("@keyframes xbw-aba-chamando"));
    expect(reduzido).toContain("prefers-reduced-motion");
  });
});

describe("o botao de voltar ao mapa", () => {
  it("fica no meio da faixa de cima", () => {
    const faixa = FOLHA.slice(FOLHA.lastIndexOf(".xbw__sair {"));
    expect(faixa).toContain("left: 50%");
    expect(faixa).toContain("translateX(-50%)");
  });

  it("a faixa e a primeira linha do aplicativo", () => {
    const canto = FOLHA.slice(FOLHA.lastIndexOf(".xbw__canto {"));
    expect(canto).toContain("order: -1");
  });
});

/**
 * O NOME DO APLICATIVO E A PLACA CLARA.
 *
 * Ordem dele, 13/09/2026: "suba no canto superior XBWAPP, e suba mais tela
 * cinza". O nome saiu da barra que ficava em cima da lista e foi para a faixa
 * do alto; a barra sumiu, e a placa subiu no lugar dela.
 *
 * O que este teste guarda e a consequencia: se alguem devolver aquela barra
 * para a lista de conversas, a placa desce de novo e ninguem percebe.
 */
describe("o nome do aplicativo", () => {
  it("mora na faixa de cima, junto da saida e do selo", () => {
    const app = readFileSync(
      "client/src/components/xbwapp/XBWApp.tsx",
      "utf8"
    );
    const canto = app.slice(app.indexOf('className="xbw__canto"'));
    expect(canto).toContain('className="xbw__nome"');
    expect(FOLHA).toContain(".xbw__nome {");
  });

  it("a lista de conversas nao tem mais barra de titulo por cima", () => {
    const lista = readFileSync(
      "client/src/components/xbwapp/TelaConversas.tsx",
      "utf8"
    );
    /* O cabecalho so pode aparecer dentro das arquivadas, que e a volta. */
    const cabecalhos = lista.match(/xbw-topo xbw-topo--marca/g) ?? [];
    expect(cabecalhos).toHaveLength(1);
    expect(lista).toContain("{vendoArquivadas && (");
  });
});

/**
 * A PLACA CLARA DOS CONTATOS, E A BARRA DE ROLAGEM.
 *
 * Ordem dele, 13/09/2026: "precisamos que contatos tenha padrao tela cinza, e
 * barra de rolagem".
 *
 * A tela de contatos nascia escura e sem rolagem — e nao rolava por um motivo
 * escondido: a regra geral das telas manda `overflow: hidden` com forca, entao
 * pedir rolagem NA TELA nao adianta nada. Quem precisa rolar e a lista.
 *
 * Este teste guarda as duas coisas de uma vez: o mesmo papel claro da lista de
 * conversas, e a rolagem no lugar certo.
 */
describe("a agenda de contatos", () => {
  const AGENDA = FOLHA.slice(FOLHA.indexOf(".xbw-agenda {"));
  const ROLAGEM = FOLHA.slice(FOLHA.indexOf(".xbw-rolagem {"));
  const TELA = readFileSync(
    "client/src/components/xbwapp/TelaContatos.tsx",
    "utf8"
  );
  const PECA = readFileSync(
    "client/src/components/xbwapp/ARolagem.tsx",
    "utf8"
  );

  it("usa o mesmo papel claro da lista de conversas", () => {
    const placa = ROLAGEM.slice(ROLAGEM.indexOf('[data-aspecto="placa"]'));
    expect(placa).toContain("background-color: #eef2f6");
    expect(placa).toContain("XBW_papel-claro.webp");
  });

  it("quem rola e a lista, nao a tela", () => {
    const tela = AGENDA.slice(0, AGENDA.indexOf(".xbw-agenda__lista"));
    expect(tela).toContain("overflow: hidden");
    expect(ROLAGEM).toContain("flex: 1 1 auto");
    expect(ROLAGEM).toContain("min-height: 0");
    expect(ROLAGEM).toContain("overflow-y: auto");
  });

  /*
   * A armadilha que custou duas rodadas: o aplicativo esconde TODA barra de
   * rolagem com forca, e mesmo devolvendo a barra so nesta tela o navegador do
   * jogo desenha uma barra flutuante, que some com a tela parada. Por isso a
   * barra e desenhada a mao — e tem de continuar sendo.
   */
  it("a barra de rolagem e desenhada a mao, e fica sempre a vista", () => {
    expect(FOLHA).toContain(".xbw *::-webkit-scrollbar{display:none");
    expect(ROLAGEM).toContain(".xbw-rolagem__trilho {");
    expect(ROLAGEM).toContain(".xbw-rolagem__polegar {");
    expect(PECA).toContain('className="xbw-rolagem__trilho"');
    expect(PECA).toContain('className="xbw-rolagem__polegar"');
  });

  /* Uma barra so, para todas as telas: duas seriam duas para manter. */
  it("a barra e uma peca comum, e nao copia em cada tela", () => {
    expect(TELA).toContain('import Rolagem from "./ARolagem"');
    expect(TELA).toContain("<Rolagem");
    expect(TELA).not.toContain("scrollHeight");
  });

  it("o polegar conta quanto da lista esta a vista", () => {
    expect(PECA).toContain("scrollHeight");
    expect(PECA).toContain("clientHeight");
    expect(PECA).toContain("scrollTop");
    /* Some quando tudo cabe: barra parada de ponta a ponta nao informa nada. */
    expect(PECA).toContain("{!cabe && (");
  });

  it("o texto escurece, porque o fundo clareou", () => {
    const lista = AGENDA.slice(AGENDA.indexOf(".xbw-agenda__lista strong {"));
    expect(lista).toContain("#0b1b2e");
  });
});
