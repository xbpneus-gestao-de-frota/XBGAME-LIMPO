/**
 * GUIA DE NEGOCIOS — os comercios do bairro, do jeito que o cliente procura.
 *
 * Nao e lista morta: cada linha abre a conversa com a loja, que e para o que o
 * guia serve. Procura por nome, pelo que a loja faz e pela categoria, e a
 * procura ignora acento — quem digita "farmacia" acha "Farmácia".
 */
import { useState } from "react";
import type { EstadoDoApp } from "@/game/xbwapp/estado";
import {
  categoriaDe,
  categoriasDoGuia,
  procurarNoGuia,
} from "@/game/xbwapp/negocio";
import type { IdContato } from "@/game/xbwapp/tipos";
import { Icone, Retrato } from "./pecas";

export default function TelaGuiaDeNegocios({
  estado,
  aoVoltar,
  aoAbrirConversa,
}: {
  estado: EstadoDoApp;
  aoVoltar: () => void;
  aoAbrirConversa: (quem: IdContato) => void;
}) {
  const [procura, setProcura] = useState("");
  const [categoria, setCategoria] = useState<string | null>(null);

  const achados = procurarNoGuia(procura, categoria ?? undefined);
  const bloqueado = (id: IdContato) => estado.bloqueados.includes(id);

  return (
    <section className="xbw-guia" aria-label="Guia de negócios">
      <header className="xbw-topo">
        <button
          type="button"
          className="xbw-botao"
          onClick={aoVoltar}
          aria-label="Voltar"
        >
          <Icone nome="voltar" />
        </button>
        <strong>Guia de negócios</strong>
      </header>

      <label className="xbw-procura">
        <Icone nome="busca" />
        <input
          type="search"
          value={procura}
          onChange={e => setProcura(e.target.value)}
          placeholder="Procurar comércio"
          aria-label="Procurar no guia"
        />
      </label>

      <div className="xbw-fichas">
        <button
          type="button"
          className={
            categoria === null ? "xbw-ficha xbw-ficha--atual" : "xbw-ficha"
          }
          onClick={() => setCategoria(null)}
          aria-pressed={categoria === null}
        >
          Tudo
        </button>
        {categoriasDoGuia().map(c => (
          <button
            key={c}
            type="button"
            className={
              categoria === c ? "xbw-ficha xbw-ficha--atual" : "xbw-ficha"
            }
            onClick={() => setCategoria(categoria === c ? null : c)}
            aria-pressed={categoria === c}
          >
            {c}
          </button>
        ))}
      </div>

      <ul className="xbw-lojas">
        {achados.map(c => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => aoAbrirConversa(c.id)}
              disabled={bloqueado(c.id)}
            >
              <Retrato quem={c.id} />
              <span>
                <strong>{c.nome}</strong>
                <small>{c.sobre}</small>
                <small className="xbw-dica">
                  {categoriaDe(c.id)}
                  {c.endereco ? ` · ${c.endereco}` : ""}
                  {c.horario ? ` · ${c.horario}` : ""}
                </small>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {!achados.length && (
        <p className="xbw-vazio">Nenhum comércio com esse nome no bairro.</p>
      )}
    </section>
  );
}
