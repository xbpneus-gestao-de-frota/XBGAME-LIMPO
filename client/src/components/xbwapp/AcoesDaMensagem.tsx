/**
 * O QUE APARECE QUANDO SE SEGURA O DEDO EM CIMA DE UM BALAO.
 *
 * Reagir, responder, encaminhar, favoritar, copiar, fixar, editar e apagar.
 * Sao as oito coisas que separam uma tela de conversa de um aplicativo de
 * mensagem — e todas moram nesta folha, que sobe de baixo.
 *
 * ── A FILA DE EMOJI FICA EM CIMA, E TEM MOTIVO ────────────────────────────
 *
 * Reagir e o que a pessoa faz noventa por cento das vezes que segura um balao.
 * Deixar os emojis na primeira linha, grandes, resolve esse caso com um toque;
 * o resto e lista, para os outros dez por cento.
 */
import { Icone } from "./pecas";
import type { Mensagem } from "@/game/xbwapp/tipos";

/** DECISAO DELE: os emojis da fila rapida, na ordem em que aparecem. */
export const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"] as const;

export default function AcoesDaMensagem({
  mensagem,
  favorita,
  fixada,
  aoReagir,
  aoResponder,
  aoEncaminhar,
  aoFavoritar,
  aoCopiar,
  aoFixar,
  aoEditar,
  aoApagar,
  aoSelecionar,
  aoFechar,
}: {
  mensagem: Mensagem;
  favorita: boolean;
  fixada: boolean;
  aoReagir: (emoji: string) => void;
  aoResponder: () => void;
  aoEncaminhar: () => void;
  aoFavoritar: () => void;
  aoCopiar: () => void;
  aoFixar: () => void;
  aoEditar: () => void;
  aoApagar: () => void;
  aoSelecionar: () => void;
  aoFechar: () => void;
}) {
  const meu = mensagem.de === "voce";
  const apagada = Boolean(mensagem.apagada);
  const daParaEditar = meu && mensagem.tipo === "texto" && !apagada;

  return (
    <div
      className="xbw-folha"
      role="dialog"
      aria-label="O que fazer com a mensagem"
    >
      <button
        type="button"
        className="xbw-folha__fora"
        onClick={aoFechar}
        aria-label="Fechar"
      />
      <div className="xbw-folha__corpo">
        {!apagada && (
          <div className="xbw-emojis" role="group" aria-label="Reagir">
            {EMOJIS.map(emoji => (
              <button key={emoji} type="button" onClick={() => aoReagir(emoji)}>
                {emoji}
              </button>
            ))}
          </div>
        )}

        <ul className="xbw-folha__lista">
          {!apagada && (
            <li>
              <button type="button" onClick={aoResponder}>
                <Icone nome="responder" /> Responder
              </button>
            </li>
          )}
          {!apagada && (
            <li>
              <button type="button" onClick={aoEncaminhar}>
                <Icone nome="encaminhar" /> Encaminhar
              </button>
            </li>
          )}
          {!apagada && (
            <li>
              <button type="button" onClick={aoFavoritar}>
                <Icone nome="estrela" />{" "}
                {favorita ? "Tirar dos favoritos" : "Favoritar"}
              </button>
            </li>
          )}
          {!apagada && (
            <li>
              <button type="button" onClick={aoCopiar}>
                <Icone nome="documento" /> Copiar
              </button>
            </li>
          )}
          {!apagada && (
            <li>
              <button type="button" onClick={aoFixar}>
                <Icone nome="fixar" />{" "}
                {fixada ? "Desafixar" : "Fixar na conversa"}
              </button>
            </li>
          )}
          {daParaEditar && (
            <li>
              <button type="button" onClick={aoEditar}>
                <Icone nome="mais" /> Editar
              </button>
            </li>
          )}
          <li>
            <button type="button" onClick={aoSelecionar}>
              <Icone nome="tiqueDuplo" /> Selecionar várias
            </button>
          </li>
          {!apagada && (
            <li>
              <button type="button" className="xbw-perigo" onClick={aoApagar}>
                <Icone nome="lixeira" /> Apagar
              </button>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

/**
 * A PERGUNTA DE APAGAR.
 *
 * "Para mim" e "para todos" precisam ser duas escolhas separadas e visiveis: e
 * a unica decisao da conversa que nao tem volta, e a diferenca entre as duas e
 * enorme para quem esta do outro lado.
 */
export function PerguntaDeApagar({
  podeParaTodos,
  aoApagarParaMim,
  aoApagarParaTodos,
  aoFechar,
}: {
  podeParaTodos: boolean;
  aoApagarParaMim: () => void;
  aoApagarParaTodos: () => void;
  aoFechar: () => void;
}) {
  return (
    <div className="xbw-folha" role="dialog" aria-label="Apagar mensagem">
      <button
        type="button"
        className="xbw-folha__fora"
        onClick={aoFechar}
        aria-label="Fechar"
      />
      <div className="xbw-folha__corpo">
        <p className="xbw-folha__titulo">Apagar mensagem?</p>
        <ul className="xbw-folha__lista">
          {podeParaTodos && (
            <li>
              <button
                type="button"
                className="xbw-perigo"
                onClick={aoApagarParaTodos}
              >
                <Icone nome="lixeira" /> Apagar para todos
              </button>
            </li>
          )}
          <li>
            <button type="button" onClick={aoApagarParaMim}>
              <Icone nome="lixeira" /> Apagar para mim
            </button>
          </li>
          <li>
            <button type="button" onClick={aoFechar}>
              Cancelar
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
