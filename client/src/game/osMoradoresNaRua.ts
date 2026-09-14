/**
 * OS MORADORES NA PORTA DE CASA.
 *
 * Ordem dele, 13/09/2026: "coloque um morador na frente de sua casa, e vamos
 * começar a dar vida maior ao game, aplique morador bem pequeno, quando for
 * aumentado zoom dê pra ver".
 *
 * ── POR QUE ISTO DÁ MAIS VIDA QUE QUALQUER ANIMAÇÃO ───────────────────────
 *
 * O bairro tem casas lindas e ninguém dentro. Um pino azul diz que ali mora
 * alguém; uma pessoa na porta diz QUEM. E a diferença aparece na entrega: hoje
 * o entregador chega num ponto e um pino apaga. Com o morador na porta, ele
 * chega até a Dona Marlene — e a Dona Marlene já estava lá antes de ele sair,
 * o que é o que faz um bairro parecer habitado em vez de encenado.
 *
 * Não é animação: é presença. Custa um desenho parado por casa e não compete
 * com nada, porque não se mexe.
 *
 * ── CADA UM NA SUA CASA, SEMPRE A MESMA ───────────────────────────────────
 *
 * O morador está preso ao NÚMERO da casa, que é o mesmo número que o jogo já
 * usa para dizer "entrega na casa 8". Sorteá-los pelas casas seria mais fácil e
 * arruinaria a única coisa que essa peça entrega: no segundo dia de jogo a
 * pessoa sabe que a casa 8 é a da Dona Divina. Endereço que troca de dono não
 * vira endereço.
 *
 * ── ONDE ELE FICA, EXATAMENTE ─────────────────────────────────────────────
 *
 * A conta parte da PORTA — o ponto onde o prédio encosta na rua, que o jogo já
 * calcula e já usa como destino da entrega — e dá um passo curto NA DIREÇÃO DA
 * CASA. Isso não é enfeite: a porta fica no meio do asfalto, porque ela foi
 * feita para o entregador ENCOSTAR nela, e morador parado no meio da rua é a
 * primeira coisa que o olho estranha. Um passo para dentro põe ele na calçada
 * ou no portão, que é onde gente fica.
 *
 * O passo é curto de propósito: o entregador continua parando a um palmo dele.
 *
 * ── QUEM NÃO TEM DESENHO NÃO ENTRA ────────────────────────────────────────
 *
 * Dois moradores do bairro ainda não têm retrato nem corpo. Eles ficam de fora
 * em vez de aparecerem como vulto ou silhueta: uma casa sem ninguém na porta é
 * uma casa normal; um vulto na porta é um defeito que ninguém sabe nomear.
 */
import { ENDERECOS } from "./addresses";
import { MORADORES } from "./xbwapp/contatos";

export interface MoradorNaRua {
  /** O mesmo id do contato no aplicativo: casa1, casa2... */
  id: string;
  nome: string;
  /** O desenho de corpo inteiro, recortado rente ao contorno. */
  corpo: string;
  /** Onde ele fica, em porcentagem do mapa. */
  em: { x: number; y: number };
}

const PASTA = "/assets/moradores/XB_morador_";

/*
 * Quem mora em cada casa, e o nome do desenho.
 *
 * A lista de QUEM TEM DESENHO é escrita e não derivada de propósito: derivar
 * do retrato do aplicativo pareceria mais esperto e criaria um buraco
 * silencioso no dia em que alguém acrescentasse um morador sem corpo — a casa
 * ficaria com uma porta vazia e nenhum erro em lugar nenhum. Escrita, um nome
 * sem desenho estoura no teste que confere se todo arquivo daqui existe na
 * pasta.
 *
 * O NOME, ao contrário, NÃO se escreve aqui: ele vem da agenda do celular.
 * Escrito nos dois lugares, um dia a pessoa entregaria para "Cláudia" na
 * conversa e leria "Cláudia Prado" na porta — foi o que quase aconteceu quando
 * a outra equipe completou a agenda do bairro. Nome de gente tem um dono só.
 */
const QUEM_MORA_ONDE: readonly { casa: number; arte: string }[] = [
  { casa: 1, arte: "claudia" },
  { casa: 2, arte: "genaro" },
  { casa: 3, arte: "aparecido" },
  { casa: 4, arte: "sebastiana" },
  { casa: 5, arte: "waldir" },
  { casa: 6, arte: "marlene" },
  { casa: 7, arte: "zica" },
  { casa: 8, arte: "divina" },
  { casa: 9, arte: "rogerio" },
  { casa: 10, arte: "lourdes" },
  { casa: 11, arte: "terezinha" },
  { casa: 12, arte: "cida" },
  { casa: 13, arte: "vera" },
  { casa: 14, arte: "ilda" },
  { casa: 15, arte: "adriano" },
  { casa: 16, arte: "silvana" },
];

/**
 * QUANTO DA ALTURA DO MAPA ELE OCUPA.
 *
 * "Bem pequeno, quando for aumentado zoom dê pra ver" — então ele NÃO tem piso
 * de tela como o entregador tem. O entregador precisa ser achado de longe,
 * porque é quem a pessoa controla; o morador é cenário que recompensa quem
 * chega perto. De longe ele é um pontinho na calçada, e está certo assim.
 *
 * O número é menos da metade do garoto da praça, que já é pequeno.
 */
export const ALTURA_DO_MORADOR = 1.05;

/**
 * O PASSO DA RUA PARA A CALÇADA.
 *
 * Quanto ele anda da porta em direção ao telhado, em porcentagem do mapa. Dois
 * por cento é mais ou menos meia rua no desenho: tira o morador do asfalto sem
 * enfiá-lo dentro da sala.
 *
 * O teto pela METADE da distância existe por causa das casas coladas na rua:
 * na casa 11 a porta e o telhado estão a um e meio por cento um do outro, e um
 * passo fixo de dois jogaria o morador para trás da própria casa.
 */
export const PASSO_ATE_A_CALCADA = 2;

/** Um passo curto da porta em direção à casa — sem nunca passar do meio. */
function naCalcada(
  porta: readonly [number, number],
  telhado: readonly [number, number]
): { x: number; y: number } {
  const dx = telhado[0] - porta[0];
  const dy = telhado[1] - porta[1];
  const distancia = Math.hypot(dx, dy);
  if (distancia === 0) return { x: porta[0], y: porta[1] };
  const passo = Math.min(PASSO_ATE_A_CALCADA, distancia / 2);
  return {
    x: porta[0] + (dx / distancia) * passo,
    y: porta[1] + (dy / distancia) * passo,
  };
}

/** Todos os moradores que têm desenho, cada um na porta da sua casa. */
export const MORADORES_NA_RUA: readonly MoradorNaRua[] = QUEM_MORA_ONDE.flatMap(
  m => {
    const endereco = ENDERECOS.find(e => e.id === `casa-${m.casa}`);
    if (!endereco) return [];
    const naAgenda = MORADORES.find(c => c.id === `casa${m.casa}`);
    if (!naAgenda) return [];
    return [
      {
        id: `casa${m.casa}`,
        nome: naAgenda.nome,
        corpo: `${PASTA}${m.arte}_corpo.webp`,
        em: naCalcada(
          [endereco.em[0], endereco.em[1]],
          [endereco.telhado[0], endereco.telhado[1]]
        ),
      },
    ];
  }
);
