/**
 * AS PECAS QUE TODA TELA DO XBWAPP USA.
 *
 * Retrato, icone, tiquinho e relogio aparecem em cinco telas diferentes. Feitos
 * uma vez aqui, eles ficam iguais em todas — e no dia em que o tiquinho mudar,
 * muda num lugar so.
 */
import { XBW_ICONES, type NomeDeIcone } from "@/game/xbwapp/icones";
import { contato, iniciaisDe } from "@/game/xbwapp/contatos";
import { hora } from "@/game/xbwapp/estado";
import type { EstadoDaMensagem, IdContato } from "@/game/xbwapp/tipos";

/** Um desenho da folha dele. Nunca tem texto alternativo: e enfeite de botao. */
export function Icone({
  nome,
  classe,
}: {
  nome: NomeDeIcone;
  classe?: string;
}) {
  return (
    <img
      src={XBW_ICONES[nome]}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={classe ? `xbw-i ${classe}` : "xbw-i"}
    />
  );
}

/**
 * O RETRATO REDONDO.
 *
 * Quem tem desenho aparece com o desenho; quem nao tem aparece com as
 * iniciais numa roda de cor. Inventar rosto para trinta moradores seria
 * inventar trinta arquivos que ninguem vai desenhar.
 */
export function Retrato({
  quem,
  tamanho = "medio",
  online,
}: {
  quem: IdContato;
  tamanho?: "pequeno" | "medio" | "grande" | "enorme";
  online?: boolean;
}) {
  const c = contato(quem);
  const nome = c?.nome ?? quem;
  return (
    <span className={`xbw-retrato xbw-retrato--${tamanho}`}>
      {c?.foto ? (
        <img src={c.foto} alt="" draggable={false} />
      ) : (
        <span
          className="xbw-retrato__iniciais"
          style={{ background: c?.cor ?? "#2f6f7a" }}
        >
          {iniciaisDe(nome)}
        </span>
      )}
      {(online ?? c?.online) && (
        <i className="xbw-retrato__online" aria-hidden="true" />
      )}
    </span>
  );
}

/**
 * OS TIQUINHOS.
 *
 * Um tique é enviada, dois cinzas é entregue, dois azuis é lida. Parece
 * detalhe e não é: é por eles que a pessoa sabe se o cliente VIU o aviso de
 * atraso. Aviso não lido não serve de desculpa.
 */
export function Tique({ estado }: { estado: EstadoDaMensagem }) {
  if (estado === "enviando") return <Icone nome="relogio" classe="xbw-tique" />;
  if (estado === "enviada") return <Icone nome="tique" classe="xbw-tique" />;
  if (estado === "entregue")
    return <Icone nome="tiqueDuplo" classe="xbw-tique" />;
  return <Icone nome="tiqueLido" classe="xbw-tique" />;
}

/** A hora do balão, no cantinho de baixo. */
export function Hora({ minuto }: { minuto: number }) {
  return <time className="xbw-hora">{hora(minuto)}</time>;
}

/** A etiqueta que separa os dias, no meio do fio da conversa. */
export function Etiqueta({ texto }: { texto: string }) {
  return <p className="xbw-etiqueta">{texto}</p>;
}

/** O contador verde de não lidas. */
export function Contador({ quantas }: { quantas: number }) {
  if (quantas <= 0) return null;
  return (
    <span className="xbw-contador" aria-label={`${quantas} não lidas`}>
      {quantas > 99 ? "99+" : quantas}
    </span>
  );
}

/** Um botão que é só um ícone — com área de toque de gente, não de mouse. */
export function BotaoIcone({
  nome,
  rotulo,
  aoTocar,
  ativo,
}: {
  nome: NomeDeIcone;
  rotulo: string;
  aoTocar: () => void;
  ativo?: boolean;
}) {
  return (
    <button
      type="button"
      className={ativo ? "xbw-botao xbw-botao--ativo" : "xbw-botao"}
      onClick={aoTocar}
      aria-label={rotulo}
    >
      <Icone nome={nome} />
    </button>
  );
}
