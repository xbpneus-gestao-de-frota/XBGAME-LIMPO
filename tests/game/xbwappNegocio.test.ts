/**
 * O LADO COMERCIAL E OS CANAIS — o que ele pediu que fosse REAL.
 *
 * Ordem dele, 07/09/2026: "TODAS ESSA FUNCIONALIDADES REAIS, DENTRO DO GAME
 * NADA DE PLACEBORD". Cada teste aqui prova que a tela MEXE no estado: anuncio
 * criado gasta e rende, cobranca enviada pode ser paga, ausencia responde
 * sozinha, canal seguido aparece na lista.
 */
import { describe, expect, it } from "vitest";
import { estadoInicial } from "../../client/src/game/xbwapp/estado";
import {
  CANAIS,
  canaisParaDescobrir,
  canaisQueSigo,
  contarReacao,
  deixarDeSeguir,
  publicacoesDe,
  quantosSeguem,
  reagirNaPublicacao,
  segue,
  seguir,
  totalDeReacoes,
} from "../../client/src/game/xbwapp/canais";
import {
  ALCANCE_POR_REAL,
  MAIOR_POR_DIA,
  MENOR_POR_DIA,
  aReceber,
  cancelarCobranca,
  categoriasDoGuia,
  criarAnuncio,
  criarCobranca,
  dentroDoIntervalo,
  empresasDoGuia,
  encerrarAnuncio,
  estaAusente,
  estatisticas,
  horarioDoPerfil,
  marcarCobrancaPaga,
  mudarAutomaticas,
  mudarPerfil,
  pausarAnuncio,
  perfilCompleto,
  procurarNoGuia,
  publicarAnuncio,
  recebido,
  respostaAutomatica,
  resultadoDoAnuncio,
} from "../../client/src/game/xbwapp/negocio";

const base = estadoInicial(9 * 60);

describe("canais", () => {
  it("o bairro tem canais, mas ele não segue nenhum no começo", () => {
    expect(base.canais.length).toBe(CANAIS.length);
    expect(base.seguindo).toHaveLength(0);
    expect(canaisQueSigo(base)).toHaveLength(0);
    expect(canaisParaDescobrir(base).length).toBe(CANAIS.length);
  });

  it("seguir e deixar de seguir muda a lista e a contagem", () => {
    const antes = quantosSeguem(base, "canal-xb");
    const e = seguir(base, "canal-xb");
    expect(segue(e, "canal-xb")).toBe(true);
    expect(quantosSeguem(e, "canal-xb")).toBe(antes + 1);
    expect(canaisQueSigo(e).map(c => c.id)).toEqual(["canal-xb"]);
    const voltou = deixarDeSeguir(e, "canal-xb");
    expect(segue(voltou, "canal-xb")).toBe(false);
    expect(quantosSeguem(voltou, "canal-xb")).toBe(antes);
  });

  it("seguir canal que não existe não faz nada", () => {
    expect(seguir(base, "canal-inventado")).toBe(base);
  });

  it("as publicações vêm da mais nova para a mais velha", () => {
    const posts = publicacoesDe(base, "canal-xb");
    for (let i = 1; i < posts.length; i++) {
      expect(posts[i - 1]!.minuto).toBeGreaterThanOrEqual(posts[i]!.minuto);
    }
  });

  it("uma carinha por pessoa: tocar de novo tira, tocar em outra troca", () => {
    const p = publicacoesDe(base, "canal-xb")[0]!;
    const antes = contarReacao(p, "👍");
    const com = reagirNaPublicacao(base, p.id, "👍");
    const dele = publicacoesDe(com, "canal-xb").find(x => x.id === p.id)!;
    expect(dele.minhaReacao).toBe("👍");
    expect(contarReacao(dele, "👍")).toBe(antes + 1);

    const trocou = reagirNaPublicacao(com, p.id, "🙏");
    const outro = publicacoesDe(trocou, "canal-xb").find(x => x.id === p.id)!;
    expect(outro.minhaReacao).toBe("🙏");
    expect(contarReacao(outro, "👍")).toBe(antes);

    const tirou = reagirNaPublicacao(trocou, p.id, "🙏");
    const limpo = publicacoesDe(tirou, "canal-xb").find(x => x.id === p.id)!;
    expect(limpo.minhaReacao).toBeUndefined();
  });

  it("o total de reações conta a do jogador", () => {
    const p = publicacoesDe(base, "canal-bairro")[0]!;
    const antes = totalDeReacoes(p);
    const com = reagirNaPublicacao(base, p.id, "❤️");
    const dele = publicacoesDe(com, "canal-bairro").find(x => x.id === p.id)!;
    expect(totalDeReacoes(dele)).toBe(antes + 1);
  });
});

describe("perfil comercial", () => {
  it("nasce vazio e a conta de completude acompanha", () => {
    expect(perfilCompleto(base.perfil)).toBeLessThan(100);
    const cheio = mudarPerfil(base, {
      nome: "Duda Entregas",
      descricao: "Entrega de bicicleta",
      endereco: "Rua 1",
      horario: "8h às 18h",
      email: "a@b.c",
      site: "duda.com.br",
    });
    expect(perfilCompleto(cheio.perfil)).toBe(100);
  });

  it("entende o horário escrito por gente", () => {
    expect(horarioDoPerfil("8h às 18h")).toEqual({ de: 480, ate: 1080 });
    expect(horarioDoPerfil("08:30 - 17:45")).toEqual({ de: 510, ate: 1065 });
    expect(horarioDoPerfil("sempre aberto")).toBeNull();
  });
});

describe("anúncios", () => {
  const comAnuncio = criarAnuncio(base, {
    titulo: "Entrega rápida",
    texto: "Chamo na hora",
    destino: "conversa",
    publico: "bairro",
    porDia: 1000,
    dias: 7,
  });

  it("nasce rascunho e não rende nada antes de entrar no ar", () => {
    const a = comAnuncio.anuncios[0]!;
    expect(a.situacao).toBe("rascunho");
    expect(resultadoDoAnuncio(comAnuncio, a)).toEqual({
      alcance: 0,
      conversas: 0,
      gasto: 0,
    });
  });

  it("anúncio sem título não é criado", () => {
    const e = criarAnuncio(base, {
      titulo: "   ",
      texto: "",
      destino: "conversa",
      publico: "bairro",
      porDia: 1000,
      dias: 7,
    });
    expect(e.anuncios).toHaveLength(0);
  });

  it("o dinheiro por dia fica dentro do teto e do piso", () => {
    const barato = criarAnuncio(base, {
      titulo: "a",
      texto: "",
      destino: "conversa",
      publico: "bairro",
      porDia: 1,
      dias: 999,
    });
    expect(barato.anuncios[0]!.porDia).toBe(MENOR_POR_DIA);
    expect(barato.anuncios[0]!.dias).toBe(30);

    const caro = criarAnuncio(base, {
      titulo: "a",
      texto: "",
      destino: "conversa",
      publico: "bairro",
      porDia: 999999,
      dias: 0,
    });
    expect(caro.anuncios[0]!.porDia).toBe(MAIOR_POR_DIA);
    expect(caro.anuncios[0]!.dias).toBe(1);
  });

  it("no ar, o resultado sai do dinheiro e do tempo — nunca do texto", () => {
    const noAr = publicarAnuncio(comAnuncio, comAnuncio.anuncios[0]!.id);
    const umDiaDepois = { ...noAr, minuto: noAr.minuto + 24 * 60 };
    const a = umDiaDepois.anuncios[0]!;
    const r = resultadoDoAnuncio(umDiaDepois, a);
    expect(r.gasto).toBe(1000);
    expect(r.alcance).toBe(10 * ALCANCE_POR_REAL);
    expect(r.conversas).toBe(Math.floor((r.alcance * 3) / 100));
  });

  it("o resultado para de crescer quando o período acaba", () => {
    const noAr = publicarAnuncio(comAnuncio, comAnuncio.anuncios[0]!.id);
    const semana = { ...noAr, minuto: noAr.minuto + 7 * 24 * 60 };
    const mes = { ...noAr, minuto: noAr.minuto + 30 * 24 * 60 };
    expect(resultadoDoAnuncio(mes, mes.anuncios[0]!)).toEqual(
      resultadoDoAnuncio(semana, semana.anuncios[0]!)
    );
  });

  it("público menor alcança menos gente pelo mesmo dinheiro", () => {
    const perto = criarAnuncio(base, {
      titulo: "b",
      texto: "",
      destino: "conversa",
      publico: "perto",
      porDia: 1000,
      dias: 7,
    });
    const noArPerto = publicarAnuncio(perto, perto.anuncios[0]!.id);
    const noArBairro = publicarAnuncio(comAnuncio, comAnuncio.anuncios[0]!.id);
    const depois = (e: typeof base) => ({ ...e, minuto: e.minuto + 24 * 60 });
    const a = resultadoDoAnuncio(depois(noArPerto), noArPerto.anuncios[0]!);
    const b = resultadoDoAnuncio(depois(noArBairro), noArBairro.anuncios[0]!);
    expect(a.alcance).toBeLessThan(b.alcance);
    expect(a.gasto).toBe(b.gasto);
  });

  it("pausar e encerrar mudam a situação", () => {
    const id = comAnuncio.anuncios[0]!.id;
    const noAr = publicarAnuncio(comAnuncio, id);
    expect(pausarAnuncio(noAr, id).anuncios[0]!.situacao).toBe("pausado");
    expect(encerrarAnuncio(noAr, id).anuncios[0]!.situacao).toBe("terminado");
  });
});

describe("guia de negócios", () => {
  it("só entram os comércios do bairro", () => {
    expect(empresasDoGuia().every(c => c.tipo === "loja")).toBe(true);
    expect(empresasDoGuia().length).toBeGreaterThan(0);
  });

  it("procura sem acento acha com acento", () => {
    const achou = procurarNoGuia("farmacia");
    expect(achou.map(c => c.id)).toContain("farmacia");
  });

  it("a categoria filtra de verdade", () => {
    const comida = procurarNoGuia("", "Alimentação");
    expect(comida.length).toBeGreaterThan(0);
    expect(comida.map(c => c.id)).not.toContain("farmacia");
  });

  it("as categorias saem das lojas que existem", () => {
    expect(categoriasDoGuia()).toContain("Alimentação");
    expect(categoriasDoGuia()).toContain("Saúde");
  });
});

describe("cobrança", () => {
  it("criar cobrança guarda e deixa a conta em aberto", () => {
    const feito = criarCobranca(base, "casa8", "Entrega", 1250)!;
    expect(feito.cobranca.situacao).toBe("enviada");
    expect(aReceber(feito.estado)).toBe(1250);
    expect(recebido(feito.estado)).toBe(0);
  });

  it("valor zero ou pessoa que não existe não vira cobrança", () => {
    expect(criarCobranca(base, "casa8", "x", 0)).toBeNull();
    expect(criarCobranca(base, "ninguem" as never, "x", 100)).toBeNull();
  });

  it("pagar tira do aberto e põe no recebido", () => {
    const feito = criarCobranca(base, "casa8", "Entrega", 1250)!;
    const pago = marcarCobrancaPaga(feito.estado, feito.cobranca.id);
    expect(aReceber(pago)).toBe(0);
    expect(recebido(pago)).toBe(1250);
  });

  it("cancelar não conta como recebido", () => {
    const feito = criarCobranca(base, "casa8", "Entrega", 1250)!;
    const morta = cancelarCobranca(feito.estado, feito.cobranca.id);
    expect(aReceber(morta)).toBe(0);
    expect(recebido(morta)).toBe(0);
  });

  it("cobrança já paga não muda de novo", () => {
    const feito = criarCobranca(base, "casa8", "Entrega", 1250)!;
    const pago = marcarCobrancaPaga(feito.estado, feito.cobranca.id);
    expect(
      cancelarCobranca(pago, feito.cobranca.id).cobrancas[0]!.situacao
    ).toBe("paga");
  });
});

describe("mensagens automáticas", () => {
  it("desligadas, ninguém responde sozinho", () => {
    expect(respostaAutomatica(base, "casa8")).toBeNull();
    expect(estaAusente(base)).toBe(false);
  });

  it("um intervalo pode virar a noite", () => {
    expect(dentroDoIntervalo(19 * 60, 18 * 60, 8 * 60)).toBe(true);
    expect(dentroDoIntervalo(3 * 60, 18 * 60, 8 * 60)).toBe(true);
    expect(dentroDoIntervalo(12 * 60, 18 * 60, 8 * 60)).toBe(false);
  });

  it("ausência 'fora do horário' pergunta ao perfil", () => {
    const comHorario = mudarPerfil(base, { horario: "8h às 18h" });
    const ligada = mudarAutomaticas(comHorario, {
      ausencia: { ligada: true, quando: "fora-do-horario" },
    });
    expect(estaAusente({ ...ligada, minuto: 10 * 60 })).toBe(false);
    expect(estaAusente({ ...ligada, minuto: 22 * 60 })).toBe(true);
  });

  it("sem horário no perfil, 'fora do horário' não vale — nada de chute", () => {
    const ligada = mudarAutomaticas(base, {
      ausencia: { ligada: true, quando: "fora-do-horario" },
    });
    expect(estaAusente({ ...ligada, minuto: 3 * 60 })).toBe(false);
  });

  it("saudação para novos só sai de quem nunca falou", () => {
    const ligada = mudarAutomaticas(base, {
      saudacao: { ligada: true, para: "novos", texto: "Oi!" },
    });
    expect(respostaAutomatica(ligada, "casa8")).toBe("Oi!");
    const jaFalou = {
      ...ligada,
      mensagens: [
        {
          id: "m1",
          conversa: "casa8" as const,
          de: "voce" as const,
          tipo: "texto" as const,
          texto: "oi",
          minuto: 500,
          estado: "lida" as const,
        },
      ],
    };
    expect(respostaAutomatica(jaFalou, "casa8")).toBeNull();
  });

  it("a ausência ganha da saudação quando as duas estão ligadas", () => {
    const dois = mudarAutomaticas(base, {
      saudacao: { ligada: true, para: "todos", texto: "Oi!" },
      ausencia: { ligada: true, quando: "sempre", texto: "Tô em rota" },
    });
    expect(respostaAutomatica(dois, "casa8")).toBe("Tô em rota");
  });
});

describe("estatísticas", () => {
  it("tudo zero quando nada aconteceu", () => {
    const n = estatisticas(base);
    expect(n.enviadas).toBe(0);
    expect(n.recebidas).toBe(0);
    expect(n.conversas).toBe(0);
    expect(n.aReceber).toBe(0);
  });

  it("a cobrança em aberto aparece nas estatísticas", () => {
    const feito = criarCobranca(base, "casa8", "Entrega", 700)!;
    expect(estatisticas(feito.estado).aReceber).toBe(700);
  });
});
