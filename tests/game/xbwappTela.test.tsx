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

  /*
   * Ordem dele, 12/09/2026: tirar "Pesquisar" e "Todos os contatos" da
   * primeira tela, para a placa clara crescer. O que tem de estar no alto e a
   * marca; o campo de pesquisa saiu (continua no codigo, atras da chave).
   */
  it("abre na lista de conversas, com a marca no alto e sem os dois campos", () => {
    const html = desenhar();
    expect(html).toContain("XBW");
    expect(html).toContain("xbw-conversas");
    expect(html).not.toContain("Pesquisar");
    expect(html).not.toContain("Todos os contatos");
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
  /*
   * Ordem dele, 13/09/2026: "retire do app por enquanto recibo, ligacoes,
   * atualizacoes". Eram quatro abas; hoje sao tres no ar. As escondidas
   * continuam existindo no codigo — quem guarda isso e `asAbasDoApp`.
   */
  it("tem as quatro abas que estao no ar", () => {
    const html = desenhar();
    for (const aba of [
      "Conversas",
      "Contatos",
      "Ferramentas",
      "Equipe",
    ]) {
      expect(html).toContain(aba);
    }
  });

  it("as tres que ele tirou nao aparecem no rodape", () => {
    const html = desenhar();
    for (const fora of ["Atualizações", "Ligações", "Recibo"]) {
      expect(html, `${fora} voltou ao rodape sem ninguem pedir`).not.toContain(
        `<small>${fora}</small>`
      );
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
    // Ordem dele, 12/09/2026: o botao passou a se chamar "Voltar ao game" e
    // mora no canto de cima, com o selo da XB, em toda tela.
    expect(desenhar()).toContain("Voltar ao game");
    expect(desenhar()).toContain("xbw__canto");
  });
});
