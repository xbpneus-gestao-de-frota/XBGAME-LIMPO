/**
 * ESTATISTICAS — os numeros do atendimento, todos tirados do que aconteceu.
 *
 * Nenhum numero aqui e escrito na mao: cada um e contado das mensagens, dos
 * pedidos e das cobrancas que existem no estado. Se o jogador nao fez nada, os
 * numeros sao zero — e zero honesto vale mais que grafico de enfeite.
 */
import type { EstadoDoApp } from "@/game/xbwapp/estado";
import { emReais, estatisticas, gastoTotal } from "@/game/xbwapp/negocio";
import { Icone } from "./pecas";

export default function TelaEstatisticas({
  estado,
  aoVoltar,
}: {
  estado: EstadoDoApp;
  aoVoltar: () => void;
}) {
  const n = estatisticas(estado);
  const linhas: readonly { nome: string; valor: string }[] = [
    { nome: "Mensagens enviadas", valor: n.enviadas.toLocaleString("pt-BR") },
    { nome: "Entregues", valor: n.entregues.toLocaleString("pt-BR") },
    { nome: "Lidas", valor: n.lidas.toLocaleString("pt-BR") },
    { nome: "Recebidas", valor: n.recebidas.toLocaleString("pt-BR") },
    { nome: "Conversas", valor: n.conversas.toLocaleString("pt-BR") },
    { nome: "Pedidos fechados", valor: n.pedidos.toLocaleString("pt-BR") },
    { nome: "A receber", valor: emReais(n.aReceber) },
    { nome: "Recebido", valor: emReais(n.recebido) },
    { nome: "Investido em anúncios", valor: emReais(gastoTotal(estado)) },
  ];

  return (
    <section className="xbw-estatisticas" aria-label="Estatísticas">
      <header className="xbw-topo">
        <button
          type="button"
          className="xbw-botao"
          onClick={aoVoltar}
          aria-label="Voltar"
        >
          <Icone nome="voltar" />
        </button>
        <strong>Estatísticas</strong>
      </header>

      <div className="xbw-rolar">
        <dl className="xbw-placar">
          {linhas.map(l => (
            <div key={l.nome}>
              <dt>{l.nome}</dt>
              <dd>{l.valor}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
