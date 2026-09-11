import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";

const CSS = readFileSync("client/src/index.css", "utf8");
const MAPA = readFileSync("client/src/components/MapaDoBairro.tsx", "utf8");
const PAPEIS = ["coleta", "entrega", "base"] as const;

/**
 * Le a ULTIMA LINHA de um PNG e devolve a maior transparencia que achou nela.
 *
 * Escrito a mao de proposito: o projeto nao carrega biblioteca de imagem, e
 * uma linha de pixel nao justifica trazer uma. So o formato que a nossa
 * ferramenta gera e aceito (cor com transparencia, 8 bits, sem entrelace); se
 * um dia isso mudar, o teste para em vez de aprovar no escuro.
 */
function opacidadeDaUltimaLinha(arquivo: string): number {
  const png = readFileSync(arquivo);
  let largura = 0;
  let altura = 0;
  const pedacos: Buffer[] = [];
  for (let i = 8; i < png.length; ) {
    const tamanho = png.readUInt32BE(i);
    const tipo = png.toString("ascii", i + 4, i + 8);
    const corpo = png.subarray(i + 8, i + 8 + tamanho);
    if (tipo === "IHDR") {
      largura = corpo.readUInt32BE(0);
      altura = corpo.readUInt32BE(4);
      expect([corpo[8], corpo[9], corpo[12]]).toEqual([8, 6, 0]);
    } else if (tipo === "IDAT") pedacos.push(corpo);
    i += tamanho + 12;
  }
  const cru = inflateSync(Buffer.concat(pedacos));
  const passo = largura * 4;
  const img = Buffer.alloc(altura * passo);
  for (let y = 0; y < altura; y += 1) {
    const filtro = cru[y * (passo + 1)]!;
    for (let x = 0; x < passo; x += 1) {
      const bruto = cru[y * (passo + 1) + 1 + x]!;
      const a = x >= 4 ? img[y * passo + x - 4]! : 0;
      const b = y > 0 ? img[(y - 1) * passo + x]! : 0;
      const c = y > 0 && x >= 4 ? img[(y - 1) * passo + x - 4]! : 0;
      let valor = bruto;
      if (filtro === 1) valor += a;
      else if (filtro === 2) valor += b;
      else if (filtro === 3) valor += (a + b) >> 1;
      else if (filtro === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        valor += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      img[y * passo + x] = valor & 0xff;
    }
  }
  let maior = 0;
  for (let x = 0; x < largura; x += 1) {
    maior = Math.max(maior, img[(altura - 1) * passo + x * 4 + 3]!);
  }
  return maior;
}

/**
 * O PINO E UMA AFIRMACAO SOBRE UM LUGAR, e estes testes guardam as duas coisas
 * que fazem essa afirmacao ser verdadeira: onde a ponta encosta, e quando a
 * peca aparece viva ou apagada.
 */
describe("os pinos do mapa", () => {
  /*
   * A PONTA TEM DE ENCOSTAR NO CHAO DA IMAGEM.
   *
   * A peca sobe do ponto marcado (o CSS a puxa 100% para cima), entao a ponta
   * precisa estar na ULTIMA linha do desenho. Uma folga transparente embaixo e
   * o pino flutuando acima da porta que ele aponta — e ninguem repara olhando,
   * porque continua bonito.
   *
   * Isto nao e teoria: o pino foi refeito em 05/09/2026, sem o pratinho, e o
   * enquadramento mudou junto. Um enquadramento novo que deixe folga cai aqui.
   */
  it.each(PAPEIS)("a ponta do pino de %s encosta na base do desenho", papel => {
    expect(
      opacidadeDaUltimaLinha(`client/public/assets/XB_Pino_${papel}.png`)
    ).toBeGreaterThan(20);
  });

  /*
   * UM DESENHO SO, VARIAS SITUACOES.
   *
   * Ordem dele: "modos de mudanca de cores, conforme modo de game, cores mais
   * vivas, ou apagadas dependendo da situacao". O jeito de isso continuar
   * barato e a cor mudar EM CIMA da mesma peca. Se um dia alguem criar uma
   * situacao nova e esquecer a regra de cor, o pino aparece com a cor cheia
   * como se fosse a parada da vez — e o mapa passa a mentir.
   */
  it("toda situacao possivel tem o seu modo de cor", () => {
    const declarado = MAPA.match(/export type SituacaoDaParada =([^;]+);/);
    expect(declarado).not.toBeNull();
    const situacoes = [...declarado![1]!.matchAll(/"([a-z]+)"/g)].map(
      m => m[1]!
    );
    expect(situacoes).toContain("agora");
    expect(situacoes.length).toBeGreaterThan(1);
    for (const s of situacoes) {
      expect(CSS).toContain(`.mapa__pino[data-situacao="${s}"]`);
    }
  });

  /*
   * SO O QUE E DA CORRIDA APARECE.
   *
   * Ordem dele depois de conferir a marcacao: "deve aparecer na tela apenas
   * ativos, os outros devem ficar invisiveis". O pino continua montado e no
   * lugar — so nao e pintado.
   *
   * Lavar em vez de esconder ja foi tentado e nao serve: sessenta e cinco
   * pinos sem cor continuam sendo sessenta e cinco manchas em cima das casas.
   * Por isso o teste exige ESCONDER, e nao apenas apagar.
   */
  it("o pino que nao e da corrida fica invisivel, e nao so apagado", () => {
    const bloco = CSS.split('.mapa__pino[data-situacao="espera"] {')[1]!.split(
      "}"
    )[0]!;
    expect(bloco).toContain("visibility: hidden");
    expect(bloco).not.toMatch(/opacity:\s*0?\.\d/);
  });

  /*
   * MAS O QUE ACONTECEU NA CORRIDA CONTINUA A VISTA. A entrega cumprida e,
   * principalmente, a que estourou: o X e vermelho existem para FICAR na tela
   * como registro, e nao para piscar e sumir.
   */
  it("o que ja aconteceu na corrida continua visivel", () => {
    for (const s of ["feito", "estourou"]) {
      const bloco =
        CSS.split(`[data-situacao="${s}"] {`)[1]?.split("}")[0] ?? "";
      expect(bloco).not.toContain("visibility: hidden");
    }
  });

  /*
   * SO A PARADA DA VEZ RESPIRA. Se todas balancassem, nenhuma chamaria — e o
   * bairro inteiro aceso viraria um tapete tremendo.
   */
  it("quem se mexe e a parada da vez, e nao um papel", () => {
    expect(CSS).toContain('.mapa__pino[data-situacao="agora"] {\n  animation:');
    expect(CSS).not.toContain(
      '.mapa__pino[data-papel="coleta"] {\n  animation:'
    );
  });

  /*
   * O SIMBOLO POUSA NA ESFERA DE VIDRO, que e clara. Neon sobre claro some;
   * quem le e tinta escura. Aquela era a cor certa no pino antigo, de esmalte
   * escuro, e viraria erro invisivel se alguem a trouxesse de volta.
   */
  it("o simbolo e escuro, porque o vidro embaixo dele e claro", () => {
    expect(CSS).toContain(".mapa__pino .mapa__simbolo {\n  fill: #08182e;");
    for (const papel of PAPEIS) {
      expect(CSS).not.toContain(
        `.mapa__pino[data-papel="${papel}"] .mapa__simbolo`
      );
    }
  });
});
