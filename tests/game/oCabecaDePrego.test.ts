/**
 * O CABECA DE PREGO NA PRACINHA — e as quatro maneiras de ele quebrar calado.
 *
 * Ordem dele, 14/09/2026, com um risco amarelo por cima da captura do mapa:
 * "bem no ponto amarelo, crie uma animacao do primeiro vilao que
 * apresentaremos cabeca de prego, deixe a animacao rodando neste local pintado
 * de amarelo, redimensione, para que fique padrao de cores proximos ou iguais
 * ao mapa".
 *
 * Uma peca animada de mapa tem um jeito ruim de falhar: ela nao estoura, ela
 * fica ERRADA. E erro de animacao nao aparece em revisao de codigo — aparece
 * dois minutos depois, olhando a tela, quando alguem repara que o sujeito
 * afundou no chao ou que a barra pisca. Estes testes seguram o que, quebrando,
 * quebraria assim:
 *
 *   · a linha do pe escrita em TRES lugares (o script que monta a tira, o
 *     modulo do jogo e o CSS) sair de sincronia — e ele passar a flutuar ou a
 *     enterrar as botas no chao;
 *   · o compasso mudar no modulo e ficar velho no CSS, ou as partes deixarem
 *     de somar um giro inteiro — e a levantada escorregar a cada volta;
 *   · a tira mudar de tamanho e a proporcao do quadro ficar para tras — e ele
 *     esticar para os lados;
 *   · ele crescer ate competir com o entregador, que e a unica coisa que a
 *     pessoa precisa achar de longe.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GAME_ASSETS } from "@/game/assets";
import { ENDERECOS } from "@/game/addresses";
import {
  ALTURA_DELE_EM_PE,
  ALTURA_DO_QUADRO,
  LINHA_DA_CABECA,
  LINHA_DO_PE,
  O_COMPASSO,
  O_GIRO_MS,
  ONDE_ELE_TREINA,
  QUANTOS_QUADROS,
  quadrosChave,
} from "@/game/oCabecaDePrego";

const CSS = readFileSync("client/src/index.css", "utf8");
const MAPA = readFileSync("client/src/components/MapaDoBairro.tsx", "utf8");
const SCRIPT = readFileSync(
  "scripts/vilao/a_tira_do_cabeca_de_prego.py",
  "utf8"
);
const TIRA = "client/public/assets/XB_Cabeca_De_Prego_tira.webp";

/** Le uma tupla de numeros escrita no script que monta a tira. */
function numerosDoScript(nome: string): number[] {
  const achado = SCRIPT.match(new RegExp(`${nome}\\s*=\\s*\\(([^)]*)\\)`));
  expect(achado, `${nome} sumiu do script da tira`).toBeTruthy();
  return achado![1]!.split(",").map(n => Number(n.trim()));
}

/**
 * O tamanho da tira, lido do cabecalho do proprio arquivo.
 *
 * Ler o cabecalho e chato e vale a pena: a alternativa e escrever o tamanho a
 * mao em algum lugar, e um numero escrito a mao sobre um arquivo e exatamente
 * o tipo de coisa que envelhece torto sem avisar.
 */
function tamanhoDaTira(): { largura: number; altura: number } {
  const b = readFileSync(TIRA);
  expect(b.subarray(0, 4).toString("latin1")).toBe("RIFF");
  expect(b.subarray(8, 12).toString("latin1")).toBe("WEBP");
  expect(b.subarray(12, 16).toString("latin1")).toBe("VP8X");
  return {
    largura: b.readUIntLE(24, 3) + 1,
    altura: b.readUIntLE(27, 3) + 1,
  };
}

describe("o vilao esta no ponto que ele riscou", () => {
  it("o ponto e o do risco amarelo, no parquinho", () => {
    /*
     * Nao foi estimado no olho: a captura dele foi casada com o desenho do
     * bairro e o centro do risco foi levado de volta para a coordenada do
     * mapa. Fica na beira noroeste da pracinha, no chao batido.
     */
    expect(ONDE_ELE_TREINA.x).toBeCloseTo(69.34, 2);
    expect(ONDE_ELE_TREINA.y).toBeCloseTo(33.45, 2);
  });

  it("nao esta em cima de porta nenhuma do bairro", () => {
    /*
     * Isto nao e frescura de posicao: a porta e onde o entregador PARA, e um
     * vilao com uma barra de dois metros em cima de uma porta taparia a
     * entrega e o morador de uma casa so — e sempre a mesma, que e a pior
     * maneira de um defeito aparecer.
     */
    for (const e of ENDERECOS) {
      const dx = e.em[0]! - ONDE_ELE_TREINA.x;
      const dy = e.em[1]! - ONDE_ELE_TREINA.y;
      expect(Math.hypot(dx, dy), `porta de ${e.id}`).toBeGreaterThan(2);
    }
  });
});

describe("a linha do pe e a mesma nos tres lugares", () => {
  /*
   * A conta esta no script: a ancora e a sola das botas na mesa de trabalho, e
   * o recorte diz onde o quadro comeca. A divisao das duas e onde o pe cai
   * dentro do quadro.
   */
  it("bate com o recorte do script que monta a tira", () => {
    const ancora = numerosDoScript("ANCORA");
    const recorte = numerosDoScript("RECORTE");
    const doScript = (ancora[1]! - recorte[1]!) / (recorte[3]! - recorte[1]!);
    expect(LINHA_DO_PE).toBeCloseTo(doScript, 4);
  });

  it("bate com o quanto o CSS sobe o desenho", () => {
    const achado = CSS.match(
      /\.vilao\s*{[\s\S]*?translate\(-50%,\s*-([\d.]+)%\)/
    );
    expect(achado, "o .vilao perdeu o translate").toBeTruthy();
    expect(Number(achado![1]) / 100).toBeCloseTo(LINHA_DO_PE, 4);
  });

  it("a linha da CABECA bate com a que o script mede no desenho", () => {
    /*
     * Esta nao sai de conta: ela depende de como o sujeito foi desenhado
     * dentro da pose, e por isso e medida no desenho pronto. O script mede toda
     * vez que roda e avisa se o desenho mudar — aqui so se confere que o numero
     * guardado nos dois lugares e o mesmo, que e o que um dia vai escorregar.
     */
    const achado = SCRIPT.match(/LINHA_DA_CABECA = ([\d.]+)/);
    expect(achado, "LINHA_DA_CABECA sumiu do script da tira").toBeTruthy();
    expect(LINHA_DA_CABECA).toBeCloseTo(Number(achado![1]), 4);
    // e ela esta em cima da sola, senao ele esta de cabeca para baixo
    expect(LINHA_DA_CABECA).toBeLessThan(LINHA_DO_PE);
  });

  it("a sombra fica na linha do pe, e nao na borda de baixo da caixa", () => {
    /*
     * A mancha marca onde o objeto ENCOSTA no chao. Na borda de baixo ela
     * ficaria embaixo das anilhas, que estao na frente dele — e a sombra
     * apareceria uns dois metros a frente dos pes.
     */
    const achado = CSS.match(/\.vilao::after\s*{[\s\S]*?top:\s*([\d.]+)%/);
    expect(achado, "a sombra do vilao perdeu o top").toBeTruthy();
    expect(Number(achado![1]) / 100).toBeCloseTo(LINHA_DO_PE, 4);
  });
});

describe("o compasso da levantada", () => {
  it("as partes somam um giro inteiro", () => {
    /*
     * Somando menos que um, sobra um pedaco de giro sem pose definida e o
     * ultimo quadro estica; somando mais, o fim do compasso e cortado. Nos
     * dois casos a levantada escorrega um pouco a cada volta — e so se percebe
     * depois de dois minutos olhando.
     */
    const soma = O_COMPASSO.reduce((t, p) => t + p.parte, 0);
    expect(soma).toBeCloseTo(1, 6);
  });

  it("todo passo aponta para uma pose que existe na tira", () => {
    for (const passo of O_COMPASSO) {
      expect(passo.quadro).toBeGreaterThanOrEqual(0);
      expect(passo.quadro).toBeLessThan(QUANTOS_QUADROS);
    }
  });

  it("comeca embaixo, passa pelo alto e volta", () => {
    const poses = O_COMPASSO.map(p => p.quadro);
    expect(poses[0]).toBe(0);
    expect(Math.max(...poses)).toBe(QUANTOS_QUADROS - 1);
    expect(poses[poses.length - 1]).toBe(0);
  });

  it("segura em cima e embaixo, e cruza o meio depressa", () => {
    /*
     * E o que separa uma levantada de um boneco de relogio. Se um dia as
     * partes ficarem todas iguais, o vilao passa a subir e descer no mesmo
     * ritmo o tempo todo — e o olho reconhece a repeticao na hora.
     */
    const parado = O_COMPASSO.filter(
      p => p.quadro === 0 || p.quadro === QUANTOS_QUADROS - 1
    ).reduce((t, p) => t + p.parte, 0);
    expect(parado).toBeGreaterThan(0.55);
  });

  it("o CSS toca o mesmo compasso que o modulo", () => {
    /*
     * Os dois existem porque o navegador nao le TypeScript. Mudar um e
     * esquecer o outro nao quebra nada: o vilao so continua levantando peso no
     * ritmo antigo, para sempre.
     */
    const bloco = CSS.match(/@keyframes vilao-levanta\s*{([\s\S]*?)\n}/);
    expect(bloco, "os quadros-chave do vilao sumiram").toBeTruthy();
    const noCss = [
      ...bloco![1]!.matchAll(
        /([\d.]+)%\s*{\s*background-position:\s*([\d.]+)%/g
      ),
    ].map(m => ({ em: Number(m[1]), posicao: Number(m[2]) }));
    const esperado = quadrosChave();
    expect(noCss).toHaveLength(esperado.length);
    esperado.forEach((c, i) => {
      expect(noCss[i]!.em, `passo ${i}`).toBeCloseTo(c.em, 1);
      expect(noCss[i]!.posicao, `passo ${i}`).toBeCloseTo(c.posicao, 1);
    });
  });

  it("o giro dura o que o modulo diz", () => {
    const achado = CSS.match(/animation:\s*vilao-levanta\s+(\d+)ms\s+step-end/);
    expect(achado, "a animacao do vilao sumiu do CSS").toBeTruthy();
    expect(Number(achado![1])).toBe(O_GIRO_MS);
  });

  it("cada pose SEGURA ate a proxima, em vez de escorregar para ela", () => {
    /*
     * Sem `step-end` o fundo desliza entre uma pose e a outra, e o que aparece
     * no meio do caminho e meio vilao ao lado de meia barra.
     */
    expect(CSS).toContain("animation: vilao-levanta 3500ms step-end infinite");
  });
});

describe("a tira e o quadro", () => {
  it("a tira esta na lista de desenhos do jogo e o arquivo existe", () => {
    expect(GAME_ASSETS.cabecaDePregoTira).toBe(
      "/assets/XB_Cabeca_De_Prego_tira.webp"
    );
    expect(readFileSync(TIRA).length).toBeGreaterThan(10_000);
  });

  it("tem os quatro quadros, todos do mesmo tamanho", () => {
    const quadro = numerosDoScript("QUADRO");
    const { largura, altura } = tamanhoDaTira();
    expect(largura).toBe(quadro[0]! * QUANTOS_QUADROS);
    expect(altura).toBe(quadro[1]);
  });

  it("o CSS mostra UM quadro por vez, e na proporcao do quadro", () => {
    /*
     * A imagem vale quatro caixas de largura e uma de altura. E a proporcao da
     * caixa e a do QUADRO (304 por 320), e nao a da tira inteira — com a da
     * tira ele apareceria esticado quatro vezes para os lados.
     */
    const quadro = numerosDoScript("QUADRO");
    expect(CSS).toContain("background-size: 400% 100%");
    expect(CSS).toContain(`aspect-ratio: ${quadro[0]} / ${quadro[1]}`);
  });

  it("o quadro do meio da tira nao e fatiado em 1/4, e sim em 1/3", () => {
    /*
     * `background-position` em porcentagem encosta a borda ESQUERDA da imagem
     * na esquerda da caixa em 0% e a DIREITA na direita em 100%. Com quatro
     * quadros, os passos sao 0, 1/3, 2/3 e 1 — e nao 0, 1/4, 2/4, 3/4. Errar
     * isto mostra pedaco de dois quadros ao mesmo tempo.
     */
    const posicoes = quadrosChave().map(c => Math.round(c.posicao * 10) / 10);
    expect(posicoes).toContain(33.3);
    expect(posicoes).toContain(66.7);
    expect(posicoes).toContain(100);
    expect(posicoes).not.toContain(25);
  });
});

describe("o tamanho dele, medido contra o bairro", () => {
  /** A altura do garoto da praca, lida da tela do mapa. */
  function alturaDoGaroto(): number {
    const achado = MAPA.match(/const GAROTO_ALTURA = ([\d.]+);/);
    expect(achado, "o garoto da praca perdeu a altura").toBeTruthy();
    return Number(achado![1]);
  }

  it("o corpo dele e mais alto que o garoto da praca", () => {
    /*
     * A altura do QUADRO nao e a dele, por dois motivos que nao sao ele: em
     * cima sobra ar sobre a cabeca, e embaixo estao as anilhas, que encostam no
     * chao bem a frente das botas. O corpo e o pedaco do meio.
     *
     * ESTA CONTA JA ESTEVE ERRADA PARA MAIS. Ate 14/09 ela era quadro vezes
     * linha do pe, que e a cabeca mais o ar de cima — ele saia 2,73% em vez de
     * 2,52%. Nao incomodava ninguem enquanto o numero so servia para dizer que
     * ele era maior que o menino; passou a incomodar quando ele virou a regua
     * dos dezesseis moradores, e oito por cento de engano viraria oito por
     * cento de gente grande demais na calcada.
     *
     * A cerca dos dois lados: um homem adulto e MAIOR que um garoto de quinze
     * anos, e nao chega a um garoto e meio. Abaixo, ele deixa de ser ameaca;
     * acima, a barra come o parquinho.
     */
    const razao = ALTURA_DELE_EM_PE / alturaDoGaroto();
    expect(razao).toBeGreaterThan(1);
    expect(razao).toBeLessThan(1.5);
    // e o corpo e mesmo menor que o quadro que o guarda
    expect(ALTURA_DELE_EM_PE).toBeLessThan(ALTURA_DO_QUADRO * LINHA_DO_PE);
  });

  it("encolhe pela raiz do zoom, como as outras pecas de jogo", () => {
    /*
     * Aproximar a cidade nao pode transformar um sujeito num predio. E a mesma
     * regra do garoto, do morador e do entregador.
     */
    expect(CSS).toMatch(
      /\.vilao\s*{[\s\S]*?height:\s*calc\(var\(--vilao-altura[^)]*\)\s*\/\s*var\(--zoom-raiz, 1\)\)/
    );
  });

  it("nao e maior que o entregador, que e quem precisa ser achado", () => {
    /*
     * A regra do bairro nao muda porque chegou um vilao: o entregador continua
     * sendo a unica coisa que a pessoa precisa achar de longe.
     */
    const achado = CSS.match(/--tamanho-de-mundo,\s*([\d.]+)%/);
    expect(achado, "o tamanho de mundo do entregador sumiu").toBeTruthy();
    // O do entregador e porcentagem da LARGURA; o do vilao, da ALTURA. O mapa
    // tem 1448 por 1086, entao um por cento de altura vale 0,75% de largura.
    const vilaoEmLargura = ALTURA_DO_QUADRO * (1086 / 1448) * (304 / 320);
    expect(vilaoEmLargura).toBeLessThan(Number(achado![1]));
  });
});

describe("ele esta dentro do bairro, e nao colado por cima", () => {
  it("e pintado ANTES da camada de luz, como o garoto e os moradores", () => {
    /*
     * Depois da luz ele ficaria com a cor do meio-dia enquanto o bairro
     * inteiro entardece — que e o defeito que faz um desenho parecer adesivo.
     */
    const luz = MAPA.indexOf('className="mapa__luz"');
    const vilao = MAPA.indexOf("<CabecaDePrego");
    expect(vilao).toBeGreaterThan(0);
    expect(vilao).toBeLessThan(luz);
  });

  it("leva a lavagem de cor, e mais funda que a do garoto", () => {
    /*
     * "Padrao de cores proximos ou iguais ao mapa." Ele veio de estudio com
     * laranja fluorescente, preto puro e brilho estourado: e a peca mais
     * berrante que ja entrou no mapa, e por isso apanha mais que o menino.
     */
    const vilao = CSS.match(/\.vilao\s*{[\s\S]*?saturate\(([\d.]+)\)/);
    const garoto = CSS.match(
      /\.garoto__desenho,[\s\S]*?{[\s\S]*?saturate\(([\d.]+)\)/
    );
    expect(vilao).toBeTruthy();
    expect(garoto).toBeTruthy();
    expect(Number(vilao![1])).toBeLessThan(Number(garoto![1]));
  });

  it("quem pediu menos movimento continua tendo o vilao — parado em pe", () => {
    /*
     * A fonte e a fumaca somem porque sao efeito. O vilao e gente, como o
     * garoto: sumir com ele mudaria o lugar em vez de acalmar a tela.
     */
    const bloco = CSS.match(
      /@media \(prefers-reduced-motion: reduce\) {\s*\.vilao {([\s\S]*?)}/
    );
    expect(bloco, "o vilao nao trata movimento reduzido").toBeTruthy();
    expect(bloco![1]).toContain("animation: none");
    expect(bloco![1]).toContain("background-position: 100%");
    expect(bloco![1]).not.toContain("display: none");
  });
});
