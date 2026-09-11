/**
 * ENTREGA RAPIDA — duas telas: quem vai, e o que pegar.
 *
 * Ordem dele, 09/09/2026: "ao clicar no botao entrega rapida precisamos de uma
 * tela antes da primeira atual, com a imagem de cada entregador, ao clicar na
 * imagem abriremos a primeira tela atual."
 *
 * ── POR QUE A ESCOLHA VEM ANTES ───────────────────────────────────────────
 *
 * Antes o balcao escolhia sozinho: mandava o menos carregado e escrevia o nome
 * embaixo do botao. Funcionava e escondia o jogo. Com a equipe crescendo, QUEM
 * VAI e a decisao que mais pesa — mandar o que esta livre, ou empilhar mais uma
 * no que ja esta na rua e ja vai passar perto? Essa pergunta nao cabe num
 * rodape de botao; ela merece a tela inteira.
 *
 * E resolve outra coisa de graca: com o entregador escolhido ANTES, cada oferta
 * mostra o tempo daquela pessoa, saindo de onde ela esta agora. O mesmo pedido
 * vale coisas diferentes para o Renan e para a Marlene, e agora da para ver.
 *
 * ── A TELA DE OFERTAS CONTINUA SENDO SO DECIDIR ───────────────────────────
 *
 * Correcao dele de 08/09: "o que precisamos e uma tela apenas para aceitar, ou
 * recusar entrega". Continua valendo. A segunda tela nao ganhou nada: ela so
 * perdeu a linha de "quem vai", que agora esta decidida.
 */
import { useState } from "react";

import {
  aceitarOferta,
  auxilioDoComeco,
  cargaDeCadaUm,
  corDoPino,
  faixaDaOferta,
  ofertasAbertas,
  ofertasEmAndamento,
  recusarOferta,
  relogioConsumido,
  rotaDe,
  segundosQueSobram,
} from "@/game/xbwapp/entregaRapida";
import { kmQueFalta } from "@/game/xbwapp/aRota";
import { emReais } from "@/game/xbwapp/catalogo";
import { nomeDe } from "@/game/xbwapp/contatos";
import type { EstadoDoApp } from "@/game/xbwapp/estado";
import type { OfertaDeEntrega } from "@/game/xbwapp/tipos";

/** Um entregador da casa, do jeito que esta tela precisa saber dele. */
export interface EntregadorDaCasa {
  id: string;
  nome: string;
  livre: boolean;
  /** O retrato dele. Sem retrato, entra a roda com a inicial. */
  foto?: string;
}

/**
 * QUEM APARECE QUANDO NAO HA NINGUEM CONTRATADO.
 *
 * O proprio jogador. Ele tambem tem rota, tambem sai da pizzaria e tambem paga
 * o caminho — entao ele e um entregador como os outros, e a tela nao precisa de
 * um caso especial para o comeco do jogo.
 */
const VOCE: EntregadorDaCasa = { id: "voce", nome: "Você", livre: true };

export function TelaEntregaRapida({
  estado,
  mudar,
  equipe,
}: {
  estado: EstadoDoApp;
  mudar: (f: (e: EstadoDoApp) => EstadoDoApp) => void;
  equipe: readonly EntregadorDaCasa[];
}) {
  const [escolhido, setEscolhido] = useState<string | null>(null);

  const gente = equipe.length > 0 ? equipe : [VOCE];
  const quem = gente.find(e => e.nome === escolhido);

  if (!quem) {
    return (
      <Escolha estado={estado} gente={gente} aoEscolher={setEscolhido} />
    );
  }
  return (
    <Balcao
      estado={estado}
      mudar={mudar}
      quem={quem}
      aoVoltar={() => setEscolhido(null)}
    />
  );
}

/* ── A PRIMEIRA TELA: QUEM VAI ─────────────────────────────────────────── */

function Escolha({
  estado,
  gente,
  aoEscolher,
}: {
  estado: EstadoDoApp;
  gente: readonly EntregadorDaCasa[];
  aoEscolher: (nome: string) => void;
}) {
  const cargas = cargaDeCadaUm(estado);
  const abertas = ofertasAbertas(estado).length;

  return (
    <section className="xbw-equipe">
      <header className="xbw-equipe__topo">
        <h2>Entrega Rápida</h2>
        <p>
          {abertas === 0
            ? "Nenhum pedido esperando agora."
            : `${abertas} pedido${abertas === 1 ? "" : "s"} esperando. Quem vai pegar?`}
        </p>
      </header>

      <ul className="xbw-equipe__lista">
        {gente.map(e => {
          const rota = rotaDe(estado, e.nome);
          const carga = cargas.get(e.nome) ?? 0;
          return (
            <li key={e.id}>
              <button
                type="button"
                className="xbw-pessoa"
                onClick={() => aoEscolher(e.nome)}
              >
                <span
                  className={
                    carga > 0
                      ? "xbw-pessoa__foto xbw-pessoa__foto--ocupado"
                      : "xbw-pessoa__foto"
                  }
                >
                  {e.foto ? (
                    <img src={e.foto} alt="" draggable={false} />
                  ) : (
                    <i aria-hidden="true">{e.nome.slice(0, 1)}</i>
                  )}
                </span>
                <strong>{e.nome}</strong>
                <small>
                  {carga === 0
                    ? `livre em ${nomeDe(rota.em)}`
                    : `${carga} na bolsa · ${kmQueFalta(rota)} km pela frente`}
                </small>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ── A SEGUNDA TELA: ACEITAR OU RECUSAR ────────────────────────────────── */

function Balcao({
  estado,
  mudar,
  quem,
  aoVoltar,
}: {
  estado: EstadoDoApp;
  mudar: (f: (e: EstadoDoApp) => EstadoDoApp) => void;
  quem: EntregadorDaCasa;
  aoVoltar: () => void;
}) {
  const cargas = cargaDeCadaUm(estado);
  const carga = cargas.get(quem.nome) ?? 0;
  const rota = rotaDe(estado, quem.nome);
  const auxilio = auxilioDoComeco(estado, quem.nome);
  const naRua = ofertasEmAndamento(estado).filter(
    o => (o.entregador ?? "Você") === quem.nome
  );

  /*
   * O MAIS URGENTE EM CIMA. Sao quase sempre os mesmos da ordem de chegada —
   * mas nao quando um pedido curto entra depois de um longo. Ordenar pelo que
   * sobra de prazo poe na frente o que esta prestes a virar reclamacao.
   */
  const abertas = ofertasAbertas(estado)
    .slice()
    .sort((a, b) => segundosQueSobram(estado, a) - segundosQueSobram(estado, b));

  /** Quem foi escolhido na tela anterior é o nome que vai no pedido. */
  const nomeNoPedido = quem.id === "voce" ? undefined : quem.nome;

  return (
    <section className="xbw-decisao">
      <header className="xbw-decisao__topo">
        <button
          type="button"
          className="xbw-decisao__voltar"
          onClick={aoVoltar}
          aria-label="Trocar de entregador"
        >
          ‹
        </button>
        <span className="xbw-decisao__quem">
          {quem.foto ? (
            <img src={quem.foto} alt="" draggable={false} />
          ) : (
            <i aria-hidden="true">{quem.nome.slice(0, 1)}</i>
          )}
        </span>
        <span className="xbw-decisao__onde">
          <strong>{quem.nome}</strong>
          <small>
            {carga === 0
              ? `em ${nomeDe(rota.em)}`
              : `${carga} na bolsa · ${kmQueFalta(rota)} km pela frente`}
          </small>
        </span>
      </header>

      {auxilio && (
        <p className="xbw-decisao__dica">
          Pegar {auxilio.pedidos[0]} e {auxilio.pedidos[1]} juntas anda{" "}
          <b>{auxilio.kmJuntas} km</b>. Uma de cada vez,{" "}
          <b>{auxilio.kmSeparadas} km</b>.
        </p>
      )}

      {abertas.length === 0 && (
        <div className="xbw-decisao__vazia">
          <p className="xbw-decisao__espera">Sem pedido agora</p>
          <p className="xbw-decisao__espera-a">
            O bairro chama sozinho. Quando entrar, aparece aqui.
          </p>
        </div>
      )}

      {abertas.map(o => (
        <Pedido
          key={o.id}
          o={o}
          estado={estado}
          carga={carga}
          aoAceitar={() => mudar(e => aceitarOferta(e, o.id, nomeNoPedido))}
          aoRecusar={() => mudar(e => recusarOferta(e, o.id))}
        />
      ))}

      {naRua.length > 0 && (
        <p className="xbw-decisao__rodape">
          {naRua.map(o => `${o.id} ${nomeDe(o.entrega)}`).join(" · ")}
        </p>
      )}
    </section>
  );
}

function Pedido({
  o,
  estado,
  carga,
  aoAceitar,
  aoRecusar,
}: {
  o: OfertaDeEntrega;
  estado: EstadoDoApp;
  carga: number;
  aoAceitar: () => void;
  aoRecusar: () => void;
}) {
  const faixa = faixaDaOferta(estado, o);
  const sobra = segundosQueSobram(estado, o);
  const cheio = relogioConsumido(estado, o);
  const cor = corDoPino(estado, o);

  return (
    <article className="xbw-cartao">
      <div className="xbw-cartao__relogio">
        <span style={{ width: `${cheio}%`, background: cor }} />
      </div>

      <p className="xbw-cartao__topo">
        <span
          className="xbw-cartao__bolinha"
          style={{ background: cor }}
          aria-hidden="true"
        />
        {o.id}
        <b style={{ color: faixa.cor }}>
          {sobra > 0 ? `${sobra}s` : `${Math.abs(sobra)}s atrasado`}
        </b>
      </p>

      <p className="xbw-cartao__rota">
        <strong>{nomeDe(o.coleta)}</strong>
        <span aria-hidden="true"> → </span>
        <strong>{nomeDe(o.entrega)}</strong>
      </p>

      <p className="xbw-cartao__linha">
        <b className="xbw-cartao__valor">{emReais(o.frete)}</b>
        <span>
          {o.kmEntrega.toFixed(1)} km · {o.volumes}v · {o.peso.toFixed(1)} kg
        </span>
      </p>

      <div className="xbw-cartao__botoes">
        <button
          type="button"
          className="xbw-cartao__bt xbw-cartao__bt--nao"
          onClick={aoRecusar}
        >
          Recusar
        </button>
        <button
          type="button"
          className="xbw-cartao__bt xbw-cartao__bt--sim"
          onClick={aoAceitar}
        >
          Aceitar
          {carga > 0 && <small>já leva {carga}</small>}
        </button>
      </div>
    </article>
  );
}
