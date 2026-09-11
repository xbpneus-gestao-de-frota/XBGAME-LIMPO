/**
 * AS QUATRO TELAS QUE FALTAVAM DENTRO DE CONFIGURAÇÕES.
 *
 * Ordem dele, 07/09/2026: "NADA DE PLACEBORD, DEPOIS PRECISAREMOS LIGAR A
 * FUNCIONALIDADES REAIS".
 *
 * "Notificações", "Privacidade", "Meu código" e "Mensagens favoritas" eram
 * quatro linhas que so MOSTRAVAM um numero e nao abriam nada. As regras ja
 * existiam nas funcoes (`silenciar`, `mudarPrivacidade`, `favoritas`,
 * `desbloquear`) — faltava a porta. Agora cada uma abre e MEXE no estado.
 *
 * O "Meu código" nao desenha um QR: um QR que nao le e o proprio placebord. Ele
 * mostra o CODIGO de verdade — o que as lojas usariam para achar o entregador —
 * e da para copiar.
 */
import { useState } from "react";
import { CONTATOS, nomeDe } from "@/game/xbwapp/contatos";
import { favoritar, hora, silenciar } from "@/game/xbwapp/estado";
import type { EstadoDoApp } from "@/game/xbwapp/estado";
import { desbloquear, mudarPrivacidade } from "@/game/xbwapp/ajustes";
import { favoritas } from "@/game/xbwapp/mensagens";
import type { IdContato, QuemPodeVer } from "@/game/xbwapp/tipos";
import { Icone, Retrato } from "./pecas";

export type DentroDeConfig =
  | "notificacoes"
  | "privacidade"
  | "codigo"
  | "favoritas";

function Cabecalho({
  titulo,
  aoVoltar,
}: {
  titulo: string;
  aoVoltar: () => void;
}) {
  return (
    <header className="xbw-topo">
      <button
        type="button"
        className="xbw-botao"
        onClick={aoVoltar}
        aria-label="Voltar"
      >
        <Icone nome="voltar" />
      </button>
      <strong>{titulo}</strong>
    </header>
  );
}

/* ── NOTIFICAÇÕES ────────────────────────────────────────────────────────── */

export function TelaNotificacoes({
  estado,
  mudar,
  aoVoltar,
}: {
  estado: EstadoDoApp;
  mudar: (f: (e: EstadoDoApp) => EstadoDoApp) => void;
  aoVoltar: () => void;
}) {
  const comQuemFalou = CONTATOS.filter(c =>
    estado.mensagens.some(m => m.conversa === c.id)
  );

  return (
    <section className="xbw-formulario" aria-label="Notificações">
      <Cabecalho titulo="Notificações" aoVoltar={aoVoltar} />
      <div className="xbw-rolar">
        <p className="xbw-dica">
          Conversa silenciada não faz a faixa descer no alto da tela. O número
          de não lidas continua contando.
        </p>

        {comQuemFalou.length === 0 && (
          <p className="xbw-vazio">Você ainda não falou com ninguém.</p>
        )}

        <ul className="xbw-itens">
          {comQuemFalou.map(c => {
            const calada = estado.silenciadas.includes(c.id);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => mudar(e => silenciar(e, c.id))}
                >
                  <Retrato quem={c.id} tamanho="pequeno" />
                  <span>
                    <strong>{nomeDe(c.id)}</strong>
                    <small>{calada ? "Silenciada" : "Avisa normalmente"}</small>
                  </span>
                  <i className="xbw-seta" aria-hidden="true">
                    {calada ? "🔕" : "🔔"}
                  </i>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* ── PRIVACIDADE ─────────────────────────────────────────────────────────── */

const QUEM: readonly { valor: QuemPodeVer; nome: string }[] = [
  { valor: "todos", nome: "Todo mundo" },
  { valor: "meus-contatos", nome: "Meus contatos" },
  { valor: "ninguem", nome: "Ninguém" },
];

export function TelaPrivacidade({
  estado,
  mudar,
  aoVoltar,
}: {
  estado: EstadoDoApp;
  mudar: (f: (e: EstadoDoApp) => EstadoDoApp) => void;
  aoVoltar: () => void;
}) {
  const p = estado.privacidade;
  return (
    <section className="xbw-formulario" aria-label="Privacidade">
      <Cabecalho titulo="Privacidade" aoVoltar={aoVoltar} />
      <div className="xbw-rolar">
        <Escolha
          nome="Visto por último"
          valor={p.visto}
          aoTrocar={v => mudar(e => mudarPrivacidade(e, "visto", v))}
        />
        <Escolha
          nome="Foto do perfil"
          valor={p.foto}
          aoTrocar={v => mudar(e => mudarPrivacidade(e, "foto", v))}
        />
        <Escolha
          nome="Meu status"
          valor={p.recado}
          aoTrocar={v => mudar(e => mudarPrivacidade(e, "recado", v))}
        />

        <label className="xbw-liga">
          <span>Confirmação de leitura</span>
          <input
            type="checkbox"
            checked={p.recibos}
            onChange={ev =>
              mudar(e => mudarPrivacidade(e, "recibos", ev.target.checked))
            }
          />
        </label>
        <p className="xbw-dica">
          Desligando, você para de mandar o tique azul e para de receber também.
          Não dá para esconder o seu e continuar vendo o dos outros.
        </p>

        <h2 className="xbw-secao">Bloqueados</h2>
        {estado.bloqueados.length === 0 ? (
          <p className="xbw-dica">Ninguém bloqueado.</p>
        ) : (
          <ul className="xbw-itens">
            {estado.bloqueados.map(id => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => mudar(e => desbloquear(e, id))}
                >
                  <Retrato quem={id} tamanho="pequeno" />
                  <span>
                    <strong>{nomeDe(id)}</strong>
                    <small>Toque para desbloquear</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Escolha({
  nome,
  valor,
  aoTrocar,
}: {
  nome: string;
  valor: QuemPodeVer;
  aoTrocar: (v: QuemPodeVer) => void;
}) {
  return (
    <label>
      <span>{nome}</span>
      <select
        value={valor}
        onChange={e => aoTrocar(e.target.value as QuemPodeVer)}
      >
        {QUEM.map(q => (
          <option key={q.valor} value={q.valor}>
            {q.nome}
          </option>
        ))}
      </select>
    </label>
  );
}

/* ── MEU CÓDIGO ──────────────────────────────────────────────────────────── */

/** O codigo do entregador dentro do XBWAPP. Sai do nome, e nao de sorteio. */
export function codigoDoEntregador(nome: string): string {
  const limpo = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  let soma = 0;
  for (const letra of limpo) soma = (soma * 31 + letra.charCodeAt(0)) % 9000;
  return `XBW-${limpo.slice(0, 6) || "ENTREGA"}-${String(soma + 1000)}`;
}

export function TelaMeuCodigo({
  entregador,
  aoVoltar,
}: {
  entregador?: { nome: string; foto?: string };
  aoVoltar: () => void;
}) {
  const [copiado, setCopiado] = useState(false);
  const codigo = codigoDoEntregador(entregador?.nome ?? "Entregador");

  return (
    <section className="xbw-formulario" aria-label="Meu código">
      <Cabecalho titulo="Meu código" aoVoltar={aoVoltar} />
      <div className="xbw-rolar">
        <div className="xbw-perfil-topo">
          <Retrato quem="voce" tamanho="grande" />
          <p>{entregador?.nome ?? "Entregador"}</p>
        </div>

        <p className="xbw-codigo">{codigo}</p>
        <p className="xbw-dica">
          É por este código que as lojas do bairro te encontram no XBWAPP.
        </p>

        <div className="xbw-linha-botoes">
          <button
            type="button"
            className="xbw-acao"
            onClick={() => {
              void navigator.clipboard?.writeText(codigo).then(
                () => setCopiado(true),
                () => setCopiado(false)
              );
            }}
          >
            {copiado ? "Copiado" : "Copiar código"}
          </button>
        </div>
      </div>
    </section>
  );
}

/* ── MENSAGENS FAVORITAS ─────────────────────────────────────────────────── */

export function TelaFavoritas({
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
  const lista = favoritas(estado);
  return (
    <section className="xbw-formulario" aria-label="Mensagens favoritas">
      <Cabecalho titulo="Mensagens favoritas" aoVoltar={aoVoltar} />
      <div className="xbw-rolar">
        {lista.length === 0 && (
          <p className="xbw-vazio">
            Nenhuma mensagem com estrela. Segure uma mensagem na conversa para
            marcar.
          </p>
        )}
        <ul className="xbw-caixas">
          {lista.map(m => (
            <li key={m.id} className="xbw-caixa">
              <header>
                <span className="xbw-caixa__quem">
                  <Retrato quem={m.conversa} tamanho="pequeno" />
                  <strong>{nomeDe(m.conversa)}</strong>
                </span>
                <time>{hora(m.minuto)}</time>
              </header>
              <p>{m.texto}</p>
              <div className="xbw-linha-botoes">
                <button
                  type="button"
                  onClick={() => aoAbrirConversa(m.conversa)}
                >
                  Ir para a conversa
                </button>
                <button
                  type="button"
                  onClick={() => mudar(e => favoritar(e, m.id))}
                >
                  Tirar a estrela
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
