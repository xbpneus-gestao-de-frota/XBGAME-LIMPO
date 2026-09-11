/**
 * AS CHAMADAS — ligar, atender, desligar, e o que fica registrado.
 *
 * ── POR QUE A CHAMADA E UM ESTADO, E NAO UMA TELA ─────────────────────────
 *
 * Porque ela sobrevive a tela. A pessoa atende, sai da conversa, volta, e a
 * ligacao continua correndo. Se o "esta em ligacao" morasse dentro da tela da
 * chamada, sair da tela derrubaria a ligacao — que e exatamente o que nenhum
 * telefone faz.
 *
 * Por isso o que existe aqui e: comecou quando, com quem, de que tipo. A
 * duracao e sempre CALCULADA a partir do comeco — contador guardado atrasa,
 * adianta e desanda quando a aba fica em segundo plano.
 */
import type { EstadoDoApp } from "./estado";
import { registrarChamadaNaConversa } from "./enviar";
import type { Chamada, IdContato, RumoDaChamada, TipoDeChamada } from "./tipos";

/** DECISAO DELE: quanto tempo o telefone toca antes de virar perdida. */
export const TOQUES_ATE_PERDER_SEGUNDOS = 30;

/** Comeca uma ligacao. Quem esta bloqueado nao recebe. */
export function ligar(
  estado: EstadoDoApp,
  contato: IdContato,
  tipo: TipoDeChamada,
  agoraEmSegundos: number
): EstadoDoApp {
  if (estado.bloqueados.includes(contato) || estado.chamadaEmCurso)
    return estado;
  return {
    ...estado,
    chamadaEmCurso: { contato, tipo, comecouEm: agoraEmSegundos },
  };
}

/** Quantos segundos a ligacao ja tem. Calculada, nunca guardada. */
export function duracaoDaChamada(
  estado: EstadoDoApp,
  agoraEmSegundos: number
): number {
  if (!estado.chamadaEmCurso) return 0;
  return Math.max(
    0,
    Math.round(agoraEmSegundos - estado.chamadaEmCurso.comecouEm)
  );
}

/**
 * DESLIGAR.
 *
 * Duas coisas acontecem juntas: entra no registro de chamadas E deixa um balao
 * na conversa. Sem o balao, a ligacao acontece e a conversa nao lembra — e
 * ligacao perdida vira uma coisa que so existe numa aba que ninguem abre.
 */
export function desligar(
  estado: EstadoDoApp,
  agoraEmSegundos: number,
  rumo: RumoDaChamada = "feita"
): EstadoDoApp {
  const emCurso = estado.chamadaEmCurso;
  if (!emCurso) return estado;

  const segundos =
    rumo === "perdida" ? 0 : duracaoDaChamada(estado, agoraEmSegundos);
  const registro: Chamada = {
    id: `ch${estado.chamadas.length + 1}`,
    contato: emCurso.contato,
    tipo: emCurso.tipo,
    rumo,
    minuto: estado.minuto,
    segundos,
  };

  const comBalao = registrarChamadaNaConversa(estado, emCurso.contato, {
    tipo: emCurso.tipo,
    rumo,
    segundos,
  });

  return {
    ...comBalao,
    chamadas: [registro, ...comBalao.chamadas],
    chamadaEmCurso: undefined,
  };
}

/** O relogio da chamada, do jeito que a tela mostra. */
export function relogioDaChamada(segundos: number): string {
  const s = Math.max(0, Math.round(segundos));
  const m = Math.floor(s / 60);
  const resto = s % 60;
  if (m < 60) return `${m}:${String(resto).padStart(2, "0")}`;
  const h = Math.floor(m / 60);
  return `${h}:${String(m % 60).padStart(2, "0")}:${String(resto).padStart(2, "0")}`;
}

/** Quantas chamadas perdidas ainda nao foram olhadas. */
export function perdidas(estado: EstadoDoApp): number {
  return estado.chamadas.filter(c => c.rumo === "perdida").length;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * A CHAMADA QUE CHEGA — e a emenda para a cena do video.
 *
 * Ordem dele, 07/09/2026: "O QUE APARECERIA QUANDO CADA UM LIGAR OU MANDAR
 * MENSAGEM?" e, decidido: "MAS COM TOM AZUL FORMATO XB, TODO RESTANTE MANTER,
 * NOME E FOTO SERA DE CADA USUARIO, SOMENTE ALGUNS CASOS QUE VEREMOS REALMENTE
 * UMA CUTCINE AO ATENDER LIGAÇÃO DE VIDEO, MAS TUDO SERA PROGRAMADO PRA ISSO".
 *
 * ── DUAS COISAS SAIRAM DAI ───────────────────────────────────────────────
 *
 * 1. NOME E FOTO SAO DE CADA UM. Nada de "chamada recebida" generico: a tela usa
 *    o contato de verdade, com o retrato dele (ou as iniciais na roda de cor, do
 *    jeito que ja vale no resto do aplicativo).
 *
 * 2. A CENA E DO JOGO, NAO DO APLICATIVO. Algumas chamadas de video, ao serem
 *    atendidas, viram cena. O aplicativo NAO toca cena nenhuma — ele so CARREGA
 *    o nome da cena e AVISA quem atendeu. Quem desenha e o jogo.
 *
 *    Foi feito assim de proposito: se o aplicativo soubesse tocar cena, cada
 *    cena nova mexeria no aplicativo. Do jeito que esta, o jogo manda a chamada
 *    com o nome da cena, o aplicativo devolve "atendeu", e o jogo faz o resto —
 *    o aplicativo continua sendo peca de acoplamento.
 * ═════════════════════════════════════════════════════════════════════════ */

/** Uma chamada tocando agora. Enquanto existe, o telefone esta chamando. */
export interface ChamadaChegando {
  contato: IdContato;
  tipo: TipoDeChamada;
  /**
   * O nome da CENA que o jogo toca quando esta chamada de video for atendida.
   * O aplicativo nunca lê o conteudo disto: so devolve para quem mandou.
   */
  cena?: string;
  /** Em que segundo o telefone comecou a tocar. */
  comecouEm: number;
}

/** O telefone toca. Quem esta bloqueado nao liga, e uma de cada vez. */
export function receberChamada(
  estado: EstadoDoApp,
  contato: IdContato,
  tipo: TipoDeChamada,
  agoraEmSegundos: number,
  cena?: string
): EstadoDoApp {
  if (estado.bloqueados.includes(contato)) return estado;
  if (estado.chamadaEmCurso || estado.chamandoAgora) return estado;
  return {
    ...estado,
    chamandoAgora: { contato, tipo, cena, comecouEm: agoraEmSegundos },
  };
}

/** Ha quantos segundos o telefone esta tocando. */
export function tocandoHa(
  estado: EstadoDoApp,
  agoraEmSegundos: number
): number {
  if (!estado.chamandoAgora) return 0;
  return Math.max(
    0,
    Math.floor(agoraEmSegundos - estado.chamandoAgora.comecouEm)
  );
}

/** Ja tocou tempo demais? Entao virou perdida. */
export function tocouDemais(
  estado: EstadoDoApp,
  agoraEmSegundos: number
): boolean {
  return (
    !!estado.chamandoAgora &&
    tocandoHa(estado, agoraEmSegundos) >= TOQUES_ATE_PERDER_SEGUNDOS
  );
}

/**
 * ATENDER.
 *
 * Devolve o estado com a ligacao correndo E a cena, quando houver — para quem
 * chamou poder avisar o jogo. Atender sem chamada nenhuma nao faz nada.
 */
export function atenderChamada(
  estado: EstadoDoApp,
  agoraEmSegundos: number
): {
  estado: EstadoDoApp;
  cena?: string;
  contato?: IdContato;
  tipo?: TipoDeChamada;
} {
  const chegando = estado.chamandoAgora;
  if (!chegando) return { estado };
  return {
    estado: {
      ...estado,
      chamandoAgora: undefined,
      chamadaEmCurso: {
        contato: chegando.contato,
        tipo: chegando.tipo,
        comecouEm: agoraEmSegundos,
      },
    },
    cena: chegando.cena,
    contato: chegando.contato,
    tipo: chegando.tipo,
  };
}

/**
 * RECUSAR, e PERDER.
 *
 * Os dois deixam rastro: a ligacao entra no historico e um balao entra na
 * conversa. Ligacao que some sem deixar marca e a mesma coisa que nao ter
 * tocado — e a pessoa fica sem saber que o cliente tentou falar com ela.
 */
export function recusarChamada(estado: EstadoDoApp): EstadoDoApp {
  return encerrarSemAtender(estado);
}

export function perderChamada(estado: EstadoDoApp): EstadoDoApp {
  return encerrarSemAtender(estado);
}

/*
 * Recusar e deixar tocar dao no MESMO registro: "perdida".
 *
 * Nao ha "recusada" na lista de rumos, e nao vale inventar um: para quem ligou,
 * as duas coisas sao iguais — o telefone tocou e ninguem falou. O historico do
 * aplicativo de verdade tambem nao separa as duas.
 */
function encerrarSemAtender(estado: EstadoDoApp): EstadoDoApp {
  const chegando = estado.chamandoAgora;
  if (!chegando) return estado;
  const registro: Chamada = {
    id: `ch-${estado.chamadas.length + 1}-${estado.minuto}`,
    contato: chegando.contato,
    tipo: chegando.tipo,
    rumo: "perdida",
    minuto: estado.minuto,
    segundos: 0,
  };
  const comBalao = registrarChamadaNaConversa(
    { ...estado, chamandoAgora: undefined },
    chegando.contato,
    { tipo: chegando.tipo, rumo: "perdida", segundos: 0 }
  );
  return { ...comBalao, chamadas: [registro, ...comBalao.chamadas] };
}
