import { beforeEach, describe, expect, it } from "vitest";
import { estadoInicial, semear } from "../../client/src/game/xbwapp/estado";
import type { EstadoDoApp } from "../../client/src/game/xbwapp/estado";
import {
  apagarParaMim,
  apagarParaTodos,
  editar,
  encaminhar,
  favoritas,
  fixarMensagem,
  mensagem,
  mensagensVisiveis,
  midiaDa,
  procurarNaConversa,
  quantasReacoes,
  reagir,
  reiniciarNumeracaoDeCopias,
  textoDeApagada,
} from "../../client/src/game/xbwapp/mensagens";
import {
  contarVotos,
  mandarAudio,
  mandarCartao,
  mandarDocumento,
  mandarEnquete,
  mandarFigurinha,
  mandarFoto,
  mandarLocal,
  mandarPagamento,
  mandarTexto,
  registrarChamadaNaConversa,
  reiniciarNumeracaoDeEnvio,
  responderCobranca,
  tipoDoArquivo,
  transmitir,
  votar,
} from "../../client/src/game/xbwapp/enviar";
import {
  criarComunidade,
  criarGrupo,
  criarTransmissao,
  darODoGrupo,
  grupo,
  meusGrupos,
  porGrupoNaComunidade,
  porNoGrupo,
  reiniciarNumeracaoDeGrupos,
  renomearGrupo,
  sairDoGrupo,
  tirarDoGrupo,
} from "../../client/src/game/xbwapp/grupos";
import {
  desligar,
  duracaoDaChamada,
  ligar,
  relogioDaChamada,
} from "../../client/src/game/xbwapp/chamadas";
import {
  atalhosQueCombinam,
  bloquear,
  desbloquear,
  etiquetar,
  frasePeloAtalho,
  guardarResposta,
  mostraTiqueAzul,
  mudarPrivacidade,
  mudarTemporarias,
  papelDa,
  trocarPapel,
  trocarTema,
  varrerTemporarias,
} from "../../client/src/game/xbwapp/ajustes";
import {
  DURACAO_DO_RECADO,
  alguemViu,
  apagarRecado,
  meusRecados,
  publicarRecado,
  recadosDosOutros,
  reiniciarNumeracaoDeRecados,
} from "../../client/src/game/xbwapp/meusRecados";
import {
  acoplar,
  ponte,
  soltarAPonte,
} from "../../client/src/game/xbwapp/ponte";

/**
 * O APLICATIVO COMPLETO.
 *
 * Ele pediu "um app whats app com todas funcionalidades" e disse que decide
 * depois como cada uma vira coisa no jogo. Entao o que estes testes cobram nao
 * e o jogo: e que cada funcionalidade FUNCIONA sozinha, do jeito que a pessoa
 * espera de um aplicativo de mensagem.
 */

let base: EstadoDoApp;

beforeEach(() => {
  reiniciarNumeracaoDeEnvio();
  reiniciarNumeracaoDeCopias();
  reiniciarNumeracaoDeGrupos();
  reiniciarNumeracaoDeRecados();
  soltarAPonte();
  base = semear(estadoInicial(), ["padaria"]);
});

describe("o que se faz com uma mensagem", () => {
  it("reagir de novo no mesmo emoji tira a reação", () => {
    const id = base.mensagens[0]!.id;
    const com = reagir(base, id, "❤️");
    expect(quantasReacoes(mensagem(com, id)!)).toBe(1);
    const sem = reagir(com, id, "❤️");
    expect(quantasReacoes(mensagem(sem, id)!)).toBe(0);
  });

  it("uma pessoa só tem UMA reação: o segundo emoji troca, não soma", () => {
    const id = base.mensagens[0]!.id;
    let e = reagir(base, id, "❤️");
    e = reagir(e, id, "😂");
    const m = mensagem(e, id)!;
    expect(quantasReacoes(m)).toBe(1);
    expect(m.reacoes?.["😂"]).toEqual(["voce"]);
    expect(m.reacoes?.["❤️"]).toBeUndefined();
  });

  it("editar deixa a marca para sempre, e só vale no que é seu", () => {
    let e = mandarTexto(base, "padaria", "tô indo");
    const meu = e.mensagens.at(-1)!.id;
    e = editar(e, meu, "tô chegando");
    expect(mensagem(e, meu)!.texto).toBe("tô chegando");
    expect(mensagem(e, meu)!.editada).toBe(true);

    // A fala da padaria não pode ser reescrita por mim.
    const dela = base.mensagens[0]!.id;
    expect(editar(e, dela, "outra coisa")).toBe(e);
  });

  it("apagar para todos deixa rastro; apagar para mim some da minha tela", () => {
    let e = mandarTexto(base, "padaria", "erro");
    const id = e.mensagens.at(-1)!.id;

    const paraTodos = apagarParaTodos(e, id);
    expect(mensagem(paraTodos, id)!.apagada).toBe("todos");
    expect(mensagensVisiveis(paraTodos, "padaria")).toHaveLength(2);
    expect(textoDeApagada(mensagem(paraTodos, id)!)).toContain("Você apagou");

    const paraMim = apagarParaMim(e, id);
    expect(mensagensVisiveis(paraMim, "padaria")).toHaveLength(1);
  });

  it("só dá para apagar para todos o que é meu", () => {
    const dela = base.mensagens[0]!.id;
    expect(apagarParaTodos(base, dela)).toBe(base);
  });

  it("encaminhar nasce meu, marcado, e sem as reações da original", () => {
    let e = reagir(base, base.mensagens[0]!.id, "👍");
    e = encaminhar(e, base.mensagens[0]!.id, ["casa8"], e.minuto);
    const copia = e.mensagens.at(-1)!;
    expect(copia.conversa).toBe("casa8");
    expect(copia.de).toBe("voce");
    expect(copia.encaminhada).toBe(true);
    expect(quantasReacoes(copia)).toBe(0);
  });

  it("fixar a segunda solta a primeira: uma por conversa", () => {
    let e = mandarTexto(base, "padaria", "primeira");
    const a = e.mensagens.at(-1)!.id;
    e = mandarTexto(e, "padaria", "segunda");
    const b = e.mensagens.at(-1)!.id;
    e = fixarMensagem(e, "padaria", a);
    expect(e.fixadaNaConversa.padaria).toBe(a);
    e = fixarMensagem(e, "padaria", b);
    expect(e.fixadaNaConversa.padaria).toBe(b);
    // Fixar a mesma de novo solta.
    e = fixarMensagem(e, "padaria", b);
    expect(e.fixadaNaConversa.padaria).toBeUndefined();
  });

  it("procurar não se importa com acento nem com maiúscula", () => {
    const e = mandarTexto(base, "padaria", "Vou me atrasar um pouquinho");
    expect(procurarNaConversa(e, "padaria", "ATRASAR")).toHaveLength(1);
    expect(procurarNaConversa(e, "padaria", "pouquinho")).toHaveLength(1);
    expect(procurarNaConversa(e, "padaria", "")).toHaveLength(0);
  });

  it("a galeria junta foto, áudio e documento — e não texto", () => {
    let e = mandarFoto(base, "padaria", "/x.webp", "olha");
    e = mandarAudio(e, "padaria", 12);
    e = mandarTexto(e, "padaria", "texto puro");
    expect(midiaDa(e, "padaria")).toHaveLength(2);
  });

  it("as favoritas vêm de todas as conversas, da mais nova para a mais velha", () => {
    let e = mandarTexto(base, "padaria", "uma");
    const a = e.mensagens.at(-1)!.id;
    e = mandarTexto({ ...e, minuto: e.minuto + 10 }, "casa8", "outra");
    const b = e.mensagens.at(-1)!.id;
    e = { ...e, favoritas: [a, b] };
    expect(favoritas(e).map(m => m.id)).toEqual([b, a]);
  });
});

describe("todos os tipos de mensagem", () => {
  it("cada tipo nasce com o que é dele", () => {
    let e = mandarFoto(base, "padaria", "/foto.webp", "chegou");
    expect(e.mensagens.at(-1)).toMatchObject({
      tipo: "foto",
      imagem: "/foto.webp",
    });

    e = mandarAudio(e, "padaria", 7.4);
    expect(e.mensagens.at(-1)).toMatchObject({ tipo: "audio", segundos: 7 });

    e = mandarDocumento(e, "padaria", {
      nome: "nota.pdf",
      tipo: "pdf",
      tamanhoKb: 20,
    });
    expect(e.mensagens.at(-1)!.documento?.tipo).toBe("pdf");

    e = mandarCartao(e, "padaria", "renan", "Renan");
    expect(e.mensagens.at(-1)!.cartao).toBe("renan");

    e = mandarLocal(e, "padaria", "Praça", true);
    expect(e.mensagens.at(-1)!.aoVivo).toBe(true);

    e = mandarFigurinha(e, "padaria", "🚲");
    expect(e.mensagens.at(-1)).toMatchObject({
      tipo: "figurinha",
      texto: "🚲",
    });
  });

  it("o tipo do arquivo sai do fim do nome", () => {
    expect(tipoDoArquivo("nota.PDF")).toBe("pdf");
    expect(tipoDoArquivo("planilha.xlsx")).toBe("planilha");
    expect(tipoDoArquivo("rota.zip")).toBe("compactado");
    expect(tipoDoArquivo("coisa.qualquer")).toBe("outro");
  });

  it("enquete precisa de pergunta e de pelo menos duas opções", () => {
    expect(mandarEnquete(base, "padaria", "", ["a", "b"])).toBe(base);
    expect(mandarEnquete(base, "padaria", "Qual?", ["só uma"])).toBe(base);
    const e = mandarEnquete(base, "padaria", "Qual rota?", [
      "Praça",
      "Lateral",
    ]);
    expect(e.mensagens.at(-1)!.enquete?.opcoes).toHaveLength(2);
  });

  it("na enquete de escolha única, votar de novo TROCA o voto", () => {
    let e = mandarEnquete(base, "padaria", "Qual rota?", ["Praça", "Lateral"]);
    const id = e.mensagens.at(-1)!.id;
    e = votar(e, id, 0);
    expect(contarVotos(mensagem(e, id)!)).toEqual([1, 0]);
    e = votar(e, id, 1);
    expect(contarVotos(mensagem(e, id)!)).toEqual([0, 1]);
  });

  it("na de escolha múltipla, os votos somam e tocar de novo tira", () => {
    let e = mandarEnquete(base, "padaria", "Quais?", ["A", "B"], true);
    const id = e.mensagens.at(-1)!.id;
    e = votar(e, id, 0);
    e = votar(e, id, 1);
    expect(contarVotos(mensagem(e, id)!)).toEqual([1, 1]);
    e = votar(e, id, 0);
    expect(contarVotos(mensagem(e, id)!)).toEqual([0, 1]);
  });

  it("cobrança nasce esperando e pode ser paga ou recusada", () => {
    let e = mandarPagamento(base, "casa8", 12, true);
    const id = e.mensagens.at(-1)!.id;
    expect(mensagem(e, id)!.pagamento?.estado).toBe("pedido");
    e = responderCobranca(e, id, true);
    expect(mensagem(e, id)!.pagamento?.estado).toBe("pago");
    // Responder de novo não muda o que já foi decidido.
    e = responderCobranca(e, id, false);
    expect(mensagem(e, id)!.pagamento?.estado).toBe("pago");
  });

  it("pagamento sem valor não vira mensagem", () => {
    expect(mandarPagamento(base, "casa8", 0)).toBe(base);
  });

  it("a transmissão entrega em cada conversa, separada", () => {
    const e = transmitir(base, ["casa8", "casa12"], "Cheguei no bairro");
    expect(mensagensVisiveis(e, "casa8")).toHaveLength(1);
    expect(mensagensVisiveis(e, "casa12")).toHaveLength(1);
  });

  it("a chamada deixa balão na conversa", () => {
    const e = registrarChamadaNaConversa(base, "renan", {
      tipo: "voz",
      rumo: "perdida",
      segundos: 0,
    });
    expect(e.mensagens.at(-1)!.texto).toContain("perdida");
  });
});

describe("grupos, comunidades e transmissões", () => {
  it("quem cria é dono, e entra junto", () => {
    const e = criarGrupo(base, "Rota da manhã", ["teo", "lia"]);
    const g = meusGrupos(e)[0]!;
    expect(g.donos).toEqual(["voce"]);
    expect(g.membros).toContain("voce");
    expect(g.membros).toHaveLength(3);
  });

  it("grupo sem nome ou sem gente não nasce", () => {
    expect(criarGrupo(base, "", ["teo"])).toBe(base);
    expect(criarGrupo(base, "Vazio", [])).toBe(base);
  });

  it("só dono põe, tira e renomeia", () => {
    let e = criarGrupo(base, "Rota", ["teo"]);
    const id = meusGrupos(e)[0]!.id;
    e = porNoGrupo(e, id, "lia");
    expect(grupo(e, id)!.membros).toContain("lia");
    e = tirarDoGrupo(e, id, "lia");
    expect(grupo(e, id)!.membros).not.toContain("lia");
    e = renomearGrupo(e, id, "Rota da tarde");
    expect(grupo(e, id)!.nome).toBe("Rota da tarde");

    // Sem ser dono, nada disso passa.
    const semDono = { ...e, grupos: e.grupos.map(g => ({ ...g, donos: [] })) };
    expect(porNoGrupo(semDono, id, "lia")).toBe(semDono);
  });

  it("ninguém se tira do grupo pelo caminho de tirar os outros", () => {
    let e = criarGrupo(base, "Rota", ["teo"]);
    const id = meusGrupos(e)[0]!.id;
    expect(tirarDoGrupo(e, id, "voce")).toBe(e);
    e = sairDoGrupo(e, id);
    expect(meusGrupos(e)).toHaveLength(0);
  });

  it("passar o comando antes de sair deixa o grupo com dono", () => {
    let e = criarGrupo(base, "Rota", ["teo"]);
    const id = meusGrupos(e)[0]!.id;
    e = darODoGrupo(e, id, "teo");
    e = sairDoGrupo(e, id);
    expect(grupo(e, id)!.donos).toEqual(["teo"]);
  });

  it("um grupo entra na comunidade e sabe de qual é", () => {
    let e = criarComunidade(base, "Bairro XB");
    const com = e.comunidades[0]!.id;
    e = criarGrupo(e, "Rota", ["teo"]);
    const id = meusGrupos(e)[0]!.id;
    e = porGrupoNaComunidade(e, com, id);
    expect(e.comunidades[0]!.grupos).toContain(id);
    expect(grupo(e, id)!.comunidade).toBe(com);
  });

  it("lista de transmissão guarda os destinos", () => {
    const e = criarTransmissao(base, "Clientes de hoje", ["casa8", "casa12"]);
    expect(e.transmissoes[0]!.destinos).toHaveLength(2);
  });
});

describe("as chamadas", () => {
  it("a duração é calculada pela hora de início, nunca guardada", () => {
    const e = ligar(base, "renan", "voz", 1000);
    expect(duracaoDaChamada(e, 1042)).toBe(42);
    expect(duracaoDaChamada(e, 1000)).toBe(0);
  });

  it("desligar registra a chamada E deixa balão na conversa", () => {
    let e = ligar(base, "renan", "video", 1000);
    e = desligar(e, 1075);
    expect(e.chamadaEmCurso).toBeUndefined();
    expect(e.chamadas[0]).toMatchObject({ contato: "renan", segundos: 75 });
    expect(e.mensagens.at(-1)!.tipo).toBe("chamada");
  });

  it("quem está bloqueado não recebe ligação", () => {
    const e = bloquear(base, "renan");
    expect(ligar(e, "renan", "voz", 1).chamadaEmCurso).toBeUndefined();
  });

  it("não se liga para dois ao mesmo tempo", () => {
    const e = ligar(base, "renan", "voz", 1);
    expect(ligar(e, "teo", "voz", 2).chamadaEmCurso?.contato).toBe("renan");
  });

  it("o relógio da chamada passa de uma hora sem virar 0:00", () => {
    expect(relogioDaChamada(75)).toBe("1:15");
    expect(relogioDaChamada(3675)).toBe("1:01:15");
  });
});

describe("privacidade, aparência e trabalho", () => {
  it("bloquear não apaga a conversa", () => {
    const antes = mensagensVisiveis(base, "padaria").length;
    const e = bloquear(base, "padaria");
    expect(mensagensVisiveis(e, "padaria")).toHaveLength(antes);
    expect(desbloquear(e, "padaria").bloqueados).toHaveLength(0);
  });

  it("desligar o recibo tira o tique azul", () => {
    expect(mostraTiqueAzul(base)).toBe(true);
    expect(mostraTiqueAzul(mudarPrivacidade(base, "recibos", false))).toBe(
      false
    );
  });

  it("o papel de parede de uma conversa ganha do padrão", () => {
    let e = trocarPapel(base, "noite");
    expect(papelDa(e, "padaria")).toBe("noite");
    e = trocarPapel(e, "asfalto", "padaria");
    expect(papelDa(e, "padaria")).toBe("asfalto");
    expect(papelDa(e, "casa8")).toBe("noite");
  });

  it("o tema troca a lista de valores inteira", () => {
    expect(trocarTema(base, "claro").aparencia.tema).toBe("claro");
  });

  it("a temporária some de verdade, sem deixar rastro", () => {
    let e = mandarTexto(base, "padaria", "some depois");
    e = mudarTemporarias(e, "padaria", 1440);
    const antes = e.mensagens.length;
    e = varrerTemporarias({ ...e, minuto: e.minuto + 1500 });
    expect(e.mensagens.length).toBeLessThan(antes);
    // E não virou "apagada": some mesmo.
    expect(e.mensagens.some(m => m.apagada)).toBe(false);
  });

  it("desligar a temporária para de varrer", () => {
    let e = mandarTexto(base, "padaria", "fica");
    e = mudarTemporarias(e, "padaria", 1440);
    e = mudarTemporarias(e, "padaria", 0);
    const antes = e.mensagens.length;
    expect(
      varrerTemporarias({ ...e, minuto: e.minuto + 9999 }).mensagens
    ).toHaveLength(antes);
  });

  it("a etiqueta liga e desliga, e a conversa some da lista quando zera", () => {
    let e = etiquetar(base, "padaria", "novo");
    expect(e.etiquetas.padaria).toEqual(["novo"]);
    e = etiquetar(e, "padaria", "novo");
    expect(e.etiquetas.padaria).toBeUndefined();
  });

  it("o atalho vira a frase inteira", () => {
    expect(frasePeloAtalho(base, "/cheguei")).toContain("Cheguei");
    expect(frasePeloAtalho(base, "cheguei")).toBeUndefined();
    expect(atalhosQueCombinam(base, "/a").length).toBeGreaterThan(0);
  });

  it("guardar uma resposta com atalho repetido troca, não duplica", () => {
    const quantas = base.respostasRapidas.length;
    const e = guardarResposta(base, "/indo", "outra frase");
    expect(e.respostasRapidas).toHaveLength(quantas);
    expect(frasePeloAtalho(e, "/indo")).toBe("outra frase");
  });
});

describe("os recados", () => {
  it("publicar entra na frente e começa sem ninguém tendo visto", () => {
    const e = publicarRecado(base, "Saindo pra rota");
    expect(meusRecados(e)[0]!.texto).toBe("Saindo pra rota");
    expect(meusRecados(e)[0]!.vistoPor).toEqual([]);
  });

  it("recado vazio não vira nada", () => {
    expect(publicarRecado(base, "   ")).toBe(base);
  });

  it("mostra quem viu, sem repetir a mesma pessoa", () => {
    let e = publicarRecado(base, "Bom dia");
    const id = meusRecados(e)[0]!.id;
    e = alguemViu(e, id, "teo");
    e = alguemViu(e, id, "teo");
    e = alguemViu(e, id, "lia");
    expect(meusRecados(e)[0]!.vistoPor).toEqual(["teo", "lia"]);
  });

  it("o recado cai sozinho depois de um dia", () => {
    const e = publicarRecado(base, "some amanhã");
    const depois = { ...e, minuto: e.minuto + DURACAO_DO_RECADO + 1 };
    expect(meusRecados(depois)).toHaveLength(0);
  });

  /*
   * O aplicativo abre sem recado nenhum (ordem dele: "SEM MENSAGENS
   * AUTOMATICAS"), entao o recado dos outros entra aqui, na mao do teste.
   */
  function comRecadoDeOutro(quem: string) {
    return {
      ...base,
      recados: [
        {
          id: "de-outro",
          dono: quem,
          texto: "recado de outra pessoa",
          minuto: base.minuto - 5,
          visto: false,
        },
        ...base.recados,
      ],
    };
  }

  it("quem está bloqueado não aparece nos recados", () => {
    const e = bloquear(comRecadoDeOutro("lia"), "lia");
    expect(recadosDosOutros(e).some(r => r.dono === "lia")).toBe(false);
  });

  it("só dá para apagar recado que é meu", () => {
    const e = publicarRecado(comRecadoDeOutro("nino"), "meu");
    const alheio = recadosDosOutros(e)[0]!.id;
    expect(apagarRecado(e, alheio)).toBe(e);
  });
});

describe("a ponte com o jogo", () => {
  it("sem o jogo acoplado o aplicativo funciona, e não inventa distância", () => {
    expect(ponte().kmDaCorrida("padaria", "casa8")).toBe(0);
    expect(ponte().prazoEmMinutos("padaria", "casa8")).toBeGreaterThan(0);
    expect(ponte().jogador().nome).toBeTruthy();
  });

  it("o jogo acopla e passa a responder", () => {
    acoplar({
      kmDaCorrida: () => 3.4,
      jogador: () => ({ nome: "Téo" }),
    });
    expect(ponte().kmDaCorrida("padaria", "casa8")).toBe(3.4);
    expect(ponte().jogador().nome).toBe("Téo");
    // O que ele não respondeu continua vindo de casa.
    expect(ponte().kmDaEntrega("padaria", "casa8")).toBe(0);
  });

  it("soltar a ponte volta tudo para as respostas de casa", () => {
    acoplar({ kmDaCorrida: () => 9 });
    soltarAPonte();
    expect(ponte().kmDaCorrida("padaria", "casa8")).toBe(0);
  });

  it("o aviso não quebra nada quando ninguém está ouvindo", () => {
    expect(() => ponte().aconteceu({ o: "abriu-o-mapa" })).not.toThrow();
  });
});
