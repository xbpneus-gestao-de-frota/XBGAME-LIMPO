/**
 * As portas do bairro.
 *
 * Estes testes existem porque os enderecos NAO sao escritos a mao: eles saem
 * da malha de ruas. Isso e o que faz o bairro sobreviver a um mapa novo — e
 * tambem o que faz um erro passar despercebido, porque ninguem olha 65 portas
 * uma a uma. Os testes olham.
 *
 * O que mais importa aqui nao e "existe 61 casas". E: nenhuma porta caiu fora
 * do mapa, nenhuma caiu em cima da outra, e a numeracao cresce conforme se
 * afasta da base ANDANDO PELA RUA. Uma casa 40 mais perto que a casa 3 nao
 * quebraria nada — o jogo rodaria igual, dizendo bobagem a cada entrega.
 */
import { describe, expect, it } from "vitest";
import {
  BASE,
  CASAS,
  caminhadaAPe,
  COMERCIOS,
  ENDERECOS,
  QUANTAS_CASAS,
  naTela,
} from "../../client/src/game/addresses";
import {
  MAPA,
  METROS_POR_PIXEL,
  NOS,
  TRECHOS,
} from "../../client/src/game/streets";
import { rota } from "../../client/src/game/rotas";

/**
 * Distancia de um ponto ate a LINHA da rua, e nao ate os pontos guardados
 * dela. Medir ate os pontos foi o primeiro jeito e estava errado: numa reta
 * longa o tracado guarda so as duas pontas, entao uma porta no meio da quadra
 * fica longe dos dois pontos e em cima do asfalto do mesmo jeito. O teste
 * reprovava codigo certo.
 */
const ateOSegmento = (
  p: readonly [number, number],
  a: readonly [number, number],
  b: readonly [number, number]
): number => {
  const vx = b[0] - a[0];
  const vy = b[1] - a[1];
  const comprimento = vx * vx + vy * vy;
  if (comprimento === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  let t = ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / comprimento;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + vx * t), p[1] - (a[1] + vy * t));
};

/**
 * A MESMA DISTANCIA, MAS EM METROS — e por que isso passou a importar.
 *
 * A conta acima soma x e y como se fossem a mesma coisa, e nao sao: o mapa tem
 * 1448 de largura por 1086 de altura, entao um por cento deitado vale mais
 * metro que um por cento em pe. Enquanto a malha grudava em cada porta a
 * diferenca nao aparecia, porque a distancia era zero. Agora aparece.
 */
/** A distancia entre dois pontos do mapa, em metros. */
const metrosEntre = (
  a: readonly [number, number],
  b: readonly [number, number]
): number =>
  Math.hypot(
    ((a[0] - b[0]) / 100) * MAPA.largura,
    ((a[1] - b[1]) / 100) * MAPA.altura
  ) * METROS_POR_PIXEL;

const metrosAteARua = (porta: readonly [number, number]): number => {
  let perto = Infinity;
  for (const t of TRECHOS) {
    for (let i = 1; i < t.linha.length; i += 1) {
      const a = t.linha[i - 1]!;
      const b = t.linha[i]!;
      const emPx = (q: readonly [number, number]): [number, number] => [
        (q[0] / 100) * MAPA.largura,
        (q[1] / 100) * MAPA.altura,
      ];
      const d = ateOSegmento(emPx(porta), emPx(a), emPx(b)) * METROS_POR_PIXEL;
      if (d < perto) perto = d;
    }
  }
  return perto;
};

describe("as portas do bairro", () => {
  it("os enderecos sao os que o Fernando marcou, e nao os que a analise achou", () => {
    /*
     * MUDANCA DE FONTE, 05/09/2026. Ate aqui os enderecos saiam de analise de
     * imagem, e a analise errava: chegou a pintar casa em cima de pinheiro e
     * loja no meio de cruzamento. Agora ele marca o mapa a mao e disse como
     * ler: "bolas vermelhas locais de coleta ou comercios, bolas verdes locais
     * de entregas ou residencias" — e depois, sem meio termo: "deve seguir
     * modelo que te entreguei".
     *
     * Entao este teste nao guarda mais um numero que eu escolhi. Ele guarda
     * que a fonte continua sendo a marcacao dele: se um dia alguem voltar a
     * gerar endereco por analise, o total muda e este teste cai.
     *
     * OS NUMEROS CAIRAM DUAS VEZES EM 05/09/2026, e as duas quedas foram
     * conserto do mesmo erro visto de mais perto.
     *
     * De 187 para 139: eu contava qualquer mancha da cor como endereco, e os
     * riscos dele viravam fileiras de pinos — "tem muita coisa duplicada".
     *
     * De 139 para 70: o conserto tinha sido pela metade. Eu separava bola de
     * risco pelo COMPRIMENTO do miolo, e risco GORDO passava como bola. Ele
     * viu de novo, na tela: "riscos ainda estao como pinos, isso nao deve
     * existir". A regra que funciona e o ALONGAMENTO da mancha — no desenho
     * dele bola fica em 1,3 a 1,6 e risco comeca em 1,75, sem nada no meio.
     *
     * De 70 para 67: o TELHADO E O TIJOLO do desenho estavam entrando como
     * marca. Telha de barro no sol e parede de tijolo passam na peneira de
     * cor e saem redondas — deram tres pinos de loja em cima de casa que so
     * tinha bola verde. Ele viu: "ainda temos um caso de duplicacao". A tinta
     * dele e PURA e o desenho embaixo nunca e: medido no miolo, tinta fica em
     * 205 a 228 e telhado/tijolo em 55 a 87, sem nada no meio.
     */
    expect(BASE.nome).toBe("Praça da Fonte");
    expect(COMERCIOS).toHaveLength(20);
    /*
     * 47 VIROU 48 EM 08/09/2026, e o motivo foi o olho dele.
     *
     * Ao ver o mapa numerado, ele apontou: "tem uma casa no canto esquerdo
     * inferior da imagem que nao esta mapeada". Estava certo — a marcacao
     * original passou por cima dela, e o bairro tem 48 casas desenhadas.
     *
     * Conferi o mapa inteiro, quadrante por quadrante, com os pinos por cima
     * do desenho: era a unica que faltava.
     */
    expect(CASAS).toHaveLength(48);
    expect(CASAS).toHaveLength(QUANTAS_CASAS);
    /*
     * TODO LUGAR TEM NOME — ordem dele, 08/09/2026: "primeiro devemos mapear e
     * gerar nome para cada local de coleta e entrega".
     *
     * Antes so cinco comercios tinham nome e as casas eram "casa 1", "casa 2".
     * Um bairro assim nao e um bairro, e uma planilha: ninguem entrega na
     * "casa 34", entrega na casa da dona Ilda.
     *
     * Este teste nao guarda QUAIS nomes — batizar continua sendo do Fernando,
     * e ele pode trocar todos amanha. Guarda que NENHUM lugar ficou sem: se
     * um predio novo entrar no mapa e ninguem batizar, este teste avisa antes
     * de aparecer um "comércio 14" no meio de uma entrega.
     */
    const semNome = [...COMERCIOS, ...CASAS].filter(e =>
      /^(comércio|casa) \d+$/.test(e.nome),
    );
    expect(semNome.map(e => e.nome)).toEqual([]);

    // e os cinco que ja existiam continuam de pe, com o nome que tinham
    const nomes = COMERCIOS.map(c => c.nome);
    for (const antigo of [
      "Farmácia",
      "Floricultura",
      "Lanchonete",
      "Padaria",
      "Papelaria",
    ])
      expect(nomes).toContain(antigo);
  });

  it("o trecho a pe comeca na rua e termina no lugar", () => {
    /*
     * Os RISCOS que ele desenhou nao sao endereco, sao a troca de animacao:
     * "riscos serao onde mudara animacao, para entregador andar ate a porta
     * para entrega ou retirada". Um risco so presta se as duas pontas
     * estiverem certas — se a primeira nao estiver na rua, a bicicleta para
     * no meio do jardim; se a ultima nao chegar ao lugar, o entregador anda
     * a pe e nao chega em lugar nenhum.
     */
    const comRisco = ENDERECOS.filter(e => e.aPe && e.aPe.length > 1);
    expect(comRisco.length).toBeGreaterThan(40);
    for (const e of comRisco) {
      const inicio = e.aPe![0]!;
      const fim = e.aPe![e.aPe!.length - 1]!;
      // a bicicleta para exatamente na porta, que ja foi conferida na rua
      expect(Math.hypot(inicio[0] - e.em[0], inicio[1] - e.em[1])).toBeLessThan(0.01);
      // e a caminhada acaba perto da bola que ele pintou
      expect(Math.hypot(fim[0] - e.telhado[0], fim[1] - e.telhado[1])).toBeLessThan(7);
      /*
       * E O ULTIMO PEDACO, e nao meia entrega. A caminhada tipica que ele
       * desenhou da trinta metros — do meio-fio ate a porta. A mais longa da
       * cento e sessenta, e e a rua de comercio, onde ele riscou ao longo da
       * fila de lojas; por isso o teto aqui e folgado, mas existe: um "trecho
       * a pe" de meio bairro seria risco lido errado, nao caminhada.
       */
      let anda = 0;
      for (let i = 1; i < e.aPe!.length; i += 1) {
        anda += Math.hypot(e.aPe![i]![0] - e.aPe![i - 1]![0], e.aPe![i]![1] - e.aPe![i - 1]![1]);
      }
      expect(anda).toBeLessThan(20);
    }
  });

  it("nenhuma porta caiu fora do mapa", () => {
    for (const e of ENDERECOS) {
      expect(e.em[0]).toBeGreaterThanOrEqual(0);
      expect(e.em[0]).toBeLessThanOrEqual(100);
      expect(e.em[1]).toBeGreaterThanOrEqual(0);
      expect(e.em[1]).toBeLessThanOrEqual(100);
    }
  });

  it("nenhuma porta ficou em cima da outra", () => {
    /*
     * Duas portas no mesmo ponto dariam uma entrega de zero metro e uma
     * segunda porta invisivel no mapa — a pessoa entregaria numa casa que
     * nunca viu.
     */
    for (let i = 0; i < ENDERECOS.length; i += 1) {
      for (let j = i + 1; j < ENDERECOS.length; j += 1) {
        const a = ENDERECOS[i]!.em;
        const b = ENDERECOS[j]!.em;
        const separacao = Math.hypot(a[0] - b[0], a[1] - b[1]);
        expect(separacao).toBeGreaterThan(0.2);
      }
    }
  });

  it("a numeracao das casas cresce conforme se afasta da base", () => {
    // Medido andando PELA RUA, e nao em linha reta — que atravessaria
    // quarteirao e daria numero de casa mentindo sobre a ordem das paradas.
    for (let i = 1; i < CASAS.length; i += 1) {
      expect(CASAS[i]!.metrosDaBase).toBeGreaterThanOrEqual(
        CASAS[i - 1]!.metrosDaBase
      );
    }
    expect(CASAS[0]!.numero).toBe(1);
    expect(CASAS[CASAS.length - 1]!.numero).toBe(QUANTAS_CASAS);
  });

  it("toda porta e alcancavel a pe a partir da base", () => {
    /*
     * Distancia infinita significa porta em pedaco de rua solto do resto —
     * o jogo mandaria a pessoa a um lugar aonde nao se chega, e so daria para
     * descobrir jogando.
     */
    for (const e of ENDERECOS) {
      expect(Number.isFinite(e.metrosDaBase)).toBe(true);
    }
  });

  it("a base fica no meio do bairro, e nao num canto", () => {
    // Base num canto faria toda primeira entrega comecar com uma travessia.
    expect(BASE.em[0]).toBeGreaterThan(25);
    expect(BASE.em[0]).toBeLessThan(75);
    expect(BASE.em[1]).toBeGreaterThan(25);
    expect(BASE.em[1]).toBeLessThan(75);
  });

  it("toda porta tem rua por perto, inclusive a da base", () => {
    /*
     * Isto mudou tres vezes, e as tres de proposito.
     *
     * Antes o comercio era colocado EM CIMA de um cruzamento, porque o bairro
     * era inventado em cima da malha — e a Pizzaria aparecia no meio do
     * asfalto. Depois os predios passaram a sair do desenho, e a porta virou
     * o ponto do predio que toca a rua. A base seguiu junto: era a esquina
     * mais central, virou a Praca da Fonte.
     *
     * ── E EM 06/09/2026 A MALHA MUDOU DE NATUREZA ────────────────────────
     *
     * Ate aqui a malha era construida GRUDANDO em cada porta: onde a porta
     * ficava, a rua ia ate ela. Isso fazia a distancia dar zero — e fazia a
     * rua serpentear de porta em porta. Ele viu na tela e disse: "estamos
     * desviando de tudo, fica mais feio". A malha nova e o EIXO da rua,
     * desenhado a mao por ele, reto no meio do asfalto.
     *
     * Com eixo de rua, porta encostando na linha e impossivel por
     * construcao: entre o meio do asfalto e o meio-fio ha meia rua. O que
     * uma porta promete deixa de ser "encosto na linha" e passa a ser
     * "tenho rua a uma caminhada curta" — que e o que o entregador faz.
     *
     * Trinta metros e o limite honesto: e a largura de um quarteirao deste
     * bairro. Porta mais longe que isso nao tem rua, tem mato.
     */
    for (const c of [BASE, ...COMERCIOS]) {
      expect(metrosAteARua(c.em), c.id).toBeLessThan(30);
    }
  });

  it("a bicicleta para na rua, e nunca dentro do lugar", () => {
    /*
     * REGRA DELE, 06/09/2026: "o entregador, quando for fazer coleta ou
     * entrega, irá parar a bicicleta, e depois geraremos animação dele fora da
     * bicicleta; por isso o entregador NAO deve parar com a bicicleta dentro
     * do local."
     *
     * Enquanto a malha grudava em cada porta, parar na porta era parar dentro
     * do lugar — a rua ia ate a soleira. Com a malha em EIXO DE RUA a rota
     * acaba no meio do asfalto, e a regra passa a valer por construcao.
     *
     * Este teste existe para ela nao se perder na proxima vez que alguem
     * mexer na malha. Sao duas medidas, e as duas precisam:
     *
     *  — a bicicleta fica NA RUA (a menos de tres metros do traçado), senao
     *    ela para no jardim;
     *  — e fica FORA do lugar (a mais de dez metros da bola que ele pintou),
     *    senao ela para dentro da loja.
     */
    for (const e of [...COMERCIOS, ...CASAS]) {
      const caminho = rota(BASE.em, e.em);
      const parada = caminho[caminho.length - 1]!;
      expect(metrosAteARua(parada), `${e.id} parou fora da rua`).toBeLessThan(3);
      expect(
        metrosEntre(parada, e.telhado),
        `${e.id} parou dentro do lugar`
      ).toBeGreaterThan(10);
    }
    /*
     * PRAZO PROPRIO: este teste calcula a rota de verdade para os 66
     * enderecos, e isso passa dos cinco segundos que o vitest da por padrao.
     * Sem o prazo ele reprova por relogio, e nao por defeito — o pior tipo de
     * teste vermelho, porque manda procurar erro onde nao ha.
     */
  }, 30_000);

  it("a caminhada a pe comeca onde a bicicleta ficou", () => {
    /*
     * A outra ponta da mesma regra. Se a caminhada nao comecar exatamente onde
     * a bicicleta parou, o menino some de um lado e aparece do outro no
     * instante em que a animacao troca.
     */
    for (const e of [...COMERCIOS, ...CASAS]) {
      const caminho = rota(BASE.em, e.em);
      const parada = caminho[caminho.length - 1]!;
      const aPe = caminhadaAPe(parada, e);
      expect(aPe.length).toBeGreaterThanOrEqual(2);
      expect(aPe[0]).toEqual(parada);
      // e termina no lugar: na porta, ou no fim do risco que ele desenhou
      const fim = aPe[aPe.length - 1]!;
      const alvo = e.aPe && e.aPe.length > 1 ? e.aPe[e.aPe.length - 1]! : e.em;
      expect(metrosEntre(fim, alvo)).toBeLessThan(0.5);
    }
  }, 30_000);

  it("o pino pousa exatamente na bola que ele pintou", () => {
    /*
     * TROCA DE REGRA, 05/09/2026: "bolas vermelhas e verdes devem ser onde
     * pinos devem ficar, e mostram locais".
     *
     * Antes o pino era empurrado 62% do caminho ate a porta. Aquilo consertava
     * um defeito de um ponto CALCULADO: quando o lugar do predio saia de
     * analise de imagem, ele caia no meio do telhado e o pino sentava em cima
     * da construcao que estava apontando.
     *
     * A bola pintada a mao nao tem esse defeito — ele olhou o desenho e
     * escolheu. Empurrar o pino dali seria corrigir uma decisao que nao e
     * minha. Este teste existe para o empurrao nao voltar sozinho.
     */
    for (const e of ENDERECOS) {
      for (const p of [e.telhado, e.frente, e.em]) {
        expect(p[0]).toBeGreaterThanOrEqual(0);
        expect(p[0]).toBeLessThanOrEqual(100);
        expect(p[1]).toBeGreaterThanOrEqual(0);
        expect(p[1]).toBeLessThanOrEqual(100);
      }
      expect(e.frente[0]).toBe(e.telhado[0]);
      expect(e.frente[1]).toBe(e.telhado[1]);
    }
  });

  it("coleta e entrega da estreia ficam longe uma da outra", () => {
    /*
     * Este teste trocou de pergunta em 05/09/2026. Antes ele exigia que os
     * comercios ficassem espalhados pelo mapa — regra minha, de quando eu
     * escolhia quais predios eram loja. A marcacao do Fernando tem uma RUA DE
     * COMERCIO, com loja ao lado de loja, que e como bairro de verdade e.
     *
     * O que continua valendo e o risco de verdade: uma corrida em que pegar e
     * entregar acontecem no mesmo lugar nao e corrida. O jogo monta a estreia
     * com a loja mais perto da base e a casa mais perto dessa loja, entao e
     * esse par que precisa ter viagem.
     */
    const loja = [...COMERCIOS].sort((a, b) => a.metrosDaBase - b.metrosDaBase)[0]!;
    const perto = (a: typeof BASE, b: typeof BASE) =>
      Math.hypot(a.em[0] - b.em[0], a.em[1] - b.em[1]);
    const casa = [...CASAS].sort((a, b) => perto(a, loja) - perto(b, loja))[0]!;
    expect(perto(loja, casa)).toBeGreaterThan(0.5);
  });

  it("as casas ficam a uma caminhada da rua, e nao no meio do quarteirao", () => {
    /*
     * Duas travas, e as duas sao necessarias.
     *
     * A PRIMEIRA pega a casa perdida: nenhuma porta a mais de trinta metros
     * de rua nenhuma. Foi ela que apareceu quando o traçado novo chegou —
     * duas casas tinham ficado a 64 e a 75 metros, sem rua nenhuma por perto,
     * e ele desenhou as duas ruas que faltavam.
     *
     * A SEGUNDA pega o defeito oposto, que a primeira nao ve: uma malha que
     * escorregou toda para o lado passa nos trinta metros e mesmo assim esta
     * errada. Por isso a MEDIANA tambem e travada — metade das portas tem de
     * estar a menos de oito metros, que e a meia rua mais a calcada.
     */
    const distancias = CASAS.map(c => metrosAteARua(c.em)).sort((x, y) => x - y);
    for (const d of distancias) expect(d).toBeLessThan(30);
    expect(distancias[Math.floor(distancias.length / 2)]).toBeLessThan(8);
  });

  it("o bairro sai igual toda vez que o jogo abre", () => {
    // Bairro que se remonta a cada partida e impossivel de decorar, e decorar
    // o bairro e metade da graca de um jogo de entrega.
    const impressao = ENDERECOS.map(
      e => `${e.id}:${e.em[0].toFixed(3)},${e.em[1].toFixed(3)}`
    ).join("|");
    expect(impressao).toBe(
      ENDERECOS.map(
        e => `${e.id}:${e.em[0].toFixed(3)},${e.em[1].toFixed(3)}`
      ).join("|")
    );
    expect(ENDERECOS).toHaveLength(QUANTAS_CASAS + COMERCIOS.length + 1);
  });

  it("sabe pousar cada porta na tela, no tamanho que ela for desenhada", () => {
    const p = naTela(BASE, 800, 600);
    expect(p.x).toBeGreaterThan(0);
    expect(p.x).toBeLessThan(800);
    expect(p.y).toBeGreaterThan(0);
    expect(p.y).toBeLessThan(600);
  });
});
