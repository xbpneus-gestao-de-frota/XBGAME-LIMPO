/**
 * AS CONVERSAS — o que cada um fala, e o que voce pode responder.
 *
 * ── POR QUE RESPOSTA PRONTA, E NAO TECLADO ───────────────────────────────
 *
 * O jogo e de celular. Digitar frase inteira no telefone, no meio de uma
 * corrida contra o relogio, e trabalho — e ninguem faz duas vezes. Alem disso
 * o entregador do jogo TEM UM JEITO (foi escolhido no portao), e um campo de
 * texto livre apagaria esse jeito na primeira frase que a pessoa escrevesse.
 *
 * Entao a pessoa ESCOLHE entre falas prontas. Escolher e rapido, cabe no
 * polegar, e cada escolha tem consequencia declarada.
 *
 * ── A REGRA QUE VALE PARA TODA CONVERSA DAQUI ─────────────────────────────
 *
 * Nenhuma resposta e so simpatia. Cada uma que muda alguma coisa TEM um efeito
 * escrito ao lado, e os efeitos passam pelos tetos do arquivo de equilibrio.
 * Se uma resposta nao muda nada, ela existe para dar voz — e isso tambem vale,
 * mas nao se disfarca de vantagem.
 *
 * ── E A GENTILEZA NAO E DE GRACA ──────────────────────────────────────────
 *
 * O que ganha gorjeta e AVISAR, nao prometer. Quem avisa que vai atrasar perde
 * um pouco de tempo escrevendo e ganha paciencia do cliente; quem promete o
 * que nao cumpre perde reputacao dobrada. E assim na rua, e e assim aqui.
 */
import type { Roteiro } from "./tipos";

/**
 * A CONVERSA DO RENAN — e ela e a ABERTURA DO JOGO.
 *
 * Ordem dele, 07/09/2026: "apos atender chamada, iremos conectar whats app app
 * real dentro do game para comunicacao real entre npcs. Entenda que sera um
 * whats app, mas so dentro do game."
 *
 * ── ANTES HAVIA DUAS CONVERSAS, E ISSO ERA O ERRO ─────────────────────────
 *
 * A abertura tinha uma tela de mensagens propria, com as falas escritas dentro
 * dela, e o aplicativo tinha OUTRA conversa com o Renan comecando pelo mesmo
 * "bom dia". Duas telas parecidas, dois lugares para mexer, e a certeza de que
 * um dia elas iam discordar uma da outra.
 *
 * Agora existe uma so: a ligacao atende e cai DENTRO do aplicativo, na conversa
 * dele. E a primeira coisa que a pessoa faz no jogo ja acontece na ferramenta
 * que ela vai usar o jogo inteiro — nao numa tela especial que some depois e
 * nunca mais volta.
 *
 * ── AS FALAS SAO AS DELE, NA ORDEM QUE ELE DITOU ──────────────────────────
 *
 *   Renan: "eu conheco esse !!!!!!"
 *   Voce:  "nao posso sair de casa, mas queria ver meus amigos"
 *   Voce:  "onde vc vai"
 *   Renan: "to indo buscar uma pizza a pe, nao tem ninguem pra entregar"
 *   Voce:  "vamos resolver isso"
 *
 * "A PE" e o que faz a bicicleta valer alguma coisa: sem isso o jogo comecaria
 * com uma bicicleta parada num mapa; com isso, comeca com um amigo andando na
 * rua quando existe uma bicicleta a duas casas dali.
 *
 * E A ULTIMA FALA E DA PESSOA, de proposito. Se o Renan pedisse a bicicleta, o
 * jogo comecaria com um favor. Como e ela que diz "vamos resolver isso", comeca
 * com uma decisao dela — e o drone que chega depois e a resposta do mundo a uma
 * coisa que ELA falou.
 *
 * ── DUAS ENTRADAS, UMA CONVERSA ───────────────────────────────────────────
 *
 * Quem atendeu entra por "abertura"; quem ignorou duas ligacoes entra por
 * "cobranca", e o "eu conheco esse" muda de sentido conforme o que a pessoa
 * fez. Dai em diante e a mesma conversa.
 */
export const ROTEIRO_RENAN: Roteiro = {
  conversa: "renan",
  inicio: "abertura",
  passos: {
    abertura: {
      falas: [{ texto: "Bom dia!! 😜" }, { texto: "Eu conheço esse 🚁🚁🚁" }],
      respostas: [
        {
          texto: "Não posso sair de casa, mas queria ver meus amigos",
          emSeguida: ["Onde vc vai?"],
          vaiPara: "apizza",
        },
      ],
    },

    /* Quem ignorou duas ligacoes ouve a cobranca brincando, e segue igual. */
    cobranca: {
      falas: [
        { texto: "Fala comigo gente fina!!!!!!" },
        { texto: "Eu conheço esse 🚁🚁🚁" },
      ],
      respostas: [
        {
          texto: "Não posso sair de casa, mas queria ver meus amigos",
          emSeguida: ["Onde vc vai?"],
          vaiPara: "apizza",
        },
      ],
    },

    apizza: {
      falas: [
        {
          texto: "Tô indo buscar uma pizza a pé, não tem ninguém pra entregar",
        },
      ],
      respostas: [
        {
          texto: "Vamos resolver isso",
          vaiPara: "comeco",
          efeito: { reputacao: 4 },
        },
      ],
    },

    /*
     * DEPOIS DO DRONE a conversa continua daqui — e ele so descobre agora o
     * tamanho do problema. O "bom dia" saiu: ja foi dado la em cima.
     */
    /*
     * ── A CENA DEPOIS DO BAU, NA ORDEM QUE ELE FECHOU ────────────────────
     *
     * Ordem dele, 08/09/2026, palavra por palavra:
     *
     *   Renan: "Achei que era minha pizza"
     *   Renan: a foto do bau aberto
     *   Voce:  "Nao vou te dar o peixe, vou te ensinar a pescar"
     *   Voce:  "To com a padaria e a farmacia pedindo entregador..."
     *   Renan: "Pode contar comigo" + a selfie de traje novo
     *   Renan: "Aeee 🎉 Pode mandar as corridas que eu to na rua"
     *   Voce:  "Vou te dando as coordenadas por aqui, do modo de trabalho"
     *   Voce:  "Mas primeiro va buscar e comer sua pizza. A tarde nos falamos"
     *
     * ── POR QUE OS LADOS SAO ESTES ────────────────────────────────────────
     *
     * Quem joga NAO PEDALA: despacha, contrata, cuida do dinheiro. O bau que
     * o drone soltou e do Renan, e e ele que vira entregador. Por isso a
     * falta de entregador e queixa de quem joga, e o "pode contar comigo" e
     * do Renan. Ja saiu trocado uma vez; ha teste guardando isso agora.
     *
     * ── OS PASSOS SEM FALA ────────────────────────────────────────────────
     *
     * Quando quem joga fala duas vezes seguidas, o passo do meio nasce sem
     * fala nenhuma: e so a vez dele de novo. Nao e passo vazio por descuido,
     * e o jeito de duas frases seguidas saírem uma depois da outra, com o
     * respiro de sempre entre elas.
     *
     * ── E A PIZZA VOLTA NO FIM ────────────────────────────────────────────
     *
     * A conversa comecou com ele indo buscar uma pizza a pe. Termina com quem
     * joga mandando ele ir comer essa pizza. O favor virou trabalho, mas o
     * dia continua sendo o dia dele.
     */
    comeco: {
      falas: [
        { texto: "Achei que era minha pizza" },
        /*
         * A RISADA VEM EM BALAO SEPARADO, e nao colada na frase.
         *
         * E como gente manda mesmo: a piada sai primeiro, e a risada vem
         * logo atras, sozinha. Junta na mesma linha ela vira pontuacao;
         * separada, ela e a pessoa rindo do que acabou de dizer.
         */
        { texto: "😄😄😄" },
        {
          tipo: "foto",
          texto: "Olha só!!",
          imagem: "/assets/xbwapp/XBW_foto-renan-bau.webp",
          esperaMs: 2000,
        },
      ],
      respostas: [
        {
          texto: "Não vou te dar o peixe, vou te ensinar a pescar",
          emSeguida: [
            "Tô com a padaria e a farmácia pedindo entregador e não tenho ninguém",
          ],
          vaiPara: "aceitou",
          efeito: { reputacao: 4 },
        },
      ],
    },

    /*
     * ELE ACEITA E MOSTRA. A selfie vem JUNTO com o "pode contar comigo": a
     * frase e o sim, a foto e a prova de que ja esta pronto — vestido, de
     * luva, com a bicicleta ao lado. Dois segundos entre uma e outra, que e
     * o tempo de levantar o braco e bater a foto.
     */
    aceitou: {
      falas: [
        { texto: "Pode contar comigo" },
        {
          tipo: "foto",
          texto: "Tô pronto!!",
          imagem: "/assets/xbwapp/XBW_selfie-renan-pronto.webp",
          esperaMs: 2000,
        },
        { texto: "Aêêê 🎉" },
        { texto: "Pode mandar as corridas que eu tô na rua" },
      ],
      respostas: [
        {
          texto: "Vou te dando as coordenadas por aqui, e o modo de trabalho",
          emSeguida: [
            "Mas primeiro vai buscar e comer sua pizza. À tarde nós falamos",
          ],
          /*
           * SEM PARA ONDE IR: aqui a cena acaba. A conversa fica parada neste
           * passo, sem oferecer mais nada, e e assim que ela termina — a
           * ultima palavra e de quem joga, e nao e sobre trabalho.
           */
          efeito: { reputacao: 2 },
        },
      ],
    },
  },
};

/** A padaria oferecendo a coleta — a conversa mais comum do jogo. */
export const ROTEIRO_PADARIA: Roteiro = {
  conversa: "padaria",
  inicio: "oferta",
  passos: {
    oferta: {
      falas: [
        { texto: "Bom dia! Tem um pedido pronto aqui pra casa 8" },
        {
          texto: "Pedido #1001 · 2 volumes · 1,7 kg",
          tipo: "pedido",
          pedido: "#1001",
        },
        { texto: "Consegue buscar?" },
      ],
      respostas: [
        {
          texto: "Tô indo agora",
          vaiPara: "aceitou",
          efeito: { aceitaColeta: true, reputacao: 3 },
        },
        { texto: "Me dá 10 minutos?", vaiPara: "dezminutos" },
        {
          texto: "Hoje não vai dar",
          vaiPara: "recusou",
          efeito: { recusaColeta: true, reputacao: -3 },
        },
      ],
    },
    dezminutos: {
      falas: [
        { texto: "Dá sim, o pão tá saindo agora mesmo" },
        { texto: "Só não demora que a dona Ilda já ligou duas vezes 😄" },
      ],
      respostas: [
        {
          texto: "Saindo já",
          vaiPara: "aceitou",
          efeito: { aceitaColeta: true, minutosDePrazo: 4 },
        },
      ],
    },
    aceitou: {
      falas: [
        { texto: "Show! Tá na sacola com o nome dela" },
        { texto: "Se ela não atender, o portão fica encostado" },
      ],
    },
    recusou: {
      falas: [{ texto: "Tranquilo. Vou ver com outro" }],
    },
  },
};

/** A cliente: o rosto do prazo. E aqui que avisar vale dinheiro. */
export const ROTEIRO_CASA8: Roteiro = {
  conversa: "casa8",
  inicio: "cobrando",
  passos: {
    cobrando: {
      falas: [
        { texto: "Oi, meu filho! O pão já saiu?" },
        {
          texto:
            "É que meu neto chega do colégio meio-dia e eu queria dar o lanche dele",
        },
      ],
      respostas: [
        {
          texto: "Já peguei, chego em 10 minutos",
          vaiPara: "avisou",
          efeito: { gorjeta: 3, reputacao: 5 },
        },
        {
          texto: "Vou me atrasar um pouco, tudo bem?",
          vaiPara: "esperou",
          efeito: { minutosDePrazo: 6, gorjeta: 2, reputacao: 4 },
        },
        {
          texto: "Tô quase aí",
          vaiPara: "prometeu",
          efeito: { reputacao: -4 },
        },
      ],
    },
    avisou: {
      falas: [
        { texto: "Ai que bom! Vou já colocar o café" },
        { texto: "Deixei um trocadinho a mais pra você, viu? 😊" },
      ],
    },
    esperou: {
      falas: [
        { texto: "Ah, sem pressa então, meu filho" },
        { texto: "Prefiro que você chegue inteiro do que rápido" },
        { texto: "Vou avisar o menino que vai demorar um tiquinho" },
      ],
    },
    prometeu: {
      falas: [
        { texto: "Tá bom..." },
        { texto: "É que o outro entregador falou isso e demorou uma hora" },
      ],
    },
  },
};

/** A farmacia: prazo apertado, e paga por isso. A tentacao do jogo. */
export const ROTEIRO_FARMACIA: Roteiro = {
  conversa: "farmacia",
  inicio: "urgencia",
  passos: {
    urgencia: {
      falas: [
        { texto: "Boa tarde. Tenho uma receita urgente pra casa 34" },
        {
          texto: "Pedido #1002 · 1 volume · 0,2 kg",
          tipo: "pedido",
          pedido: "#1002",
        },
        { texto: "É longe, mas paga urgência" },
      ],
      respostas: [
        {
          texto: "Aceito a urgência",
          vaiPara: "aceitou",
          efeito: { aceitaColeta: true, parteDoFrete: 4, minutosDePrazo: -5 },
        },
        {
          texto: "Aceito, mas no prazo normal",
          vaiPara: "normal",
          efeito: { aceitaColeta: true },
        },
        {
          texto: "Não consigo agora",
          vaiPara: "recusou",
          efeito: { recusaColeta: true, reputacao: -2 },
        },
      ],
    },
    aceitou: {
      falas: [
        { texto: "Perfeito. Anotei a urgência no pedido" },
        {
          texto:
            "Só não corre demais, por favor. A gente prefere o remédio atrasado do que você no chão",
        },
      ],
    },
    normal: {
      falas: [
        { texto: "Tudo bem. Vou avisar o cliente que chega mais tarde" },
        { texto: "Obrigado por ser sincero no horário" },
      ],
    },
    recusou: {
      falas: [{ texto: "Entendo. Vou tentar outro entregador" }],
    },
  },
};

/** O grupo: onde o bairro tem barulho, e onde sai a dica que vale tempo. */
export const ROTEIRO_GRUPO: Roteiro = {
  conversa: "grupo-bairro",
  inicio: "papo",
  passos: {
    papo: {
      falas: [
        { de: "nino", texto: "Bom dia povo 🚲" },
        { de: "lia", texto: "Gente, a rua da praça tá interditada hoje" },
        {
          de: "lia",
          texto:
            "Quem for pra casa 34 desvia pela lateral, economiza uns minutos",
        },
        { de: "kau", texto: "Boa, Lia! Salvou meu dia ontem essa dica" },
      ],
      respostas: [
        {
          texto: "Valeu Lia! 🙏",
          vaiPara: "agradeceu",
          efeito: { minutosDePrazo: 3, reputacao: 3 },
        },
        { texto: "Alguém sabe se a padaria abriu?", vaiPara: "perguntou" },
        {
          texto: "Bom dia, galera",
          vaiPara: "cumprimentou",
          efeito: { reputacao: 1 },
        },
      ],
    },
    agradeceu: {
      falas: [
        { de: "lia", texto: "Por nada! A gente se ajuda 💪" },
        {
          de: "lia",
          texto: "Anota aí: sempre que a praça tiver evento, esse desvio salva",
        },
      ],
    },
    perguntou: {
      falas: [
        { de: "teo", texto: "Abriu sim, passei lá 6h30" },
        { de: "teo", texto: "Tá cheio de pedido esperando entregador" },
      ],
    },
    cumprimentou: {
      falas: [
        { de: "manu", texto: "Bom dia! 🌞" },
        { de: "bento", texto: "Bora que hoje tem movimento" },
      ],
    },
  },
};

/** O sistema da historia: e ele quem transforma desgaste em decisao. */
export const ROTEIRO_XB: Roteiro = {
  conversa: "xb",
  inicio: "aviso",
  passos: {
    aviso: {
      falas: [
        { texto: "Aviso do sistema XB Technology" },
        { texto: "Seus pneus estão em 38% de vida útil", tipo: "aviso" },
        { texto: "Nesse ritmo, você perde velocidade nas próximas corridas" },
      ],
      respostas: [
        { texto: "O que você recomenda?", vaiPara: "recomenda" },
        { texto: "Depois eu vejo", vaiPara: "depois" },
      ],
    },
    recomenda: {
      falas: [
        { texto: "Trocar agora custa menos do que trocar depois de furar" },
        {
          texto:
            "E pneu novo não te deixa mais rápido: ele te deixa PREVISÍVEL",
        },
        {
          texto:
            "Quem sabe quanto tempo leva pode aceitar mais coletas sem medo",
        },
      ],
      respostas: [
        { texto: "Faz sentido", vaiPara: "entendeu", efeito: { reputacao: 2 } },
      ],
    },
    depois: {
      falas: [{ texto: "Anotado. Vou avisar de novo quando chegar em 20%" }],
    },
    entendeu: {
      falas: [{ texto: "A oficina fica na base. Aparece quando puder" }],
    },
  },
};

export const ROTEIROS: readonly Roteiro[] = [
  ROTEIRO_RENAN,
  ROTEIRO_PADARIA,
  ROTEIRO_CASA8,
  ROTEIRO_FARMACIA,
  ROTEIRO_GRUPO,
  ROTEIRO_XB,
];

const POR_CONVERSA = new Map(ROTEIROS.map(r => [r.conversa, r] as const));

export function roteiroDe(conversa: string): Roteiro | undefined {
  return POR_CONVERSA.get(conversa);
}
