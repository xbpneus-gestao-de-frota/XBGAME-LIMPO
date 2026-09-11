/**
 * A LOJA — catalogo, carrinho e pedidos, dentro do aplicativo.
 *
 * ── POR QUE O CARRINHO IMPORTA NUM JOGO DE ENTREGA ────────────────────────
 *
 * Num aplicativo comum o carrinho e do cliente e o entregador so recebe uma
 * sacola. Aqui quem monta ve o PESO, e peso e o que enche a mochila. A pessoa
 * para de aceitar "uma entrega" e passa a aceitar "quatro quilos de pao mais
 * um vaso de flor" — que e uma decisao de verdade, com a mochila na frente.
 *
 * ── E O FRETE NAO E INVENTADO ─────────────────────────────────────────────
 *
 * O valor da corrida sai da conta de frete do jogo, com a distancia REAL pelas
 * ruas do bairro: base ate a loja, loja ate a porta. Nao ha premio escrito a
 * mao em lugar nenhum desta tela.
 */
import { useState } from "react";
import { LOJAS, MORADORES, nomeDe } from "@/game/xbwapp/contatos";
import {
  cabeNaMochila,
  catalogoDa,
  emReais,
  freteDoPedido,
  pesoDoCarrinho,
  produto,
  valorDoCarrinho,
} from "@/game/xbwapp/catalogo";
import { kmDaCorrida, prazoEmMinutos } from "@/game/xbwapp/distancias";
import {
  esvaziarCarrinho,
  fecharPedido,
  hora,
  porNoCarrinho,
} from "@/game/xbwapp/estado";
import type { EstadoDoApp } from "@/game/xbwapp/estado";
import type { IdContato } from "@/game/xbwapp/tipos";
import { Icone, Retrato } from "./pecas";

/** DECISAO DELE: o nivel da mochila no comeco do jogo. */
const NIVEL_DA_MOCHILA = 1;

export default function TelaLoja({
  estado,
  mudar,
  aoAbrirConversa,
  aoVoltar,
}: {
  estado: EstadoDoApp;
  mudar: (f: (e: EstadoDoApp) => EstadoDoApp) => void;
  aoAbrirConversa: (c: IdContato) => void;
  /** Quando o catalogo e aberto de dentro de Ferramentas, ha para onde voltar. */
  aoVoltar?: () => void;
}) {
  const [loja, setLoja] = useState<IdContato | null>(null);
  const [escolhendoCliente, setEscolhendoCliente] = useState(false);
  const [vendoPedidos, setVendoPedidos] = useState(false);

  const peso = pesoDoCarrinho(estado.carrinho);
  const valor = valorDoCarrinho(estado.carrinho);
  const cabe = cabeNaMochila(estado.carrinho, NIVEL_DA_MOCHILA);

  if (vendoPedidos) {
    return (
      <section className="xbw-loja" aria-label="Pedidos">
        <header className="xbw-topo xbw-topo--marca">
          <button
            type="button"
            className="xbw-botao"
            onClick={() => setVendoPedidos(false)}
            aria-label="Voltar"
          >
            <Icone nome="voltar" />
          </button>
          <strong className="xbw-marca">Pedidos</strong>
        </header>
        <ul className="xbw-pedidos">
          {estado.pedidos.map(p => (
            <li key={p.numero}>
              <button type="button" onClick={() => aoAbrirConversa(p.loja)}>
                <Retrato quem={p.loja} tamanho="pequeno" />
                <span>
                  <strong>
                    {p.numero} · {nomeDe(p.loja)} → {nomeDe(p.cliente)}
                  </strong>
                  <small>
                    {p.itens.length} item(ns) · frete {emReais(p.frete)} · prazo{" "}
                    {p.prazoMin} min · {hora(p.minuto)}
                  </small>
                </span>
                <em className={`xbw-selo xbw-selo--${p.estado}`}>{p.estado}</em>
              </button>
            </li>
          ))}
        </ul>
        {estado.pedidos.length === 0 && (
          <p className="xbw-vazio">Nenhum pedido ainda.</p>
        )}
      </section>
    );
  }

  if (!loja) {
    return (
      <section className="xbw-loja" aria-label="Lojas">
        <header className="xbw-topo xbw-topo--marca">
          {aoVoltar && (
            <button
              type="button"
              className="xbw-botao"
              onClick={aoVoltar}
              aria-label="Voltar"
            >
              <Icone nome="voltar" />
            </button>
          )}
          <strong className="xbw-marca">Catálogo</strong>
          <button
            type="button"
            className="xbw-botao"
            onClick={() => setVendoPedidos(true)}
            aria-label="Pedidos"
          >
            <Icone nome="pagamento" />
          </button>
        </header>
        <ul className="xbw-lojas">
          {LOJAS.map(l => (
            <li key={l.id}>
              <button type="button" onClick={() => setLoja(l.id)}>
                <Retrato quem={l.id} />
                <span>
                  <strong>{l.nome}</strong>
                  <small>{l.sobre}</small>
                  <small className={l.online ? "xbw-aberta" : "xbw-fechada"}>
                    {l.online ? "Aberta agora" : "Fechada"} · {l.horario}
                  </small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  const itens = catalogoDa(loja);

  return (
    <section className="xbw-loja" aria-label={`Catálogo da ${nomeDe(loja)}`}>
      <header className="xbw-topo">
        <button
          type="button"
          className="xbw-botao"
          onClick={() => setLoja(null)}
          aria-label="Voltar"
        >
          <Icone nome="voltar" />
        </button>
        <Retrato quem={loja} tamanho="pequeno" />
        <span className="xbw-topo__quem">
          <strong>{nomeDe(loja)}</strong>
          <small>Catálogo</small>
        </span>
        <button
          type="button"
          className="xbw-botao"
          onClick={() => aoAbrirConversa(loja)}
          aria-label="Conversar"
        >
          <Icone nome="abaConversas" />
        </button>
      </header>

      <ul className="xbw-catalogo">
        {itens.map(p => {
          const noCarrinho =
            estado.lojaDoCarrinho === loja
              ? (estado.carrinho.find(i => i.produto === p.id)?.quantidade ?? 0)
              : 0;
          return (
            <li key={p.id}>
              <span className="xbw-produto">
                <strong>{p.nome}</strong>
                <small>{p.descricao}</small>
                <em>
                  {emReais(p.preco)} · {p.peso.toFixed(1)} kg
                </em>
              </span>
              <span className="xbw-quantidade">
                <button
                  type="button"
                  onClick={() => mudar(e => porNoCarrinho(e, loja, p.id, -1))}
                  aria-label={`Tirar ${p.nome}`}
                  disabled={noCarrinho === 0}
                >
                  −
                </button>
                <b>{noCarrinho}</b>
                <button
                  type="button"
                  onClick={() => mudar(e => porNoCarrinho(e, loja, p.id, 1))}
                  aria-label={`Somar ${p.nome}`}
                >
                  +
                </button>
              </span>
            </li>
          );
        })}
      </ul>

      {estado.carrinho.length > 0 && estado.lojaDoCarrinho === loja && (
        <div
          className={
            cabe ? "xbw-carrinho" : "xbw-carrinho xbw-carrinho--estourou"
          }
        >
          <span>
            {estado.carrinho.length} item(ns) · {peso.toFixed(1)} kg ·{" "}
            {emReais(valor)}
            {!cabe && <b> — não cabe na mochila</b>}
          </span>
          <span className="xbw-carrinho__acoes">
            <button type="button" onClick={() => mudar(esvaziarCarrinho)}>
              Limpar
            </button>
            <button
              type="button"
              disabled={!cabe}
              onClick={() => setEscolhendoCliente(true)}
            >
              Fazer pedido
            </button>
          </span>
        </div>
      )}

      {escolhendoCliente && (
        <div
          className="xbw-escolher"
          role="dialog"
          aria-label="Para quem é a entrega"
        >
          <p>Para quem é a entrega?</p>
          <ul>
            {MORADORES.map(m => {
              const km = kmDaCorrida(loja, m.id);
              const prazo = prazoEmMinutos(loja, m.id);
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setEscolhendoCliente(false);
                      mudar(e =>
                        fecharPedido(e, {
                          cliente: m.id,
                          km,
                          prazoMin: prazo,
                          aberta: false,
                        })
                      );
                    }}
                  >
                    <Retrato quem={m.id} tamanho="pequeno" />
                    <span>
                      <strong>{m.nome}</strong>
                      <small>
                        {m.endereco} · {km.toFixed(1)} km · {prazo} min ·{" "}
                        {emReais(freteDoPedido(estado.carrinho, km))}
                      </small>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            className="xbw-escolher__sair"
            onClick={() => setEscolhendoCliente(false)}
          >
            Cancelar
          </button>
        </div>
      )}
    </section>
  );
}

/** Uma linha de carrinho lida por fora — usada pelos testes e pela tela de pedidos. */
export function descreverItem(id: string, quantidade: number): string {
  const p = produto(id);
  return p ? `${quantidade}× ${p.nome}` : `${quantidade}× ?`;
}
