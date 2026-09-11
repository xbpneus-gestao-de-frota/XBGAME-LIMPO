/**
 * ETIQUETAS — o jeito de a loja saber em que pe esta cada conversa.
 *
 * Esta tela mostra as etiquetas que existem e QUAIS CONVERSAS estao em cada
 * uma, e deixa tirar. Marcar acontece dentro da conversa, que e onde a pessoa
 * esta quando o pedido muda de estado.
 */
import { nomeDe } from "@/game/xbwapp/contatos";
import type { EstadoDoApp } from "@/game/xbwapp/estado";
import {
  ETIQUETAS,
  conversasComEtiqueta,
  etiquetar,
} from "@/game/xbwapp/ajustes";
import type { IdContato } from "@/game/xbwapp/tipos";
import { Icone, Retrato } from "./pecas";

export default function TelaEtiquetas({
  estado,
  mudar,
  aoVoltar,
  aoAbrirConversa,
}: {
  estado: EstadoDoApp;
  mudar: (f: (e: EstadoDoApp) => EstadoDoApp) => void;
  aoVoltar: () => void;
  aoAbrirConversa: (quem: IdContato) => void;
}) {
  return (
    <section className="xbw-etiquetas" aria-label="Etiquetas">
      <header className="xbw-topo">
        <button
          type="button"
          className="xbw-botao"
          onClick={aoVoltar}
          aria-label="Voltar"
        >
          <Icone nome="voltar" />
        </button>
        <strong>Etiquetas</strong>
      </header>

      <div className="xbw-rolar">
        {ETIQUETAS.map(et => {
          const conversas = conversasComEtiqueta(estado, et.id);
          return (
            <div key={et.id} className="xbw-grupo-etiqueta">
              <h2 className="xbw-secao">
                <i className="xbw-bolinha" style={{ background: et.cor }} />
                {et.nome}
                <b>{conversas.length}</b>
              </h2>
              {conversas.length ? (
                <ul className="xbw-lojas">
                  {conversas.map(id => (
                    <li key={id}>
                      <button type="button" onClick={() => aoAbrirConversa(id)}>
                        <Retrato quem={id} />
                        <span>
                          <strong>{nomeDe(id)}</strong>
                        </span>
                      </button>
                      <button
                        type="button"
                        className="xbw-botao"
                        onClick={() => mudar(e => etiquetar(e, id, et.id))}
                        aria-label={`Tirar ${et.nome} de ${nomeDe(id)}`}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="xbw-dica">Nenhuma conversa com esta etiqueta.</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
