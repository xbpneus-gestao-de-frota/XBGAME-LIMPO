/**
 * O TELEFONE TOCANDO — a tela que ELE desenhou.
 *
 * Ele mandou a arte da tela de chamada junto com as folhas de interface, e eu
 * fiz outra por conta propria. Ele cobrou: "PQ VC NÃO UTILIZOU PADRÃO QUE TE
 * ENVIEI?". Esta e a dele, peca por peca, no azul XB:
 *
 *   a marca XBWAPP e o lema em cima
 *   o retrato redondo grande, com o anel aceso em volta
 *   o nome, e embaixo "Ligação de vídeo…"
 *   TRES botoes redondos: Câmera · Silenciar · Mensagem
 *   DOIS botoes grandes: Recusar (vermelho) e Atender (azul XB)
 *   "BOAS PESSOAS / MAIS PRÓXIMAS SEMPRE" no rodape
 *
 * ── OS TRES BOTOES DE CIMA FAZEM COISA DE VERDADE ─────────────────────────
 *
 * "NADA DE PLACEBORD", ordem dele. Entao:
 *
 *   CÂMERA   — desliga a camera ANTES de atender: atender com ela desligada
 *              entra como chamada de voz. So aparece em chamada de video, que
 *              e como o aplicativo de verdade faz.
 *   SILENCIAR— cala o toque. A chamada continua chamando e continua contando
 *              para virar perdida; o que para e o aviso piscando.
 *   MENSAGEM — recusa e abre a conversa para escrever. E o que o WhatsApp faz:
 *              nao dava para falar agora, mas da para responder.
 *
 * ── A FAIXA FINA ──────────────────────────────────────────────────────────
 *
 * Quando a pessoa ja esta no meio de outra coisa, a chamada vira uma faixa fina
 * no alto em vez de tomar a tela. Tomar a tela de quem esta escrevendo e o jeito
 * mais rapido de fazer a pessoa recusar sem querer.
 *
 * A CENA DO VIDEO NAO ACONTECE AQUI: esta tela so avisa que atendeu. Quem toca
 * a cena e o jogo — ver o comentario grande em `chamadas.ts`.
 */
import { useEffect, useRef, useState } from "react";
import { tocarOCelular, type Toque } from "@/game/aChamada";
import { nomeDe } from "@/game/xbwapp/contatos";
import { TOQUES_ATE_PERDER_SEGUNDOS } from "@/game/xbwapp/chamadas";
import type { ChamadaChegando as Chegando } from "@/game/xbwapp/chamadas";
import { XBW_ICONES } from "@/game/xbwapp/icones";
import { Icone, Retrato } from "./pecas";

export default function ChamadaChegando({
  chamada,
  miudo,
  aoAtender,
  aoRecusar,
  aoResponder,
  comSom = true,
}: {
  chamada: Chegando;
  /** Faixa fina em vez de tela cheia — quando a pessoa ja esta em outra coisa. */
  miudo?: boolean;
  /** `comVideo` diz se a camera ficou ligada quando ela atendeu. */
  aoAtender: (comVideo: boolean) => void;
  aoRecusar: () => void;
  /** Recusar e ir escrever. */
  aoResponder: () => void;
  /*
   * O TOQUE. Vem de fora porque quem manda no som e o jogo, e nao esta tela:
   * quem desligou o som no jogo nao pode ser surpreendido por um telefone
   * tocando. Sem ninguem dizer nada, toca — uma ligacao que chega calada nao
   * parece uma ligacao.
   */
  comSom?: boolean;
}) {
  const [segundos, setSegundos] = useState(0);
  const [camera, setCamera] = useState(chamada.tipo === "video");
  const [calado, setCalado] = useState(false);

  useEffect(() => {
    const passo = window.setInterval(() => setSegundos(s => s + 1), 1000);
    return () => window.clearInterval(passo);
  }, [chamada.contato]);

  /*
   * ── O TELEFONE TOCA, E A TELA TREME ──────────────────────────────────────
   *
   * Ordem dele, 08/09/2026: "a tela de ligacao do Renan deve tremer um
   * pouquinho, e deve ter toque".
   *
   * O toque e o mesmo do jogo: dois tons curtos e uma pausa, feitos na hora,
   * sem arquivo de som para baixar. Ele ja respeita o interruptor de som e ja
   * faz o aparelho vibrar quando o aparelho sabe vibrar.
   *
   * Silenciar cala o toque, mas NAO para a chamada nem o relogio dela — e o
   * que um telefone de verdade faz quando se aperta o lado do aparelho.
   *
   * Na faixa fina nao toca: ali a pessoa ja esta no meio de outra coisa, e um
   * toque por cima do que ela esta fazendo e o caminho mais curto para ela
   * recusar so para calar o barulho.
   */
  const toque = useRef<Toque | null>(null);
  useEffect(() => {
    if (miudo || calado) return;
    toque.current = tocarOCelular(comSom);
    return () => {
      toque.current?.parar();
      toque.current = null;
    };
  }, [miudo, calado, comSom, chamada.contato]);

  const oQueE =
    chamada.tipo === "video" ? "Ligação de vídeo" : "Ligação de voz";
  const faltam = Math.max(0, TOQUES_ATE_PERDER_SEGUNDOS - segundos);

  if (miudo) {
    return (
      <div className="xbw-toque-faixa" role="alert">
        <Retrato quem={chamada.contato} tamanho="pequeno" />
        <span>
          <strong>{nomeDe(chamada.contato)}</strong>
          <small>{oQueE}</small>
        </span>
        <button
          type="button"
          className="xbw-toque__recusar"
          onClick={aoRecusar}
          aria-label="Recusar"
        >
          <Icone nome="telefone" />
        </button>
        <button
          type="button"
          className="xbw-toque__atender"
          onClick={() => aoAtender(chamada.tipo === "video")}
          aria-label="Atender"
        >
          <Icone nome={chamada.tipo === "video" ? "video" : "telefone"} />
        </button>
      </div>
    );
  }

  return (
    <section
      className="xbw-toque"
      role="alertdialog"
      aria-label={`${nomeDe(chamada.contato)} está ligando`}
    >
      {/* A marca inteira e desenho dele: o X no balao, o nome e o lema. */}
      <header className="xbw-toque__marca">
        <img
          src={XBW_ICONES.logoMarca}
          alt=""
          aria-hidden="true"
          className="xbw-toque__selo"
          draggable={false}
        />
        <img
          src={XBW_ICONES.logoNome}
          alt="XBWAPP"
          className="xbw-toque__nome"
          draggable={false}
        />
        <small>TALK · CONNECT · BE CLOSER</small>
      </header>

      <div className="xbw-toque__quem">
        {/* O anel aceso e desenho dele; o retrato da pessoa entra por dentro. */}
        <span className="xbw-toque__moldura">
          <Retrato quem={chamada.contato} tamanho="enorme" />
          <img
            src={XBW_ICONES.anelChamada}
            alt=""
            aria-hidden="true"
            className="xbw-toque__aro"
            draggable={false}
          />
        </span>
        <strong>{nomeDe(chamada.contato)}</strong>
        <small>
          {oQueE}
          {calado ? " · silenciada" : "…"}
        </small>
        {!calado && (
          <em className="xbw-toque__pulso">
            chamando{faltam > 0 ? ` · ${faltam}s` : ""}
          </em>
        )}
      </div>

      <div className="xbw-toque__extras">
        {chamada.tipo === "video" && (
          <Redondo
            desenho={XBW_ICONES.btCamera}
            palavra={XBW_ICONES.rotCamera}
            rotulo={camera ? "Desligar a câmera" : "Ligar a câmera"}
            ligado={camera}
            aoTocar={() => setCamera(c => !c)}
          />
        )}
        <Redondo
          desenho={XBW_ICONES.btSilenciar}
          palavra={XBW_ICONES.rotSilenciar}
          rotulo={calado ? "Já está silenciada" : "Silenciar"}
          ligado={!calado}
          aoTocar={() => setCalado(true)}
        />
        <Redondo
          desenho={XBW_ICONES.btMensagem}
          palavra={XBW_ICONES.rotMensagem}
          rotulo="Responder por mensagem"
          ligado
          aoTocar={aoResponder}
        />
      </div>

      <div className="xbw-toque__botoes">
        {/* Os dois botoes grandes sao desenho dele, com a palavra ja dentro. */}
        <button
          type="button"
          className="xbw-toque__grande"
          onClick={aoRecusar}
          aria-label="Recusar"
        >
          <img
            src={XBW_ICONES.recusar}
            alt=""
            aria-hidden="true"
            draggable={false}
          />
          <img
            src={XBW_ICONES.rotRecusar}
            alt="Recusar"
            className="xbw-toque__rotulo"
            draggable={false}
          />
        </button>
        <button
          type="button"
          className="xbw-toque__grande"
          onClick={() => aoAtender(camera && chamada.tipo === "video")}
          aria-label="Atender"
        >
          <img
            src={XBW_ICONES.atender}
            alt=""
            aria-hidden="true"
            draggable={false}
          />
          <img
            src={XBW_ICONES.rotAtender}
            alt="Atender"
            className="xbw-toque__rotulo"
            draggable={false}
          />
        </button>
      </div>

      <p className="xbw-toque__lema">
        BOAS PESSOAS
        <br />
        MAIS PRÓXIMAS SEMPRE
      </p>
    </section>
  );
}

/** Um dos tres botoes redondos: o desenho dele ja traz o nome embaixo. */
function Redondo({
  desenho,
  palavra,
  rotulo,
  ligado,
  aoTocar,
}: {
  desenho: string;
  palavra: string;
  rotulo: string;
  ligado: boolean;
  aoTocar: () => void;
}) {
  return (
    <button
      type="button"
      className={
        ligado ? "xbw-toque__extra" : "xbw-toque__extra xbw-toque__extra--off"
      }
      onClick={aoTocar}
      aria-label={rotulo}
      aria-pressed={!ligado}
    >
      <img src={desenho} alt="" aria-hidden="true" draggable={false} />
      <img
        src={palavra}
        alt=""
        aria-hidden="true"
        className="xbw-toque__rotulo"
        draggable={false}
      />
    </button>
  );
}
