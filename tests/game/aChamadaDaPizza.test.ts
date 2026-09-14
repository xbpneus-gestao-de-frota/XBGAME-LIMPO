/**
 * A SEGUNDA CHAMADA DO RENAN — a da pizza.
 *
 * Ordem dele, 13/09/2026: "vamos para uma nova chamada de video de Renan, apos
 * ele dizer 'comi todas as pizzas', manda a imagem, dai dizemos 'tudo bem
 * quando estiver melhor me avisa por favor'".
 *
 * O que estes testes guardam nao e o desenho: e a ORDEM e a AUTORIA. Quem diz
 * o que, em que ordem, e de quem e a ultima palavra. Ja saiu trocado uma vez na
 * cena do bau, e foi um teste como este que pegou.
 */
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CENA_DA_ABERTURA,
  CENA_DA_PIZZA,
  FALAS_DA_PIZZA,
  FALAS_NA_LINHA,
  falasDaCena,
  legendaAgora,
} from "@/game/aCenaDaChamada";
import { ESPERA_DA_CHAMADA_MS } from "@/game/aChamada";
import {
  ESPERA_DA_SEGUNDA_CHAMADA_MS,
  PASSO_DA_PIZZA,
  ULTIMA_FALA_DA_PIZZA,
} from "@/game/aConversa";
import { ROTEIRO_RENAN } from "@/game/xbwapp/roteiros";

const passo = ROTEIRO_RENAN.passos[PASSO_DA_PIZZA];

describe("a cena da pizza e a mesma tela, com outras falas", () => {
  it("e uma cena com nome proprio, e nao a da abertura", () => {
    expect(CENA_DA_PIZZA).not.toBe(CENA_DA_ABERTURA);
  });

  it("cada cena traz as falas dela, e o nome desconhecido cai na abertura", () => {
    expect(falasDaCena(CENA_DA_PIZZA)).toBe(FALAS_DA_PIZZA);
    expect(falasDaCena(CENA_DA_ABERTURA)).toBe(FALAS_NA_LINHA);
    expect(falasDaCena("nao-existe")).toBe(FALAS_NA_LINHA);
  });

  /*
   * A LEGENDA DA CENA NAO PODE REPETIR A CONVERSA ESCRITA. Se ela repetisse, a
   * pessoa leria a mesma frase duas vezes e a queda da linha perderia o sentido
   * — o motivo de a conversa continuar por escrito e justamente ele nao ter
   * conseguido falar.
   */
  it("nenhuma legenda repete o que ele escreve depois", () => {
    const escritas = passo.falas.map(f => f.texto);
    for (const fala of FALAS_DA_PIZZA) {
      expect(escritas).not.toContain(fala.texto);
    }
  });

  it("quem pede a legenda sem dizer a cena continua com a da abertura", () => {
    expect(legendaAgora(1400)).toBe(FALAS_NA_LINHA[0].texto);
    expect(legendaAgora(1400, FALAS_DA_PIZZA)).toBe(FALAS_DA_PIZZA[0].texto);
  });

  /*
   * A segunda espera mais que a primeira: a primeira chega num bairro que a
   * pessoa nunca viu, a segunda chega depois de ele ter ido comer.
   */
  it("ele demora mais para ligar de novo do que demorou para ligar", () => {
    expect(ESPERA_DA_SEGUNDA_CHAMADA_MS).toBeGreaterThan(ESPERA_DA_CHAMADA_MS);
  });
});

describe("o que ele diz, na ordem que ele mandou", () => {
  it("o passo existe no roteiro do Renan", () => {
    expect(passo).toBeDefined();
  });

  it("primeiro a frase, depois a imagem", () => {
    expect(passo.falas[0].texto).toBe("Comi todas as pizzas");
    expect(passo.falas[0].tipo).toBeUndefined();
    expect(passo.falas[1].tipo).toBe("foto");
    expect(passo.falas[1].imagem).toContain("foto-renan-pizza");
  });

  /* Dois segundos entre a frase e a foto: o tempo de bater a foto. */
  it("a foto espera antes de entrar, como a selfie do traje novo", () => {
    expect(passo.falas[1].esperaMs).toBe(2000);
  });

  it("o desenho que ele manda existe na pasta do jogo", () => {
    const caminho = `client/public${passo.falas[1].imagem}`;
    expect(existsSync(caminho), `falta ${caminho}`).toBe(true);
  });

  /*
   * A ULTIMA PALAVRA E DE QUEM JOGA — como na abertura. Se a despedida fosse
   * dele ("eu te aviso"), a pessoa sairia da propria historia: quem decide
   * esperar, e quem marca como a espera acaba, e ela.
   */
  it("a ultima palavra e dela, e e a frase dele por inteiro", () => {
    expect(passo.respostas).toHaveLength(1);
    expect(passo.respostas?.[0].texto).toBe(ULTIMA_FALA_DA_PIZZA);
    expect(ULTIMA_FALA_DA_PIZZA).toContain("Quando estiver melhor me avisa");
  });

  /* A conversa descansa aqui: nao ha proximo passo ate a historia ter um. */
  it("a conversa descansa neste passo", () => {
    expect(passo.respostas?.[0].vaiPara).toBeUndefined();
  });

  it("cuidar de quem trabalha com voce conta reputacao", () => {
    expect(passo.respostas?.[0].efeito?.reputacao).toBeGreaterThan(0);
  });
});

/*
 * ── O ENCAIXE NO JOGO ─────────────────────────────────────────────────────
 *
 * Estes leem o arquivo do jogo como texto. Nao e elegante, e e o unico jeito
 * honesto que este projeto tem de guardar uma LIGACAO entre duas partes sem
 * montar a tela inteira num teste. O mesmo ja guarda a chegada da Lorena.
 */
const JOGO = readFileSync("client/src/components/GameCanvas.tsx", "utf8");
const ESTILO = readFileSync("client/src/styles/xbwapp.css", "utf8");
const ESTILO_JOGO = readFileSync("client/src/index.css", "utf8");

describe("o jogo toca a segunda chamada, e so depois abre o balcao", () => {
  it("ela so comeca com a praca limpa — nunca por cima da abertura", () => {
    expect(JOGO).toContain(
      "if (!pracaLimpa || jaChamouDaPizza.current) return"
    );
    expect(JOGO).toContain("ESPERA_DA_SEGUNDA_CHAMADA_MS");
  });

  it("quem ja passou por ela num save nao ouve o telefone de novo", () => {
    expect(JOGO).toContain("PRIMEIRA_FALA_DA_PIZZA");
    expect(JOGO).toContain(
      'const PRIMEIRA_FALA_DA_PIZZA = "Comi todas as pizzas"'
    );
  });

  /*
   * ORDEM DELE: "ainda nao entramos na fase dos pedidos". O aviso de pedido
   * novo espera esta cena terminar — amigo passando mal nao divide a tela com
   * cobranca de trabalho.
   */
  it("o aviso de pedido novo espera a cena da pizza terminar", () => {
    expect(JOGO).toContain("!pracaLimpa || !aPizzaAcabou");
  });

  /*
   * A TELA DE CHAMADA POR FORA precisa levar a cena junto.
   *
   * Ela avisava so "atendeu" — nasceu antes de existir cena. A chamada da
   * pizza e a primeira que toca com o aplicativo fechado, entao e a primeira
   * que passa por ela: sem o nome da cena, atender caia direto na conversa,
   * sem filme e sem o passo novo. Medido na bancada.
   */
  it("a tela de chamada por fora leva o nome da cena junto", () => {
    const corpo = JOGO.split("<ChamadaDeVideo")[1]!.split("/>")[0]!;
    expect(corpo).toContain("atender(");
    expect(corpo).toContain('"video"');
    expect(corpo).toContain("CENA_DA_PIZZA");
  });

  it("atender leva para a cena da pizza, e a cena leva para o passo dela", () => {
    expect(JOGO).toContain("? CENA_DA_PIZZA");
    expect(JOGO).toContain(
      "era === CENA_DA_PIZZA ? PASSO_DA_PIZZA : undefined"
    );
  });

  /* A segunda nao insiste: quem recusa recebe a mensagem, e nao outra ligacao. */
  it("recusar a segunda chamada nao faz ele ligar de novo", () => {
    expect(JOGO).toContain('if (chamadaAtual === "pizza")');
    expect(JOGO).toContain("caiNoAplicativo(PASSO_DA_PIZZA)");
  });
});

/*
 * ── O APLICATIVO COMECA VAZIO ─────────────────────────────────────────────
 *
 * Ordem dele, 13/09/2026: "precisamos limpar tela de mensagens ate este
 * momento, deixando somente a de Renan; neste ponto atual ainda ninguem deve
 * ter mandado pedido ou mensagem".
 *
 * A lista de conversas so mostra quem JA FALOU — entao basta nao semear
 * ninguem no comeco para a primeira tela ter so o Renan.
 */
describe("ninguem escreveu ainda quando o jogo comeca", () => {
  it("o aplicativo nasce sem conversa nenhuma semeada", () => {
    const inicio = JOGO.split("useState<EstadoDoApp>")[1]!.split(");")[0]!;
    expect(inicio).toContain("estadoInicialDoApp");
    expect(inicio).not.toContain("semear");
  });

  it("a padaria e o grupo entram quando a cena da pizza termina", () => {
    expect(JOGO).toContain("if (!aPizzaAcabou || jaSemeouOBairro.current)");
    expect(JOGO).toContain('semear(atual, ["padaria", "grupo-bairro"])');
  });

  /*
   * ORDEM DELE, 14/09: "entrou um chamado de whatsapp da XB que nao sei quem
   * criou e por que esta ali, deve ser removido".
   *
   * Quem escreve no aplicativo sao PESSOAS e LOJAS. Aviso de sistema tem lugar
   * proprio — o cartao prata no mapa.
   */
  it("a XB nao abre conversa sozinha", () => {
    expect(JOGO).not.toContain('"grupo-bairro", "xb"');
  });

  /*
   * A MESMA MARCA abre as duas coisas: as primeiras conversas do bairro e o
   * aviso de pedido novo. Se fossem marcas diferentes, um dia uma andaria sem
   * a outra e o bairro falaria de trabalho antes de haver trabalho.
   */
  it("e a mesma marca que abre o aviso de pedido novo", () => {
    expect(JOGO).toContain("!pracaLimpa || !aPizzaAcabou");
  });
});

/*
 * ── O AVISO NAO PISA NO NOME DO APLICATIVO ────────────────────────────────
 *
 * Ordem dele, 14/09/2026: "conserte esse encavalamento do aviso com o topo".
 *
 * As duas faixas de aviso ficavam presas ao topo do aplicativo, que desde
 * 13/09 e ocupado pelo nome XBWAPP, pela moeda de voltar, pelo selo e pela
 * barra de celular. Agora elas moram na SEGUNDA linha da grade — a mesma da
 * tela —, entao comecam onde o alto acaba, seja qual for a altura dele.
 *
 * Medido no navegador: o alto termina em 89 px e o aviso comeca em 99 px.
 */
describe("o aviso comeca abaixo do alto do aplicativo", () => {
  it("as duas faixas moram na segunda linha da grade, junto da tela", () => {
    const bloco = ESTILO.split(".xbw-faixa,\n.xbw-toque-faixa {")[1]!.split(
      "}"
    )[0]!;
    expect(bloco).toContain("grid-row: 2");
    expect(bloco).toContain("align-self: start");
    expect(bloco).toContain("position: relative");
  });

  /*
   * A TELA E O AVISO DIVIDEM A MESMA CASA da grade de proposito: assim o aviso
   * nao empurra a tela para baixo quando chega, nem deixa buraco quando some.
   */
  it("a tela esta na mesma casa, para o aviso nao empurrar nada", () => {
    expect(ESTILO).toContain(
      ".xbw__tela {\n  grid-row: 2;\n  grid-column: 1;\n}"
    );
  });

  /* Numero escrito a mao aqui seria acerto de hoje e erro de amanha. */
  it("nao ha altura chutada para o alto do aplicativo", () => {
    const bloco = ESTILO.split(".xbw-faixa,\n.xbw-toque-faixa {")[1]!.split(
      "}"
    )[0]!;
    expect(bloco).toContain("inset: auto");
    expect(bloco).not.toMatch(/top:\s*\d/);
  });
});

/*
 * ── A CENA DA CHAMADA E AZUL, NAO VERDE ───────────────────────────────────
 *
 * Ordem dele, 14/09/2026: "a tela da chamada de video de Renan para mostrar a
 * pizza esta verde, saiu do padrao".
 *
 * O bloco inteiro nasceu num verde-quase-preto, enquanto o aplicativo e
 * azul-marinho de ponta a ponta. Cada tom trocou de cor e manteve a claridade.
 */
describe("a cena da chamada segue a cor da casa", () => {
  const CENA = ESTILO_JOGO.split(".cena-chamada {")[1]!.split(
    "A JANELINHA DA PROPRIA CAMERA"
  )[0]!;

  it("nao sobrou nenhum dos tons verdes de antes", () => {
    for (const verde of [
      "#04100c",
      "#eef7f1",
      "rgba(3, 20, 15",
      "rgba(1, 16, 12",
      "rgba(238, 247, 241",
      "rgba(2, 18, 13",
      "rgba(2, 16, 12",
    ]) {
      expect(CENA, `ainda ha ${verde} na cena`).not.toContain(verde);
    }
  });

  it("o fundo e o branco sao os da casa", () => {
    expect(CENA).toContain("#040d16");
    expect(CENA).toContain("#eaf6ff");
  });

  /*
   * As barrinhas de sinal ficam como estavam: ali a cor nao e enfeite, e o
   * unico aviso de que a ligacao vai cair.
   */
  it("as barrinhas de sinal continuam verde e ambar", () => {
    expect(CENA).toContain("#7ce0a8");
    expect(CENA).toContain("#f2c14a");
  });
});
