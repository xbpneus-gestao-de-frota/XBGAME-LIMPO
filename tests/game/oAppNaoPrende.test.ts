import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";

/*
 * O APP NAO PODE PRENDER NINGUEM — nem encolher letra ate sumir.
 *
 * Em 12/09/2026 a analise tela por tela achou quatro defeitos com a MESMA
 * causa. Uma regra escrita para a tela inicial — o alto virar so o selo da XB
 * no canto — tinha um seletor largo demais:
 *
 *     .xbw-topo:has(.xbw-marca) { position: absolute; width: 42..56px }
 *
 * Como TODA tela tem titulo, toda tela virava um selo de 42 pixels no canto:
 * o titulo sumia, o botao de voltar ia parar embaixo do selo e, no Catalogo,
 * o botao de pedidos comecava quarenta pixels fora da tela. Em tela de
 * ferramenta nao ha barra de abas — entao nao sobrava saida nenhuma.
 *
 * Estes testes nao olham desenho: olham a FOLHA DE ESTILO na ordem em que o
 * navegador le. Quem vale e a ultima regra de cada seletor. E isso que estes
 * testes travam, porque foi exatamente assim que o defeito entrou: uma regra
 * nova, mais embaixo, com !important, apagando a de cima sem ninguem ver.
 */

const FOLHA = readFileSync("client/src/styles/xbwapp.css", "utf8");
/* Sem comentarios: eles tem chaves dentro (exemplos de regra) e bagunçam a conta. */
const CSS = FOLHA.replace(/\/\*[\s\S]*?\*\//g, "");

/** O corpo da ULTIMA regra escrita para este seletor — a que o navegador usa. */
function ultimaRegra(seletor: string): string | null {
  const alvo = seletor.trim();
  let achado: string | null = null;
  const partes = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = partes.exec(CSS))) {
    const sel = m[1]!.trim();
    if (sel === alvo) achado = m[2]!;
  }
  return achado;
}

/** TODAS as regras deste seletor, uma atras da outra (ha blocos de tela larga). */
function todasAsRegras(seletor: string): string {
  const alvo = seletor.trim();
  const partes = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  let junto = "";
  while ((m = partes.exec(CSS))) {
    if (m[1]!.trim() === alvo) junto += m[2]!;
  }
  return junto;
}

/**
 * TODAS as regras que VALEM para este seletor — inclusive as que ele divide com
 * outro numa lista separada por virgula.
 *
 * Existe porque a moeda laranja passou a ser a MESMA peca em dois botoes, e o
 * material foi para uma regra so. Procurar so pelo seletor sozinho passaria a
 * dizer que a moeda perdeu a cor, quando na verdade ela so mudou de casa.
 */
function regrasQueValemPara(seletor: string): string {
  const alvo = seletor.trim();
  const partes = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  let junto = "";
  while ((m = partes.exec(CSS))) {
    const lista = m[1]!.split(",").map(x => x.trim());
    if (lista.includes(alvo)) junto += m[2]!;
  }
  return junto;
}

/** Onde comeca a ULTIMA regra deste seletor, para conferir quem vem depois. */
function ondeEsta(seletor: string): number {
  const alvo = seletor.trim();
  let onde = -1;
  const partes = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = partes.exec(CSS))) {
    const sel = m[1]!.trim();
    if (sel === alvo) onde = m.index;
  }
  return onde;
}

describe("o alto das telas do aplicativo", () => {
  it("o selo e a saida moram no aplicativo, e nao dentro de cada tela", () => {
    // Ordem dele, 12/09/2026: "TODA TELA DO APP, DEVE MANTER LOGO NA PARTE
    // SUPERIOR DIREITA E BOTAO DE VOLTAR AO GAME". Se isso morasse dentro das
    // telas, a proxima tela nasceria sem. Mora no aplicativo, uma vez so.
    const casca = readFileSync(
      "client/src/components/xbwapp/XBWApp.tsx",
      "utf8"
    );
    expect(casca).toContain('className="xbw__canto"');
    expect(casca).toContain('className="xbw__sair"');
    expect(casca).toContain('className="xbw__selo"');
    expect(casca).toContain("Voltar ao game");
    const canto = todasAsRegras(".xbw__canto");
    expect(canto, "sumiu a regra do canto").toBeTruthy();
    expect(canto).toContain("position: absolute");
    const sair = todasAsRegras(".xbw__sair");
    expect(sair, "sumiu a regra da saida").toBeTruthy();
    expect(sair, "a saida voltou a sumir da tela").not.toContain(
      "display: none"
    );
    expect(sair).toContain("--xbw-toque");
  });

  it("nenhum cabecalho escreve embaixo do canto", () => {
    const reservado = ultimaRegra(
      ".xbw-topo,\n.xbw-equipe__topo,\n.xbw-vazia,\n.xbw-decisao__topo"
    );
    expect(reservado, "sumiu o lugar reservado para o canto").toBeTruthy();
    expect(reservado).toContain("--xbw-canto");
  });

  it("nenhuma tela volta a virar so um selo no canto", () => {
    const geral = ultimaRegra(
      ".xbw-topo:has(.xbw-marca),\n.xbw__tela > section:has(.xbw-contatos) > .xbw-topo:has(.xbw-marca)"
    );
    expect(geral, "sumiu a regra do cabecalho").toBeTruthy();
    expect(geral).toContain("position: static");
    expect(geral).toContain("background-image: none");
  });

  it("o titulo aparece em toda tela, inclusive na inicial", () => {
    const marca = ultimaRegra(
      ".xbw-marca,\n.xbw__tela > section:has(.xbw-contatos) .xbw-marca"
    );
    expect(marca, "sumiu a regra do titulo").toBeTruthy();
    expect(marca).toContain("display: block");
  });

  it("toda tela que usa cabecalho com marca escreve um titulo nela", () => {
    const pasta = "client/src/components/xbwapp";
    for (const arquivo of readdirSync(pasta).filter(n =>
      n.startsWith("Tela")
    )) {
      const texto = readFileSync(`${pasta}/${arquivo}`, "utf8");
      if (!texto.includes("xbw-topo--marca")) continue;
      expect(
        texto,
        `${arquivo} usa o cabecalho com marca e nao escreve titulo nenhum`
      ).toMatch(/className="xbw-marca">[^<]+</);
    }
  });
});

describe("nada de letra miuda nem alvo pequeno", () => {
  it("o nome da aba nao pode ser menor que o menor tamanho do proprio app", () => {
    // --xbw-t-mini comeca em 0.68rem: nenhuma aba pode ficar abaixo disso
    const regra = ultimaRegra(".xbw-aba small");
    expect(regra, "sumiu a regra do nome da aba").toBeTruthy();
    const minimo = regra!.match(/clamp\(\s*([\d.]+)rem/);
    expect(minimo, `sem clamp em "${regra}"`).toBeTruthy();
    expect(Number(minimo![1])).toBeGreaterThanOrEqual(0.68);
  });

  it("o que se toca tem pelo menos a medida de um dedo", () => {
    for (const seletor of [".xbw-ficha", ".xbw-procura"]) {
      const regra = ultimaRegra(seletor);
      expect(regra, `sumiu ${seletor}`).toBeTruthy();
      expect(regra, `${seletor} sem altura de toque`).toContain("--xbw-toque");
    }
    const conversa = ultimaRegra(".xbw-conversa .xbw-topo .xbw-botao");
    expect(conversa).toContain("--xbw-toque");
  });
});

describe("os rotulos de secao nao encostam na borda", () => {
  it("a classe vence o zerador generico de titulo", () => {
    // .xbw h2/h3 { margin: 0 } pesa mais que .xbw-secao sozinha: por isso as
    // regras boas tambem trazem a etiqueta junto
    expect(FOLHA).toContain(".xbw h2.xbw-secao");
    expect(FOLHA).toContain(".xbw h3.xbw-titulo");
    expect(ultimaRegra(".xbw h2.xbw-secao")).toContain("4vw");
    expect(ultimaRegra(".xbw h3.xbw-titulo")).toContain("5vw");
  });

  it("a lista de numeros nao encosta nas duas bordas", () => {
    expect(ultimaRegra(".xbw-placar")).toContain("4vw");
  });
});

/*
 * OS RABISCOS DO PAPEL SAO SUAVES — ordem dele de 12/09/2026.
 *
 * O papel de rabiscos cobria 60% da tela de conversas e 73% da tela de
 * conversa, na forca cheia. Ele pediu "bem mais sutis, uma transparencia de
 * 50%". A forca nao foi apagada do desenho: ficou um veu da propria cor do
 * papel por cima, dito UMA vez num token, para mexer depois num numero so.
 *
 * O risco que este teste trava: alguem mexer numa das tres placas e esquecer
 * as outras, ou trocar a lista de fundos sem trocar o tamanho e a repeticao
 * junto — quando ha dois fundos, o navegador precisa de dois de cada.
 */
describe("os rabiscos do papel ficam suaves", () => {
  const PLACAS = [
    ".xbw-contatos ul,.xbw-conversas",
    ".xbw-fio",
    ".xbw-chamadas>ul",
  ];

  it("o veu e dito uma vez so, num token", () => {
    const vezes = (FOLHA.match(/--xbw-veu\s*:/g) ?? []).length;
    expect(vezes).toBe(1);
    const token = /--xbw-veu\s*:\s*linear-gradient\(([^)]*\)[^;]*)/.exec(FOLHA);
    expect(token).not.toBeNull();
    const forcas = [...token![1]!.matchAll(/rgba\([^)]*,\s*([\d.]+)\)/g)].map(
      m => Number(m[1])
    );
    expect(forcas.length).toBe(2);
    for (const f of forcas) expect(f).toBeCloseTo(0.5, 2);
  });

  /** O ULTIMO valor escrito para esta propriedade, somando todas as regras. */
  function ultimoValor(placa: string, propriedade: string): string | null {
    const tudo = todasAsRegras(placa);
    const acha = new RegExp(`${propriedade}\\s*:\\s*([^;}]+)`, "g");
    let achado: string | null = null;
    let m: RegExpExecArray | null;
    while ((m = acha.exec(tudo))) achado = m[1]!;
    return achado;
  }

  it("as tres placas de papel usam o veu", () => {
    for (const placa of PLACAS) {
      const desenho = ultimoValor(placa, "background-image");
      expect(desenho, `sem fundo para ${placa}`).not.toBeNull();
      expect(desenho, `${placa} sem o veu`).toContain("var(--xbw-veu)");
      expect(desenho, `${placa} perdeu o desenho`).toContain(
        "XBW_papel-claro.webp"
      );
    }
  });

  it("com dois fundos, tamanho e repeticao vem em dois", () => {
    for (const placa of PLACAS) {
      for (const propriedade of [
        "background-size",
        "background-repeat",
        "background-position",
      ]) {
        const valor = ultimoValor(placa, propriedade);
        expect(valor, `${placa} sem ${propriedade}`).not.toBeNull();
        const partes = valor!.replace(/!important/g, "").split(",").length;
        expect(
          partes,
          `${placa}: ${propriedade} so tem uma parte para dois fundos`
        ).toBe(2);
      }
    }
  });

  it("nenhuma placa voltou a pintar o desenho sozinho", () => {
    const sozinho =
      /background-image\s*:\s*url\("\/assets\/xbwapp\/XBW_papel-claro\.webp"\)/g;
    expect(CSS.match(sozinho)).toBeNull();
  });
});

/*
 * A PRIMEIRA TELA MAIS LIMPA, E A SAIDA COM CARA DE GAME — 12/09/2026.
 *
 * Ordem dele: "REMOVA TAMBEM CAMPO DO APP PESQUISAR, TODOS OS CONTATOS, AMPLIE
 * TELA CINZA E MELHORE VIZUALMENTE BOTAO VOLTAR AO GAME, PADRAO DE QUALIDADE
 * DO GAME".
 *
 * Duas coisas podem se perder com o tempo e ninguem ver:
 *   · as duas pecas tiradas serem APAGADAS em vez de ficarem atras da chave —
 *     ai nao ha mais como trazer de volta;
 *   · o botao de voltar virar um ovo (44 de largo por 40 de alto) se alguem
 *     mexer no tamanho da moeda sem olhar o alvo de toque.
 */
describe("a primeira tela sem os dois campos", () => {
  const TELA = readFileSync(
    "client/src/components/xbwapp/TelaConversas.tsx",
    "utf8"
  );

  it("as duas chaves existem e estao desligadas", () => {
    expect(TELA).toMatch(/export const MOSTRAR_PESQUISA = false;/);
    expect(TELA).toMatch(/export const MOSTRAR_TODOS_OS_CONTATOS = false;/);
  });

  it("as duas pecas continuam escritas, so que atras da chave", () => {
    expect(TELA).toContain('placeholder="Pesquisar"');
    expect(TELA).toContain("Todos os contatos");
    expect(TELA).toContain("{MOSTRAR_PESQUISA && (");
    expect(TELA).toContain("{MOSTRAR_TODOS_OS_CONTATOS &&");
  });

  it("a placa clara ganhou lado e pe", () => {
    const placa = ultimaRegra(".xbw-conversas")!;
    expect(placa).toContain("2.6vw");
    /* margem embaixo tambem: sem ela a placa encosta na barra de abas */
    expect(placa.replace(/!important/g, "")).toMatch(
      /margin:\s*[^;]*\s+2\.6vw\s+[^;]+/
    );
  });
});

describe("o botao de voltar ao game tem acabamento de game", () => {
  /*
   * ── O BOTAO VIROU O MUNDO EM 14/09/2026 ──────────────────────────────
   *
   * Ordem dele: "vamos trocar tambem o botao laranja da parte superior por
   * estes", com o desenho do planeta no aro dourado.
   *
   * O aro, a luz e o volume deixaram de ser pintados em CSS: vem dentro do
   * desenho. O que este teste passa a segurar e o contrario do que segurava —
   * que nao sobrou moeda NENHUMA por baixo. Um aro de CSS por baixo de um aro
   * desenhado vira dois aros, e e o tipo de coisa que ninguem sabe nomear mas
   * todo mundo ve.
   */
  it("e o desenho do mundo, sem moeda pintada por baixo", () => {
    const sair = regrasQueValemPara(".xbw__sair");
    expect(sair).toContain("background: none");
    expect(sair).toContain("box-shadow: none");
    expect(todasAsRegras(".xbw__sair::before")).toContain(
      "XBW_botao_mundo.webp"
    );
    expect(existsSync("client/public/assets/xbwapp/XBW_botao_mundo.webp")).toBe(
      true
    );
  });

  it("a moeda e o selo tem o mesmo tamanho", () => {
    expect(todasAsRegras(".xbw__sair")).toContain("var(--xbw-moeda)");
    expect(todasAsRegras(".xbw__selo")).toContain("var(--xbw-moeda)");
  });

  it("a moeda nunca fica menor que o alvo de toque, senao vira ovo", () => {
    const moeda = /--xbw-moeda:\s*clamp\(([^,]+),/.exec(CSS);
    expect(moeda).not.toBeNull();
    expect(moeda![1]!.trim()).toBe("var(--xbw-toque)");
  });

  it("nenhuma regra de tela larga troca a forma do botao", () => {
    const sair = regrasQueValemPara(".xbw__sair");
    expect(sair).not.toContain("border-radius: var(--xbw-pilula)");
    /* o nome desenhado sai, mas continua no botao para a leitura em voz alta */
    expect(todasAsRegras(".xbw__sair span")).toContain("clip-path");
    expect(todasAsRegras(".xbw__sair span")).not.toContain("display: inline");
  });
});

/*
 * O BOTAO DE VOLTAR — DE MOEDA LARANJA A DESENHO DO MUNDO.
 *
 * Ordem de 12/09/2026: "DEIXE BOTAO DE VOLTAR AO MAPA COM COR LARANJA, IGUAL
 * AOS PINOS". Ordem de 14/09/2026: "vamos trocar tambem o botao laranja da
 * parte superior por estes" — o planeta no aro dourado.
 *
 * A moeda laranja NAO foi apagada: ela continua sendo o botao que abre o
 * aplicativo la no mapa. O que se desfez foi o PAR — os dois eram a mesma
 * moeda vista dos dois lados da mesma porta, e agora o lado do aplicativo diz
 * PARA ONDE se volta em vez de so dizer que ha uma porta.
 *
 * O que pode se perder sem ninguem ver: alguem devolver o fundo laranja por
 * baixo do desenho, ou o desenho sumir e sobrar um botao vazio no alto.
 */
describe("o botao de voltar mostra o mundo", () => {
  const SAIR = regrasQueValemPara(".xbw__sair");

  it("nao ha mais moeda pintada por baixo do desenho", () => {
    expect(SAIR).toContain("background: none");
    expect(SAIR).not.toContain("linear-gradient(158deg");
  });

  it("o desenho do mundo esta la, e a figura antiga fica de fora", () => {
    expect(todasAsRegras(".xbw__sair .xbw-i")).toContain("display: none");
    const antes = todasAsRegras(".xbw__sair::before");
    expect(antes).toContain("XBW_botao_mundo.webp");
    /* O alfinete recortado saiu daqui — mas o traco continua guardado para o
       dia em que alguma outra peca precisar dele. */
    expect(antes).not.toContain("var(--xbw-alfinete)");
    expect(CSS).toContain("--xbw-alfinete:");
  });

  it("a moeda laranja continua inteira do lado do mapa", () => {
    const doMapa = regrasQueValemPara(".mapa__xbwapp");
    expect(doMapa).toContain("#ffa23a");
    expect(doMapa).toContain("border-radius: 50%");
    expect(doMapa).toContain("box-shadow");
  });
});

/*
 * O ALTO DA CONVERSA — 12/09/2026.
 *
 * Ordem dele: "QUANDO TIVERMOS CHAMADAS RETIRAR ICONE DE 3 PONTOS TELEFONE E
 * CHAMADA DE VIDEO, ENCAIXAR PERFEITAMENTE BOTAO E LOGO NA BARRA E MELHORAR
 * NOME DE USUARIO".
 *
 * O que pode se perder sem ninguem ver:
 *   · os tres botoes serem APAGADOS em vez de ficarem atras da chave — ai nao
 *     ha como traze-los de volta no dia em que a chamada tocar;
 *   · alguem mexer na altura da barra OU na descida do canto sem mexer no
 *     outro, e a moeda voltar a flutuar por cima da barra;
 *   · o lugar reservado voltar a ser um numero escrito a mao, que foi o que
 *     deixou o nome encostando na moeda.
 */
describe("o alto da conversa", () => {
  const CONVERSA = readFileSync(
    "client/src/components/xbwapp/TelaConversa.tsx",
    "utf8"
  );

  it("a chave das chamadas existe e esta desligada", () => {
    expect(CONVERSA).toMatch(/export const TEM_CHAMADAS = false;/);
  });

  it("os tres botoes continuam escritos, atras da chave", () => {
    expect(CONVERSA).toContain("{TEM_CHAMADAS && (");
    for (const rotulo of [
      "Chamada de vídeo",
      "Chamada de voz",
      "Mais opções",
    ]) {
      expect(CONVERSA, `${rotulo} foi apagado`).toContain(rotulo);
    }
    /* Os tres moram DENTRO da chave: o trecho entre a chave e o fecho tem os tres. */
    const dentro = CONVERSA.slice(CONVERSA.indexOf("{TEM_CHAMADAS && ("));
    const ate = dentro.slice(0, dentro.indexOf("</header>"));
    for (const rotulo of [
      "Chamada de vídeo",
      "Chamada de voz",
      "Mais opções",
    ]) {
      expect(ate, `${rotulo} ficou fora da chave`).toContain(rotulo);
    }
  });

  it("a barra e o canto saem do mesmo numero", () => {
    expect(CSS).toContain("--xbw-barra-topo:");
    const canto = todasAsRegras(".xbw__canto");
    expect(canto, "o canto nao le a altura da barra").toContain(
      "var(--xbw-barra-topo)"
    );
    const barra = todasAsRegras(
      ".xbw-conversa .xbw-topo,\n.xbw-chamadas > .xbw-topo,\n.xbw-topo,\n.xbw-topo:has(.xbw-marca),\n.xbw__tela > section:has(.xbw-contatos) > .xbw-topo:has(.xbw-marca)"
    );
    expect(barra, "a barra nao le a propria altura").toContain(
      "var(--xbw-barra-topo)"
    );
  });

  it("o lugar reservado sai do tamanho do canto, e nao de um numero solto", () => {
    const reserva = todasAsRegras(".xbw-conversa .xbw-topo,\n.xbw-topo");
    expect(reserva).toContain("var(--xbw-moeda) * 2");
  });

  it("o nome corta com reticencias e nao empurra o resto", () => {
    const nome = todasAsRegras(".xbw-topo .xbw-topo__quem strong");
    expect(nome).toContain("text-overflow: ellipsis");
    expect(nome).toContain("nowrap");
    expect(todasAsRegras(".xbw-topo__quem")).toContain("min-width: 0");
    expect(todasAsRegras(".xbw-topo__abrir")).toContain("min-width: 0");
  });
});

/**
 * AS DUAS MOEDAS SAO A MESMA PECA.
 *
 * Ordem dele, 12/09/2026: "deixe laranja mesmo formato de botao sair do app".
 *
 * Entrar no aplicativo e voltar ao mapa sao a mesma porta, vista de um lado e
 * do outro. O jeito antigo — cada botao com a sua cor escrita a mao — deixa um
 * ficar para tras na primeira vez que alguem mexe no laranja, e ninguem percebe
 * ate ver os dois lado a lado. Entao o material mora numa regra so, e estes
 * testes seguram isso.
 */
describe("a moeda laranja do mapa", () => {
  /*
   * Em 14/09/2026 ela deixou de ser um par: o botao do aplicativo virou o
   * desenho do mundo. A moeda ficou de dono unico — o botao que abre o
   * aplicativo la no mapa — e continua com todo o acabamento de antes.
   */
  it("o laranja, o aro e o volume continuam inteiros", () => {
    const moeda = ultimaRegra(".mapa__xbwapp");
    expect(moeda, "a moeda do mapa sumiu").not.toBeNull();
    expect(moeda).toContain("#ffa23a");
    expect(moeda).toContain("border-radius: 50%");
    expect(moeda).toContain("box-shadow");
    expect(moeda).toContain("radial-gradient");
    expect(moeda).toContain("inset");
  });

  it("o azul chapado de antes nao volta por descuido", () => {
    const doMapa = regrasQueValemPara(".mapa__xbwapp");
    expect(doMapa).not.toContain("#35b7f5");
    expect(doMapa).not.toContain("#1268c9");
  });

  it("o brilho de tocar continua", () => {
    expect(ultimaRegra(".mapa__xbwapp:hover")).not.toBeNull();
    expect(ultimaRegra(".mapa__xbwapp:active")).not.toBeNull();
  });

  it("o balao e recortado em traco, e a figura pronta fica escondida", () => {
    /*
     * A figura do aplicativo foi desenhada para fundo escuro e carrega uma
     * borda escura assada dentro dela; em cima do laranja ela vira sujeira.
     */
    expect(todasAsRegras(".mapa__xbwapp .xbw-i")).toContain("display: none");
    expect(todasAsRegras(".mapa__xbwapp::before")).toContain("var(--xbw-balao)");
  });

  it("o balao mora fora do aplicativo, senao chega vazio no mapa", () => {
    /*
     * Este botao vive NO MAPA. Um valor guardado dentro de `.xbw` chega vazio
     * aqui e o desenho some sem erro nenhum aparecer — custou o alfinete uma
     * vez, nao custa o balao de novo.
     */
    expect(ultimaRegra(":root")).toContain("--xbw-balao");
  });

  it("o numero de nao lidas tem selo, e nao fica solto no bairro", () => {
    const selo = todasAsRegras(".mapa__xbwapp .xbw-contador");
    expect(selo).toContain("background");
    expect(selo).toContain("box-shadow");
  });
});
