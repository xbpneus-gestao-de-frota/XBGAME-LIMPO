/**
 * AS TELAS DA EQUIPE, REFEITAS EM 14/09/2026 — e o que nelas quebra calado.
 *
 * Ordens dele, no mesmo dia:
 *
 *   "ao acessar essa tela icones na parte inferior devem sumir, renan e
 *    informacoes de localizacao tambem devem sair e barra de saude, entram
 *    novas caixas que devem ocupar desde a parte inferior organizadas junto
 *    com renan na tela, caixas novas e renan tambem vira botao, ao tocar em
 *    renan abrir nova tela para configuracao futura"
 *
 *   "ao clicar em bicicleta devemos ter uma tela nesse formato seguinte, sem
 *    renan e duas caixas no lugar como botoes"
 *
 *   "vamos substituir icones inferiores nas telas onde devem aparecer no game,
 *    adicionando icone que liga a tela de pedidos"
 *
 * Tela desenhada falha de um jeito ruim: ela nao estoura, ela fica ERRADA. E
 * erro de tela nao aparece em revisao de codigo — aparece quando alguem abre e
 * repara que o botao sumiu, que o desenho esticou ou que nao ha como voltar.
 * Estes testes seguram exatamente isso.
 */
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CAIXAS_DA_FICHA } from "@/game/xbwapp/aFicha";
import { NO_AR } from "@/game/xbwapp/asAbasDoApp";
import { XBW_ICONES } from "@/game/xbwapp/icones";

const TELA = readFileSync(
  "client/src/components/xbwapp/TelaEntregaRapida.tsx",
  "utf8"
);
const APP = readFileSync("client/src/components/xbwapp/XBWApp.tsx", "utf8");
const FOLHA = readFileSync("client/src/styles/xbwapp.css", "utf8");

/** Um desenho do aplicativo existe mesmo na pasta? */
const existeODesenho = (url: string) => existsSync(`client/public${url}`);

describe("a ficha: o que ele mandou tirar, saiu", () => {
  it("o nome, o lugar e a barra de folego sairam do alto da ficha", () => {
    const daFicha = TELA.indexOf("function Ficha(");
    const doFim = TELA.indexOf("function AjustesDoEntregador(");
    expect(daFicha).toBeGreaterThan(0);
    expect(doFim).toBeGreaterThan(daFicha);
    const trecho = TELA.slice(daFicha, doFim);
    expect(trecho).not.toContain("xbw-cracha__nome");
    expect(trecho).not.toContain("<Folego");
    expect(trecho).not.toContain("livre em");
  });

  /*
   * A saida era a faixa do nome mais a barra de abas. As duas sumiram no mesmo
   * dia — sem esta seta a pessoa entra na ficha e so sai fechando o
   * aplicativo inteiro. E o defeito mais caro que esta mudanca podia deixar.
   */
  it("sobrou uma saida, e ela e a mesma nas duas telas novas", () => {
    for (const tela of ["function Ficha(", "function Portaria("]) {
      const i = TELA.indexOf(tela);
      expect(i, tela).toBeGreaterThan(0);
      expect(TELA.slice(i, i + 2200), tela).toContain('className="xbw-volta"');
    }
    expect(FOLHA).toContain(".xbw-volta {");
  });

  it("o entregador virou botao, e o botao abre os ajustes", () => {
    expect(TELA).toContain('className="xbw-cracha__pessoa"');
    expect(TELA).toContain("onClick={aoAjustar}");
    expect(TELA).toContain('tela: "ajustes"');
    expect(TELA).toContain("function AjustesDoEntregador(");
  });

  it("a tela dos ajustes diz que esta vazia em vez de fingir conteudo", () => {
    const i = TELA.indexOf("function AjustesDoEntregador(");
    const trecho = TELA.slice(i, i + 1800);
    expect(trecho).toContain("Ainda não há nada para ajustar");
    // E tem como voltar: sem barra de abas, a seta e a unica saida.
    expect(trecho).toContain("xbw-decisao__voltar");
  });
});

describe("as tres caixas da ficha sao o desenho dele", () => {
  it("cada caixa tem desenho, e o arquivo existe", () => {
    expect(CAIXAS_DA_FICHA).toHaveLength(3);
    for (const c of CAIXAS_DA_FICHA) {
      expect(c.desenho, c.id).toMatch(/^\/assets\/xbwapp\/XBW_caixa_/);
      expect(existeODesenho(c.desenho), c.desenho).toBe(true);
    }
  });

  /*
   * O nome e a frase estao pintados dentro do desenho. Escritos DE NOVO por
   * cima, apareceriam duas vezes na mesma caixa — e e o tipo de coisa que
   * ninguem nota lendo o codigo.
   */
  it("a tela nao escreve por cima o que ja esta pintado no desenho", () => {
    const i = TELA.indexOf("function Ficha(");
    const trecho = TELA.slice(i, TELA.indexOf("function AjustesDoEntregador("));
    expect(trecho).toContain("{c.desenho}");
    expect(trecho).not.toContain("{c.nome}</strong>");
    expect(trecho).not.toContain("{c.sobre}</small>");
    // Mas quem nao enxerga a tela continua recebendo os dois.
    expect(trecho).toContain("${c.nome}: ${c.sobre}");
  });

  /*
   * A caixa NAO tem altura escrita: ela sai da proporcao do proprio desenho,
   * com um teto em vh para a tela baixa e larga. Escrever a altura a mao
   * esticaria as tres no dia em que a arte mudasse de tamanho.
   */
  it("a altura da caixa vem do desenho, com teto para tela baixa", () => {
    const i = FOLHA.indexOf(".xbw-caixona img {");
    expect(i).toBeGreaterThan(0);
    const regra = FOLHA.slice(i, FOLHA.indexOf("}", i));
    expect(regra).toContain("width: 100%");
    expect(regra).toContain("height: auto");
    expect(regra).toMatch(/max-height: \d+vh/);
  });
});

describe("a tela da bicicleta: duas caixas e mais nada", () => {
  it("os dois desenhos estao na lista e na pasta", () => {
    for (const url of [XBW_ICONES.portariaLoja, XBW_ICONES.portariaOficina]) {
      expect(url).toMatch(/^\/assets\/xbwapp\/XBW_portaria_/);
      expect(existeODesenho(url), url).toBe(true);
    }
  });

  it("o entregador saiu da tela da bicicleta", () => {
    const i = TELA.indexOf("function Portaria(");
    const trecho = TELA.slice(i, TELA.indexOf("/* ── A LOJA:"));
    expect(trecho).not.toContain("fotoInteira");
    expect(trecho).not.toContain("xbw-cracha__pessoa");
    expect(trecho).toContain("xbw-caixona--dupla");
  });

  it("os dois caminhos continuam existindo por tras dos desenhos", () => {
    const i = TELA.indexOf("function Portaria(");
    const trecho = TELA.slice(i, TELA.indexOf("/* ── A LOJA:"));
    expect(trecho).toContain("onClick={aoLoja}");
    expect(trecho).toContain("onClick={aoUpgrade}");
  });
});

describe("a barra de abas", () => {
  it("some quando a pessoa desce para dentro da Equipe, e volta ao sair", () => {
    expect(APP).toContain("noFundoDaEquipe");
    expect(APP).toContain("aoMergulhar={setNoFundoDaEquipe}");
    expect(TELA).toContain('const noFundo = onde.tela !== "escolha"');
    // A limpeza devolve a barra quando a pessoa troca de aba com a ficha aberta.
    expect(TELA).toContain("return () => aoMergulhar?.(false)");
  });

  it("sao cinco, e Pedidos entrou no meio", () => {
    expect(NO_AR.map(a => a.nome)).toEqual([
      "conversas",
      "contatos",
      "pedidos",
      "ferramentas",
      "entregaRapida",
    ]);
  });

  it("as cinco no ar usam os desenhos novos, e os arquivos existem", () => {
    for (const aba of NO_AR) {
      const achado = FOLHA.match(
        new RegExp(`\\[data-aba="${aba.nome}"\\][^\\n]*url\\("([^"]+)"\\)`)
      );
      expect(achado, aba.nome).toBeTruthy();
      const url = achado![1]!;
      expect(url, aba.nome).toContain("XBW_aba3-");
      expect(existeODesenho(url), url).toBe(true);
    }
  });

  /*
   * Guardadas, e nao apagadas: elas voltam um dia, e apagar o desenho junto
   * com a aba transformaria o retorno num trabalho novo.
   */
  it("as abas fora do ar continuam com o desenho antigo", () => {
    for (const nome of ["atualizacoes", "ligacoes", "recibo"]) {
      expect(FOLHA, nome).toContain(`[data-aba="${nome}"]`);
    }
  });
});

describe("a aba de Pedidos e a mesma tela por outra porta", () => {
  it("a tela existe uma vez so, com duas portas", () => {
    expect(APP).toContain('porta="pedidos"');
    expect(TELA).toContain('porta?: "equipe" | "pedidos"');
    // Nao ha uma segunda copia da lista da equipe em lugar nenhum.
    expect(APP.match(/<TelaEntregaRapida/g) ?? []).toHaveLength(2);
  });

  it("pela porta dos pedidos, escolher alguem abre o balcao", () => {
    expect(TELA).toContain('porta === "pedidos" ? "balcao" : "ficha"');
  });

  it("e a volta do balcao respeita por onde a pessoa entrou", () => {
    const i = TELA.indexOf("    <Balcao");
    expect(i).toBeGreaterThan(0);
    const trecho = TELA.slice(i, i + 400);
    expect(trecho).toContain('porta === "pedidos"');
    expect(trecho).toContain('{ tela: "escolha" }');
  });

  it("o selo de pedidos esperando aparece nas duas abas", () => {
    expect(APP).toContain('a.nome === "entregaRapida" || a.nome === "pedidos"');
  });
});
