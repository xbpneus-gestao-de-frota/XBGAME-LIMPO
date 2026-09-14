/**
 * XBWAPP — o aplicativo de mensagens do jogo, inteiro.
 *
 * Ordem dele, 07/09/2026: "sua funcao sera criar o app apenas, completo, com
 * funcoes loja, tudo que o whats app tem". E, sobre o peso da conversa no jogo:
 * "mexe em tudo".
 *
 * ── AS ABAS SAO AS DE VERDADE ─────────────────────────────────────────────
 *
 * Ordem dele, mais tarde no mesmo dia: "ICONES DE CONVERSAS, RECADOS, LOJA,
 * CHAMADAS, AJUSTES, ISTO NÃO E O QUE EXISTE DE FATO NO WHATS APP REAL, QUERO O
 * QUE REALMENTE EXISTE".
 *
 * Entao a barra de baixo e a do WhatsApp Business, com as quatro que ele tem:
 *
 *   CONVERSAS · ATUALIZAÇÕES · LIGAÇÕES · FERRAMENTAS
 *
 * O que era aba e nao existe la mudou de casa, nao sumiu: os RECADOS viraram a
 * parte de Status dentro de Atualizacoes; a LOJA virou o Catalogo dentro de
 * Ferramentas; e AJUSTES virou Configuracoes, tambem dentro de Ferramentas.
 *
 * ── O QUE ESTE ARQUIVO E, E O QUE ELE NAO E ───────────────────────────────
 *
 * Ele e a CASCA: as abas de baixo, qual tela esta na frente, e o estado que
 * todas compartilham. Ele nao sabe conversar, nao sabe vender e nao sabe
 * calcular frete — isso mora nas regras, e as telas so leem de la.
 *
 * A casca ser burra e o que permite trocar uma tela inteira sem medo.
 *
 * ── UMA TELA POR VEZ, PORQUE O ALVO E CELULAR ─────────────────────────────
 *
 * Nada de duas colunas: o jogo e de celular, e no celular o aplicativo de
 * mensagem e uma pilha de telas com um botao de voltar. Numa tela larga ele
 * aparece na coluna do tamanho de tablet, centralizada — a mesma regra que vale
 * para o resto do jogo.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  estadoInicial,
  receber,
  totalNaoLidas,
  recadosNaoVistos,
} from "@/game/xbwapp/estado";
import type { EstadoDoApp } from "@/game/xbwapp/estado";
import type { IdContato, Mensagem, TipoDeChamada } from "@/game/xbwapp/tipos";
import {
  atenderChamada,
  desligar,
  perderChamada,
  receberChamada,
  recusarChamada,
  tocouDemais,
} from "@/game/xbwapp/chamadas";
import { AVISO_NA_TELA_MS, deveAvisar } from "@/game/xbwapp/avisos";
import { varrerTemporarias } from "@/game/xbwapp/ajustes";
import BarraDoCelular from "./BarraDoCelular";
import TelaParaOsPais from "./TelaParaOsPais";
import { Contador, Icone } from "./pecas";
import TelaConversas from "./TelaConversas";
import TelaConversa from "./TelaConversa";
import TelaAtualizacoes from "./TelaAtualizacoes";
import TelaCanal from "./TelaCanal";
import TelaChamadas from "./TelaChamadas";
import TelaFerramentas, { type Ferramenta } from "./TelaFerramentas";
import TelaPerfilComercial from "./TelaPerfilComercial";
import TelaAnuncios from "./TelaAnuncios";
import TelaGuiaDeNegocios from "./TelaGuiaDeNegocios";
import TelaCobrancas from "./TelaCobrancas";
import TelaAutomaticas from "./TelaAutomaticas";
import TelaRespostasRapidas from "./TelaRespostasRapidas";
import TelaEtiquetas from "./TelaEtiquetas";
import TelaEstatisticas from "./TelaEstatisticas";
import TelaLoja from "./TelaLoja";
import TelaAjustes from "./TelaAjustes";
import TelaContatos from "./TelaContatos";
import TelaChamada from "./TelaChamada";
import ChamadaChegando from "./ChamadaChegando";
import FaixaDeAviso from "./FaixaDeAviso";
import {
  TelaEntregaRapida,
  type EntregadorDaCasa,
} from "./TelaEntregaRapida";
import { ofertasAbertas } from "@/game/xbwapp/entregaRapida";
import {
  NO_AR,
  abaValida,
  type NomeDaAba,
} from "@/game/xbwapp/asAbasDoApp";

/*
 * NADA DE MENSAGEM AUTOMATICA. Ordem dele, 07/09/2026: "SEM MENSAGENS
 * AUTOMATICAS, JA SOLICITEI ISSO VARIAS VEZES".
 *
 * O aplicativo abre vazio: so aparece o que alguem escreveu de verdade. A UNICA
 * excecao e a conversa que o JOGO manda abrir (`conversaInicial`) — a abertura,
 * cujas falas sao dele, escritas por ele.
 */

/*
 * O TIPO DA ABA E A LISTA MORAM EM `asAbasDoApp`.
 *
 * Foi para la quando ele pediu para tirar tres abas do ar: o que decide
 * quais aparecem e o interruptor de la, e o desenho de cada uma passou a
 * seguir o NOME, e nao a posicao na barra.
 */
type Aba = NomeDaAba;

export default function XBWApp({
  aoFechar,
  entregador,
  conversaInicial,
  aoLigar,
  estadoInicialDoJogo,
  aoMudarEstado,
  chamadaChegando,
  mensagemChegando,
  aoAtenderChamada,
  aoPerderChamada,
  comSom = true,
  cenaLigada = true,
  equipe = [],
  abaInicial,
}: {
  aoFechar: () => void;
  entregador?: { nome: string; foto?: string };
  /** O jogo pode abrir o aplicativo ja dentro de uma conversa. */
  conversaInicial?: IdContato;
  aoLigar?: (contato: IdContato, tipo: "voz" | "video") => void;
  /** O jogo pode entregar um estado ja comecado (um save, por exemplo). */
  estadoInicialDoJogo?: EstadoDoApp;
  /** O jogo escuta o estado para saber prazo, gorjeta e reputacao. */
  aoMudarEstado?: (estado: EstadoDoApp) => void;
  /*
   * ── O TELEFONE TOCANDO, E A EMENDA DA CENA ───────────────────────────────
   *
   * Ordem dele, 07/09/2026: "SOMENTE ALGUNS CASOS QUE VEREMOS REALMENTE UMA
   * CUTCINE AO ATENDER LIGAÇÃO DE VIDEO, MAS TUDO SERA PROGRAMADO PRA ISSO".
   *
   * O JOGO manda a chamada chegar, com o nome da cena quando houver. O
   * aplicativo toca, mostra quem esta ligando com o nome e o retrato da pessoa,
   * e devolve o que aconteceu. Quem DESENHA a cena e o jogo — o aplicativo
   * nunca toca cena nenhuma. E o mesmo tipo de emenda da `ponte`: uma porta, e
   * do outro lado o jogo faz o que quiser.
   */
  chamadaChegando?: { contato: IdContato; tipo: TipoDeChamada; cena?: string };
  /**
   * O JOGO faz alguem mandar mensagem. E a mesma porta da chamada: o jogo
   * entrega, o aplicativo mostra a faixa com o nome e o retrato da pessoa.
   */
  mensagemChegando?: { conversa: IdContato; texto: string };
  /** Atendeu. Se vier `cena`, e a hora de o jogo tocar a cena. */
  aoAtenderChamada?: (
    contato: IdContato,
    tipo: TipoDeChamada,
    cena?: string
  ) => void;
  /** Recusou, ou deixou tocar ate perder. */
  aoPerderChamada?: (contato: IdContato, tipo: TipoDeChamada) => void;
  /*
   * O interruptor de som do JOGO, so de passagem: o aplicativo nao decide se
   * pode fazer barulho, ele apenas leva o recado ate o telefone que toca.
   */
  comSom?: boolean;
  /*
   * ── A CHAVE DA CENA ──────────────────────────────────────────────────────
   *
   * O jogo pode PAUSAR a conversa escrita enquanto acontece alguma coisa no
   * bairro. Existe por um defeito real: assim que a pessoa respondia "vamos
   * resolver isso", o passo da conversa virava, e o Renan comecava a digitar
   * a fala do bau ANTES de o drone sair do lugar. Ele agradecia por uma
   * caixa que ainda nem tinha decolado.
   *
   * Agora o jogo desliga a conversa quando o drone parte e liga de novo
   * quando a caixa abre — que e o mesmo instante do aviso no alto da tela.
   */
  cenaLigada?: boolean;
  /*
   * QUEM A XB TEM NA RUA — so os nomes e quem esta livre.
   *
   * O balcao de Entrega Rapida precisa saber para quem oferecer o pedido. Ele
   * recebe a lista PRONTA, e nao o jogo inteiro: o aplicativo continua sem
   * conhecer a frota, o caixa nem o mapa.
   */
  equipe?: readonly EntregadorDaCasa[];
  /** O jogo pode abrir o aplicativo direto numa aba — o aviso usa isto. */
  abaInicial?: Aba;
}) {
  const [estado, setEstado] = useState<EstadoDoApp>(
    () => estadoInicialDoJogo ?? estadoInicial()
  );
  /*
   * O jogo pode mandar abrir numa aba que esta fora do ar. `abaValida` devolve
   * a primeira que existe em vez de deixar o aplicativo abrir numa tela que
   * nao esta na barra.
   */
  const [aba, setAba] = useState<Aba>(() => abaValida(abaInicial));
  const [conversa, setConversa] = useState<IdContato | null>(
    conversaInicial ?? null
  );
  const [canal, setCanal] = useState<string | null>(null);
  const [ferramenta, setFerramenta] = useState<Ferramenta | null>(null);
  const [aviso, setAviso] = useState<Mensagem | null>(null);

  const mudar = useCallback((f: (e: EstadoDoApp) => EstadoDoApp) => {
    setEstado(anterior => f(anterior));
  }, []);

  // O jogo precisa saber o que a conversa rendeu — prazo, gorjeta, reputacao.
  useEffect(() => {
    aoMudarEstado?.(estado);
  }, [estado, aoMudarEstado]);

  /*
   * O botao voltar do aparelho fecha UMA camada por vez, de dentro para fora:
   * conversa, canal, ferramenta e so entao o aplicativo. Fechar tudo de uma vez
   * e o jeito mais rapido de a pessoa perder o que estava fazendo.
   */
  useEffect(() => {
    function tecla(ev: KeyboardEvent) {
      if (ev.key !== "Escape") return;
      if (conversa) setConversa(null);
      else if (canal) setCanal(null);
      else if (ferramenta) setFerramenta(null);
      else aoFechar();
    }
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [conversa, canal, ferramenta, aoFechar]);

  const abrir = useCallback((id: IdContato) => {
    setFerramenta(null);
    setCanal(null);
    setConversa(id);
  }, []);

  /*
   * ── O JOGO PODE MANDAR ABRIR UMA CONVERSA A QUALQUER MOMENTO ─────────────
   *
   * `conversaInicial` era lida uma vez so, no instante em que o aplicativo
   * nascia. Bastava para a abertura, onde o aplicativo sempre nasce junto com
   * a ordem. Nao bastava para o aviso do alto da tela: se o aplicativo ja
   * tivesse sido aberto e fechado antes, a ordem chegava com ele ja de pe, e
   * era ignorada — a pessoa tocava no aviso e caia na lista, tendo de
   * procurar a mensagem que o aviso acabara de mostrar.
   *
   * Agora toda ordem vale, e nao so a primeira.
   */
  useEffect(() => {
    if (!conversaInicial) return;
    abrir(conversaInicial);
  }, [conversaInicial, abrir]);

  /*
   * ── O TELEFONE TOCA QUANDO O JOGO MANDA ────────────────────────────────
   *
   * O jogo entrega `chamadaChegando`; o aplicativo bota o telefone para tocar
   * uma vez so. A marca (`jaTocou`) existe porque a mesma chamada continua na
   * propriedade enquanto o jogo nao a tirar — sem a marca, recusar faria ela
   * voltar a tocar no quadro seguinte, para sempre.
   */
  const jaTocou = useRef<string | null>(null);
  useEffect(() => {
    if (!chamadaChegando) {
      jaTocou.current = null;
      return;
    }
    const marca = `${chamadaChegando.contato}-${chamadaChegando.tipo}-${chamadaChegando.cena ?? ""}`;
    if (jaTocou.current === marca) return;
    jaTocou.current = marca;
    mudar(e =>
      receberChamada(
        e,
        chamadaChegando.contato,
        chamadaChegando.tipo,
        Date.now() / 1000,
        chamadaChegando.cena
      )
    );
  }, [chamadaChegando, mudar]);

  /*
   * AS MENSAGENS TEMPORARIAS SOMEM DE VERDADE.
   *
   * A regra ja existia (`varrerTemporarias`) e ninguem chamava — entao "some em
   * 24 horas" era so um texto na tela. Agora, toda vez que o RELOGIO DO JOGO
   * anda, a varredura passa. Se o relogio nao anda, nada some, que e o certo:
   * o tempo do aplicativo e o tempo do jogo.
   */
  const minutoDoJogo = estado.minuto;
  useEffect(() => {
    mudar(e => varrerTemporarias(e));
  }, [minutoDoJogo, mudar]);

  /* A mesma porta, para mensagem: o jogo entrega, o aplicativo recebe uma vez. */
  const ultimaDoJogo = useRef<string | null>(null);
  useEffect(() => {
    if (!mensagemChegando) {
      ultimaDoJogo.current = null;
      return;
    }
    const marca = `${mensagemChegando.conversa}-${mensagemChegando.texto}`;
    if (ultimaDoJogo.current === marca) return;
    ultimaDoJogo.current = marca;
    mudar(e =>
      receber(
        e,
        mensagemChegando.conversa,
        { texto: mensagemChegando.texto },
        true
      )
    );
  }, [mensagemChegando, mudar]);

  /* Tocou tempo demais e ninguem atendeu: vira perdida, e o jogo fica sabendo. */
  const chamando = estado.chamandoAgora;
  useEffect(() => {
    if (!chamando) return;
    const relogio = window.setInterval(() => {
      setEstado(atual => {
        if (!tocouDemais(atual, Date.now() / 1000)) return atual;
        aoPerderChamada?.(chamando.contato, chamando.tipo);
        return perderChamada(atual);
      });
    }, 1000);
    return () => window.clearInterval(relogio);
  }, [chamando, aoPerderChamada]);

  /*
   * ── A FAIXA DE MENSAGEM ────────────────────────────────────────────────
   *
   * Olha a ULTIMA mensagem e decide se ela merece faixa (as regras estao em
   * `avisos.ts`). Guardar o id da ultima vista e o que impede a faixa de voltar
   * a cada vez que qualquer outra coisa do estado mudar.
   */
  const ultimaVista = useRef<string | null>(null);
  useEffect(() => {
    const ultima = estado.mensagens[estado.mensagens.length - 1];
    if (!ultima) return;
    if (ultimaVista.current === ultima.id) return;
    ultimaVista.current = ultima.id;
    if (!deveAvisar(estado, ultima, conversa)) return;
    setAviso(ultima);
  }, [estado, conversa]);

  useEffect(() => {
    if (!aviso) return;
    const relogio = window.setTimeout(() => setAviso(null), AVISO_NA_TELA_MS);
    return () => window.clearTimeout(relogio);
  }, [aviso]);

  /*
   * Atender com a camera desligada entra como chamada de VOZ — e o que o
   * aplicativo de verdade faz quando a pessoa desliga a camera antes de
   * atender. O jogo recebe o tipo certo, e nao o tipo com que ligaram.
   */
  /*
   * ── ATENDER CAI NA CONVERSA, E NAO NUMA TELA DE LIGACAO ──────────────────
   *
   * Ordem dele, 08/09/2026: "atender ligacao deve ir para conversa direto".
   *
   * Antes, atender abria a tela da ligacao em curso — retrato grande, mudo,
   * camera, desligar — e a pessoa ficava ali olhando ate desligar na mao. Mas
   * a conversa com o Renan acontece ESCRITA: a tela da ligacao era um degrau
   * entre atender e o lugar onde a historia continua, e nada acontecia nela.
   *
   * Agora atender registra a ligacao no historico e abre a conversa de quem
   * ligou, no mesmo gesto. A linha "Chamada de video" fica na conversa, como
   * ficaria num telefone de verdade — sem duracao, porque a ligacao nao
   * chegou a correr.
   *
   * A tela da ligacao em curso NAO foi apagada: ela continua valendo para as
   * ligacoes que a propria pessoa faz de dentro do aplicativo, onde ficar na
   * chamada e justamente o ponto.
   */
  function atender(comVideo: boolean) {
    const quem = chamando?.contato;
    setEstado(atual => {
      const feito = atenderChamada(atual, Date.now() / 1000);
      if (!feito.contato || !feito.tipo) return feito.estado;
      const tipo = comVideo ? feito.tipo : "voz";
      aoAtenderChamada?.(feito.contato, tipo, feito.cena);
      const comOTipoCerto = feito.estado.chamadaEmCurso
        ? {
            ...feito.estado,
            chamadaEmCurso: { ...feito.estado.chamadaEmCurso, tipo },
          }
        : feito.estado;
      return desligar(comOTipoCerto, Date.now() / 1000, "recebida");
    });
    if (quem) abrir(quem);
  }

  /* "Mensagem": recusa e leva para a conversa, como no aplicativo de verdade. */
  function responderPorEscrito() {
    const quem = chamando?.contato;
    recusar();
    if (quem) abrir(quem);
  }

  function recusar() {
    if (chamando) aoPerderChamada?.(chamando.contato, chamando.tipo);
    mudar(e => recusarChamada(e));
  }

  const naoLidas = totalNaoLidas(estado);
  const recados = recadosNaoVistos(estado).length;
  /*
   * A FICHA DO ENTREGADOR TAMBEM E "DENTRO DE ALGO".
   *
   * Ordem dele, 14/09/2026: "ao acessar essa tela icones na parte inferior
   * devem sumir". A aba da Equipe tem degraus por dentro — a ficha, as caixas,
   * a portaria, a loja — e a partir do primeiro deles a barra de abas some,
   * como ja acontece na conversa e na ferramenta.
   *
   * Quem avisa e a propria tela da Equipe, porque so ela sabe em que degrau a
   * pessoa esta.
   */
  const [noFundoDaEquipe, setNoFundoDaEquipe] = useState(false);
  const dentroDeAlgo = Boolean(
    conversa || canal || ferramenta || noFundoDaEquipe
  );
  const emLigacao = Boolean(estado.chamadaEmCurso);
  /*
   * Tela cheia quando a pessoa nao esta no meio de nada; faixa fina quando ela
   * esta. E o que o aplicativo de verdade faz, e o motivo e pratico: tomar a
   * tela de quem esta escrevendo faz a pessoa recusar sem querer.
   */
  const toqueMiudo = dentroDeAlgo;

  /* A ligacao correndo toma o aplicativo inteiro, como em qualquer telefone. */
  if (emLigacao) {
    return (
      <div className="xbw" role="dialog" aria-modal="true" aria-label="XBWAPP">
        <TelaChamada
          estado={estado}
          aoDesligar={() =>
            mudar(e => desligar(e, Date.now() / 1000, "recebida"))
          }
        />
      </div>
    );
  }

  /* O telefone tocando, sem nada aberto: tela cheia. */
  if (chamando && !toqueMiudo) {
    return (
      <div className="xbw" role="dialog" aria-modal="true" aria-label="XBWAPP">
        <ChamadaChegando
          chamada={chamando}
          aoAtender={atender}
          aoRecusar={recusar}
          aoResponder={responderPorEscrito}
          comSom={comSom}
        />
      </div>
    );
  }

  return (
    <div
      className={estado.aparencia.tema === "claro" ? "xbw xbw--claro" : "xbw"}
      role="dialog"
      aria-modal="true"
      aria-label="XBWAPP"
    >
      {chamando && (
        <ChamadaChegando
          chamada={chamando}
          miudo
          aoAtender={atender}
          aoRecusar={recusar}
          aoResponder={responderPorEscrito}
          comSom={comSom}
        />
      )}

      {aviso && !chamando && (
        <FaixaDeAviso
          mensagem={aviso}
          aoAbrir={() => {
            abrir(aviso.conversa);
            setAviso(null);
          }}
          aoFechar={() => setAviso(null)}
        />
      )}

      <div className="xbw__tela">
        {conversa ? (
          <TelaConversa
            estado={estado}
            mudar={mudar}
            conversa={conversa}
            aoVoltar={() => setConversa(null)}
            aoLigar={tipo => aoLigar?.(conversa, tipo)}
            roteiroLigado={cenaLigada && conversa === conversaInicial}
          />
        ) : canal ? (
          <TelaCanal
            estado={estado}
            mudar={mudar}
            canal={canal}
            aoVoltar={() => setCanal(null)}
          />
        ) : ferramenta ? (
          <Ferramentas
            qual={ferramenta}
            estado={estado}
            mudar={mudar}
            entregador={entregador}
            aoVoltar={() => setFerramenta(null)}
            aoAbrirConversa={abrir}
          />
        ) : (
          <>
            {aba === "conversas" && (
              <TelaConversas
                estado={estado}
                mudar={mudar}
                aoAbrir={abrir}
                aoVoltarAoJogo={aoFechar}
              />
            )}
            {aba === "contatos" && <TelaContatos aoAbrir={abrir} />}
            {aba === "atualizacoes" && (
              <TelaAtualizacoes
                estado={estado}
                mudar={mudar}
                aoAbrirCanal={setCanal}
              />
            )}
            {aba === "ligacoes" && (
              <TelaChamadas
                estado={estado}
                aoLigar={(c, tipo) => aoLigar?.(c, tipo)}
              />
            )}
            {aba === "ferramentas" && (
              <TelaFerramentas estado={estado} aoAbrir={setFerramenta} />
            )}
            {aba === "entregaRapida" && (
              <TelaEntregaRapida
                estado={estado}
                mudar={mudar}
                equipe={equipe}
                aoMergulhar={setNoFundoDaEquipe}
              />
            )}
            {/*
              PEDIDOS: a mesma tela da Equipe, por outra porta. Escolher alguem
              aqui abre o BALCAO, e nao a ficha. Ver o comentario da `porta` em
              TelaEntregaRapida.
            */}
            {aba === "pedidos" && (
              <TelaEntregaRapida
                estado={estado}
                mudar={mudar}
                equipe={equipe}
                aoMergulhar={setNoFundoDaEquipe}
                porta="pedidos"
              />
            )}
            {aba === "recibo" && (
              <TelaEmBranco
                titulo="Recibo"
                linha="Seus recibos, organizados e sempre à mão."
                forte="Nenhum recibo disponível ainda"
                abaixo="Os recibos emitidos aparecerão aqui."
              />
            )}
          </>
        )}
      </div>

      {!dentroDeAlgo && (
        <nav className="xbw-abas" aria-label="Abas do aplicativo">
          {NO_AR.map(a => (
            <Aba
              key={a.nome}
              nome={a.nome}
              atual={aba}
              rotulo={a.rotulo}
              aviso={
                a.nome === "conversas"
                  ? naoLidas
                  : a.nome === "atualizacoes"
                    ? recados
                    : a.nome === "entregaRapida" || a.nome === "pedidos"
                    ? ofertasAbertas(estado).length
                    : undefined
              }
              aoTocar={setAba}
            />
          ))}
        </nav>
      )}

      {/*
       * O CANTO DE CIMA — EM TODA TELA, SEM EXCECAO.
       *
       * Ordem dele, 12/09/2026: "ACHO QUE TODA TELA DO APP, DEVE MANTER LOGO
       * NA PARTE SUPERIOR DIREITA E BOTAO DE VOLTAR AO GAME".
       *
       * Isto muda a decisao de 08/09, quando a saida ficava so ao lado de
       * "Todos os contatos" com o argumento de que espalhar a saida daria
       * mais jeitos de sair sem querer. O que a analise de hoje mostrou e o
       * contrario: em tela de ferramenta nao ha barra de abas, e quem entrava
       * no Catalogo ou nas Configuracoes nao via saida nenhuma.
       *
       * Fica FORA das telas, no proprio aplicativo: assim vale para as vinte e
       * tantas de uma vez, e nenhuma pode esquecer de ter.
       */}
      <div className="xbw__canto">
        {/*
         * O NOME DO APLICATIVO, no canto de cima.
         *
         * Ordem dele, 13/09/2026: "suba no canto superior XBWAPP". Ele morava
         * numa barra propria em cima da lista de conversas, e essa barra
         * empurrava a placa clara para baixo. Aqui ele divide a faixa com a
         * saida e o selo — e a placa subiu no lugar que sobrou.
         *
         * Fica no aplicativo, e nao em cada tela, porque e o nome do
         * aplicativo: vale para as vinte e tantas de uma vez.
         */}
        <strong className="xbw__nome">
          XBW<em>APP</em>
        </strong>
        <button
          type="button"
          className="xbw__sair"
          onClick={aoFechar}
          aria-label="Voltar ao game"
        >
          {/* O alfinete do mapa, e nao a seta de voltar: a seta ja e o voltar
              DA TELA, e duas setas iguais no mesmo alto confundem. */}
          <Icone nome="local" />
          <span>Voltar ao game</span>
        </button>
        <img
          className="xbw__selo"
          src="/assets/xbwapp/XBW_marca-xb.webp"
          alt="XB"
          aria-hidden="true"
        />

        {/*
         * A BARRA DE CELULAR, na linha de baixo da faixa.
         *
         * Ordem dele, 13/09/2026: "icones de um celular de verdade, bateria,
         * 9G, nivel de sinal, horas real do game, com data real" — e "coloque
         * logo abaixo destas informacoes se necessario". Foi necessario: entre
         * a moeda e o selo nao cabia nada legivel.
         */}
        <BarraDoCelular />
      </div>
    </div>
  );
}

/** Qual ferramenta esta aberta. Cada uma e uma tela inteira, com seu voltar. */
function Ferramentas({
  qual,
  estado,
  mudar,
  entregador,
  aoVoltar,
  aoAbrirConversa,
}: {
  qual: Ferramenta;
  estado: EstadoDoApp;
  mudar: (f: (e: EstadoDoApp) => EstadoDoApp) => void;
  entregador?: { nome: string; foto?: string };
  aoVoltar: () => void;
  aoAbrirConversa: (quem: IdContato) => void;
}) {
  switch (qual) {
    case "perfil":
      return (
        <TelaPerfilComercial
          estado={estado}
          mudar={mudar}
          aoVoltar={aoVoltar}
        />
      );
    case "catalogo":
      return (
        <TelaLoja
          estado={estado}
          mudar={mudar}
          aoAbrirConversa={aoAbrirConversa}
          aoVoltar={aoVoltar}
        />
      );
    case "anuncios":
      return <TelaAnuncios estado={estado} mudar={mudar} aoVoltar={aoVoltar} />;
    case "guia":
      return (
        <TelaGuiaDeNegocios
          estado={estado}
          aoVoltar={aoVoltar}
          aoAbrirConversa={aoAbrirConversa}
        />
      );
    case "cobranca":
      return (
        <TelaCobrancas estado={estado} mudar={mudar} aoVoltar={aoVoltar} />
      );
    case "automaticas":
      return (
        <TelaAutomaticas estado={estado} mudar={mudar} aoVoltar={aoVoltar} />
      );
    case "respostas":
      return (
        <TelaRespostasRapidas
          estado={estado}
          mudar={mudar}
          aoVoltar={aoVoltar}
        />
      );
    case "etiquetas":
      return (
        <TelaEtiquetas
          estado={estado}
          mudar={mudar}
          aoVoltar={aoVoltar}
          aoAbrirConversa={aoAbrirConversa}
        />
      );
    case "estatisticas":
      return <TelaEstatisticas estado={estado} aoVoltar={aoVoltar} />;
    case "pais":
      return <TelaParaOsPais aoVoltar={aoVoltar} />;
    case "ajustes":
      return (
        <TelaAjustes
          estado={estado}
          mudar={mudar}
          entregador={entregador}
          aoVoltar={aoVoltar}
          aoAbrirConversa={aoAbrirConversa}
        />
      );
  }
}

function Aba({
  nome,
  atual,
  rotulo,
  aviso,
  aoTocar,
}: {
  nome: Aba;
  atual: Aba;
  rotulo: string;
  aviso?: number;
  aoTocar: (a: Aba) => void;
}) {
  return (
    <button
      type="button"
      /*
       * O NOME VAI NA TELA. E por ele que o desenho de cada aba e escolhido —
       * antes era pela posicao, e tirar uma aba do meio trocava o desenho de
       * todas as outras sem erro nenhum aparecer.
       */
      data-aba={nome}
      /*
       * "Tem recado esperando?" — o piscar do icone de conversa se pendura
       * aqui. Ordem dele, 13/09/2026: "icone de conversa deve pulsar a cor
       * como se estivesse acendendo e apagando".
       */
      data-chamando={aviso ? "sim" : undefined}
      className={atual === nome ? "xbw-aba xbw-aba--atual" : "xbw-aba"}
      onClick={() => aoTocar(nome)}
      aria-current={atual === nome ? "page" : undefined}
    >
      <span className="xbw-aba__icone">
        {aviso ? <Contador quantas={aviso} /> : null}
      </span>
      <small>{rotulo}</small>
    </button>
  );
}

/*
 * AS DUAS TELAS GUARDADAS.
 *
 * Ele pediu mais dois lugares na barra de baixo, com a tela em branco, para
 * as ligacoes que ainda vao existir. Nao e enfeite: o lugar ja fica reservado
 * com o nome certo, para quem for ligar depois nao ter de mexer na barra.
 *
 * O desenho de cada aba vem do visual, pela ordem em que ela aparece na barra
 * (a quinta e a sexta). Se alguem trocar a ORDEM aqui, o desenho troca junto.
 */
function TelaEmBranco({
  titulo,
  linha,
  forte,
  abaixo,
}: {
  titulo: string;
  linha: string;
  forte: string;
  abaixo: string;
}) {
  return (
    <section className="xbw-vazia">
      <h2 className="xbw-vazia__t">{titulo}</h2>
      <p className="xbw-vazia__l">{linha}</p>
      <div className="xbw-vazia__caixa">
        <p className="xbw-vazia__f">{forte}</p>
        <p className="xbw-vazia__a">{abaixo}</p>
      </div>
    </section>
  );
}
