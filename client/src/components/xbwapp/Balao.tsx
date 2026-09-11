/**
 * UM BALAO — de qualquer tipo de mensagem.
 *
 * Texto, foto, audio, documento, cartao de contato, localizacao, figurinha,
 * enquete, cobranca, pedido, chamada e aviso. Doze formas, um componente.
 *
 * ── POR QUE UM COMPONENTE SO, E NAO DOZE ──────────────────────────────────
 *
 * Porque o que muda entre eles e o MIOLO, e o que se repete e tudo o resto: a
 * cor do lado certo, o rabinho, a hora, os tiquinhos, a citacao em cima, as
 * reacoes embaixo, a marca de encaminhada, a de editada, o dedo que segura
 * para abrir as acoes. Doze componentes seriam doze copias dessa moldura, e a
 * decima segunda ficaria diferente das outras onze.
 *
 * A forma continua sendo FEITA, e nao colada: balao que e imagem nao estica
 * com o texto sem entortar as pontas.
 */
import { nomeDe } from "@/game/xbwapp/contatos";
import { emReais } from "@/game/xbwapp/catalogo";
import { contarVotos } from "@/game/xbwapp/enviar";
import { textoDeApagada } from "@/game/xbwapp/mensagens";
import { relogioDaChamada } from "@/game/xbwapp/chamadas";
import type { Mensagem } from "@/game/xbwapp/tipos";
import { XBW_ICONES } from "@/game/xbwapp/icones";
import { Hora, Icone, Retrato, Tique } from "./pecas";

/** As cores das etiquetas de arquivo, do desenho dele. */
const COR_DO_ARQUIVO: Record<string, string> = {
  pdf: "#c0392b",
  planilha: "#1f7a4d",
  apresentacao: "#c0492f",
  compactado: "#6b7280",
  texto: "#3a5fa8",
  outro: "#5a6470",
};

const NOME_DO_ARQUIVO: Record<string, string> = {
  pdf: "PDF",
  planilha: "XLS",
  apresentacao: "PPT",
  compactado: "ZIP",
  texto: "DOC",
  outro: "ARQ",
};

export default function Balao({
  mensagem,
  grupo,
  favorita,
  citada,
  selecionada,
  modoSelecao,
  mostraTique,
  aoSegurar,
  aoTocar,
  aoVotar,
  aoResponderCobranca,
}: {
  mensagem: Mensagem;
  grupo: boolean;
  favorita: boolean;
  /** A mensagem que esta sendo respondida, quando houver. */
  citada?: Mensagem;
  selecionada?: boolean;
  modoSelecao?: boolean;
  mostraTique: boolean;
  aoSegurar: () => void;
  aoTocar: () => void;
  aoVotar?: (opcao: number) => void;
  aoResponderCobranca?: (pagou: boolean) => void;
}) {
  const meu = mensagem.de === "voce";

  // Aviso e chamada nao sao balao: sao uma linha no meio da conversa.
  if (mensagem.tipo === "aviso") {
    return <p className="xbw-aviso">{mensagem.texto}</p>;
  }
  if (mensagem.tipo === "chamada") {
    return (
      <p className="xbw-aviso xbw-aviso--chamada">
        <Icone
          nome={mensagem.chamada?.tipo === "video" ? "video" : "telefone"}
        />
        {mensagem.texto}
        {mensagem.chamada && mensagem.chamada.segundos > 0 && (
          <span> · {relogioDaChamada(mensagem.chamada.segundos)}</span>
        )}
      </p>
    );
  }

  const apagada = mensagem.apagada === "todos";
  // Figurinha nao tem balao: e o desenho solto, como em todo aplicativo.
  const semBalao = mensagem.tipo === "figurinha" && !apagada;

  return (
    <div
      className={[
        "xbw-balao",
        meu ? "xbw-balao--meu" : "xbw-balao--outro",
        semBalao ? "xbw-balao--solto" : "",
        apagada ? "xbw-balao--apagada" : "",
        selecionada ? "xbw-balao--marcada" : "",
        mensagem.tipo === "pedido" ? "xbw-balao--pedido" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onContextMenu={ev => {
        ev.preventDefault();
        aoSegurar();
      }}
      onClick={modoSelecao ? aoTocar : undefined}
    >
      {grupo && !meu && !apagada && (
        <strong className="xbw-balao__autor">{nomeDe(mensagem.de)}</strong>
      )}

      {/*
        O selo "Encaminhada" e desenho DELE, com a palavra ja dentro. So da
        para usar assim porque a frase nunca muda — e a mesma razao pela qual o
        contador de nao lidas continua sendo feito em CSS.
      */}
      {mensagem.encaminhada && !apagada && (
        <img
          src={XBW_ICONES.seloEncaminhada}
          alt="Encaminhada"
          className="xbw-selo-img xbw-selo-img--encaminhada"
          draggable={false}
        />
      )}

      {citada && !apagada && (
        /*
         * A CITACAO em cima da resposta.
         * Sem ela, "pode sim" duas horas depois nao quer dizer nada — e essa e
         * a diferenca entre uma conversa e uma lista de frases soltas.
         */
        <span className="xbw-citacao">
          <strong>{citada.de === "voce" ? "Você" : nomeDe(citada.de)}</strong>
          <small>
            {citada.apagada ? textoDeApagada(citada) : citada.texto}
          </small>
        </span>
      )}

      {apagada ? (
        <span className="xbw-balao__texto xbw-balao__apagada">
          <Icone nome="lixeira" classe="xbw-tique" /> {textoDeApagada(mensagem)}
        </span>
      ) : (
        <Miolo
          mensagem={mensagem}
          aoVotar={aoVotar}
          aoResponderCobranca={aoResponderCobranca}
        />
      )}

      <span className="xbw-balao__pe">
        {mensagem.editada && (
          <img
            src={XBW_ICONES.seloEditada}
            alt="Editada"
            className="xbw-selo-img xbw-selo-img--editada"
            draggable={false}
          />
        )}
        {favorita && <Icone nome="estrela" classe="xbw-tique" />}
        <Hora minuto={mensagem.minuto} />
        {meu && mostraTique && <Tique estado={mensagem.estado} />}
      </span>

      {mensagem.reacoes && Object.keys(mensagem.reacoes).length > 0 && (
        <span className="xbw-reacoes">
          {Object.entries(mensagem.reacoes).map(([emoji, quem]) => (
            <em key={emoji}>
              {emoji}
              {quem.length > 1 && <b>{quem.length}</b>}
            </em>
          ))}
        </span>
      )}
    </div>
  );
}

/** O miolo: a unica parte que muda de um tipo para outro. */
function Miolo({
  mensagem,
  aoVotar,
  aoResponderCobranca,
}: {
  mensagem: Mensagem;
  aoVotar?: (opcao: number) => void;
  aoResponderCobranca?: (pagou: boolean) => void;
}) {
  switch (mensagem.tipo) {
    case "figurinha":
      return <span className="xbw-figurinha">{mensagem.texto}</span>;

    case "foto":
      return (
        <span className="xbw-foto">
          {mensagem.imagem ? (
            <img
              src={mensagem.imagem}
              alt={mensagem.texto || "Foto"}
              draggable={false}
            />
          ) : (
            <Icone nome="imagemVazia" classe="xbw-foto__vazia" />
          )}
          {mensagem.texto && <small>{mensagem.texto}</small>}
        </span>
      );

    case "audio":
      /*
       * O AUDIO tem play, onda e duracao — os tres. Sem a duracao a pessoa nao
       * sabe se vai ouvir tres segundos ou tres minutos, e nao toca.
       */
      return (
        <span className="xbw-audio">
          <Icone nome="play" classe="xbw-audio__play" />
          <Icone nome="onda" classe="xbw-audio__onda" />
          <small>{segundosEmRelogio(mensagem.segundos ?? 0)}</small>
        </span>
      );

    case "documento":
      return (
        <span className="xbw-documento">
          <em
            style={{
              background: COR_DO_ARQUIVO[mensagem.documento?.tipo ?? "outro"],
            }}
          >
            {NOME_DO_ARQUIVO[mensagem.documento?.tipo ?? "outro"]}
          </em>
          <span>
            <strong>{mensagem.documento?.nome ?? mensagem.texto}</strong>
            <small>
              {Math.max(1, Math.round(mensagem.documento?.tamanhoKb ?? 0))} KB
            </small>
          </span>
        </span>
      );

    case "contato":
      return (
        <span className="xbw-cartao">
          {mensagem.cartao && (
            <Retrato quem={mensagem.cartao} tamanho="pequeno" />
          )}
          <span>
            <strong>{mensagem.texto}</strong>
            <small>Contato</small>
          </span>
        </span>
      );

    case "local":
      return (
        <span className="xbw-local">
          <Icone nome="local" classe="xbw-local__pino" />
          <span>
            <strong>
              {mensagem.aoVivo ? "Localização em tempo real" : mensagem.lugar}
            </strong>
            <small>
              {mensagem.aoVivo
                ? "acompanhando agora"
                : "toque para ver no mapa"}
            </small>
          </span>
        </span>
      );

    case "enquete": {
      const votos = contarVotos(mensagem);
      const total = votos.reduce((s, n) => s + n, 0);
      return (
        <span className="xbw-enquete">
          <strong>{mensagem.enquete?.pergunta}</strong>
          {mensagem.enquete?.opcoes.map((opcao, i) => {
            const meus = (mensagem.enquete!.votos[i] ?? []).includes("voce");
            const parte = total > 0 ? Math.round((votos[i]! / total) * 100) : 0;
            return (
              <button
                key={opcao}
                type="button"
                className={meus ? "xbw-opcao xbw-opcao--minha" : "xbw-opcao"}
                onClick={ev => {
                  ev.stopPropagation();
                  aoVotar?.(i);
                }}
              >
                <i style={{ width: `${parte}%` }} aria-hidden="true" />
                <span>{opcao}</span>
                <b>{votos[i]}</b>
              </button>
            );
          })}
          <small>
            {total === 0
              ? "Ninguém votou ainda"
              : `${total} voto${total > 1 ? "s" : ""}`}
            {mensagem.enquete?.varias ? " · pode marcar várias" : ""}
          </small>
        </span>
      );
    }

    case "pagamento": {
      const p = mensagem.pagamento;
      if (!p) return <span className="xbw-balao__texto">{mensagem.texto}</span>;
      return (
        <span className="xbw-pagamento">
          <Icone nome="pagamento" classe="xbw-pagamento__marca" />
          <strong>{emReais(p.valor)}</strong>
          <small>
            {p.estado === "pago"
              ? p.cobranca
                ? "Cobrança paga"
                : "Pagamento enviado"
              : p.estado === "recusado"
                ? "Cobrança recusada"
                : "Cobrança aguardando"}
          </small>
          {p.estado === "pedido" && aoResponderCobranca && (
            <span className="xbw-pagamento__acoes">
              <button
                type="button"
                onClick={ev => {
                  ev.stopPropagation();
                  aoResponderCobranca(true);
                }}
              >
                Pagar
              </button>
              <button
                type="button"
                onClick={ev => {
                  ev.stopPropagation();
                  aoResponderCobranca(false);
                }}
              >
                Recusar
              </button>
            </span>
          )}
        </span>
      );
    }

    case "pedido":
      return (
        <>
          <Icone nome="pagamento" classe="xbw-balao__marca" />
          <span className="xbw-balao__texto">{mensagem.texto}</span>
        </>
      );

    default:
      return <span className="xbw-balao__texto">{mensagem.texto}</span>;
  }
}

function segundosEmRelogio(segundos: number): string {
  const s = Math.max(0, Math.round(segundos));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
