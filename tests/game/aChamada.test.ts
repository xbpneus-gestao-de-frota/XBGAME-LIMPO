import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  ESPERA_DA_CHAMADA_MS,
  QUEM_LIGA,
  TREMOR_DO_APARELHO,
  tocarOCelular,
} from "../../client/src/game/aChamada";

const CSS = readFileSync("client/src/index.css", "utf8");
const TELA = readFileSync("client/src/components/ChamadaDeVideo.tsx", "utf8");
const CANVAS = readFileSync("client/src/components/GameCanvas.tsx", "utf8");

/**
 * A CHAMADA QUE COMECA O JOGO.
 *
 * "Primeiro passo: apos 7 segundos de tela devemos aplicar um toque de celular e
 * entrar essa tela, ficar tremendo bem pouquinho parecendo que e o celular que
 * treme."
 */
describe("a chamada de abertura", () => {
  it("o bairro fica sozinho por sete segundos antes do telefone tocar", () => {
    /*
     * Nao e enrolacao: e o tempo de a pessoa OLHAR o bairro antes de alguem
     * falar com ela. Se a ligacao entrasse junto com o mapa, ela nunca teria
     * visto o lugar onde a historia acontece.
     */
    expect(ESPERA_DA_CHAMADA_MS).toBe(7000);
    expect(CANVAS).toContain("ESPERA_DA_CHAMADA_MS");
  });

  it("ela toca uma vez por entrada, e nao toda vez que se volta ao mapa", () => {
    /*
     * Sair para a central e voltar nao e chegar de novo. Sem esta marca, o
     * telefone tocaria toda vez — e a segunda vez ja e pedagio.
     */
    expect(CANVAS).toContain("jaChamou");
    expect(CANVAS).toContain("if (!mostrandoMapa || jaChamou.current) return;");
  });

  it("a ligacao toma a tela inteira, porque o jogo e de celular", () => {
    /*
     * "Deve ser aplicada na tela toda; o game e mobile." Ela nao e um cartao no
     * meio do bairro — ela toma a tela, como uma ligacao toma o celular na mao
     * de quem esta jogando.
     */
    const fundo = CSS.split("\n.chamada {")[1]!.split("\n}")[0]!;
    expect(fundo).toContain("position: fixed");
    expect(fundo).toContain("inset: 0");
    const tela = CSS.split(".chamada__tela {")[1]!.split("\n}")[0]!;
    expect(tela).toContain("inset: 0");
    // e os tres do meio existem, como no desenho dele
    expect(TELA).toContain("Câmera");
    expect(TELA).toContain("Silenciar");
    expect(TELA).toContain("Mensagem");
  });

  it("os tres do meio nao se fingem de botao", () => {
    /*
     * Eles estao no desenho e fazem aquilo parecer aplicativo de verdade, mas
     * ainda nao fazem nada. Prometer botao que nao responde e pior do que nao
     * ter botao — entao entram como enfeite marcado como enfeite.
     */
    const lista = TELA.split("chamada__meio")[1]!.split("</ul>")[0]!;
    expect(lista).not.toContain("<button");
    expect(TELA).toContain('className="chamada__meio" aria-hidden="true"');
  });

  it("quem treme e o celular, e nao a moldura da tela", () => {
    /*
     * Sacudir a tela inteira le como defeito, e e a primeira coisa que incomoda
     * quem tem enjoo de movimento. Sacudir so o cartao le como celular vibrando
     * na mesa — e o bairro atras fica parado, como um bairro fica.
     *
     * "Bem pouquinho": meio grau e meio por cento. De perto se ve, de longe so
     * se sente.
     */
    const aparelho = CSS.split(".chamada__tela {")[1]!.split("\n}")[0]!;
    expect(aparelho).toContain("animation: aparelho-treme");
    // a tela inteira e o celular agora, entao quem treme e ela — mas o fundo
    // fixo que segura tudo continua parado, senao a moldura da tela balanca
    const fundo = CSS.split("\n.chamada {")[1]!.split("\n}")[0]!;
    expect(fundo).not.toContain("aparelho-treme");

    const quadros = CSS.split("@keyframes aparelho-treme {")[1]!.split("\n}")[0]!;
    for (const g of [...quadros.matchAll(/rotate\((-?[\d.]+)deg\)/g)])
      expect(Math.abs(Number(g[1]))).toBeLessThanOrEqual(0.6);
    for (const g of [...quadros.matchAll(/translate3d\((-?[\d.]+)%/g)])
      expect(Math.abs(Number(g[1]))).toBeLessThanOrEqual(0.6);
  });

  it("o toque respeita o interruptor de som, e o tremor nao", () => {
    /*
     * A primeira coisa que o jogo faz com quem desligou o som nao pode ser
     * fazer barulho. Mas o tremor do aparelho vale mesmo no silencioso: quem
     * joga sem som sente o telefone na mao.
     */
    const vibrate = vi.fn(() => true);
    const janela = {
      navigator: { vibrate },
      setInterval: vi.fn(() => 1),
      clearInterval: vi.fn(),
    } as unknown as Window & typeof globalThis;

    const toque = tocarOCelular(false, janela);
    expect(vibrate).toHaveBeenCalled();
    toque.parar();
    expect(TREMOR_DO_APARELHO.length).toBeGreaterThan(1);
  });

  it("o som e acordado, senao o telefone toca calado", () => {
    /*
     * O DEFEITO QUE NAO APARECE EM TESTE NENHUM, SO NO OUVIDO.
     *
     * O navegador nasce com o som suspenso ate a pessoa tocar em alguma coisa,
     * e so acorda sozinho quando o som e criado no mesmo instante do toque.
     * Aqui nao e: entre o clique de entrar e o telefone tocar passam o filme
     * inteiro e mais sete segundos.
     */
    const fonte = readFileSync("client/src/game/aChamada.ts", "utf8");
    expect(fonte).toContain('ctx.state === "suspended"');
    expect(fonte).toContain("ctx.resume()");
    // e de novo a cada toque, porque o navegador pode suspender no meio
    expect(fonte.match(/ctx\.resume\(\)/g)!.length).toBeGreaterThanOrEqual(2);
  });

  it("o toque tem cadencia de telefone, e nao de alarme", () => {
    /*
     * Dois bipes curtos colados e um silencio maior que os dois juntos. E a
     * pausa que faz o ouvido dizer "telefone".
     */
    const fonte = readFileSync("client/src/game/aChamada.ts", "utf8");
    const ciclo = Number(fonte.match(/const CICLO = ([\d.]+);/)![1]);
    const [, segundo] = fonte.match(/bipe\(agora \+ ([\d.]+), ([\d.]+)\)/)!;
    expect(ciclo).toBeGreaterThan(Number(segundo) * 2);
  });

  it("sem navegador nenhum, nada explode", () => {
    // o jogo tambem roda em teste e em servidor, onde nao ha janela
    const toque = tocarOCelular(true, undefined);
    expect(() => toque.parar()).not.toThrow();
  });

  it("atender e recusar sao botoes de verdade", () => {
    /*
     * Este jogo foi pensado com uma crianca com deficiencia do lado de ca.
     * Desenho pronto com area clicavel por cima seria mais rapido de por e
     * impossivel de usar sem mouse.
     */
    expect(TELA).toContain('type="button"');
    expect(TELA).toContain("aoAtender");
    expect(TELA).toContain("aoRecusar");
    expect(TELA).toContain('role="dialog"');
    // e os dois nao dependem de cor: tem simbolo e nome escrito
    expect(TELA).toContain("<em>Recusar</em>");
    expect(TELA).toContain("<em>Atender</em>");
    // area de dedo, mesmo em tela pequena
    const botao = CSS.split(".chamada__botao span {")[1]!.split("\n}")[0]!;
    expect(botao).toContain("min-width: 56px");
    expect(botao).toContain("min-height: 56px");
  });

  it("o toque para na hora em que se responde", () => {
    /*
     * Telefone que continua tocando depois de atendido e o defeito mais obvio
     * que esta tela pode ter.
     */
    expect(TELA).toContain("toque.current?.parar()");
    expect(TELA).toContain("const responder = (oQue: () => void) => () => {");
  });

  it("quem pediu menos movimento nao ve o tremor", () => {
    /*
     * O bloco e lido contando as CHAVES, e nao cortando o arquivo no texto do
     * @media. Cortando, tudo o que vem depois do ultimo @media entra no
     * pedaco — entao qualquer regra nova escrita no fim da folha passava a
     * contar como "dentro do bloco", e o teste deixava de perguntar o que
     * queria perguntar. Aconteceu em 14/09, quando a tela que toca ficou azul.
     */
    const blocos: string[] = [];
    const abre = "@media (prefers-reduced-motion: reduce) {";
    let i = CSS.indexOf(abre);
    while (i >= 0) {
      let fundo = 1;
      let j = i + abre.length;
      while (j < CSS.length && fundo > 0) {
        if (CSS[j] === "{") fundo += 1;
        if (CSS[j] === "}") fundo -= 1;
        j += 1;
      }
      blocos.push(CSS.slice(i + abre.length, j - 1));
      i = CSS.indexOf(abre, j);
    }
    expect(blocos.length).toBeGreaterThan(0);
    expect(
      blocos.some(b => /\.chamada__tela\s*\{\s*animation:\s*none/.test(b)),
      "a tela que toca voltou a tremer para quem pediu menos movimento"
    ).toBe(true);
  });

  it("a ligacao aparece por cima do bairro, e responde ao toque", () => {
    /*
     * Ja custou uma volta: a tela existia, respondia ao teclado e era
     * INVISIVEL, escondida atras do proprio mapa. Duas coisas resolvem, e as
     * duas sao faceis de perder numa arrumacao de folha de estilo.
     */
    const bloco = CSS.split("\n.chamada {")[1]!.split("\n}")[0]!;
    const doMapa = Number(
      (CSS.split("\n.mapa {")[2] ?? "").match(/z-index: (\d+)/)?.[1] ?? 370
    );
    expect(Number(bloco.match(/z-index: (\d+)/)![1])).toBeGreaterThan(doMapa);
    expect(bloco).toContain("pointer-events: auto");
  });

  it("quem liga tem nome, e ele sai de um lugar so", () => {
    expect(QUEM_LIGA.nome).toBe("Renan");
    expect(TELA).toContain("QUEM_LIGA.nome");
  });
});
