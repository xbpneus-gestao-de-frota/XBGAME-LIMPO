/**
 * CHAMADAS — quem ligou, quem voce ligou, e o que ficou perdido.
 *
 * A ligacao perdida em vermelho tem funcao: e a memoria de que o Renan ligou
 * duas vezes antes de mandar "fala comigo gente fina". Sem o registro, aquela
 * piada perde a conta.
 */
import { nomeDe } from "@/game/xbwapp/contatos";
import { hora } from "@/game/xbwapp/estado";
import type { EstadoDoApp } from "@/game/xbwapp/estado";
import type { IdContato } from "@/game/xbwapp/tipos";
import { Icone, Retrato } from "./pecas";

function duracao(segundos: number): string {
  if (segundos <= 0) return "não atendida";
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function TelaChamadas({
  estado,
  aoLigar,
}: {
  estado: EstadoDoApp;
  aoLigar: (contato: IdContato, tipo: "voz" | "video") => void;
}) {
  return (
    <section className="xbw-chamadas" aria-label="Chamadas">
      <header className="xbw-topo xbw-topo--marca">
        {/* O nome da aba embaixo e "Ligacoes": o titulo do alto diz o mesmo. */}
        <strong className="xbw-marca">Ligações</strong>
      </header>
      <ul>
        {estado.chamadas.map(c => (
          <li
            key={c.id}
            className={
              c.rumo === "perdida"
                ? "xbw-chamada xbw-chamada--perdida"
                : "xbw-chamada"
            }
          >
            <Retrato quem={c.contato} tamanho="pequeno" />
            <span>
              <strong>{nomeDe(c.contato)}</strong>
              <small>
                {c.rumo === "recebida"
                  ? "Recebida"
                  : c.rumo === "feita"
                    ? "Feita"
                    : "Perdida"}{" "}
                · {hora(c.minuto)} · {duracao(c.segundos)}
              </small>
            </span>
            <button
              type="button"
              className="xbw-botao"
              onClick={() => aoLigar(c.contato, c.tipo)}
              aria-label={`Ligar para ${nomeDe(c.contato)}`}
            >
              <Icone nome={c.tipo === "video" ? "video" : "telefone"} />
            </button>
          </li>
        ))}
      </ul>
      {estado.chamadas.length === 0 && (
        <p className="xbw-vazio">Nenhuma chamada ainda.</p>
      )}
    </section>
  );
}
