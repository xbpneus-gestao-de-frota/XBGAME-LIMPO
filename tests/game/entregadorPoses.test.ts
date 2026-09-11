import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MOLDES } from "../../client/src/game/rumoDoEntregador";

/*
 * O ANGULO DE CADA MOLDE SAI DA PROPRIA LISTA, e nao de uma copia aqui.
 *
 * Uma copia so vale enquanto sao oito nomes de bussola. Com a lista saindo da
 * pasta de desenhos, uma tabela escrita aqui envelheceria no primeiro desenho
 * novo — e envelheceria em silencio, conferindo o angulo errado.
 */

const COMPONENTE = readFileSync("client/src/components/Entregador.tsx", "utf8");
const MAPA = readFileSync("client/src/components/MapaDoBairro.tsx", "utf8");
const CSS = readFileSync("client/src/index.css", "utf8");
const POSES = ["pedalando1", "parado", "entregando", "coletando", "comemorando"];

const desenhos = readdirSync("client/public/assets").filter(n =>
  POSES.some(p => n.startsWith(`XB_Entregador_${p}_`))
);

/** Largura e altura de um WebP simples, lidas do cabecalho. */
function tamanhoWebp(arquivo: string): [number, number] {
  const b = readFileSync(arquivo);
  expect(b.toString("ascii", 0, 4)).toBe("RIFF");
  expect(b.toString("ascii", 8, 12)).toBe("WEBP");
  const tipo = b.toString("ascii", 12, 16);
  if (tipo === "VP8X")
    return [b.readUIntLE(24, 3) + 1, b.readUIntLE(27, 3) + 1];
  if (tipo === "VP8L") {
    const n = b.readUInt32LE(21);
    return [(n & 0x3fff) + 1, ((n >> 14) & 0x3fff) + 1];
  }
  return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
}

/**
 * O ENTREGADOR NO MAPA.
 *
 * Em 06/09/2026 ele mandou tirar os desenhos do jogador para refazer mirando
 * so o percurso. Entao hoje nao ha desenho nenhum — e estes testes guardam as
 * duas coisas que importam nesse estado: que a peca esta DESLIGADA (e nao meio
 * montada, pedindo arquivo que sumiu), e que as regras de tamanho voltam a
 * valer sozinhas assim que os desenhos novos chegarem.
 */
describe("o entregador no mapa", () => {
  /*
   * SEM DESENHO, SEM PECA.
   *
   * Peca ligada sem arte nao da erro visivel: da um espaco vazio andando pelo
   * bairro, que ninguem chama de defeito e ninguem conserta.
   */
  it("com os desenhos fora do projeto, ele nao e pintado", () => {
    if (desenhos.length > 0) return;
    expect(MAPA).toContain("const ENTREGADOR_NO_MAPA = false;");
  });

  /*
   * E O CAMINHO CONTINUA DE PE. O que sai e so o desenho: a rota, a conta da
   * distancia e o passo ficam prontos, para os desenhos novos entrarem numa
   * peca que ja funciona.
   */
  it("o caminho e o passo continuam no lugar", () => {
    expect(COMPONENTE).toContain("METROS_POR_SEGUNDO");
    expect(COMPONENTE).toContain("desenhoDoRumo");
    expect(MAPA).toContain("<Entregador");
    expect(MAPA).toContain("caminho={caminho}");
    /*
     * E ELE PARA NAS ENTREGAS. Sem esta linha o mapa monta o entregador sem a
     * lista de paradas e ele volta a passar reto pela loja — que foi o defeito,
     * e um defeito que nao da erro nenhum: a corrida roda igual, so que ele
     * pega a encomenda em movimento.
     */
    expect(MAPA).toContain("paradas={paradasDaEntrega}");
  });

  /*
   * TROCAR OITO DESENHOS POR VINTE E QUATRO TEM DE SER TROCAR A LISTA.
   *
   * A fatia do angulo precisa nascer do TAMANHO da lista. Com o 45 e o 8
   * escritos a mao — como estavam — trocar so a lista deixa o jogo escolhendo
   * pelo numero velho: ele passa a pintar oito dos vinte e quatro desenhos e
   * ignorar o resto, sem erro nenhum na tela.
   */
  it("a troca de desenho e seca, com o desenho ja pronto — o menino nunca fica transparente", () => {
    /*
     * A HISTORIA TEM DUAS ORDENS DELE, E A SEGUNDA MEDIU A PRIMEIRA.
     *
     * 06/09: "precisamos melhorar e muito a alteracao de posicao do
     * entregador". A resposta foi o cruzamento — com oito desenhos, quarenta e
     * cinco graus de diferenca num quadro liam como teleporte.
     *
     * 10/09: "analise melhorias que deixem uma animacao profissional sem ficar
     * piscando". Medido no jogo montado, quadro a quadro: no cruzamento os dois
     * desenhos ficam meio apagados ao mesmo tempo (19% do tempo), a camada nova
     * nascia apagada antes de a velha aparecer, e em dezenove quadros o menino
     * sumiu da tela — sete deles por um quarto de segundo. O pisca era isto.
     *
     * Com as folhas novas sao vinte e seis desenhos em volta do relogio: dois
     * vizinhos diferem em media uns catorze graus, e a troca seca entre eles le
     * como giro. Entao: cruzamento desligado atras de uma chave (continua
     * escrito) e DUAS imagens empilhadas — o desenho novo carrega na de tras,
     * escondida, e so vira a da frente depois de decodificado, junto com as
     * medidas dele. Medido de novo: nenhum quadro sem desenho pronto, nenhum
     * quadro com o menino sumido ou com dois desenhos a vista.
     */
    expect(COMPONENTE).toContain("const CRUZAR_A_TROCA = false;");
    expect(COMPONENTE).toContain('key={CRUZAR_A_TROCA ? `entra-${desenhoAgora}` : "entra"}');
    // duas imagens: o desenho novo entra na de tras e so aparece pronto
    expect(COMPONENTE).toContain("entregador__desenho--reserva");
    expect(COMPONENTE).toContain("el.decode().then(virar, virar)");
    expect(COMPONENTE).toMatch(/visibility: telas\.frente === i \? "visible" : "hidden"/);
    expect(CSS).toMatch(/\.entregador__desenho--reserva\s*\{[^}]*position:\s*absolute/);
    expect(COMPONENTE).toContain("img.decode()");
    // o cruzamento continua escrito, para voltar se ele pedir
    expect(COMPONENTE).toContain("CRUZAMENTO_MS");
    expect(COMPONENTE).toContain("entregador__camada--sai");
    expect(CSS).toContain("entregador-sai");
    expect(CSS).toMatch(/--sai\s*\{[^}]*position:\s*absolute/);
  });

  it("ele gira pelos desenhos do meio e monta ja virado para onde vai", () => {
    /*
     * 11/09/2026, medido no PC dele: 19 de 67 trocas pulavam 45 graus ou mais
     * — ate 137 e 180 graus ao montar de novo depois da cena. "Apenas uma
     * situacao que da pra ver Renan mudando de forma."
     */
    // a tela passa pelos desenhos do meio, um de cada vez, e so depois que o
    // de agora apareceu de fato
    expect(COMPONENTE).toContain("proximoNoGiro(tela, quer)");
    expect(COMPONENTE).toContain(
      "naTela.current = { desenho: desenhoAgora, desde: performance.now() }"
    );
    // ao montar depois da cena, o desenho ja e o da saida
    expect(COMPONENTE).toContain("const saida = rumoSuavizado(");
    // voltar para o desenho que acabou de sair acorda a virada (antes ficava
    // preso no desenho errado ate outro ser pedido)
    expect(COMPONENTE).toContain(
      "return { ...t, enderecos: [t.enderecos[0], t.enderecos[1]] };"
    );
  });

  it("a bicicleta de cada folha aponta para o lado do rumo", () => {
    /*
     * O TESTE QUE FALTAVA — e o defeito que ele viu antes de mim.
     *
     * "Entregador esta andando de lado, e de costas." Estava certo: tres dos
     * oito rumos usavam a folha de outro. O norte e o nordeste usavam a do
     * leste — noventa e quarenta e cinco graus errados — e nada no codigo
     * reclamava, porque a conta do rumo estava certa. Era o DESENHO que
     * mentia, e nao havia nada que olhasse para o desenho.
     *
     * Este teste olha. A linha entre os dois pontos onde as rodas encostam e a
     * direcao em que a bicicleta aponta na tela — ela sai da medida da folha,
     * pixel a pixel, e nao de opiniao. Ela tem de ser paralela ao rumo.
     *
     * ── DUAS RESSALVAS, E AS DUAS IMPORTAM ────────────────────────────────
     *
     * PARALELA, e nao igual: a folha nao diz qual das duas rodas e a da
     * frente. Ir para leste e ir para oeste dao a mesma linha. Entao este
     * teste pega a folha girada (o leste servindo o norte) e NAO pega a folha
     * invertida (uma vista de frente servindo um rumo que sobe a tela). Essa
     * segunda so se pega olhando o desenho — esta na folha de conferencia, em
     * Claude outputs/as_oito_direcoes.png.
     *
     * SUBIR E DESCER A TELA sao os dois rumos em que a bicicleta aponta para a
     * camera: as duas rodas quase se juntam e a linha entre elas vira ruido.
     * Nesses, o que se confere e justamente que elas estao juntas — que e a
     * assinatura de estar apontando para a camera, e o que separa o norte de
     * verdade do leste emprestado.
     */
    const perto = (a: number, b: number) => {
      const d = Math.abs(((a - b) % 180) + 180) % 180;
      return Math.min(d, 180 - d);
    };
    for (const molde of MOLDES) {
      const rumo = molde.nome;
      const alvo = molde.graus;
      const g = molde.geometria;
      const dx = g.frenteX - g.trasX;
      const dy = g.frenteY - g.trasY;
      const separacao = Math.hypot(dx, dy);
      if (alvo === 90 || alvo === 270 || molde.umaRoda) {
        // aponta para a camera (ou quase): so uma roda aparece, e as duas
        // pegadas ficam no mesmo ponto
        expect(separacao, `${rumo} devia estar de frente ou de costas`)
          .toBeLessThan(8);
        continue;
      }
      expect(separacao, `${rumo} tem as rodas coladas demais`).toBeGreaterThan(8);
      const naTela = (Math.atan2(-dy, dx) * 180) / Math.PI;
      expect(perto(naTela, alvo), `${rumo} aponta para ${naTela.toFixed(0)}°`)
        .toBeLessThan(20);
    }
  });

  it("o numero de rumos manda na conta, e nao um numero escrito a mao", () => {
    const corpo = COMPONENTE.split("function desenhoDoRumo")[1]!.split("\n}")[0]!;
    expect(corpo).toContain("RUMOS.length");
    expect(corpo).not.toMatch(/\/ 45\b/);
    expect(corpo).not.toMatch(/% 8\b/);
  });

  /*
   * E A BUSSOLA FICA CITADA ONDE O ERRO ACONTECE.
   *
   * O angulo que entra aqui e o da TELA, e o chao do mapa e achatado: quem
   * gerar os desenhos girando o corpo de igual erra ate 18,7 graus e nao ve.
   * O aviso tem de morar na funcao, e nao so na nota.
   */
  it("a funcao avisa que o angulo e o da tela, e aponta a bussola", () => {
    const aviso = COMPONENTE.split("function desenhoDoRumo")[0]!.slice(-1400);
    expect(aviso).toContain("A_BUSSOLA.md");
  });

  /*
   * QUANDO OS DESENHOS VOLTAREM, ESTAS REGRAS SE REARMAM SOZINHAS.
   *
   * Sao as duas que ja custaram caro:
   *
   *   TODOS NA MESMA MOLDURA — cortado rente ao proprio contorno, o menino
   *   andando sai estreito e o de bicicleta sai largo; como o jogo dimensiona
   *   pela largura, ele CRESCERIA ao descer da bicicleta.
   *
   *   E O TAMANHO NA TELA — moldura nova pede numero novo, senao o menino muda
   *   de tamanho e ninguem percebe olhando.
   */
  it("se houver desenhos, todos tem a mesma moldura e o tamanho certo", () => {
    if (desenhos.length === 0) return;
    const medidas = new Set(
      desenhos.map(n => tamanhoWebp(`client/public/assets/${n}`).join("x"))
    );
    expect([...medidas]).toHaveLength(1);
    const [l, a] = tamanhoWebp(`client/public/assets/${desenhos[0]}`);
    const tamanho = Number(
      (COMPONENTE.match(/const TAMANHO_APROVADO = ([\d.]+);/) ?? [])[1]
    );
    /*
     * A MOLDURA E QUADRADA, E ISSO E O QUE MANTEM O MENINO DO MESMO TAMANHO.
     *
     * Ate 06/09/2026 cada folha vinha recortada rente ao contorno, e o teste
     * comparava o tamanho contra a proporcao desse recorte. Com folhas de
     * verdade em cada rumo isso deixou de servir: visto de lado o menino e
     * largo, visto de frente e estreito — recorte justo faria ele MUDAR DE
     * TAMANHO ao virar a esquina.
     *
     * Agora todas as folhas entram na moldura quadrada inteira, com o ar em
     * volta. O quadro e igual para todos os rumos, entao o menino nao cresce
     * nem encolhe ao virar. Como ele ocupa cerca de 80% da altura desse quadro,
     * a moldura e maior que o recorte antigo — e o numero do tamanho subiu junto.
     */
    expect(a).toBe(l);
    expect(tamanho * (a / l)).toBeCloseTo(2.536, 1);
  });

  /*
   * O AUMENTO PARA OLHAR E TEMPORARIO, E TEM DE PARECER TEMPORARIO.
   *
   * Ele pediu para enxergar o menino — "depois redimensionamos". Um aumento
   * assim e exatamente o tipo de coisa que fica esquecida no jogo por meses,
   * porque nao quebra nada: so deixa o entregador grande demais para sempre.
   *
   * Entao ele mora numa constante propria, com nome que denuncia o que e, e o
   * teste falha quando ela some — obrigando quem tirar a decidir o tamanho
   * final em vez de deixar como esta.
   */
  it("o aumento para olhar esta separado, e some por inteiro", () => {
    expect(COMPONENTE).toContain("const AUMENTO_PARA_OLHAR = ");
    expect(COMPONENTE).toContain(
      "const TAMANHO = TAMANHO_APROVADO * AUMENTO_PARA_OLHAR;"
    );
  });

  /*
   * O PISO NAO ANDA MAIS JUNTO COM O AUMENTO — E ESSE E O CONSERTO.
   *
   * Antes eram a mesma decisao em dois arquivos, e por isso o piso subia para
   * 51 quando o aumento subia para 3. Com o mapa afastado a conta do mundo
   * pedia 36 pixels e o piso mandava 51: o menino PARAVA DE ENCOLHER e ficava
   * boiando, do tamanho de meio quarteirao. O Fernando viu jogando — "o garoto
   * nao esta acompanhando zoom".
   *
   * Agora o piso e rede de seguranca, e nao regra de tamanho: um numero
   * pequeno e fixo, que nao encosta na conta do mundo em nenhum zoom que o
   * mapa oferece hoje (1x a 3,5x). Quem manda no tamanho e o bairro.
   *
   * O teste guarda as duas metades disso: o piso e pequeno, e ele fica ABAIXO
   * do que a conta do mundo pede no zoom mais afastado.
   */
  it("ele encolhe quando a pessoa aproxima o bairro", () => {
    /*
     * "Neste ponto da camera nada deve ser alterado, mas ao aplicar o zoom na
     * cidade o garoto deve encolher para 1x2."
     *
     * O menino tem tamanho de MUNDO: cobre uma fatia fixa do bairro. Aproximar
     * o bairro o aproximava junto, e aproximado ele virava um gigante ao lado
     * das casas — foi por isso que a cena da parada nunca achou lugar perto da
     * porta.
     *
     * Dividir pela RAIZ do zoom e a mesma regra que o pino ja usava, do outro
     * lado da conta. No mapa cheio nada muda (raiz de 1 e 1) e no zoom maximo
     * do mapa, 3,5 vezes, ele fica com pouco mais da metade — que e o que ele
     * pediu. O numero do zoom desce por heranca; o componente so diz o tamanho
     * de mundo.
     */
    const bloco = CSS.split("\n.entregador {")[1]!.split("}")[0]!;
    expect(bloco).toContain("var(--tamanho-de-mundo");
    expect(bloco).toContain("var(--zoom-raiz");
    expect(COMPONENTE).toContain('"--tamanho-de-mundo" as string');
    // e a peca nao pode mais mandar a largura pronta, senao o zoom nao entra
    expect(COMPONENTE).not.toMatch(/width: `\$\{TAMANHO\}%`/);

    const maximo = Number((MAPA.match(/const ZOOM_MAXIMO = ([\d.]+);/) ?? [])[1]);
    expect(1 / Math.sqrt(maximo)).toBeGreaterThan(0.45);
    expect(1 / Math.sqrt(maximo)).toBeLessThan(0.6);
  });

  it("o piso e rede de seguranca, e nao trava o zoom", () => {
    const bloco = CSS.split("\n.entregador {")[1]!.split("}")[0]!;
    const piso = Number((bloco.match(/min-width: (\d+)px;/) ?? [])[1]);
    const aprovado = Number(
      (COMPONENTE.match(/const TAMANHO_APROVADO = ([\d.]+);/) ?? [])[1]
    );

    // O mapa ABRE em 1,8x. Numa tela estreita de celular, 360 pixels de
    // largura, o bairro mede 648 — e e nesse estado que a pessoa entra.
    const MAPA_AO_ABRIR = 360 * 1.8;
    // desde 07/09 a peca encolhe pela raiz do zoom, entao a conta do mundo na
    // abertura e menor do que era — e o piso tem de continuar abaixo dela
    const contaDoMundo =
      (aprovado * aumento() * MAPA_AO_ABRIR) / 100 / Math.sqrt(1.8);

    // O piso tem de ficar ABAIXO da conta do mundo ja na abertura. Se
    // encostar ali, o menino para de encolher no uso normal e deixa de
    // acompanhar o zoom — foi exatamente o defeito de 06/09/2026.
    expect(piso).toBeLessThan(contaDoMundo);
  });
});

/** O aumento temporario que ele pediu para poder enxergar o entregador. */
function aumento(): number {
  return Number(
    (COMPONENTE.match(/const AUMENTO_PARA_OLHAR = ([\d.]+);/) ?? [])[1]
  );
}
