/**
 * COBRANCA — pedir o dinheiro, e saber quem pagou.
 *
 * A cobranca criada aqui NAO fica so nesta lista: ela vira um balao de
 * pagamento na conversa da pessoa, porque e la que o cliente olha. Marcar como
 * paga aqui muda o balao la, e responder o balao la muda a lista aqui — os dois
 * lados apontam para a mesma cobranca.
 */
import { useState } from "react";
import { CONTATOS, nomeDe } from "@/game/xbwapp/contatos";
import { hora } from "@/game/xbwapp/estado";
import type { EstadoDoApp } from "@/game/xbwapp/estado";
import { mandarPagamento } from "@/game/xbwapp/enviar";
import {
  aReceber,
  cancelarCobranca,
  criarCobranca,
  emReais,
  marcarCobrancaPaga,
  recebido,
} from "@/game/xbwapp/negocio";
import type { IdContato } from "@/game/xbwapp/tipos";
import { Icone, Retrato } from "./pecas";

export default function TelaCobrancas({
  estado,
  mudar,
  aoVoltar,
}: {
  estado: EstadoDoApp;
  mudar: (f: (e: EstadoDoApp) => EstadoDoApp) => void;
  aoVoltar: () => void;
}) {
  const gente = CONTATOS.filter(c => c.id !== "voce" && c.tipo !== "sistema");
  const [para, setPara] = useState<IdContato>(gente[0]!.id);
  const [descricao, setDescricao] = useState("");
  const [reais, setReais] = useState("");

  function cobrar() {
    const centavos = Math.round(Number(reais.replace(",", ".")) * 100);
    if (!Number.isFinite(centavos) || centavos <= 0) return;
    mudar(e => {
      const feito = criarCobranca(e, para, descricao, centavos);
      if (!feito) return e;
      // O balao na conversa: e la que o cliente ve e responde.
      return mandarPagamento(feito.estado, para, centavos / 100, true);
    });
    setDescricao("");
    setReais("");
  }

  return (
    <section className="xbw-cobrancas" aria-label="Cobrança">
      <header className="xbw-topo">
        <button
          type="button"
          className="xbw-botao"
          onClick={aoVoltar}
          aria-label="Voltar"
        >
          <Icone nome="voltar" />
        </button>
        <strong>Cobrança</strong>
      </header>

      <div className="xbw-rolar">
        <dl className="xbw-numeros">
          <div>
            <dt>A receber</dt>
            <dd>{emReais(aReceber(estado))}</dd>
          </div>
          <div>
            <dt>Recebido</dt>
            <dd>{emReais(recebido(estado))}</dd>
          </div>
        </dl>

        <div className="xbw-formulario xbw-formulario--dentro">
          <label>
            <span>Cobrar de</span>
            <select
              value={para}
              onChange={e => setPara(e.target.value as IdContato)}
            >
              {gente.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Do que se trata</span>
            <input
              value={descricao}
              onChange={e => setDescricao(e.target.value.slice(0, 60))}
              placeholder="Entrega da casa 12"
            />
          </label>

          <label>
            <span>Valor (R$)</span>
            <input
              inputMode="decimal"
              value={reais}
              onChange={e => setReais(e.target.value.replace(/[^\d.,]/g, ""))}
              placeholder="12,50"
            />
          </label>

          <button
            type="button"
            className="xbw-acao"
            onClick={cobrar}
            disabled={!Number(reais.replace(",", "."))}
          >
            Enviar cobrança
          </button>
        </div>

        <ul className="xbw-caixas">
          {estado.cobrancas.map(c => (
            <li key={c.id} className="xbw-caixa">
              <header>
                <span className="xbw-caixa__quem">
                  <Retrato quem={c.para} tamanho="pequeno" />
                  <strong>{nomeDe(c.para)}</strong>
                </span>
                <span
                  className={`xbw-selo-situacao xbw-selo-situacao--${c.situacao}`}
                >
                  {c.situacao === "enviada"
                    ? "Em aberto"
                    : c.situacao === "paga"
                      ? "Paga"
                      : "Cancelada"}
                </span>
              </header>
              <p>
                {c.descricao} — <b>{emReais(c.centavos)}</b>
              </p>
              <small className="xbw-dica">Enviada às {hora(c.minuto)}</small>
              {c.situacao === "enviada" && (
                <div className="xbw-linha-botoes">
                  <button
                    type="button"
                    className="xbw-acao"
                    onClick={() => mudar(e => marcarCobrancaPaga(e, c.id))}
                  >
                    Marcar como paga
                  </button>
                  <button
                    type="button"
                    onClick={() => mudar(e => cancelarCobranca(e, c.id))}
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>

        {!estado.cobrancas.length && (
          <p className="xbw-vazio">Nenhuma cobrança ainda.</p>
        )}
      </div>
    </section>
  );
}
