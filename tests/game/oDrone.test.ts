import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ABERTURA_MS,
  CAIXA_PENDURADA_EM,
  ESPERA_PARA_ABRIR_MS,
  MARCOS,
  ONDE_A_CAIXA_CAI,
  ONDE_O_DRONE_PARA,
  TAMANHOS,
  VOO_MS,
  aReguaDoVoo,
} from "../../client/src/game/oDrone";

const CSS = readFileSync("client/src/index.css", "utf8");
const CENA = readFileSync("client/src/components/ODrone.tsx", "utf8");
const MAPA = readFileSync("client/src/components/MapaDoBairro.tsx", "utf8");
const CANVAS = readFileSync("client/src/components/GameCanvas.tsx", "utf8");

/** As paradas de um bloco de quadros-chave, em fracao (0 a 1). */
function paradas(nome: string): number[] {
  const bloco = CSS.split(`@keyframes ${nome} {`)[1]!.split("\n}")[0]!;
  return [...bloco.matchAll(/(\d+(?:\.\d+)?)%/g)].map(
    (m) => Number(m[1]) / 100,
  );
}

/**
 * O DRONE DA XBPNEUS.
 *
 * "Quando diz 'vamos resolver isso', um drone passa por nossos olhos icando a
 * caixa, voa proximo do entregador, desce a caixa no chao e volta para frente de
 * nossos olhos."
 */
describe("o drone da XB", () => {
  it("a cena responde a ULTIMA fala, e a ultima fala e dela", () => {
    /*
     * O gancho e "vamos resolver isso". A primeira decisao da pessoa no jogo nao
     * pode ser respondida com um menu: tem que ser alguma coisa acontecendo no
     * bairro.
     */
    expect(CANVAS).toContain("setDroneEntregando(true)");
    expect(CANVAS).toContain("ESPERA_DEPOIS_DA_ULTIMA_MS");
    // o gancho e o PASSO da conversa dentro do aplicativo, e nao um aviso de tela
    expect(CANVAS).toContain("PASSO_DEPOIS_DE_RESOLVER");
    expect(MAPA).toContain("entregaDoDrone");
  });

  it("o voo e da TELA; a caixa que ficou e do BAIRRO", () => {
    /*
     * Ele passa rente aos nossos olhos: entra por fora de uma borda e sai pela
     * outra, e "borda" so quer dizer alguma coisa na moldura. Dentro da foto do
     * bairro — que e tres vezes maior que a moldura — o aparelho comecaria e
     * terminaria num canto que ninguem esta vendo.
     *
     * A caixa e o contrario: ela caiu ao lado do garoto e tem que continuar ao
     * lado dele quando a pessoa arrasta o mapa.
     */
    const dentroDaFoto = MAPA.split('className="mapa__caixa"')[1]!;
    const fechaAFoto = dentroDaFoto.indexOf("\n        </div>");
    expect(dentroDaFoto.slice(0, fechaAFoto)).toContain("<CaixaNoChao aberta=");
    // e o voo fica DEPOIS que a foto fecha, ainda dentro da moldura
    expect(dentroDaFoto.slice(fechaAFoto)).toContain("<ODrone");
  });

  it("a caixa encosta NELE, ao alcance da mao — senao vira caminhada", () => {
    /*
     * "Precisamos que a entrega da caixa seja ao lado do entregador, pq senao
     * teremos que fazer animacao para entregador chegar ate a caixa."
     *
     * Este teste guarda exatamente isso: qualquer numero que afaste a caixa mais
     * que a altura do garoto passa a exigir um desenho que nao existe. O limite
     * nao e um gosto, e um custo.
     */
    const garoto = MAPA.match(/GAROTO_ONDE = \{ x: ([\d.]+), y: ([\d.]+) \}/)!;
    const dele = { x: Number(garoto[1]), y: Number(garoto[2]) };
    const altura = Number(MAPA.match(/GAROTO_ALTURA = ([\d.]+)/)![1]);
    // ele mede 2,4% da ALTURA do mapa; na largura, isso da 1,8%
    const larguraDoMapa = 1448 / 1086;
    const oTamanhoDele = altura / larguraDoMapa;

    const daCaixa = ONDE_A_CAIXA_CAI.x - dele.x;
    // do lado, e nao em cima: meio corpo dele mais meia caixa
    expect(daCaixa).toBeGreaterThan(TAMANHOS.caixaNoBairro / 2);
    // e nunca mais longe que ele proprio e alto — dai em diante e caminhada
    expect(daCaixa).toBeLessThan(oTamanhoDele);
    // um tico mais para ca, para ficar na frente da perna dele e nao atras
    expect(ONDE_A_CAIXA_CAI.y).toBeGreaterThan(dele.y);
    expect(ONDE_A_CAIXA_CAI.y - dele.y).toBeLessThan(1);
  });

  it("o drone para EM CIMA da caixa, e a caixa desce reto", () => {
    expect(ONDE_O_DRONE_PARA.x).toBe(ONDE_A_CAIXA_CAI.x);
    // ele fica no ar; ela encosta no chao
    expect(ONDE_O_DRONE_PARA.y).toBeLessThan(CAIXA_PENDURADA_EM);
    expect(CAIXA_PENDURADA_EM).toBeLessThan(ONDE_A_CAIXA_CAI.y);
  });

  it("os marcos do TypeScript sao as paradas do CSS", () => {
    /*
     * O desenho do voo mora no CSS e o aviso de "a caixa encostou" mora no
     * componente. Se os dois contarem historias diferentes, a caixa do bairro
     * acende antes ou depois de a outra encostar — e ai a troca aparece.
     */
    const doDrone = paradas("drone-voo");
    const daCarga = paradas("drone-caixa-voo");
    for (const marco of [MARCOS.passou, MARCOS.chegou, MARCOS.soltou]) {
      expect(doDrone).toContain(Number(marco.toFixed(2)));
      expect(daCarga).toContain(Number(marco.toFixed(2)));
    }
    expect(MARCOS.soltou).toBeCloseTo(0.74, 2);
    expect(VOO_MS).toBeGreaterThan(5000);
  });

  it("a regua leva um ponto do bairro para a tela", () => {
    /*
     * Uma janela conhecida: a foto de 2026 x 1519 comecando 763 px a esquerda e
     * 180 px acima da moldura de 390 x 844. O meio da foto (50%) cai em
     * (1013 - 763) / 390 = 64% da tela.
     */
    const regua = aReguaDoVoo({
      esquerda: -763,
      topo: -180,
      largura: 2026,
      altura: 1519,
      telaLargura: 390,
      telaAltura: 844,
      zoom: 1.8,
    });
    const naTelaX = ((-763 + (ONDE_O_DRONE_PARA.x / 100) * 2026) / 390) * 100;
    expect(regua.droneX).toBeCloseTo(naTelaX, 4);
    // e o tamanho de longe cresce pela RAIZ do zoom, que e a regra do garoto
    const esperado =
      (((TAMANHOS.droneNoBairro / 100) * 2026) / Math.sqrt(1.8) / 390) * 100;
    expect(regua.droneLonge).toBeCloseTo(esperado, 4);
  });

  it("moldura de tamanho zero nao vira divisao por zero", () => {
    /*
     * No primeiro quadro a moldura ainda nao foi medida. Sem esta guarda a conta
     * daria Infinity, o CSS jogaria a largura fora e o drone voaria com tamanho
     * nenhum — que e o mesmo que nao voar.
     */
    const regua = aReguaDoVoo({
      esquerda: 0,
      topo: 0,
      largura: 0,
      altura: 0,
      telaLargura: 0,
      telaAltura: 0,
      zoom: 0,
    });
    for (const n of Object.values(regua)) expect(Number.isFinite(n)).toBe(true);
  });

  it("ele vira de frente nas duas pontas e de cima no meio", () => {
    /*
     * Sao dois desenhos do mesmo aparelho. Cortar seco de um para o outro faria
     * o drone piscar; cruzando, ele so gira.
     */
    expect(CENA).toContain("droneFrente");
    expect(CENA).toContain("droneVoando");
    const frente = CSS.split("@keyframes drone-de-frente {")[1]!.split(
      "\n}\n",
    )[0]!;
    const cima = CSS.split("@keyframes drone-de-cima {")[1]!.split("\n}\n")[0]!;
    // o de frente comeca e termina visivel; o de cima, o contrario
    expect(frente.trimStart().startsWith("0%,")).toBe(true);
    expect(frente.trimEnd().endsWith("}")).toBe(true);
    expect(cima).toContain("opacity: 1");
    expect(frente).toContain("opacity: 0");
  });

  it("quem pediu menos movimento nao ve o voo, mas ve a caixa", () => {
    /*
     * A cena existe para dizer uma coisa: a XB atendeu. Tirar o voo tira o
     * enjoo; tirar a caixa tiraria o recado.
     */
    const menos = CSS.split("@media (prefers-reduced-motion: reduce) {")
      .filter((b) => b.includes(".drone-cena"))
      .at(-1)!;
    expect(menos).toMatch(/\.drone-cena\s*\{\s*display:\s*none/);
    expect(menos).toMatch(/\.caixa-no-chao\s*\{\s*animation:\s*none/);
  });

  it("a mala abre ALI MESMO, do tamanho que esta", () => {
    /*
     * "Apenas uma animacao simples da caixa abrindo ao lado do garoto, nada de
     * zoom da caixa."
     *
     * Ela nao cresce, nao sai do lugar e nao vira tela: e a mesma peca de vinte
     * pixels no chao do bairro, com a tampa trocando de desenho.
     */
    const abrindo = CSS.split("\n.caixa-no-chao--aberta {")[1]!.split(
      "\n}",
    )[0]!;
    expect(abrindo).not.toContain("scale(");
    expect(abrindo).not.toContain("width");
    expect(abrindo).toContain("caixa-agacha");
    // e o agacho e so na altura, da base para cima
    const agacho = CSS.split("@keyframes caixa-agacha {")[1]!.split(
      "\n}\n",
    )[0]!;
    expect(agacho).toContain("scaleY(0.86)");
    expect(agacho).not.toContain("scaleX");
    expect(abrindo).toContain("transform-origin: 50% 100%");
    expect(CENA).toContain("caixaAberta");
  });

  it("a tampa troca no alto do salto, e a mala para depois", () => {
    /*
     * Trocar o desenho enquanto a mala se mexe esconde a troca; trocar com ela
     * parada mostraria uma figura virando outra. Depois disso ela nao se mexe
     * mais — peca que continua animada e peca que o navegador continua
     * desenhando.
     */
    const some = CSS.split("@keyframes caixa-tampa-some {")[1]!.split(
      "\n}\n",
    )[0]!;
    const salta = CSS.split("@keyframes caixa-tampa-salta {")[1]!.split(
      "\n}\n",
    )[0]!;
    expect(some).toContain("40%");
    expect(salta).toContain("58%");
    expect(ABERTURA_MS).toBeLessThan(900);
    expect(CSS).toContain(
      "caixa-tampa-salta var(--abre, 520ms) linear forwards",
    );
  });

  it("ela espera o drone sumir antes de abrir", () => {
    /*
     * As duas coisas ao mesmo tempo seriam duas para olhar, e cada uma tem um
     * recado: primeiro quem trouxe, depois o que veio.
     */
    expect(ESPERA_PARA_ABRIR_MS).toBeGreaterThan(400);
    expect(MAPA).toContain("if (!oVooAcabou || malaAberta) return;");
    expect(MAPA).toContain("<CaixaNoChao aberta={malaAberta}");
  });

  it("a caixa no chao encolhe com o zoom, como o garoto", () => {
    const bloco = CSS.split("\n.caixa-no-chao {")[1]!.split("\n}")[0]!;
    expect(bloco).toContain("var(--zoom-raiz, 1)");
    expect(bloco).toContain("translate(-50%, -100%)");
  });
});
