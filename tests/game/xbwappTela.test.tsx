import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import XBWApp from "../../client/src/components/xbwapp/XBWApp";

/**
 * O XBWAPP MONTADO.
 *
 * Mil linhas de tela que nunca foram montadas sao mil linhas que ninguem sabe
 * se montam. Este teste desenha o aplicativo inteiro em texto — sem navegador,
 * sem jsdom — so para provar que ele nasce sem quebrar e que a primeira tela
 * mostra o que deve mostrar.
 *
 * Ele nao clica em nada: efeito de React nao roda no desenho em texto. O que
 * responde por clique e conversa sao os testes das regras, que rodam sem tela.
 */
function desenhar() {
  return renderToStaticMarkup(
    <XBWApp aoFechar={() => {}} entregador={{ nome: "Téo" }} />
  );
}

describe("o XBWAPP montado", () => {
  it("monta sem quebrar", () => {
    expect(() => desenhar()).not.toThrow();
  });

  it("abre na lista de conversas, com a marca no alto", () => {
    const html = desenhar();
    expect(html).toContain("XBW");
    expect(html).toContain("Pesquisar");
  });

  /*
   * Ordem dele, 07/09/2026: "SEM MENSAGENS AUTOMATICAS". O aplicativo nascia
   * com tres conversas ja cheias de recado nao lido. Este teste guarda o
   * contrario: ele abre limpo, e so aparece o que alguem escreveu.
   */
  it("abre sem nenhuma conversa: ninguem fala sozinho", () => {
    const html = desenhar();
    expect(html).toContain("Nenhuma conversa ainda");
    expect(html).not.toContain("Bom dia! Tem um pedido pronto");
  });

  /*
   * Ordem dele, 07/09/2026: "ICONES DE CONVERSAS, RECADOS, LOJA, CHAMADAS,
   * AJUSTES, ISTO NÃO E O QUE EXISTE DE FATO NO WHATS APP REAL, QUERO O QUE
   * REALMENTE EXISTE". As abas agora sao as quatro do WhatsApp Business.
   */
  it("tem as quatro abas do WhatsApp Business", () => {
    const html = desenhar();
    for (const aba of [
      "Conversas",
      "Atualizações",
      "Ligações",
      "Ferramentas",
    ]) {
      expect(html).toContain(aba);
    }
  });

  it("não tem mais as abas que o WhatsApp real não tem", () => {
    const html = desenhar();
    expect(html).not.toContain(">Recados<");
    expect(html).not.toContain(">Loja<");
    expect(html).not.toContain(">Ajustes<");
  });

  it("usa os desenhos que ele mandou, e nao emoji no lugar de icone", () => {
    const html = desenhar();
    expect(html).toContain("/assets/xbwapp/XBW_");
  });

  it("da sempre um jeito de voltar para o mapa", () => {
    expect(desenhar()).toContain("Voltar ao mapa");
  });
});
