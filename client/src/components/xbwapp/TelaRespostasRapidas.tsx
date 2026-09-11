/**
 * RESPOSTAS RAPIDAS — o atalho que vira frase pronta.
 *
 * Ja funcionava na barra de escrever: digitar "/cheguei" oferece a frase. Aqui
 * e onde elas sao criadas e apagadas — e por isso esta tela nao e enfeite: o
 * que se escreve aqui aparece na hora, na conversa.
 */
import { useState } from "react";
import type { EstadoDoApp } from "@/game/xbwapp/estado";
import { esquecerResposta, guardarResposta } from "@/game/xbwapp/ajustes";
import { Icone } from "./pecas";

export default function TelaRespostasRapidas({
  estado,
  mudar,
  aoVoltar,
}: {
  estado: EstadoDoApp;
  mudar: (f: (e: EstadoDoApp) => EstadoDoApp) => void;
  aoVoltar: () => void;
}) {
  const [atalho, setAtalho] = useState("");
  const [texto, setTexto] = useState("");

  function guardar() {
    if (!atalho.trim() || !texto.trim()) return;
    const a = atalho.trim().startsWith("/")
      ? atalho.trim()
      : `/${atalho.trim()}`;
    mudar(e => guardarResposta(e, a, texto));
    setAtalho("");
    setTexto("");
  }

  return (
    <section className="xbw-formulario" aria-label="Respostas rápidas">
      <header className="xbw-topo">
        <button
          type="button"
          className="xbw-botao"
          onClick={aoVoltar}
          aria-label="Voltar"
        >
          <Icone nome="voltar" />
        </button>
        <strong>Respostas rápidas</strong>
      </header>

      <div className="xbw-rolar">
        <p className="xbw-dica">
          Na conversa, digite o atalho e a frase aparece para você tocar.
        </p>

        <ul className="xbw-itens">
          {estado.respostasRapidas.map(r => (
            <li key={r.atalho}>
              <span className="xbw-linha-fixa">
                <span>
                  <strong>{r.atalho}</strong>
                  <small>{r.texto}</small>
                </span>
                <button
                  type="button"
                  className="xbw-botao"
                  onClick={() => mudar(e => esquecerResposta(e, r.atalho))}
                  aria-label={`Apagar ${r.atalho}`}
                >
                  <Icone nome="lixeira" />
                </button>
              </span>
            </li>
          ))}
        </ul>

        {!estado.respostasRapidas.length && (
          <p className="xbw-vazio">Nenhuma resposta guardada.</p>
        )}

        <div className="xbw-formulario xbw-formulario--dentro">
          <label>
            <span>Atalho</span>
            <input
              value={atalho}
              onChange={e => setAtalho(e.target.value.slice(0, 20))}
              placeholder="/cheguei"
            />
          </label>
          <label>
            <span>Frase</span>
            <textarea
              rows={2}
              value={texto}
              onChange={e => setTexto(e.target.value.slice(0, 200))}
              placeholder="Cheguei! Tô na porta"
            />
          </label>
          <button
            type="button"
            className="xbw-acao"
            onClick={guardar}
            disabled={!atalho.trim() || !texto.trim()}
          >
            Guardar resposta
          </button>
        </div>
      </div>
    </section>
  );
}
