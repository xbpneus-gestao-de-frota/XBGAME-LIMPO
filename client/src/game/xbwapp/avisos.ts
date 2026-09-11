/**
 * OS AVISOS — a faixa que desce no alto quando chega mensagem.
 *
 * Ordem dele, 07/09/2026, sobre o que aparece quando alguem manda mensagem ou
 * liga: "TODO RESTANTE MANTER, NOME E FOTO SERA DE CADA USUARIO".
 *
 * ── QUANDO A FAIXA NAO DEVE DESCER ────────────────────────────────────────
 *
 * Um telefone que avisa de tudo vira um telefone que ninguem olha. As tres
 * regras aqui sao as mesmas do aplicativo de verdade, e cada uma tem motivo:
 *
 * 1. NAO AVISA O QUE EU MESMO ESCREVI — obvio, e mesmo assim e o erro mais
 *    facil de cometer quando a tela so olha "chegou mensagem nova".
 * 2. NAO AVISA A CONVERSA QUE ESTA ABERTA — a mensagem ja esta na frente dos
 *    olhos; a faixa so taparia o que ele veio ler.
 * 3. NAO AVISA CONVERSA SILENCIADA NEM PESSOA BLOQUEADA — silenciar que ainda
 *    avisa nao silencia nada.
 */
import type { EstadoDoApp } from "./estado";
import type { IdContato, Mensagem } from "./tipos";

/** Quanto tempo a faixa fica na tela antes de subir sozinha. */
export const AVISO_NA_TELA_MS = 4200;

export function deveAvisar(
  estado: EstadoDoApp,
  mensagem: Mensagem,
  conversaAberta: IdContato | null
): boolean {
  if (mensagem.de === "voce") return false;
  if (conversaAberta === mensagem.conversa) return false;
  if (estado.silenciadas.includes(mensagem.conversa)) return false;
  if (estado.bloqueados.includes(mensagem.conversa)) return false;
  return true;
}

/** O resumo que cabe numa linha da faixa. */
export function resumoDoAviso(m: Mensagem): string {
  if (m.tipo === "texto") return m.texto;
  const nomes: Partial<Record<Mensagem["tipo"], string>> = {
    foto: "Foto",
    audio: "Mensagem de voz",
    documento: "Documento",
    local: "Localização",
    figurinha: "Figurinha",
    contato: "Contato",
    enquete: "Enquete",
    pagamento: "Pagamento",
    chamada: "Chamada",
  };
  return nomes[m.tipo] ?? m.texto;
}
