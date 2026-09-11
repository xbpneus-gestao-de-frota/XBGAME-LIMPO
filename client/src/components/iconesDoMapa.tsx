/**
 * OS SIMBOLOS QUE MORAM DENTRO DO PINO.
 *
 * Um desenho por tipo de lugar, todos na mesma grade de 24 e no mesmo jeito:
 * silhueta cheia, contorno escuro grosso. O contorno nao e enfeite — o mapa e
 * um desenho pintado, claro e colorido, e sem a linha escura um icone chapado
 * some em cima de um telhado claro.
 *
 * A COR nao mora aqui. A cor diz o PAPEL na corrida (branco a base, ciano a
 * coleta, ambar a entrega), e disso quem cuida e o estilo do pino; o simbolo
 * diz o QUE E o lugar. Separar as duas coisas e o que deixa "pegar na
 * Pizzaria" e "deixar na casa 18" legiveis de relance, sem escrever nada.
 *
 * Os nomes dos comercios sao PROVISORIOS — batizar e decisao do Fernando —
 * entao a busca aqui e por pedaco do nome, e nao por igualdade: quando ele
 * trocar "Padaria" por outro nome, o pino cai no simbolo generico de loja em
 * vez de ficar sem nada.
 */

export type PapelDaParada = "base" | "coleta" | "entrega";

/** Qual simbolo cabe num lugar, pelo papel dele e pelo nome. */
function escolherSimbolo(papel: PapelDaParada, nome: string): string {
  if (papel === "base") return "base";
  if (papel === "entrega") return "casa";

  const n = nome.toLowerCase();
  if (n.includes("pizza")) return "pizza";
  if (n.includes("mercad")) return "cesta";
  if (n.includes("padar") || n.includes("pão") || n.includes("pao")) return "pao";
  if (n.includes("farm")) return "cruz";
  if (n.includes("flor")) return "flor";
  if (n.includes("papel")) return "lapis";
  if (n.includes("lanch")) return "copo";
  return "cesta";
}

function Desenho({ qual }: { qual: string }) {
  switch (qual) {
    case "base":
      // Uma bandeira: a base nao vende nada, ela e de onde se sai.
      return (
        <>
          <path d="M6.2 2.4v19.2" />
          <path d="M6.2 3.6h12.6l-3 4.4 3 4.4H6.2z" />
        </>
      );
    case "casa":
      return (
        <path d="M2.6 11.4 12 3.2l9.4 8.2v9.1a1.3 1.3 0 0 1-1.3 1.3h-4.6v-5.4h-7v5.4H3.9a1.3 1.3 0 0 1-1.3-1.3z" />
      );
    case "pizza":
      return (
        <>
          <path d="M12 2.6 22 20.2a1.2 1.2 0 0 1-1 1.8H3a1.2 1.2 0 0 1-1-1.8z" />
          <circle cx="12" cy="11" r="1.7" className="mapa__simbolo-furo" />
          <circle cx="8.6" cy="16.6" r="1.5" className="mapa__simbolo-furo" />
          <circle cx="15.2" cy="16.9" r="1.5" className="mapa__simbolo-furo" />
        </>
      );
    case "pao":
      return (
        <>
          <path d="M4 9.4C4 6.5 7.6 4.6 12 4.6s8 1.9 8 4.8v7.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
          <path d="M9 8.4v10M15 8.4v10" className="mapa__simbolo-risco" />
        </>
      );
    case "cruz":
      return (
        <path d="M9.4 2.6h5.2a1.2 1.2 0 0 1 1.2 1.2v4.6h4.6a1.2 1.2 0 0 1 1.2 1.2v5.2a1.2 1.2 0 0 1-1.2 1.2h-4.6v4.6a1.2 1.2 0 0 1-1.2 1.2H9.4a1.2 1.2 0 0 1-1.2-1.2V16H3.6a1.2 1.2 0 0 1-1.2-1.2V9.6a1.2 1.2 0 0 1 1.2-1.2h4.6V3.8a1.2 1.2 0 0 1 1.2-1.2z" />
      );
    case "flor":
      return (
        <>
          <circle cx="12" cy="7.4" r="3.3" />
          <circle cx="7.2" cy="11.2" r="3.3" />
          <circle cx="16.8" cy="11.2" r="3.3" />
          <circle cx="12" cy="14.4" r="2.6" className="mapa__simbolo-furo" />
          <path d="M12 15.4V22" className="mapa__simbolo-risco" />
        </>
      );
    case "lapis":
      return (
        <>
          <path d="M16.4 2.9a1.6 1.6 0 0 1 2.3 0l2.4 2.4a1.6 1.6 0 0 1 0 2.3L9.4 19.7l-5.6 1.6 1.6-5.6z" />
          <path d="M15.1 5.5 18.5 8.9" className="mapa__simbolo-risco" />
        </>
      );
    case "copo":
      return (
        <>
          <path d="M5.4 7.6h13.2l-1.3 12.1a2 2 0 0 1-2 1.8H8.7a2 2 0 0 1-2-1.8z" />
          <path d="M4.2 3.9h15.6a1.1 1.1 0 0 1 0 2.2H4.2a1.1 1.1 0 0 1 0-2.2z" />
        </>
      );
    default:
      return (
        <path d="M7.8 3.1a1.2 1.2 0 0 1 2 1.3L8.2 7.6h7.6l-1.6-3.2a1.2 1.2 0 1 1 2.1-1.1l2.1 4.3h2.3a1.2 1.2 0 0 1 1.2 1.5l-2.2 9.3a2 2 0 0 1-2 1.5H6.3a2 2 0 0 1-2-1.5L2.1 9.1a1.2 1.2 0 0 1 1.2-1.5h2.3z" />
      );
  }
}

/** O simbolo do lugar, para ir dentro do pino. */
export default function IconeDoMapa({
  papel,
  nome,
}: {
  papel: PapelDaParada;
  nome: string;
}) {
  return (
    <svg className="mapa__simbolo" viewBox="0 0 24 24" aria-hidden="true">
      <Desenho qual={escolherSimbolo(papel, nome)} />
    </svg>
  );
}
