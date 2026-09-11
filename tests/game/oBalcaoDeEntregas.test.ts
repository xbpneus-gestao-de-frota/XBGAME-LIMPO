/**
 * O BALCAO DE ENTREGA RAPIDA, E A REGUA QUE JULGA CADA PEDIDO.
 *
 * Ordem dele, 08/09/2026, ja com a correcao: "o correto e % do tempo. se uma
 * solicitacao de coleta e entrega final e de 25 segundos em media, ate atrasou
 * ate 10% verde, 25% amarela, e assim por diante. quando entregador ou usuario
 * aceitarem mais de uma coleta por vez podem estar perdendo qualidade."
 *
 * O que estes testes seguram, e por que cada um importa:
 *
 *   · VINTE E CINCO SEGUNDOS E O TEMPO FINAL da solicitacao tipica.
 *   · A NOTA E O ATRASO EM PORCENTAGEM, e nao em segundos. Se alguem voltar a
 *     comparar segundos, a entrega longa vira impossivel e a curta vira de
 *     graca — que e exatamente o que ele mandou corrigir.
 *   · O RELOGIO COMECA NA PUBLICACAO. Hesitar tem de custar estrela.
 *   · CARREGAR DUAS CUSTA TEMPO NAS DUAS, e o atraso aparece sozinho na nota.
 *   · TRES RECLAMACOES FECHAM A PORTA, e a porta reabre depois do periodo.
 *   · RECUSAR NA HORA NAO RENDE RECLAMACAO. Dizer nao e honesto; prometer e
 *     demorar e que nao e.
 */
import { beforeEach, describe, expect, it } from "vitest";

import { estadoInicial } from "@/game/xbwapp/estado";
import { LOJAS } from "@/game/xbwapp/contatos";
import { acoplar, soltarAPonte } from "@/game/xbwapp/ponte";
import { BASE_DO_ENTREGADOR } from "@/game/xbwapp/aRota";
import {
  BLOQUEIOS_POR_DEGRAU,
  CASTIGO_DO_CLIENTE_S,
  DEGRAUS_ATE_O_BAN,
  DIAS_DE_MEMORIA,
  FAIXAS,
  REPUTACAO_DE_PARTIDA,
  SEGUNDOS_POR_DIA,
  INTERVALO_ENTRE_PEDIDOS_S,
  OFERTAS_ABERTAS_NO_MAXIMO,
  PRIMEIRO_NUMERO,
  RECLAMACOES_ATE_PERDER,
  KM_DA_CORRIDA_TIPICA,
  PEDIDOS_DE_TESTE,
  SEGUNDOS_DA_SOLICITACAO,
  aceitarOferta,
  atrasoPorCento,
  auxilioDoComeco,
  bloqueiosNaJanela,
  caixinhaDoDia,
  castigoPara,
  cargaDe,
  corDoPino,
  cronometro,
  clientesAtivos,
  clientesPerdidos,
  diaDoBairro,
  estaDeCastigo,
  estaPerdido,
  faixaDaOferta,
  faixaDe,
  ganhoDoDia,
  mediaDeEstrelas,
  ofertasAbertas,
  ofertasEmAndamento,
  passarUmSegundo,
  proximoCastigoDe,
  reputacaoDoCliente,
  pedidoDeNumero,
  reclamacoesDe,
  recusarOferta,
  rotaDe,
  segundosQueSobram,
  tempoDaSolicitacao,
} from "@/game/xbwapp/entregaRapida";
import type { EstadoDoApp } from "@/game/xbwapp/estado";

/**
 * UM BAIRRO DE MENTIRA, mas com geografia.
 *
 * Cada lugar ganha uma coordenada numa reta; a distancia e a diferenca. E
 * pouco, e basta: com ela a rota do entregador passa a ter caminho curto e
 * caminho longo, que e o que os testes de juntar coletas precisam medir. Com
 * distancia constante — como era antes — juntar duas coletas nunca custaria
 * nada, e o teste passaria dizendo que sim quando a resposta e "depende".
 */
const ONDE: Record<string, number> = {
  pizzaria: 0,
  padaria: 0.2,
  lanchonete: 0.35,
  farmacia: 1.6,
  floricultura: 2,
  papelaria: 2.4,
  casa8: 0.6,
  casa12: 0.8,
  casa34: 2.2,
  casa21: 1.1,
};

function bairroDeMentira() {
  const km = (a: string, b: string) =>
    Math.abs((ONDE[a] ?? 0) - (ONDE[b] ?? 0));
  acoplar({
    kmDaCorrida: (a, b) => km("pizzaria", a) + km(a, b),
    kmDaEntrega: (a, b) => km(a, b),
    freteDaCorrida: (k, volumes) => 7 + k * 1.5 + volumes * 1.5,
  });
}

/** Anda o relogio do balcao. */
function andar(estado: EstadoDoApp, segundos: number): EstadoDoApp {
  let e = estado;
  for (let i = 0; i < segundos; i += 1) e = passarUmSegundo(e);
  return e;
}

describe("a regua do balcao", () => {
  beforeEach(() => {
    soltarAPonte();
    bairroDeMentira();
  });

  it("a solicitacao tipica tem os vinte e cinco segundos que ele mandou", () => {
    expect(tempoDaSolicitacao(KM_DA_CORRIDA_TIPICA)).toBe(
      SEGUNDOS_DA_SOLICITACAO
    );
  });

  it("corrida mais longa ganha mais tempo; a da esquina, menos", () => {
    expect(tempoDaSolicitacao(KM_DA_CORRIDA_TIPICA * 2)).toBeGreaterThan(
      SEGUNDOS_DA_SOLICITACAO
    );
    expect(tempoDaSolicitacao(0.05)).toBeLessThan(SEGUNDOS_DA_SOLICITACAO);
  });

  it("dez por cento ainda e verde; vinte e cinco ja e amarelo", () => {
    // A escada dele, escrita em porcentagem de atraso.
    expect(faixaDe(-20).chave).toBe("adiantado");
    expect(faixaDe(0).chave).toBe("adiantado");
    expect(faixaDe(10).chave).toBe("verde");
    expect(faixaDe(25).chave).toBe("amarela");
    expect(faixaDe(50).chave).toBe("laranja");
    expect(faixaDe(100).chave).toBe("muito-atrasado");
    expect(faixaDe(300).chave).toBe("perdeu");
  });

  it("a escada vai de caixinha com cinco estrelas ate reclamacao", () => {
    const topo = FAIXAS[0]!;
    const fundo = FAIXAS[FAIXAS.length - 1]!;
    expect(topo.estrelas).toBe(5);
    expect(topo.caixinha).toBeGreaterThan(0);
    expect(topo.reclama).toBe(false);
    expect(fundo.estrelas).toBe(1);
    expect(fundo.reclama).toBe(true);
  });

  it("as faixas descem sem buraco entre uma e outra", () => {
    for (let i = 1; i < FAIXAS.length; i += 1) {
      expect(FAIXAS[i]!.atePorCento).toBeGreaterThan(
        FAIXAS[i - 1]!.atePorCento
      );
      expect(FAIXAS[i]!.estrelas).toBeLessThanOrEqual(FAIXAS[i - 1]!.estrelas);
    }
  });

  it("a mesma regua vale para a entrega curta e para a longa", () => {
    /*
     * Dez por cento de atraso e verde nas duas, mesmo que dez por cento sejam
     * dois segundos numa e vinte na outra. E o coracao da correcao dele.
     */
    const curta = tempoDaSolicitacao(0.05);
    const longa = tempoDaSolicitacao(2);
    expect(longa).toBeGreaterThan(curta);
    const atrasoDe = (prazo: number, gastou: number) =>
      Math.round(((gastou - prazo) / prazo) * 100);
    expect(faixaDe(atrasoDe(curta, curta * 1.1)).chave).toBe("verde");
    expect(faixaDe(atrasoDe(longa, longa * 1.1)).chave).toBe("verde");
    expect(faixaDe(atrasoDe(curta, curta * 1.2)).chave).toBe("amarela");
    expect(faixaDe(atrasoDe(longa, longa * 1.2)).chave).toBe("amarela");
  });

  it("a corrida tipica e a mesma medida para todo mundo", () => {
    expect(KM_DA_CORRIDA_TIPICA).toBeGreaterThan(0);
  });
});

describe("o balcao de Entrega Rapida", () => {
  beforeEach(() => {
    soltarAPonte();
    bairroDeMentira();
  });

  it("nasce vazio — o jogo nao abre com trabalho acumulado", () => {
    const e = estadoInicial();
    expect(e.ofertas).toHaveLength(0);
    expect(e.relogioDoBalcao).toBe(0);
    expect(e.proximoNumeroDePedido).toBe(PRIMEIRO_NUMERO);
  });

  it("a abertura solta os tres pedidos de teste de uma vez — ordem dele", () => {
    const e = andar(estadoInicial(), 6);
    expect(e.ofertas).toHaveLength(PEDIDOS_DE_TESTE.length);
    // Todos com a MESMA hora de publicacao: o relogio dos tres comeca junto.
    const horas = new Set(e.ofertas.map(o => o.publicadaEm));
    expect(horas.size).toBe(1);
    // E cada um ja vem com coleta e entrega definidas.
    for (const o of e.ofertas) {
      expect(o.coleta).toBeTruthy();
      expect(o.entrega).toBeTruthy();
      expect(o.entrega).not.toBe(o.coleta);
    }
  });

  it("os tres de teste sao os que ele escolheu", () => {
    const e = andar(estadoInicial(), 6);
    expect(e.ofertas.map(o => o.coleta)).toEqual(
      PEDIDOS_DE_TESTE.map(t => t.coleta)
    );
    expect(e.ofertas.map(o => o.entrega)).toEqual(
      PEDIDOS_DE_TESTE.map(t => t.entrega)
    );
  });

  it("depois da abertura o bairro volta ao compasso normal", () => {
    const e = andar(estadoInicial(), INTERVALO_ENTRE_PEDIDOS_S + 6);
    expect(e.ofertas.length).toBe(PEDIDOS_DE_TESTE.length + 1);
  });

  it("para de publicar quando o balcao enche", () => {
    const e = andar(estadoInicial(), 400);
    expect(ofertasAbertas(e).length).toBeLessThanOrEqual(
      OFERTAS_ABERTAS_NO_MAXIMO
    );
  });

  it("a bolinha escurece sozinha enquanto o pedido espera", () => {
    let e = andar(estadoInicial(), 5);
    const o = ofertasAbertas(e)[0]!;
    const primeira = corDoPino(e, e.ofertas[0]!);
    expect(faixaDaOferta(e, e.ofertas[0]!).chave).toBe("adiantado");
    expect(atrasoPorCento(e, e.ofertas[0]!)).toBeLessThan(0);

    e = andar(e, Math.round(o.prazoS * 1.4));
    const depois = corDoPino(e, e.ofertas[0]!);
    expect(depois).not.toBe(primeira);
    expect(atrasoPorCento(e, e.ofertas[0]!)).toBeGreaterThan(25);
    expect(faixaDaOferta(e, e.ofertas[0]!).estrelas).toBeLessThan(5);
  });

  it("o relogio comeca na PUBLICACAO, e nao no aceite", () => {
    let e = andar(estadoInicial(), 5);
    const o = ofertasAbertas(e)[0]!;
    const sobravaAntes = segundosQueSobram(e, o);
    expect(sobravaAntes).toBeLessThan(o.prazoS);

    e = aceitarOferta(e, o.id, "Renan");
    const depois = e.ofertas.find(x => x.id === o.id)!;
    expect(segundosQueSobram(e, depois)).toBe(sobravaAntes);
  });

  it("aceitar na hora rende caixinha e cinco estrelas", () => {
    let e = andar(estadoInicial(), 5);
    const o = ofertasAbertas(e)[0]!;
    e = aceitarOferta(e, o.id, "Renan");
    e = andar(e, o.prazoS);
    const fim = e.ofertas.find(x => x.id === o.id)!;
    expect(fim.situacao).toBe("entregue");
    expect(fim.estrelas).toBe(5);
    expect(fim.caixinha).toBeGreaterThan(0);
    expect(caixinhaDoDia(e)).toBeGreaterThan(0);
    expect(ganhoDoDia(e)).toBeGreaterThan(0);
    expect(mediaDeEstrelas(e)).toBe(5);
  });

  it("demorar para aceitar derruba a estrela", () => {
    let e = andar(estadoInicial(), 5);
    const o = ofertasAbertas(e)[0]!;
    e = andar(e, o.prazoS); // fica olhando, sem decidir
    e = aceitarOferta(e, o.id, "Renan");
    e = andar(e, o.prazoS);
    const fim = e.ofertas.find(x => x.id === o.id)!;
    expect(fim.estrelas).toBeLessThan(5);
    expect(fim.caixinha).toBe(0);
  });

  it("ninguem aceita: o cliente desiste e liga reclamando", () => {
    let e = andar(estadoInicial(), 5);
    const o = ofertasAbertas(e)[0]!;
    e = andar(e, o.prazoS * 4);
    const fim = e.ofertas.find(x => x.id === o.id)!;
    expect(fim.situacao).toBe("perdida");
    expect(fim.reclamou).toBe(true);
    expect(fim.estrelas).toBe(1);
    expect(reclamacoesDe(e, o.coleta)).toBeGreaterThan(0);
  });

  it("recusar na hora NAO rende reclamacao", () => {
    let e = andar(estadoInicial(), 5);
    const o = ofertasAbertas(e)[0]!;
    e = recusarOferta(e, o.id);
    expect(e.ofertas[0]!.situacao).toBe("recusada");
    expect(reclamacoesDe(e, o.coleta)).toBe(0);
    expect(ofertasAbertas(e).some(x => x.id === o.id)).toBe(false);
  });

  it("na terceira reclamacao o cliente para de mandar servico", () => {
    let e = estadoInicial();
    const quem = LOJAS.find(l => l.online)!.id;
    // Deixa estourar tudo o que aparecer, ate a porta fechar.
    for (let i = 0; i < 600 && !estaDeCastigo(e, quem); i += 1) {
      e = passarUmSegundo(e);
    }
    expect(estaDeCastigo(e, quem)).toBe(true);
    expect(RECLAMACOES_ATE_PERDER).toBe(3);
    // A ficha zera junto com o castigo: ele volta limpo.
    expect(reclamacoesDe(e, quem)).toBe(0);
  });

  it("o cliente de castigo nao publica, e volta depois do periodo", () => {
    let e = estadoInicial();
    const quem = LOJAS.find(l => l.online)!.id;
    for (let i = 0; i < 600 && !estaDeCastigo(e, quem); i += 1) {
      e = passarUmSegundo(e);
    }
    /*
     * O castigo trava PEDIDO NOVO. O que ja estava aberto no balcao continua
     * la — o cliente fechou a porta para servico novo, nao cancelou o que ja
     * tinha pedido.
     */
    const comecou = e.relogioDoBalcao;
    const durante = andar(e, 20);
    expect(
      durante.ofertas.some(o => o.coleta === quem && o.publicadaEm >= comecou)
    ).toBe(false);

    const depois = andar(e, CASTIGO_DO_CLIENTE_S + INTERVALO_ENTRE_PEDIDOS_S);
    expect(estaDeCastigo(depois, quem)).toBe(false);
    expect(CASTIGO_DO_CLIENTE_S).toBe(40 * 60);
  });

  it("o entregador sai da pizzaria e passa pela coleta antes da entrega", () => {
    let e = andar(estadoInicial(), 6);
    const o = ofertasAbertas(e)[0]!;
    e = aceitarOferta(e, o.id, "Renan");
    const rota = rotaDe(e, "Renan");
    expect(rota.em).toBe(BASE_DO_ENTREGADOR);
    expect(rota.paradas[0]!.o).toBe("coleta");
    expect(rota.paradas[0]!.lugar).toBe(o.coleta);
    expect(rota.paradas[1]!.o).toBe("entrega");
    expect(rota.paradas[1]!.lugar).toBe(o.entrega);
  });

  it("juntar DUAS COLETAS VIZINHAS anda menos que fazer uma de cada vez", () => {
    /*
     * E a conta que ele quer que o jogador faca: padaria e lanchonete sao
     * vizinhas, entao pegar as duas antes de entregar economiza caminho.
     */
    const e = andar(estadoInicial(), 6);
    const ajuda = auxilioDoComeco(e, "Renan");
    expect(ajuda).toBeDefined();
    expect(ajuda!.saiDe).toBe(BASE_DO_ENTREGADOR);
    expect(ajuda!.kmJuntas).toBeLessThan(ajuda!.kmSeparadas);
  });

  it("pegar a de perto primeiro atrasa a de longe — o preco de juntar", () => {
    /*
     * O entregador e sensato: ele faz a parada mais perto primeiro. Entao
     * juntar uma coleta longe com uma perto NAO atrasa a de perto — atrasa a
     * DE LONGE, que fica esperando a outra terminar. E exatamente a conta que
     * ele quer que o jogador faca antes de aceitar as duas.
     */
    const ateChegar = (inicio: EstadoDoApp, id: string): number => {
      let e = inicio;
      let s = 0;
      while (
        e.ofertas.find(x => x.id === id)!.situacao !== "entregue" &&
        s < 500
      ) {
        e = passarUmSegundo(e);
        s += 1;
      }
      return s;
    };

    const aberto = andar(estadoInicial(), 6);
    const perto = aberto.ofertas[0]!; // padaria, do lado da pizzaria
    const longe = aberto.ofertas[2]!; // farmacia, na outra ponta

    const soALonge = ateChegar(aceitarOferta(aberto, longe.id, "Renan"), longe.id);

    let asDuas = aceitarOferta(aberto, perto.id, "Renan");
    asDuas = aceitarOferta(asDuas, longe.id, "Renan");
    const aLongeAcompanhada = ateChegar(asDuas, longe.id);

    expect(aLongeAcompanhada).toBeGreaterThan(soALonge);
  });

  it("a moto faz a mesma rota em menos tempo — o caminho da melhoria", () => {
    const aberto = andar(estadoInicial(), 6);
    const o = aberto.ofertas[0]!;
    const correr = (veiculo: string): number => {
      let e = aceitarOferta(aberto, o.id, "Renan");
      e = {
        ...e,
        rotas: { ...e.rotas, Renan: { ...e.rotas.Renan!, veiculo } },
      };
      let s = 0;
      while (
        e.ofertas.find(x => x.id === o.id)!.situacao !== "entregue" &&
        s < 500
      ) {
        e = passarUmSegundo(e);
        s += 1;
      }
      return s;
    };
    expect(correr("moto")).toBeLessThan(correr("bicicleta"));
  });

  it("aceitar poe na fila mesmo sem ninguem livre — regra dele", () => {
    let e = andar(estadoInicial(), 5);
    const o = ofertasAbertas(e)[0]!;
    e = aceitarOferta(e, o.id);
    expect(e.ofertas[0]!.situacao).toBe("na-fila");
    expect(e.ofertas[0]!.entregador).toBeUndefined();
    expect(ofertasEmAndamento(e)).toHaveLength(1);
  });

  it("nao aceita duas vezes o mesmo pedido", () => {
    let e = andar(estadoInicial(), 5);
    const o = ofertasAbertas(e)[0]!;
    e = aceitarOferta(e, o.id, "Renan");
    e = aceitarOferta(e, o.id, "Outro");
    expect(e.ofertas[0]!.entregador).toBe("Renan");
  });

  it("o destino pode ser outro comercio — regra dele", () => {
    const idsDeLoja = new Set(LOJAS.map(l => l.id));
    const destinos = new Set<string>();
    for (let n = PRIMEIRO_NUMERO; n < PRIMEIRO_NUMERO + 40; n += 1) {
      destinos.add(pedidoDeNumero(n, 0).entrega);
    }
    expect([...destinos].some(d => idsDeLoja.has(d))).toBe(true);
  });

  it("nunca coleta e entrega no mesmo lugar", () => {
    for (let n = PRIMEIRO_NUMERO; n < PRIMEIRO_NUMERO + 60; n += 1) {
      const p = pedidoDeNumero(n, 0);
      expect(p.entrega).not.toBe(p.coleta);
    }
  });

  it("o mesmo numero devolve sempre o mesmo pedido", () => {
    expect(pedidoDeNumero(1042, 0)).toEqual(pedidoDeNumero(1042, 0));
  });

  it("o preco vem da ponte, e nao do aplicativo", () => {
    const p = pedidoDeNumero(1001, 0);
    expect(p.frete).toBeCloseTo(7 + p.km * 1.5 + p.volumes * 1.5, 5);
  });

  it("sem bairro acoplado o preco e zero, e nao um numero inventado", () => {
    soltarAPonte();
    expect(pedidoDeNumero(1001, 0).frete).toBe(0);
  });

  it("o cronometro escreve o tempo do jeito que se le", () => {
    expect(cronometro(75)).toBe("1:15");
    expect(cronometro(9)).toBe("0:09");
  });
});

/**
 * A CARTEIRA DE CLIENTES, E O QUE ELA COBRA DA EMPRESA.
 *
 * Ordem dele, 08/09/2026: "ao menos uns 40 minutos, e comeca a contar durante
 * 30 dias a reputacao pode ir piorando ate nao restar mais ninguem entregando
 * frete, entao o jogo sempre vai cobrar crescimento e melhorias" e "a cada 3
 * bloqueios o tempo de castigo vai aumentando, dentro dos 30 dias pode tomar
 * ban daquele cliente".
 */
describe("a carteira de clientes", () => {
  beforeEach(() => {
    soltarAPonte();
    bairroDeMentira();
  });

  it("o dia do bairro anda com o relogio do balcao", () => {
    const e = estadoInicial();
    expect(diaDoBairro(e)).toBe(1);
    expect(diaDoBairro({ ...e, relogioDoBalcao: SEGUNDOS_POR_DIA })).toBe(2);
    expect(
      diaDoBairro({ ...e, relogioDoBalcao: SEGUNDOS_POR_DIA * 29 })
    ).toBe(30);
  });

  it("cliente sem historico comeca na reputacao de partida", () => {
    const e = estadoInicial();
    expect(reputacaoDoCliente(e, "padaria")).toBe(REPUTACAO_DE_PARTIDA);
  });

  it("entrega boa sobe a reputacao; entrega ruim derruba", () => {
    const base = estadoInicial();
    const boa = {
      ...base,
      historico: [
        { dia: 1, cliente: "padaria", estrelas: 5, reclamou: false },
      ],
    };
    const ruim = {
      ...base,
      historico: [
        { dia: 1, cliente: "padaria", estrelas: 1, reclamou: true },
      ],
    };
    expect(reputacaoDoCliente(boa, "padaria")).toBeGreaterThan(
      REPUTACAO_DE_PARTIDA
    );
    expect(reputacaoDoCliente(ruim, "padaria")).toBeLessThan(
      REPUTACAO_DE_PARTIDA
    );
  });

  it("a conta esquece o que passou dos trinta dias", () => {
    const base = estadoInicial();
    const velho = {
      ...base,
      relogioDoBalcao: SEGUNDOS_POR_DIA * (DIAS_DE_MEMORIA + 5),
      historico: [
        { dia: 1, cliente: "padaria", estrelas: 1, reclamou: true },
        { dia: 2, cliente: "padaria", estrelas: 1, reclamou: true },
      ],
    };
    // As duas linhas ficaram para tras: a reputacao voltou ao normal sozinha.
    expect(reputacaoDoCliente(velho, "padaria")).toBe(REPUTACAO_DE_PARTIDA);
  });

  it("o castigo sobe um degrau a cada tres bloqueios", () => {
    expect(castigoPara(0)).toBe(CASTIGO_DO_CLIENTE_S);
    expect(castigoPara(BLOQUEIOS_POR_DEGRAU - 1)).toBe(CASTIGO_DO_CLIENTE_S);
    expect(castigoPara(BLOQUEIOS_POR_DEGRAU)).toBe(CASTIGO_DO_CLIENTE_S * 2);
    expect(castigoPara(BLOQUEIOS_POR_DEGRAU * 2)).toBe(
      CASTIGO_DO_CLIENTE_S * 3
    );
  });

  it("a escada le so os bloqueios dos trinta dias", () => {
    const base = estadoInicial();
    const comBloqueios = {
      ...base,
      relogioDoBalcao: SEGUNDOS_POR_DIA * 2,
      historico: [
        { dia: 1, cliente: "padaria", estrelas: 0, reclamou: true, bloqueio: true },
        { dia: 2, cliente: "padaria", estrelas: 0, reclamou: true, bloqueio: true },
      ],
    };
    expect(bloqueiosNaJanela(comBloqueios, "padaria")).toBe(2);
    expect(proximoCastigoDe(comBloqueios, "padaria")).toBe(
      CASTIGO_DO_CLIENTE_S
    );

    const bemDepois = {
      ...comBloqueios,
      relogioDoBalcao: SEGUNDOS_POR_DIA * (DIAS_DE_MEMORIA + 5),
    };
    expect(bloqueiosNaJanela(bemDepois, "padaria")).toBe(0);
  });

  it("bloqueio nao mexe na reputacao duas vezes", () => {
    const base = estadoInicial();
    const so = {
      ...base,
      historico: [
        { dia: 1, cliente: "padaria", estrelas: 0, reclamou: true, bloqueio: true },
      ],
    };
    expect(reputacaoDoCliente(so, "padaria")).toBe(REPUTACAO_DE_PARTIDA);
  });

  it("depois dos degraus o cliente da ban, e ele sai da carteira", () => {
    // Um cliente que ja gastou todos os degraus dentro da janela.
    const bloqueios = Array.from(
      { length: BLOQUEIOS_POR_DEGRAU * DEGRAUS_ATE_O_BAN },
      (_, i) => ({
        dia: 1,
        cliente: "padaria",
        estrelas: 0,
        reclamou: true,
        bloqueio: true,
      })
    );
    let e: EstadoDoApp = {
      ...estadoInicial(),
      historico: bloqueios,
      reclamacoes: { padaria: 2 },
      equipeDeAgora: 1,
    };
    // Publica um pedido dessa loja e deixa o cliente desistir.
    const pedido = pedidoDeNumero(PRIMEIRO_NUMERO, 0);
    e = { ...e, ofertas: [{ ...pedido, coleta: "padaria" }] };
    for (let i = 0; i < 200 && !estaPerdido(e, "padaria"); i += 1) {
      e = passarUmSegundo(e, 1);
    }
    expect(estaPerdido(e, "padaria")).toBe(true);
    expect(clientesPerdidos(e)).toContain("padaria");
    expect(clientesAtivos(e)).not.toContain("padaria");
  });

  it("cliente perdido nao publica mais nada", () => {
    let e: EstadoDoApp = {
      ...estadoInicial(),
      perdidos: { padaria: 1 },
      equipeDeAgora: 1,
    };
    e = andar(e, 200);
    expect(e.ofertas.some(o => o.coleta === "padaria")).toBe(false);
  });

  it("o cliente perdido volta quando a XB cresce — e so ai", () => {
    let e: EstadoDoApp = {
      ...estadoInicial(),
      perdidos: { padaria: 2 },
      equipeDeAgora: 2,
    };
    // Com a mesma equipe, ele nao volta nem depois de muito tempo.
    e = andar(e, 300);
    expect(estaPerdido(e, "padaria")).toBe(true);

    // Contratou mais um: a porta reabre.
    e = passarUmSegundo(e, 3);
    expect(estaPerdido(e, "padaria")).toBe(false);
    expect(reputacaoDoCliente(e, "padaria")).toBe(REPUTACAO_DE_PARTIDA);
  });

  it("sem cliente nenhum nao ha frete — e e a derrota do jogo", () => {
    const perdidos: Record<string, number> = {};
    for (const l of LOJAS) perdidos[l.id] = 1;
    let e: EstadoDoApp = { ...estadoInicial(), perdidos, equipeDeAgora: 1 };
    e = andar(e, 200);
    expect(clientesAtivos(e)).toHaveLength(0);
    expect(ofertasAbertas(e)).toHaveLength(0);
  });
});
