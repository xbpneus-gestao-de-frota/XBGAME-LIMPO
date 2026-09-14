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
import { useEffect, useState } from "react";
import {
  MAX_BIKE_PART_LEVEL,
  bikePartUpgradeCost,
  type BikePartConfig,
  type BikePartLevels,
} from "@/game/asPecasDaBicicleta";
import {
  CAIXAS_DA_FICHA,
  acessoriosDaCaixa,
  caixaDaFicha,
  faltaNaCaixa,
  oQueEstaMontado,
  oQueEstaNoCorpo,
  oQueMuda,
  oQueMudaNoAcessorio,
  pecasDaCaixa,
  quantoDaCaixa,
  type IdDaCaixa,
} from "@/game/xbwapp/aFicha";
import {
  MAX_NIVEL_DO_ACESSORIO,
  custoDoAcessorio,
  type AcessorioConfig,
  type NiveisDosAcessorios,
} from "@/game/osAcessorios";
import { ponte } from "@/game/xbwapp/ponte";
import {
  FAIXAS_DO_FOLEGO,
  faixaDoFolego,
  folegoDe,
} from "@/game/xbwapp/oFolego";

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
import {
  AINDA_SEM_PRECO,
  LOJA_DA_EQUIPE,
  itemDaLoja,
  type IdDaLoja,
} from "@/game/xbwapp/aLojaDaEquipe";
import Rolagem from "./ARolagem";
import { XBW_ICONES } from "@/game/xbwapp/icones";
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
  /** O desenho de corpo inteiro, sem bicicleta, para a ficha. */
  fotoInteira?: string;
}

/**
 * QUEM APARECE QUANDO NAO HA NINGUEM CONTRATADO.
 *
 * O proprio jogador. Ele tambem tem rota, tambem sai da pizzaria e tambem paga
 * o caminho — entao ele e um entregador como os outros, e a tela nao precisa de
 * um caso especial para o comeco do jogo.
 */
const VOCE: EntregadorDaCasa = { id: "voce", nome: "Você", livre: true };

/*
 * O BOTAO "PEGAR PEDIDO" ESTA DESLIGADO — ordem dele, 13/09/2026: "precisamos
 * reorganizar essa tela, retirar pegar pedido daí".
 *
 * Desligado, e nao apagado: o balcao continua inteiro do outro lado deste
 * interruptor, com a regra de prazo e frete que ja funcionava. Apagar a tela
 * junto com o botao jogaria fora trabalho que so estava no lugar errado —
 * e o lugar certo dele ainda nao foi decidido.
 */
const MOSTRAR_PEGAR_PEDIDO = false;

export function TelaEntregaRapida({
  estado,
  mudar,
  equipe,
  aoMergulhar,
  porta = "equipe",
}: {
  estado: EstadoDoApp;
  mudar: (f: (e: EstadoDoApp) => EstadoDoApp) => void;
  equipe: readonly EntregadorDaCasa[];
  /*
   * AVISA O APLICATIVO QUE A PESSOA DESCEU PARA DENTRO DESTA ABA.
   *
   * Ordem dele, 14/09/2026: "ao acessar essa tela icones na parte inferior
   * devem sumir".
   *
   * Quem esconde a barra de abas e o aplicativo, e nao esta tela — a barra
   * mora la fora, e vale para as vinte e tantas telas de uma vez. Entao a
   * tela nao esconde nada: ela so DIZ onde a pessoa esta, e o aplicativo
   * decide. Esconder daqui seria esta tela mexendo em peca que nao e dela.
   */
  aoMergulhar?: (fundo: boolean) => void;
  /*
   * POR ONDE A PESSOA ENTROU.
   *
   * Ordem dele, 14/09/2026: "adicionando icone que liga a tela de pedidos".
   *
   * A aba nova NAO e uma tela nova: e a mesma, com outra porta. Pela Equipe,
   * escolher alguem abre a FICHA dele; pelos Pedidos, escolher alguem abre o
   * BALCAO — que e a tela que ja existia e que so se alcancava por dentro da
   * ficha.
   *
   * Duplicar a tela para a aba nova teria custado duas listas de equipe para
   * manter, e no dia em que uma mudasse a outra ficaria para tras.
   */
  porta?: "equipe" | "pedidos";
}) {
  /*
   * ONDE A PESSOA ESTA, dentro desta tela.
   *
   * Ordem dele, 12/09/2026: "ao clicar no cartao abre uma tela, onde mostra
   * imagem de entregador, com caixas que te falei, depois clicando nessas
   * caixas chegamos ate caixas finais para upar entregador".
   *
   * Sao tres degraus: a lista de quem tem, a ficha de um, e uma caixa da
   * ficha. O balcao de pedidos vira um quarto caminho, que sai da ficha —
   * hoje desligado pelo interruptor la de cima.
   *
   * A BICICLETA GANHOU UMA PORTARIA. Ordem dele, 13/09/2026: "ao clicar em
   * bicicleta devemos ter duas caixas apenas loja, upgrade". Melhorar o que ja
   * se tem e comprar outra coisa sao duas conversas diferentes, e misturar as
   * duas na mesma lista faria a pessoa comprar quando queria consertar. As
   * outras caixas da ficha (mochila, acessorios) seguem indo direto ao ponto:
   * nelas nao ha o que comprar, so o que melhorar.
   *
   * Guardar o NOME e nao o objeto e de proposito: a equipe e remontada a cada
   * entrega que sai, e um objeto guardado aqui ficaria velho — a pessoa
   * ficaria olhando uma ficha que diz "livre" para quem ja saiu.
   */
  const [onde, setOnde] = useState<
    | { tela: "escolha" }
    | { tela: "ficha"; nome: string }
    | { tela: "caixa"; nome: string; caixa: IdDaCaixa }
    | { tela: "portaria"; nome: string }
    | { tela: "loja"; nome: string }
    | { tela: "lojaItem"; nome: string; item: IdDaLoja }
    | { tela: "ajustes"; nome: string }
    | { tela: "balcao"; nome: string }
  >({ tela: "escolha" });

  /*
   * A lista de quem vai e a superficie; tudo o mais e fundo. O aviso sai daqui
   * e nao de cada degrau porque a resposta e sempre a mesma: fora da lista, a
   * barra some.
   *
   * A limpeza devolve o aplicativo ao normal quando a pessoa troca de aba com a
   * ficha aberta — sem ela, a barra sumiria e nao voltaria mais.
   */
  const noFundo = onde.tela !== "escolha";
  useEffect(() => {
    aoMergulhar?.(noFundo);
    return () => aoMergulhar?.(false);
  }, [noFundo, aoMergulhar]);

  const gente = equipe.length > 0 ? equipe : [VOCE];
  const quem =
    onde.tela === "escolha" ? undefined : gente.find(e => e.nome === onde.nome);

  if (!quem) {
    return (
      <Escolha
        estado={estado}
        gente={gente}
        porta={porta}
        aoEscolher={nome =>
          setOnde({ tela: porta === "pedidos" ? "balcao" : "ficha", nome })
        }
      />
    );
  }

  if (onde.tela === "caixa") {
    return (
      <Caixa
        quem={quem}
        caixa={onde.caixa}
        aoVoltar={() =>
          setOnde(
            onde.caixa === "bicicleta"
              ? { tela: "portaria", nome: quem.nome }
              : { tela: "ficha", nome: quem.nome }
          )
        }
      />
    );
  }

  if (onde.tela === "portaria") {
    return (
      <Portaria
        quem={quem}
        aoVoltar={() => setOnde({ tela: "ficha", nome: quem.nome })}
        aoLoja={() => setOnde({ tela: "loja", nome: quem.nome })}
        aoUpgrade={() =>
          setOnde({ tela: "caixa", nome: quem.nome, caixa: "bicicleta" })
        }
      />
    );
  }

  if (onde.tela === "loja") {
    return (
      <Loja
        aoVoltar={() => setOnde({ tela: "portaria", nome: quem.nome })}
        aoAbrir={item => setOnde({ tela: "lojaItem", nome: quem.nome, item })}
      />
    );
  }

  if (onde.tela === "lojaItem") {
    return (
      <PrateleiraDoItem
        item={onde.item}
        aoVoltar={() => setOnde({ tela: "loja", nome: quem.nome })}
      />
    );
  }

  if (onde.tela === "ajustes") {
    return (
      <AjustesDoEntregador
        quem={quem}
        aoVoltar={() => setOnde({ tela: "ficha", nome: quem.nome })}
      />
    );
  }

  if (onde.tela === "ficha") {
    return (
      <Ficha
        quem={quem}
        aoVoltar={() => setOnde({ tela: "escolha" })}
        aoAbrirCaixa={caixa =>
          setOnde(
            caixa === "bicicleta"
              ? { tela: "portaria", nome: quem.nome }
              : { tela: "caixa", nome: quem.nome, caixa }
          )
        }
        aoAjustar={() => setOnde({ tela: "ajustes", nome: quem.nome })}
        aoPegarPedido={() => setOnde({ tela: "balcao", nome: quem.nome })}
      />
    );
  }

  return (
    <Balcao
      estado={estado}
      mudar={mudar}
      quem={quem}
      aoVoltar={() =>
        setOnde(
          porta === "pedidos"
            ? { tela: "escolha" }
            : { tela: "ficha", nome: quem.nome }
        )
      }
    />
  );
}

/* ── A PRIMEIRA TELA: QUEM VAI ─────────────────────────────────────────── */

function Escolha({
  estado,
  gente,
  porta,
  aoEscolher,
}: {
  estado: EstadoDoApp;
  gente: readonly EntregadorDaCasa[];
  porta: "equipe" | "pedidos";
  aoEscolher: (nome: string) => void;
}) {
  const cargas = cargaDeCadaUm(estado);
  const abertas = ofertasAbertas(estado).length;
  const pedidos = porta === "pedidos";

  return (
    <section className="xbw-equipe">
      <header className="xbw-equipe__topo">
        {/*
          A MESMA LISTA COM DUAS PERGUNTAS.
          Pela Equipe, a pergunta e "quem e essa gente?" e o toque abre a ficha.
          Pelos Pedidos, e "quem vai pegar?" e o toque abre o balcao. A lista e
          uma so; muda o titulo, que e o que diz para que ela serve agora.
        */}
        <h2>{pedidos ? "Pedidos" : "Equipe"}</h2>
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
                <Folego quanto={folegoDe(estado.folego, e.nome)} />
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

/**
 * O FOLEGO DE CADA UM, na tela onde se escolhe quem vai.
 *
 * Ordem dele, 12/09/2026: "cada corrida quanto desgasta".
 *
 * Fica AQUI, e nao numa tela de saude propria, porque e aqui que a pergunta
 * acontece: "quem pega esse pedido?". Uma barra escondida numa tela que
 * ninguem abre no meio do trabalho nao muda escolha nenhuma — e escolha e o
 * unico motivo de o folego existir.
 *
 * A palavra aparece junto da barra de proposito. Barra sozinha obriga a
 * decorar o que e cheio e o que e vazio; a palavra diz na hora, e quem joga
 * sem enxergar cor le do mesmo jeito.
 */
function Folego({ quanto }: { quanto: number }) {
  const faixa = faixaDoFolego(quanto);
  const nome = FAIXAS_DO_FOLEGO.find(f => f.chave === faixa)?.nome ?? "";
  return (
    <span
      className="xbw-folego"
      data-faixa={faixa}
      title={`Fôlego: ${nome}`}
    >
      <i aria-hidden="true">
        <b style={{ width: `${Math.round(quanto)}%` }} />
      </i>
      <em>{nome}</em>
    </span>
  );
}

/* ── A FICHA: A PESSOA, E O QUE DA PARA MELHORAR NELA ──────────────────── */

/**
 * A FICHA DO ENTREGADOR.
 *
 * Ordem dele, 12/09/2026: "ao clicar no cartao abre uma tela, onde mostra
 * imagem de entregador, sem a bicicleta, e abaixo caixas onde teremos caixa
 * da bicicleta, mochila, acessorios".
 *
 * ── POR QUE O DESENHO OCUPA METADE DA TELA ────────────────────────────────
 *
 * Porque a ficha nao existe para informar: existe para dar vontade. Quem
 * chega aqui ja sabe o nome e ja viu a barra de folego na lista. O que esta
 * tela acrescenta e a pessoa — de corpo inteiro, com a mochila que ele vai
 * melhorar logo abaixo. Um retrato pequeno no canto faria a tela virar um
 * formulario com foto, e formulario ninguem tem vontade de abrir duas vezes.
 *
 * ── E POR QUE O BOTAO DE PEGAR PEDIDO CONTINUA AQUI ───────────────────────
 *
 * Antes, clicar no cartao ia direto para os pedidos. Agora vai para a ficha —
 * entao o caminho do trabalho ganhou um toque. Ele fica em baixo, grande e
 * sozinho, para que esse toque custe o menos possivel: a mao ja esta ali.
 */
function Ficha({
  quem,
  aoVoltar,
  aoAbrirCaixa,
  aoAjustar,
  aoPegarPedido,
}: {
  quem: EntregadorDaCasa;
  aoVoltar: () => void;
  aoAbrirCaixa: (caixa: IdDaCaixa) => void;
  aoAjustar: () => void;
  aoPegarPedido: () => void;
}) {
  const niveis = ponte().pecasDaBicicleta();
  const dosAcessorios = ponte().acessorios();

  return (
    <section className="xbw-cracha" aria-label={`Ficha de ${quem.nome}`}>
      {/*
        A UNICA SAIDA DA TELA.
        Ela ficava presa na faixa do nome, que saiu; e a barra de abas, que era
        a outra saida, some nesta tela. Sem este botao a pessoa entra na ficha e
        nao volta mais — sai so fechando o aplicativo inteiro.
      */}
      <button
        type="button"
        className="xbw-volta"
        onClick={aoVoltar}
        aria-label="Voltar para a equipe"
      >
        ‹
      </button>

      {/*
        ELE VIRA BOTAO — ordem dele, 14/09/2026: "renan tambem vira botao, ao
        tocar em renan abrir nova tela para configuracao futura".

        O desenho ja era a maior coisa da tela; agora ele TEM funcao, e o alvo
        de toque e do tamanho dele. E o contrario do caminho comum, em que a
        pessoa procura um botaozinho de engrenagem num canto.
      */}
      <button
        type="button"
        className="xbw-cracha__pessoa"
        onClick={aoAjustar}
        aria-label={`Abrir os ajustes de ${quem.nome}`}
      >
        {quem.fotoInteira ? (
          <img src={quem.fotoInteira} alt="" draggable={false} />
        ) : quem.foto ? (
          <img
            className="xbw-cracha__so-rosto"
            src={quem.foto}
            alt=""
            draggable={false}
          />
        ) : (
          <i aria-hidden="true">{quem.nome.slice(0, 1)}</i>
        )}
      </button>

      {/*
        AS TRES CAIXAS DESENHADAS POR ELE.

        O nome e a frase de cada uma estao PINTADOS dentro do desenho. Entao
        aqui nao se escreve nenhum dos dois por cima: escrever de novo poria
        duas vezes a mesma palavra na tela, uma na arte e outra no texto.

        O que fica escrito e o que o desenho NAO sabe: quanto falta melhorar.
        Esse numero muda a cada peca comprada, e um desenho nao muda.

        Quem nao enxerga a tela recebe tudo pelo rotulo do botao — a arte,
        sozinha, nao fala.
      */}
      <ul className="xbw-cracha__caixas">
        {CAIXAS_DA_FICHA.map(c => {
          const vazia = c.pecas.length === 0 && c.acessorios.length === 0;
          const quanto = quantoDaCaixa(c.id, niveis, dosAcessorios);
          const falta = faltaNaCaixa(c.id, niveis, dosAcessorios);
          const estado = vazia
            ? "vazio"
            : falta === 0
              ? "no máximo"
              : `${falta} para melhorar`;
          return (
            <li key={c.id}>
              <button
                type="button"
                className="xbw-caixona"
                onClick={() => aoAbrirCaixa(c.id)}
                disabled={vazia}
                data-vazia={vazia ? "sim" : undefined}
                aria-label={`${c.nome}: ${c.sobre}. ${estado}.`}
              >
                <img src={c.desenho} alt="" draggable={false} />
                <i aria-hidden="true">
                  <b style={{ width: `${Math.round(quanto * 100)}%` }} />
                </i>
                <em aria-hidden="true">{estado}</em>
              </button>
            </li>
          );
        })}
      </ul>

      {MOSTRAR_PEGAR_PEDIDO && (
        <button
          type="button"
          className="xbw-cracha__pegar"
          onClick={aoPegarPedido}
        >
          Pegar pedido
        </button>
      )}
    </section>
  );
}

/* ── OS AJUSTES DO ENTREGADOR: A TELA QUE ABRE NELE ────────────────────── */

/**
 * A TELA QUE ABRE AO TOCAR NO ENTREGADOR.
 *
 * Ordem dele, 14/09/2026: "ao tocar em renan abrir nova tela para configuracao
 * futura".
 *
 * ── POR QUE ELA ESTA VAZIA, E DIZ QUE ESTA ────────────────────────────────
 *
 * Porque ele pediu o CAMINHO, e nao o conteudo — o conteudo ainda vai ser
 * decidido. Entao a tela existe, abre, volta, e diz em palavras claras que
 * ainda nao ha o que ajustar aqui.
 *
 * Inventar tres controles de mentira para "nao parecer vazia" seria pior de
 * duas maneiras: quem joga mexeria em coisa que nao faz nada, e no dia em que
 * o ajuste de verdade chegasse ele teria de brigar com o lugar ja ocupado por
 * um enfeite.
 */
function AjustesDoEntregador({
  quem,
  aoVoltar,
}: {
  quem: EntregadorDaCasa;
  aoVoltar: () => void;
}) {
  return (
    <section className="xbw-ajustes-do-entregador">
      <header className="xbw-decisao__topo">
        <button
          type="button"
          className="xbw-decisao__voltar"
          onClick={aoVoltar}
          aria-label="Voltar para a ficha"
        >
          ‹
        </button>
        <strong>{quem.nome}</strong>
      </header>

      <div className="xbw-vazia">
        <p className="xbw-vazia__l">
          Aqui vão ficar os ajustes de {quem.nome}.
        </p>
        <div className="xbw-vazia__caixa">
          <p className="xbw-vazia__f">Ainda não há nada para ajustar</p>
          <p className="xbw-vazia__a">
            Esta tela foi aberta agora e espera o que vai morar dentro dela.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ── A PORTARIA DA BICICLETA: CONSERTAR OU TROCAR ──────────────────────── */

/**
 * DUAS CAIXAS, E SO DUAS — AGORA DESENHADAS POR ELE.
 *
 * Ordem dele, 13/09/2026: "ao clicar em bicicleta devemos ter duas caixas
 * apenas loja, upgrade". E em 14/09/2026, com os dois desenhos na mao: "ao
 * clicar em bicicleta devemos ter uma tela nesse formato seguinte, sem renan e
 * duas caixas no lugar como botoes".
 *
 * As duas respondem perguntas diferentes: "melhorar o que ele ja tem" e
 * "trocar o que ele anda". Juntas numa lista so, a pessoa comparava preco de
 * pneu com preco de bicicleta nova — e comprava errado achando que melhorava.
 *
 * ── A TELA E IRMA DA FICHA, E ISSO E DE PROPOSITO ─────────────────────────
 *
 * Mesmo jeito: sem faixa de nome, sem barra de abas, a seta de voltar
 * flutuando, e o desenho dele ocupando a tela. Quem chega aqui veio de um
 * toque na caixa da bicicleta — se a tela mudasse de familia no meio do
 * caminho, a pessoa sentiria que saiu do aplicativo.
 *
 * O nome e a frase de cada caixa estao PINTADOS no desenho, inclusive a linha
 * de baixo ("Trocar o que ele anda", "Equipar, cuidar e revisar"). Entao a
 * tela nao escreve nada por cima: quem nao enxerga recebe tudo pelo rotulo do
 * botao.
 */
function Portaria({
  quem,
  aoVoltar,
  aoLoja,
  aoUpgrade,
}: {
  quem: EntregadorDaCasa;
  aoVoltar: () => void;
  aoLoja: () => void;
  aoUpgrade: () => void;
}) {
  return (
    <section className="xbw-portaria" aria-label={`Bicicleta de ${quem.nome}`}>
      <button
        type="button"
        className="xbw-volta"
        onClick={aoVoltar}
        aria-label="Voltar para a ficha"
      >
        ‹
      </button>

      <ul className="xbw-portaria__caixas">
        <li>
          <button
            type="button"
            className="xbw-caixona xbw-caixona--dupla"
            onClick={aoLoja}
            aria-label="Loja: bicicletas, patins, skates e patinetes. Trocar o que ele anda."
          >
            <img
              src={XBW_ICONES.portariaLoja}
              alt=""
              draggable={false}
            />
          </button>
        </li>
        <li>
          <button
            type="button"
            className="xbw-caixona xbw-caixona--dupla"
            onClick={aoUpgrade}
            aria-label="Acessórios e oficina: capacetes, peças e manutenção. Equipar, cuidar e revisar."
          >
            <img
              src={XBW_ICONES.portariaOficina}
              alt=""
              draggable={false}
            />
          </button>
        </li>
      </ul>
    </section>
  );
}

/* ── A LOJA: SEIS JEITOS DE ANDAR ──────────────────────────────────────── */

/**
 * A PRATELEIRA DE CIMA.
 *
 * Ordem dele, 13/09/2026: "nesta loja teremos bicicleta, patins, triciclo,
 * patinete, caiaque, skate".
 *
 * Os seis vem de `aLojaDaEquipe`, e nao daqui: a forma da loja e decisao de
 * jogo, e decisao de jogo escrita na tela some quando a tela muda.
 */
function Loja({
  aoVoltar,
  aoAbrir,
}: {
  aoVoltar: () => void;
  aoAbrir: (item: IdDaLoja) => void;
}) {
  return (
    <section className="xbw-oficina" aria-label="Loja">
      <header className="xbw-cracha__topo">
        <button
          type="button"
          className="xbw-decisao__voltar"
          onClick={aoVoltar}
          aria-label="Voltar"
        >
          ‹
        </button>
        <span className="xbw-cracha__nome">
          <strong>Loja</strong>
          <small>o que dá para andar</small>
        </span>
      </header>

      <Rolagem rotulo="Itens da loja">
        <ul className="xbw-loja">
          {LOJA_DA_EQUIPE.map(item => (
            <li key={item.id}>
              <button type="button" onClick={() => aoAbrir(item.id)}>
                <span>
                  <strong>{item.nome}</strong>
                  <small>{item.sobre}</small>
                </span>
                <i className="xbw-seta" aria-hidden="true">
                  ›
                </i>
              </button>
            </li>
          ))}
        </ul>
      </Rolagem>
    </section>
  );
}

/* ── A PRATELEIRA DE UM ITEM: OS CINCO DEGRAUS ─────────────────────────── */

/**
 * DO NORMAL AO ELETRICO, CINCO DEGRAUS.
 *
 * Ordem dele, 13/09/2026: "ao clicar em cada item abrir telas ainda vazias mas
 * com veiculos do nv 1 ao 5 da bicicleta normal a eletrica, siga mesmo exemplo
 * para todos".
 *
 * ── POR QUE A TELA DIZ QUE ESTA VAZIA ─────────────────────────────────────
 *
 * Cinco nomes sem preco nenhum parecem uma loja quebrada. Com a frase em cada
 * linha, parecem o que sao: o lugar pronto, esperando os numeros. Quem abrir
 * isto amanha — ele, o outro time, ou eu — entende na hora o que falta.
 */
function PrateleiraDoItem({
  item,
  aoVoltar,
}: {
  item: IdDaLoja;
  aoVoltar: () => void;
}) {
  const dados = itemDaLoja(item);

  return (
    <section className="xbw-oficina" aria-label={dados.nome}>
      <header className="xbw-cracha__topo">
        <button
          type="button"
          className="xbw-decisao__voltar"
          onClick={aoVoltar}
          aria-label="Voltar para a loja"
        >
          ‹
        </button>
        <span className="xbw-cracha__nome">
          <strong>{dados.nome}</strong>
          <small>{dados.sobre}</small>
        </span>
      </header>

      <Rolagem rotulo={`Modelos de ${dados.nome}`}>
        <ul className="xbw-prateleira">
          {dados.degraus.map(degrau => (
            <li key={degrau.nivel}>
              <span className="xbw-prateleira__nivel">{degrau.nivel}</span>
              <span className="xbw-prateleira__miolo">
                <strong>{degrau.nome}</strong>
                <small>{AINDA_SEM_PRECO}</small>
              </span>
            </li>
          ))}
        </ul>
      </Rolagem>
    </section>
  );
}

/* ── A CAIXA: AS PECAS DE UM GRUPO, UMA EMBAIXO DA OUTRA ───────────────── */

/**
 * UMA CAIXA DA FICHA, aberta.
 *
 * Ordem dele, 12/09/2026: "ao clicar em bicicleta deve aparecer outra tela, e
 * ali ter itens para melhorar bicicleta, novos pneus, corrente, banco,
 * freios, cada item melhorado pode aumentar volume de entregas, velocidade,
 * diminuir cansasso dos entregadores".
 *
 * ── OS NUMEROS SAO OS DA GARAGEM, SEM COPIA ──────────────────────────────
 *
 * Preco, nivel e efeito saem de asPecasDaBicicleta — a mesma tabela que a
 * garagem do jogo sempre usou. Se um pneu custa trinta la, custa trinta aqui,
 * hoje e depois de qualquer mudanca. Uma segunda tabela seria mais facil de
 * escrever e viraria mentira na primeira vez que alguem mexesse num preco.
 *
 * ── O APLICATIVO NAO COMPRA ───────────────────────────────────────────────
 *
 * Ele avisa. Quem tira o dinheiro do caixa e sobe a peca e o jogo, pela mesma
 * porta que a garagem usa — inclusive para recusar. Se o aplicativo comprasse
 * por conta propria, existiriam dois jeitos de gastar o mesmo dinheiro, e dois
 * jeitos e como um deles fica desatualizado sem ninguem perceber.
 */
function Caixa({
  quem,
  caixa,
  aoVoltar,
}: {
  quem: EntregadorDaCasa;
  caixa: IdDaCaixa;
  aoVoltar: () => void;
}) {
  /*
   * A COMPRA ACONTECE DO LADO DE LA, e o lado de la nao avisa quando muda.
   * Esta contagem existe so para a tela perguntar de novo depois de cada
   * compra. Sem ela, o nivel e o dinheiro ficariam na tela como estavam antes
   * do toque — e a pessoa apertaria de novo achando que falhou.
   */
  const [compras, setCompras] = useState(0);
  const dados = caixaDaFicha(caixa);
  const niveis = ponte().pecasDaBicicleta();
  const dosAcessorios = ponte().acessorios();
  const dinheiro = ponte().dinheiro();
  const nivelDaEmpresa = ponte().nivelDaEmpresa();

  return (
    <section className="xbw-oficina" key={compras}>
      <header className="xbw-oficina__topo">
        <button
          type="button"
          className="xbw-decisao__voltar"
          onClick={aoVoltar}
          aria-label="Voltar para a ficha"
        >
          ‹
        </button>
        <span className="xbw-oficina__titulo">
          <strong>{dados.nome}</strong>
          <small>
            {quem.nome} · {emReais(dinheiro)} no caixa
          </small>
        </span>
      </header>

      {/*
        * A LISTA ROLA, e a tela nao. Ordem dele, 13/09/2026: "todas telas devem
        * ter rolagem se necessário". Com quatro pecas cabia; com acessorios e
        * telefone pequeno, a ultima ficava escondida atras das abas.
        */}
      <Rolagem rotulo={dados.nome}>
        {pecasDaCaixa(caixa).map(peca => (
          <Peca
            key={peca.id}
            peca={peca}
            niveis={niveis}
            dinheiro={dinheiro}
            nivelDaEmpresa={nivelDaEmpresa}
            aoMelhorar={() => {
              ponte().aconteceu({ o: "melhorar-peca", peca: peca.id });
              setCompras(c => c + 1);
            }}
          />
        ))}

        {acessoriosDaCaixa(caixa).map(item => (
          <Acessorio
            key={item.id}
            item={item}
            niveis={dosAcessorios}
            dinheiro={dinheiro}
            nivelDaEmpresa={nivelDaEmpresa}
            aoMelhorar={() => {
              ponte().aconteceu({ o: "melhorar-acessorio", acessorio: item.id });
              setCompras(c => c + 1);
            }}
          />
        ))}
      </Rolagem>
    </section>
  );
}

/**
 * UMA PECA: o que esta montado, o que vem depois, e quanto custa.
 *
 * Os cinco tracinhos de nivel existem porque "nivel 2 de 5" obriga a ler; os
 * tracinhos se veem de longe, e e assim que a pessoa compara quatro pecas numa
 * tela so sem parar em nenhuma.
 */
function Peca({
  peca,
  niveis,
  dinheiro,
  nivelDaEmpresa,
  aoMelhorar,
}: {
  peca: BikePartConfig;
  niveis: BikePartLevels;
  dinheiro: number;
  nivelDaEmpresa: number;
  aoMelhorar: () => void;
}) {
  const nivel = niveis[peca.id] ?? 0;
  const proximo = peca.tiers.find(t => t.level === nivel + 1);
  const preco = bikePartUpgradeCost(peca.id, nivel);
  const liberada = nivelDaEmpresa >= peca.unlockLevel;
  const noMaximo = nivel >= MAX_BIKE_PART_LEVEL || !proximo || preco === null;
  const temDinheiro = preco !== null && dinheiro >= preco;

  return (
    <article className="xbw-peca" data-liberada={liberada ? "sim" : "nao"}>
      <p className="xbw-peca__topo">
        <strong>{peca.name}</strong>
        <span className="xbw-peca__niveis" aria-label={`Nível ${nivel} de 5`}>
          {Array.from({ length: MAX_BIKE_PART_LEVEL }).map((_, i) => (
            <i key={i} className={i < nivel ? "esta-em" : undefined} />
          ))}
        </span>
      </p>

      <p className="xbw-peca__agora">{oQueEstaMontado(peca, nivel)}</p>

      {!noMaximo && proximo && (
        <>
          <p className="xbw-peca__proximo">{proximo.name}</p>
          <p className="xbw-peca__muda">
            {oQueMuda(proximo).map(f => (
              <span key={f}>{f}</span>
            ))}
          </p>
        </>
      )}

      <button
        type="button"
        className="xbw-peca__bt"
        onClick={aoMelhorar}
        disabled={noMaximo || !liberada || !temDinheiro}
      >
        {noMaximo
          ? "No máximo"
          : !liberada
            ? `Abre no nível ${peca.unlockLevel}`
            : !temDinheiro
              ? `Falta dinheiro · ${emReais(preco ?? 0)}`
              : `Melhorar · ${emReais(preco ?? 0)}`}
      </button>
    </article>
  );
}

/**
 * UM ACESSORIO: o que ele leva no corpo, e o que isso alivia.
 *
 * E o irmao de `Peca`, com o mesmo desenho de propósito — mesmos tracinhos,
 * mesmo botao, mesmo lugar para o preco. Sao coisas diferentes (uma e da
 * bicicleta, a outra e da pessoa) e a tela nao tenta explicar isso duas
 * vezes: quem separa e a caixa em que cada uma mora.
 *
 * A diferenca real e o numero de degraus: tres, e nao cinco. Por isso os
 * tracinhos sao contados a partir do proprio teto do acessorio, e nao de um
 * cinco escrito na mao — se um dia virarem quatro, a tela acompanha sozinha.
 */
function Acessorio({
  item,
  niveis,
  dinheiro,
  nivelDaEmpresa,
  aoMelhorar,
}: {
  item: AcessorioConfig;
  niveis: Readonly<NiveisDosAcessorios>;
  dinheiro: number;
  nivelDaEmpresa: number;
  aoMelhorar: () => void;
}) {
  const nivel = niveis[item.id] ?? 0;
  const proximo = item.tiers.find(t => t.level === nivel + 1);
  const preco = custoDoAcessorio(item.id, nivel);
  const liberado = nivelDaEmpresa >= item.unlockLevel;
  const noMaximo = nivel >= MAX_NIVEL_DO_ACESSORIO || !proximo || preco === null;
  const temDinheiro = preco !== null && dinheiro >= preco;

  return (
    <article className="xbw-peca" data-liberada={liberado ? "sim" : "nao"}>
      <p className="xbw-peca__topo">
        <strong>{item.name}</strong>
        <span
          className="xbw-peca__niveis"
          aria-label={`Nível ${nivel} de ${MAX_NIVEL_DO_ACESSORIO}`}
        >
          {Array.from({ length: MAX_NIVEL_DO_ACESSORIO }).map((_, i) => (
            <i key={i} className={i < nivel ? "esta-em" : undefined} />
          ))}
        </span>
      </p>

      <p className="xbw-peca__agora">{oQueEstaNoCorpo(item, nivel)}</p>

      {!noMaximo && proximo && (
        <>
          <p className="xbw-peca__proximo">{proximo.name}</p>
          <p className="xbw-peca__muda">
            {oQueMudaNoAcessorio(proximo).map(f => (
              <span key={f}>{f}</span>
            ))}
          </p>
        </>
      )}

      <button
        type="button"
        className="xbw-peca__bt"
        onClick={aoMelhorar}
        disabled={noMaximo || !liberado || !temDinheiro}
      >
        {noMaximo
          ? "No máximo"
          : !liberado
            ? `Abre no nível ${item.unlockLevel}`
            : !temDinheiro
              ? `Falta dinheiro · ${emReais(preco ?? 0)}`
              : `Comprar · ${emReais(preco ?? 0)}`}
      </button>
    </article>
  );
}
