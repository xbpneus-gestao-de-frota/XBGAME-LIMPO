/**
 * A BARRA DE BAIXO — escrever, anexar, gravar e responder.
 *
 * ── ELA TEM QUATRO ESTADOS, E SO UM APARECE POR VEZ ───────────────────────
 *
 * 1. Parada: campo vazio, clipe e microfone.
 * 2. Escrevendo: o microfone vira o aviao de enviar (troca de CARA, nao de
 *    lugar — trocar de lugar faria o polegar procurar toda vez).
 * 3. Gravando: a barra vira o gravador, com o tempo correndo, a lixeira e o
 *    envio. Enquanto grava, nao ha campo de texto: as duas coisas ao mesmo
 *    tempo nao existem em telefone nenhum.
 * 4. Editando: a barra avisa em cima que aquilo e uma edicao, com o X para
 *    desistir. Sem o aviso, a pessoa edita achando que esta escrevendo nova.
 *
 * ── OS ATALHOS ────────────────────────────────────────────────────────────
 *
 * Digitar "/" abre a lista de respostas guardadas. E o unico jeito de a lista
 * valer a pena: guardada num menu que ninguem abre, ela nao existe.
 */
import { useEffect, useRef, useState } from "react";
import { LIMITE_DE_LETRAS } from "@/game/xbwapp/atendimento";
import { atalhosQueCombinam } from "@/game/xbwapp/ajustes";
import { nomeDe } from "@/game/xbwapp/contatos";
import type { EstadoDoApp } from "@/game/xbwapp/estado";
import type { Mensagem } from "@/game/xbwapp/tipos";
import { Icone } from "./pecas";
import Teclado from "./Teclado";

export interface Anexo {
  o:
    | "foto"
    | "camera"
    | "documento"
    | "contato"
    | "local"
    | "local-vivo"
    | "enquete"
    | "pagamento"
    | "cobranca"
    | "figurinha";
}

/** As carinhas da tecla do teclado dele. */
const CARINHAS = [
  "😀",
  "😅",
  "😂",
  "🙂",
  "😉",
  "😍",
  "🤔",
  "😮",
  "😢",
  "😡",
  "👍",
  "🙏",
  "🚲",
  "🔥",
  "❤️",
  "🎉",
] as const;

export default function BarraDeEscrever({
  estado,
  rascunho,
  aoMudarRascunho,
  respondendo,
  aoLargarResposta,
  editando,
  aoLargarEdicao,
  esperando,
  aoEnviar,
  aoGravar,
  aoAnexar,
  aoEscrevendo,
  teclaAcesa,
  digitandoSozinho = false,
  travado = false,
}: {
  estado: EstadoDoApp;
  rascunho: string;
  aoMudarRascunho: (texto: string) => void;
  respondendo?: Mensagem;
  aoLargarResposta: () => void;
  editando?: Mensagem;
  aoLargarEdicao: () => void;
  esperando: boolean;
  aoEnviar: () => void;
  aoGravar: (segundos: number) => void;
  aoAnexar: (anexo: Anexo) => void;
  aoEscrevendo: (sim: boolean) => void;
  /*
   * A DIGITACAO QUE ANDA SOZINHA.
   *
   * Quem conduz e a tela da conversa. Aqui chegam duas coisas: a letra que
   * esta sendo apertada neste instante (para a tecla acender) e o aviso de
   * que a digitacao comecou — porque com o teclado fechado nao haveria nada
   * para ver. Por isso o teclado sobe sozinho quando ela comeca.
   */
  teclaAcesa?: string | null;
  digitandoSozinho?: boolean;
  /**
   * A CENA ESTA RODANDO — ninguem digita nada.
   *
   * Ordem dele, 08/09/2026: "na apresentacao do game devemos travar tudo,
   * teclado nao pode ser digitado, deve ser uma cutcine".
   *
   * O teclado continua NA TELA e continua acendendo tecla por tecla, porque e
   * ele que conta a historia: a pessoa ve a frase sendo escrita. O que some e
   * a resposta ao toque. Esconder o teclado seria mais simples e perderia a
   * cena; deixar digitar seria deixar a pessoa atropelar a propria abertura,
   * escrevendo por cima do que o roteiro esta dizendo.
   */
  travado?: boolean;
}) {
  const [anexos, setAnexos] = useState(false);
  /*
   * TOCOU NA MENSAGEM, ABRE O TECLADO — igual ao WhatsApp.
   *
   * O campo e "so leitura" de proposito: assim o teclado do APARELHO nao sobe
   * junto e os dois nao brigam pela mesma tela. Quem escreve e o teclado do
   * aplicativo, que aparece igual em celular e em computador. O teclado fisico
   * tambem escreve, enquanto ele estiver aberto.
   */
  const [teclado, setTeclado] = useState(false);

  /* Comecou a digitar sozinho: o teclado sobe, senao nao ha o que assistir. */
  useEffect(() => {
    if (digitandoSozinho) setTeclado(true);
  }, [digitandoSozinho]);

  /*
   *
   * Houve um teclado desenhado aqui dentro, com o campo em "so leitura" para o
   * do aparelho nao subir. Foi erro: teclado desenhado nao corrige palavra, nao
   * tem a lingua da pessoa, nao tem emoji, nao tem ditado — e no fim nem
   * aparecia. O campo agora e um campo de verdade, e quem sobe e o teclado do
   * celular. A tela ja sabe encolher: `--xbw-teclado` mede o que ele cobre.
   */
  const [gravando, setGravando] = useState(false);
  const [anexoCarinhas, setAnexoCarinhas] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const campo = useRef<HTMLInputElement | null>(null);

  // O relogio do gravador. Comeca no zero a cada gravacao.
  useEffect(() => {
    if (!gravando) return;
    setSegundos(0);
    const passo = window.setInterval(() => setSegundos(s => s + 1), 1000);
    return () => window.clearInterval(passo);
  }, [gravando]);

  // Editar coloca o texto antigo no campo: editar do zero nao seria editar.
  useEffect(() => {
    if (editando) {
      aoMudarRascunho(editando.texto);
      campo.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editando?.id]);

  function escrever(letra: string) {
    aoMudarRascunho((rascunho + letra).slice(0, LIMITE_DE_LETRAS));
  }

  function apagar() {
    aoMudarRascunho(rascunho.slice(0, -1));
  }

  const atalhos = atalhosQueCombinam(estado, rascunho);
  const temTexto = rascunho.trim().length > 0;

  if (gravando) {
    return (
      <div className="xbw-gravando" role="group" aria-label="Gravando áudio">
        <button
          type="button"
          aria-label="Jogar fora"
          onClick={() => setGravando(false)}
          className="xbw-gravando__fora"
        >
          <Icone nome="lixeira" />
        </button>
        <i className="xbw-gravando__ponto" aria-hidden="true" />
        <time>{`${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, "0")}`}</time>
        <Icone nome="onda" classe="xbw-gravando__onda" />
        <button
          type="button"
          className="xbw-enviar"
          aria-label="Enviar áudio"
          onClick={() => {
            setGravando(false);
            aoGravar(Math.max(1, segundos));
          }}
        >
          <Icone nome="enviar" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={travado ? "xbw-escrever xbw-escrever--travado" : undefined}
    >
      {atalhos.length > 0 && !travado && (
        <ul className="xbw-atalhos" aria-label="Respostas guardadas">
          {atalhos.map(r => (
            <li key={r.atalho}>
              <button type="button" onClick={() => aoMudarRascunho(r.texto)}>
                <b>{r.atalho}</b> {r.texto}
              </button>
            </li>
          ))}
        </ul>
      )}

      {anexos && (
        <div className="xbw-anexos" role="group" aria-label="Anexar">
          <Anexar
            nome="galeria"
            rotulo="Galeria"
            aoTocar={() => {
              setAnexos(false);
              aoAnexar({ o: "foto" });
            }}
          />
          <Anexar
            nome="camera"
            rotulo="Câmera"
            aoTocar={() => {
              setAnexos(false);
              aoAnexar({ o: "camera" });
            }}
          />
          <Anexar
            nome="documento"
            rotulo="Documento"
            aoTocar={() => {
              setAnexos(false);
              aoAnexar({ o: "documento" });
            }}
          />
          <Anexar
            nome="contato"
            rotulo="Contato"
            aoTocar={() => {
              setAnexos(false);
              aoAnexar({ o: "contato" });
            }}
          />
          <Anexar
            nome="local"
            rotulo="Localização"
            aoTocar={() => {
              setAnexos(false);
              aoAnexar({ o: "local" });
            }}
          />
          <Anexar
            nome="local"
            rotulo="Em tempo real"
            aoTocar={() => {
              setAnexos(false);
              aoAnexar({ o: "local-vivo" });
            }}
          />
          <Anexar
            nome="enquete"
            rotulo="Enquete"
            aoTocar={() => {
              setAnexos(false);
              aoAnexar({ o: "enquete" });
            }}
          />
          <Anexar
            nome="pagamento"
            rotulo="Pagamento"
            aoTocar={() => {
              setAnexos(false);
              aoAnexar({ o: "pagamento" });
            }}
          />
          <Anexar
            nome="pagamento"
            rotulo="Cobrar"
            aoTocar={() => {
              setAnexos(false);
              aoAnexar({ o: "cobranca" });
            }}
          />
          <Anexar
            nome="figurinha"
            rotulo="Figurinha"
            aoTocar={() => {
              setAnexos(false);
              aoAnexar({ o: "figurinha" });
            }}
          />
          <Anexar
            nome="audio"
            rotulo="Gravar"
            aoTocar={() => {
              setAnexos(false);
              setGravando(true);
            }}
          />
          <Anexar
            nome="gif"
            rotulo="GIF"
            aoTocar={() => {
              setAnexos(false);
              aoAnexar({ o: "figurinha" });
            }}
          />
        </div>
      )}

      {(respondendo || editando) && (
        <div className="xbw-citando">
          <span>
            <strong>
              {editando
                ? "Editando mensagem"
                : respondendo!.de === "voce"
                  ? "Você"
                  : nomeDe(respondendo!.de)}
            </strong>
            <small>{(editando ?? respondendo)!.texto}</small>
          </span>
          <button
            type="button"
            aria-label="Desistir"
            onClick={editando ? aoLargarEdicao : aoLargarResposta}
          >
            ✕
          </button>
        </div>
      )}

      <form
        className="xbw-barra"
        onSubmit={ev => {
          ev.preventDefault();
          aoEnviar();
        }}
      >
        <span className="xbw-campo">
          <Icone nome="figurinha" />
          <input
            ref={campo}
            type="text"
            value={rascunho}
            onChange={ev =>
              aoMudarRascunho(ev.target.value.slice(0, LIMITE_DE_LETRAS))
            }
            readOnly
            onFocus={() => {
              aoEscrevendo(true);
              setAnexos(false);
              setTeclado(true);
            }}
            onClick={() => setTeclado(true)}
            placeholder={esperando ? "Esperando resposta…" : "Mensagem"}
            aria-label="Escreva uma mensagem"
            enterKeyHint="send"
            maxLength={LIMITE_DE_LETRAS}
            disabled={esperando}
          />
          <button
            type="button"
            onClick={() => setAnexos(a => !a)}
            aria-label="Anexar"
          >
            <Icone nome="mais" />
          </button>
        </span>

        {temTexto ? (
          <button
            type="submit"
            className="xbw-enviar"
            aria-label="Enviar mensagem"
            disabled={esperando}
          >
            <Icone nome="enviar" />
          </button>
        ) : (
          <button
            type="button"
            className="xbw-enviar"
            aria-label="Gravar áudio"
            onClick={() => setGravando(true)}
          >
            <Icone nome="microfone" />
          </button>
        )}
      </form>

      {anexoCarinhas && (
        <div className="xbw-carinhas" role="group" aria-label="Carinhas">
          {CARINHAS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => {
                aoMudarRascunho((rascunho + c).slice(0, LIMITE_DE_LETRAS));
                setAnexoCarinhas(false);
              }}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {teclado && (
        <Teclado
          aoEscrever={escrever}
          aoApagar={apagar}
          aoEnviar={aoEnviar}
          podeEnviar={temTexto && !esperando}
          comecoDeFrase={rascunho.length === 0}
          aoFechar={() => setTeclado(false)}
          aoGravar={() => {
            setTeclado(false);
            setGravando(true);
          }}
          aoCarinhas={() => setAnexoCarinhas(true)}
          teclaAcesa={teclaAcesa}
        />
      )}
    </div>
  );
}

function Anexar({
  nome,
  rotulo,
  aoTocar,
}: {
  nome: Parameters<typeof Icone>[0]["nome"];
  rotulo: string;
  aoTocar: () => void;
}) {
  return (
    <button type="button" onClick={aoTocar}>
      <Icone nome={nome} />
      <span>{rotulo}</span>
    </button>
  );
}
