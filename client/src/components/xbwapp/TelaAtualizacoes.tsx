/**
 * ATUALIZAÇÕES — status em cima, canais embaixo.
 *
 * Ordem dele, 07/09/2026: "ATUALIZAÇÕES MOSTRAR STATUS, E CANAIS TAMBEM, REAL".
 * E o mesmo desenho do aplicativo de verdade: a tira de status no alto (o meu
 * primeiro, depois os dos outros) e a lista de canais logo abaixo, separada em
 * "sigo" e "descobrir".
 *
 * Status vazio nao e defeito: e a ordem dele de que nada aparece sozinho. Quem
 * nunca publicou nao tem status, e o bairro so tem status quando alguem posta.
 */
import { useState } from "react";
import { nomeDe } from "@/game/xbwapp/contatos";
import { hora, verRecado } from "@/game/xbwapp/estado";
import type { EstadoDoApp } from "@/game/xbwapp/estado";
import {
  CORES_DE_RECADO,
  haQuantoTempo,
  meusRecados,
  publicarRecado,
  recadosDosOutros,
} from "@/game/xbwapp/meusRecados";
import {
  canaisParaDescobrir,
  canaisQueSigo,
  quantosSeguem,
  seguir,
  ultimaDoCanal,
} from "@/game/xbwapp/canais";
import type { Canal } from "@/game/xbwapp/tipos";
import { Icone, Retrato } from "./pecas";

export default function TelaAtualizacoes({
  estado,
  mudar,
  aoAbrirCanal,
}: {
  estado: EstadoDoApp;
  mudar: (f: (e: EstadoDoApp) => EstadoDoApp) => void;
  aoAbrirCanal: (id: string) => void;
}) {
  const [escrevendo, setEscrevendo] = useState(false);
  const [texto, setTexto] = useState("");
  const [cor, setCor] = useState(CORES_DE_RECADO[0]!);

  const meus = meusRecados(estado);
  const outros = recadosDosOutros(estado);
  const sigo = canaisQueSigo(estado);
  const descobrir = canaisParaDescobrir(estado);

  function publicar() {
    if (!texto.trim()) return;
    mudar(e => publicarRecado(e, texto, cor));
    setTexto("");
    setEscrevendo(false);
  }

  return (
    <section className="xbw-atualizacoes" aria-label="Atualizações">
      <header className="xbw-topo xbw-topo--marca">
        <strong className="xbw-marca">Atualizações</strong>
      </header>

      <div className="xbw-rolar">
        <h2 className="xbw-secao">Status</h2>

        <ul className="xbw-status">
          <li>
            <button type="button" onClick={() => setEscrevendo(v => !v)}>
              <span className="xbw-status__meu">
                <Retrato quem="voce" />
                <i aria-hidden="true">+</i>
              </span>
              <span>
                <strong>Meu status</strong>
                <small>
                  {meus.length
                    ? `${meus.length} no ar · ${haQuantoTempo(estado, meus[0]!)}`
                    : "Toque para escrever"}
                </small>
              </span>
            </button>
          </li>

          {outros.map(r => (
            <li key={r.id} className={r.visto ? "xbw-visto" : undefined}>
              <button
                type="button"
                onClick={() => mudar(e => verRecado(e, r.id))}
              >
                <span className="xbw-status__anel">
                  {!r.visto && (
                    <Icone nome="anelStatus" classe="xbw-status__aro" />
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

          {!outros.length && (
            <li className="xbw-vazio-linha">
              <p>Ninguém do bairro publicou status ainda.</p>
            </li>
          )}
        </ul>

        {escrevendo && (
          <div className="xbw-novo-status">
            <textarea
              value={texto}
              onChange={ev => setTexto(ev.target.value.slice(0, 140))}
              placeholder="O que você quer contar?"
              aria-label="Escreva seu status"
              rows={3}
            />
            <div className="xbw-cores">
              {CORES_DE_RECADO.map(c => (
                <button
                  key={c}
                  type="button"
                  className={c === cor ? "xbw-cor xbw-cor--atual" : "xbw-cor"}
                  style={{ background: c }}
                  onClick={() => setCor(c)}
                  aria-label={`Cor ${c}`}
                  aria-pressed={c === cor}
                />
              ))}
            </div>
            <div className="xbw-linha-botoes">
              <button type="button" onClick={() => setEscrevendo(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className="xbw-acao"
                onClick={publicar}
                disabled={!texto.trim()}
              >
                Publicar
              </button>
            </div>
          </div>
        )}

        {meus.length > 0 && (
          <ul className="xbw-meus-status">
            {meus.map(r => (
              <li key={r.id}>
                <span className="xbw-bolinha" style={{ background: r.cor }} />
                <span>
                  <strong>{r.texto}</strong>
                  <small>
                    {haQuantoTempo(estado, r)} ·{" "}
                    {r.vistoPor?.length
                      ? `${r.vistoPor.length} viram`
                      : "ninguém viu ainda"}
                  </small>
                </span>
              </li>
            ))}
          </ul>
        )}

        <h2 className="xbw-secao">Canais</h2>

        {sigo.length > 0 && (
          <ul className="xbw-canais">
            {sigo.map(c => (
              <LinhaDeCanal
                key={c.id}
                canal={c}
                estado={estado}
                aoAbrir={() => aoAbrirCanal(c.id)}
              />
            ))}
          </ul>
        )}

        {descobrir.length > 0 && (
          <>
            <h3 className="xbw-subsecao">
              {sigo.length ? "Descobrir mais canais" : "Canais para seguir"}
            </h3>
            <ul className="xbw-canais">
              {descobrir.map(c => (
                <LinhaDeCanal
                  key={c.id}
                  canal={c}
                  estado={estado}
                  aoAbrir={() => aoAbrirCanal(c.id)}
                  aoSeguir={() => mudar(e => seguir(e, c.id))}
                />
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}

function LinhaDeCanal({
  canal,
  estado,
  aoAbrir,
  aoSeguir,
}: {
  canal: Canal;
  estado: EstadoDoApp;
  aoAbrir: () => void;
  aoSeguir?: () => void;
}) {
  const ultima = ultimaDoCanal(estado, canal.id);
  return (
    <li className="xbw-canal">
      <button type="button" onClick={aoAbrir}>
        <span
          className="xbw-canal__foto"
          style={{ background: canal.cor ?? "#12547a" }}
          aria-hidden="true"
        >
          {canal.nome.slice(0, 1)}
        </span>
        <span>
          <strong>
            <span>{canal.nome}</span>
            {canal.verificado && <i className="xbw-verificado">✓</i>}
          </strong>
          <small>{ultima ? ultima.texto : canal.descricao}</small>
        </span>
        {/*
          A hora so aparece nos canais que ele SEGUE. Na lista de descobrir,
          quem ocupa esse canto e o botao "Seguir" — e os dois juntos espremem
          o nome do canal ate sobrar "XB…".
        */}
        {ultima && !aoSeguir && <time>{hora(ultima.minuto)}</time>}
      </button>
      {aoSeguir && (
        <button type="button" className="xbw-seguir" onClick={aoSeguir}>
          Seguir
        </button>
      )}
    </li>
  );
}
