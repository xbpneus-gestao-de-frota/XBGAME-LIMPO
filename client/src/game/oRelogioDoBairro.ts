/**
 * O RELOGIO DO BAIRRO — um dia so, e todo mundo lendo dele.
 *
 * Ordem dele, 12/09/2026: "primeiro atualize relogio um apenas".
 *
 * ── O QUE ESTAVA ERRADO ───────────────────────────────────────────────────
 *
 * O jogo tinha TRES dias correndo ao mesmo tempo, cada um nascido num dia
 * diferente para uma coisa diferente:
 *
 *   · a luz do bairro fechava um ciclo a cada quatro minutos de tela, sozinha,
 *     numa animacao que rodava sem olhar para o jogo;
 *   · o balcao e a reputacao dos clientes viviam um dia a cada dez minutos;
 *   · o relogio que aparece na conversa andava um minuto a cada minuto de
 *     verdade, o que dava um dia de vinte e quatro horas de tela.
 *
 * Enquanto o balcao vivia um dia, o sol nascia duas vezes e meia e a conversa
 * andava dez minutos. Nenhum estava errado sozinho. Juntos, nao dava para
 * responder "que horas sao no bairro" — e sem essa resposta nao existe hora do
 * almoco, nem fim de expediente, nem nada do que vem depois.
 *
 * ── QUAL DOS TRES GANHOU, E POR QUE ───────────────────────────────────────
 *
 * O do balcao. E o relogio do TRABALHO: os pedidos, os prazos, o castigo de
 * quarenta minutos e os trinta dias de memoria da reputacao ja estavam todos
 * medidos nele. Trocar o dele seria mexer no equilibrio inteiro do balcao;
 * trocar os outros dois nao mexe em nada — a luz era enfeite solto e o relogio
 * da conversa so carimbava mensagem.
 *
 * Por isso este arquivo nao INVENTA quanto dura um dia: ele le
 * `SEGUNDOS_POR_DIA`, que e a decisao dele e continua morando no balcao.
 *
 * ── O DIA COMECA NO AMANHECER E TERMINA NO ESCURO ─────────────────────────
 *
 * De seis da manha as oito da noite. Nao ha madrugada de proposito — e a mesma
 * regra que ja valia para a luz: noite fechada escureceria as ruas, e rua e
 * onde moram a rota e os pinos.
 *
 * As horas nao sao chute: os marcos da luz (amanhecer, manha, meio-dia, tarde,
 * entardecer) foram desenhados nas fracoes 0, 0.20, 0.45, 0.70 e 0.88. Esticados
 * neste intervalo, o meio-dia cai as 12:18 e o entardecer as 18:19 — que e onde
 * eles cairiam num dia de verdade. Os marcos ja tinham um dia inteiro dentro
 * deles; so faltava alguem dizer que horas eram.
 *
 * ── A CONTA QUE ISSO FAZ ──────────────────────────────────────────────────
 *
 * Catorze horas de bairro em dez minutos de tela: um segundo de tela vale um
 * minuto e meio de bairro. A corrida tipica, que o balcao mede em vinte e cinco
 * segundos, passa a durar trinta e cinco minutos de bairro — que e quanto leva
 * uma entrega de bicicleta de verdade. As duas reguas ja concordavam sem saber.
 */
/** DECISAO DELE: a que horas o bairro amanhece. */
export const COMECA_AS = 6 * 60;

/** DECISAO DELE: a que horas o bairro escurece e o dia recomeca. */
export const TERMINA_AS = 20 * 60;

/** Quantos minutos de bairro cabem num dia. */
export const MINUTOS_POR_DIA = TERMINA_AS - COMECA_AS;

/**
 * DECISAO DELE: quantos segundos de tela dura um dia.
 *
 * Dez minutos. O numero e dele e nasceu no balcao — e a medida que faz os
 * trinta dias de memoria da reputacao caberem numa temporada jogavel, e que
 * deixa a suspensao de quarenta minutos valendo quatro dias.
 *
 * ── POR QUE ELE MUDOU DE CASA, E NAO DE VALOR ─────────────────────────────
 *
 * Na primeira versao deste arquivo o numero continuava morando no balcao e era
 * LIDO daqui. Parecia mais honesto — "nao se decide aqui" — e criou um
 * caminho fechado: o balcao precisava do estado, o estado precisava do
 * relogio, e o relogio precisava do balcao. Numa das voltas o numero chegava
 * antes de existir, o dia virava zero e a hora do bairro virava NaN. Nao
 * quebrava nada com estrondo: o carimbo das mensagens saia vazio e os recados
 * sumiam, e so.
 *
 * Este arquivo e a FUNDACAO do tempo: ele nao pode depender de ninguem. Quem
 * precisa do dia le daqui — inclusive o balcao, que continua exportando o
 * mesmo nome de sempre para nao mexer em quem ja o usava.
 */
export const SEGUNDOS_DO_DIA = 10 * 60;

/**
 * ONDE O DIA ESTA, de 0 (amanhecer) a quase 1 (fim do entardecer).
 *
 * E esta fracao que a luz le. Antes ela saia de uma animacao correndo solta;
 * agora sai daqui, entao a luz e o balcao nao tem mais como se separar.
 */
export function fracaoDoDia(relogioDoBalcao: number): number {
  const s = relogioDoBalcao % SEGUNDOS_DO_DIA;
  const dentro = s < 0 ? s + SEGUNDOS_DO_DIA : s;
  return dentro / SEGUNDOS_DO_DIA;
}

/**
 * QUE HORAS SAO NO BAIRRO, em minutos desde a meia-noite.
 *
 * E o numero que o carimbo das mensagens usa. Antes ele era guardado e somava
 * de um em um; guardado, ele atrasava junto com a aba em segundo plano e
 * desandava da luz. Calculado, nunca erra.
 */
export function minutoDoDia(relogioDoBalcao: number): number {
  return Math.floor(COMECA_AS + fracaoDoDia(relogioDoBalcao) * MINUTOS_POR_DIA);
}

/**
 * QUE DIA DE TRABALHO E ESTE, contado do primeiro (dia 1).
 *
 * Ainda nao ha nada no jogo que mostre o numero do dia. Ele existe desde ja
 * porque tudo que vem depois — expediente, almoco, faltar amanha — precisa
 * saber quando um dia acabou e outro comecou, e essa resposta tem de sair do
 * mesmo lugar que as outras duas.
 */
export function diaDoBairro(relogioDoBalcao: number): number {
  return Math.floor(Math.max(0, relogioDoBalcao) / SEGUNDOS_DO_DIA) + 1;
}
