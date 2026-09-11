/**
 * RECADOS — o que o bairro esta contando hoje.
 *
 * Nao e enfeite: e AVISO DE RUA. A Lia posta que a praca esta interditada, a
 * padaria posta que o pao saiu do forno. Quem abre os recados sabe do bairro
 * antes de aceitar a corrida; quem nao abre, descobre pedalando.
 */
import { nomeDe } from "@/game/xbwapp/contatos";
import { hora, verRecado } from "@/game/xbwapp/estado";
import type { EstadoDoApp } from "@/game/xbwapp/estado";
import { Icone, Retrato } from "./pecas";

export default function TelaRecados({
  estado,
  mudar,
}: {
  estado: EstadoDoApp;
  mudar: (f: (e: EstadoDoApp) => EstadoDoApp) => void;
}) {
  return (
    <section className="xbw-recados" aria-label="Recados">
      <header className="xbw-topo xbw-topo--marca">
        <strong className="xbw-marca">Recados</strong>
      </header>
      <ul>
        {estado.recados.map(r => (
          <li
            key={r.id}
            className={r.visto ? "xbw-recado xbw-recado--visto" : "xbw-recado"}
          >
            <button
              type="button"
              onClick={() => mudar(e => verRecado(e, r.id))}
            >
              <span className="xbw-recado__anel">
                {!r.visto && (
                  <Icone nome="anelStatus" classe="xbw-recado__aro" />
                )}
                <Retrato quem={r.dono} />
              </span>
              <span>
                <strong>{nomeDe(r.dono)}</strong>
                <small>{r.texto}</small>
                <time>{hora(r.minuto)}</time>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
