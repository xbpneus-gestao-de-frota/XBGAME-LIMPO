import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ESPERA_DEPOIS_DA_ULTIMA_MS,
  ESPERA_PARA_LIGAR_DE_NOVO_MS,
  PASSO_DA_COBRANCA,
  PASSO_DEPOIS_DE_RESOLVER,
  RECUSAS_ATE_A_MENSAGEM,
} from "../../client/src/game/aConversa";
import { QUEM_LIGA } from "../../client/src/game/aChamada";
import { ROTEIRO_RENAN } from "../../client/src/game/xbwapp/roteiros";
import {
  estadoInicial,
  irParaOPasso,
  passoAtual,
  responder,
  mensagensDa,
} from "../../client/src/game/xbwapp/estado";

const CANVAS = readFileSync("client/src/components/GameCanvas.tsx", "utf8");
const APP = readFileSync("client/src/components/xbwapp/XBWApp.tsx", "utf8");

/**
 * A LIGACAO DE ABERTURA, E ONDE ELA VAI DAR.
 *
 * "Apos atender chamada, iremos conectar whats app app real dentro do game para
 * comunicacao real entre npcs. Entenda que sera um whats app, mas so dentro do
 * game."
 */
describe("a ligacao do Renan", () => {
  it("da para nao atender, e recusar nao e caminho morto", () => {
    /*
     * Uma abertura em que so existe um botao nao e escolha, e um corredor com
     * uma porta. E o jogo nao castiga quem recusa: ele insiste, que e o que um
     * amigo faz.
     */
    expect(RECUSAS_ATE_A_MENSAGEM).toBe(2);
    expect(CANVAS).toContain("const recusar = useCallback");
    expect(ESPERA_PARA_LIGAR_DE_NOVO_MS).toBeGreaterThan(5000);
  });

  it("atender cai DENTRO do aplicativo, na conversa de quem ligou", () => {
    /*
     * Antes havia uma tela de mensagens so da abertura, com as falas escritas
     * dentro dela, enquanto o aplicativo tinha OUTRA conversa com o Renan
     * comecando pelo mesmo bom dia. Duas telas parecidas, dois lugares para
     * mexer, e a certeza de que um dia elas iam discordar uma da outra.
     */
    expect(CANVAS).not.toContain('from "./Conversa"');
    const atender = CANVAS.split("const atender = useCallback")[1]!.split(
      "}, ["
    )[0]!;
    expect(atender).toContain("caiNoAplicativo()");
    const cai = CANVAS.split("const caiNoAplicativo = useCallback")[1]!.split(
      "}, ["
    )[0]!;
    expect(cai).toContain("setAbrirNaConversa(QUEM_LIGA.id)");
    expect(cai).toContain("setAppAberto(true)");
    // e o aplicativo sabe abrir ja dentro de uma conversa
    expect(APP).toContain("conversaInicial");
    expect(APP).toContain("conversaInicial ?? null");
  });

  it("quem liga e um contato do aplicativo, e nao um personagem de uma tela so", () => {
    expect(QUEM_LIGA.id).toBe(ROTEIRO_RENAN.conversa);
  });

  it("na terceira ele NAO liga: ele escreve, e cobrando", () => {
    const corpo = CANVAS.split("const recusar = useCallback")[1]!.split(
      "}, ["
    )[0]!;
    expect(corpo).toContain("caiNoAplicativo(PASSO_DA_COBRANCA)");
    /*
     * Desde 13/09 o jogo guarda QUAL chamada esta tocando, e nao so que ha uma:
     * sao duas do Renan, e atender precisa saber qual cena rodar. Ligar de novo
     * e voltar a tocar a chamada DA ABERTURA — a da pizza nao insiste.
     */
    expect(corpo).toContain('setChamadaAtual("abertura")');
    const cobranca = ROTEIRO_RENAN.passos[PASSO_DA_COBRANCA]!;
    expect(cobranca.falas[0]!.texto).toBe("Fala comigo gente fina!!!!!!");
  });

  it("as duas portas levam a mesma conversa", () => {
    /*
     * Quem atendeu ouve o bom dia; quem ignorou duas ligacoes ouve a cobranca
     * brincando. Dai em diante e igual — e "eu conheco esse" muda de sentido
     * conforme o que a pessoa fez.
     */
    const porAtender = ROTEIRO_RENAN.passos[ROTEIRO_RENAN.inicio]!;
    const porIgnorar = ROTEIRO_RENAN.passos[PASSO_DA_COBRANCA]!;
    expect(porAtender.falas[0]!.texto).toContain("Bom dia");
    expect(porAtender.falas[1]!.texto).toBe("Eu conheço esse 🚁🚁🚁");
    expect(porIgnorar.falas[1]!.texto).toBe("Eu conheço esse 🚁🚁🚁");
    expect(porAtender.respostas).toEqual(porIgnorar.respostas);
  });

  it("as falas sao as dele, na ordem que ele ditou", () => {
    const abertura = ROTEIRO_RENAN.passos[ROTEIRO_RENAN.inicio]!;
    const dela = abertura.respostas![0]!;
    expect(dela.texto).toBe(
      "Não posso sair de casa, mas queria ver meus amigos"
    );
    expect(dela.emSeguida).toEqual(["Onde vc vai?"]);
    const pizza = ROTEIRO_RENAN.passos[dela.vaiPara!]!;
    expect(pizza.falas[0]!.texto).toBe(
      "Tô indo buscar uma pizza a pé, não tem ninguém pra entregar"
    );
    expect(pizza.respostas![0]!.texto).toBe("Vamos resolver isso");
  });

  it("uma resposta pode sair em dois baloes, como gente manda mesmo", () => {
    /*
     * Ninguem escreve "nao posso sair de casa, mas queria ver meus amigos. onde
     * voce vai?" numa mensagem so. Sem isto, seria preciso inventar uma fala do
     * Renan no meio, so para separar duas frases dela.
     */
    const abertura = ROTEIRO_RENAN.passos[ROTEIRO_RENAN.inicio]!;
    const antes = estadoInicial();
    const depois = responder(antes, "renan", abertura.respostas![0]!);
    const minhas = mensagensDa(depois, "renan").filter(m => m.de === "voce");
    expect(minhas.map(m => m.texto)).toEqual([
      "Não posso sair de casa, mas queria ver meus amigos",
      "Onde vc vai?",
    ]);
  });

  it("depois do bau, a cena e a piada dele e o ditado de quem joga", () => {
    /*
     * A CENA MUDOU EM 08/09/2026, por ordem dele.
     *
     * O passo depois do drone comecava com o Renan pedindo ajuda de novo.
     * Agora comeca com a piada — caiu uma caixa do ceu na frente dele, e a
     * primeira coisa que sai da boca de alguem assim nao e um pedido, e uma
     * brincadeira. A resposta e a frase que da nome ao jogo inteiro.
     *
     * O "bom dia" continua fora: ja foi dado la em cima.
     */
    const pizza = ROTEIRO_RENAN.passos["apizza"]!;
    expect(pizza.respostas![0]!.vaiPara).toBe(PASSO_DEPOIS_DE_RESOLVER);
    const depois = ROTEIRO_RENAN.passos[PASSO_DEPOIS_DE_RESOLVER]!;
    expect(depois.falas[0]!.texto).toContain("Achei que era minha pizza");
    expect(depois.falas.some(f => f.texto.includes("Bom dia"))).toBe(false);
    expect(depois.respostas![0]!.texto).toContain("ensinar a pescar");
  });

  it("os lados do dialogo nao se invertem depois do bau", () => {
    /*
     * ESTE TESTE EXISTE POR CAUSA DE UM ERRO REAL.
     *
     * Quem joga nao pedala: despacha, contrata, cuida do dinheiro. O bau que
     * o drone soltou e do RENAN, e e ele que vira entregador. Numa versao a
     * cena saiu trocada — o Renan recebia a bicicleta e continuava pedindo
     * ajuda, e quem joga se oferecia para pedalar.
     *
     * A regra que segura isso: a falta de entregador e fala de QUEM JOGA (vai
     * nas respostas), e o "pode contar comigo" e fala do RENAN (vai nas
     * falas). Se um dia trocarem de lugar de novo, este teste avisa.
     */
    const depoisDoBau = ROTEIRO_RENAN.passos[PASSO_DEPOIS_DE_RESOLVER]!;
    const faltaEntregador = depoisDoBau.respostas!.some(r =>
      (r.emSeguida ?? []).some(t => t.includes("não tenho ninguém"))
    );
    expect(faltaEntregador).toBe(true);

    const aceite = ROTEIRO_RENAN.passos["aceitou"]!;
    expect(aceite.falas[0]!.texto).toContain("Pode contar comigo");

    // e ele mostra que esta pronto, em foto, logo depois de aceitar
    const selfie = aceite.falas.find(f => f.tipo === "foto");
    expect(selfie?.imagem).toContain("selfie-renan-pronto");
    expect(selfie?.esperaMs).toBeGreaterThan(1000);
  });

  it("a conversa fica parada enquanto o drone voa", () => {
    /*
     * DEFEITO REAL, VISTO POR ELE EM 08/09/2026: "o Renan esta digitando
     * antes de o drone chegar, e ja enviou a selfie".
     *
     * O passo da conversa vira no instante em que a pessoa responde "vamos
     * resolver isso" — e e esse mesmo passo que solta o drone. Enquanto o
     * aplicativo continuava aberto, a conversa seguia andando e o Renan
     * comentava um bau que ainda nem tinha decolado.
     *
     * A emenda e uma chave: o jogo desliga a cena quando o drone parte e
     * liga de novo quando a caixa abre. Estas quatro linhas sao o contrato.
     */
    expect(CANVAS).toContain("setCenaLigada(false)");
    expect(CANVAS).toContain("setCenaLigada(true)");
    expect(CANVAS).toContain("cenaLigada={cenaLigada}");
    // e a caixa abrindo e quem religa, no mesmo gesto do aviso
    const abrirMala = CANVAS.slice(CANVAS.indexOf("aoAbrirAMala"));
    /*
     * A janela e generosa de proposito. Ela ja foi de 200 letras e quebrou
     * quando entrou um comentario no meio — e o comentario nao era o defeito.
     * O que este teste tem de garantir e que a caixa abrindo religa a cena, e
     * nao quantas linhas existem entre uma coisa e outra.
     */
    expect(abrirMala.slice(0, 900)).toContain("setCenaLigada(true)");
  });

  it("a cena anda ate o fim e para sozinha", () => {
    /*
     * A conversa e uma cena que se conta sozinha: cada passo aponta para o
     * seguinte e o ultimo nao oferece resposta nenhuma. Sem esse ponto final
     * a cena voltaria a se oferecer para sempre, escrevendo a mesma frase.
     *
     * Este teste caminha a cena inteira, do bau ate a pizza, e cobra que ela
     * termine.
     */
    let estado = irParaOPasso(
      estadoInicial(),
      "renan",
      PASSO_DEPOIS_DE_RESOLVER
    );
    const andados: string[] = [PASSO_DEPOIS_DE_RESOLVER];
    for (let volta = 0; volta < 12; volta += 1) {
      const agora = passoAtual(estado, "renan")!;
      const passo = ROTEIRO_RENAN.passos[agora]!;
      if (!passo.respostas?.length) break;
      const escolha = passo.respostas[0]!;
      estado = responder(estado, "renan", escolha);
      andados.push(passoAtual(estado, "renan")!);
      /* Sem para onde ir, a cena acabou: continuar seria repetir a mesma. */
      if (!escolha.vaiPara) break;
    }
    // a ultima resposta nao aponta para lugar nenhum: e assim que a cena acaba
    expect(andados.at(-1)).toBe(andados.at(-2));

    // e a pizza fecha a cena, do mesmo jeito que abriu a historia
    const ultimaNossa = estado.mensagens.filter(m => m.de === "voce").at(-1);
    expect(ultimaNossa?.texto).toContain("pizza");
  });

  it("o jogo escuta o PASSO da conversa para soltar o drone", () => {
    /*
     * Nao ha aviso especial ligando a tela de mensagens a cena do bairro: a
     * conversa faz o que uma conversa faz, e o jogo repara no que ela virou.
     */
    expect(CANVAS).toContain(
      "if (estadoDoApp.passo[QUEM_LIGA.id] !== PASSO_DEPOIS_DE_RESOLVER) return;"
    );
    expect(CANVAS).toContain("setDroneEntregando(true)");
    expect(ESPERA_DEPOIS_DA_ULTIMA_MS).toBeGreaterThan(800);

    // e o passo chega la de verdade, andando pelo roteiro
    let estado = estadoInicial();
    const abertura = ROTEIRO_RENAN.passos[ROTEIRO_RENAN.inicio]!;
    estado = responder(estado, "renan", abertura.respostas![0]!);
    const pizza = ROTEIRO_RENAN.passos[passoAtual(estado, "renan")!]!;
    estado = responder(estado, "renan", pizza.respostas![0]!);
    expect(passoAtual(estado, "renan")).toBe(PASSO_DEPOIS_DE_RESOLVER);
  });

  it("o jogo pode escolher a porta sem mexer no roteiro", () => {
    const estado = irParaOPasso(estadoInicial(), "renan", PASSO_DA_COBRANCA);
    expect(passoAtual(estado, "renan")).toBe(PASSO_DA_COBRANCA);
    // passo novo, contagem nova: as falas dele comecam do zero
    expect(estado.entregues["renan"]).toBe(0);
  });
});
