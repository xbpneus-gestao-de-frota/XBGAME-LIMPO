/**
 * A TELA DA CHAMADA — voz e video.
 *
 * ── O RELOGIO E CALCULADO, NUNCA GUARDADO ─────────────────────────────────
 *
 * A duracao sai da hora em que a ligacao comecou, e nao de um contador que
 * soma de um em um. Contador que soma atrasa quando a aba vai para segundo
 * plano, e a pessoa volta para uma ligacao de "cinco minutos" que ja tem
 * quinze. A conta pela hora de inicio nunca erra.
 *
 * ── O DESLIGAR E VERMELHO E FICA SOZINHO ──────────────────────────────────
 *
 * E o unico botao da tela que nao tem volta. Botao sem volta nao divide fileira
 * com botao que so muda o som.
 */
import { useEffect, useState } from "react";
import { nomeDe } from "@/game/xbwapp/contatos";
import { duracaoDaChamada, relogioDaChamada } from "@/game/xbwapp/chamadas";
import type { EstadoDoApp } from "@/game/xbwapp/estado";
import { Icone, Retrato } from "./pecas";

export default function TelaChamada({
  estado,
  aoDesligar,
}: {
  estado: EstadoDoApp;
  aoDesligar: (segundos: number) => void;
}) {
  const chamada = estado.chamadaEmCurso;
  const [agora, setAgora] = useState(() => Date.now() / 1000);
  const [semSom, setSemSom] = useState(false);
  const [semCamera, setSemCamera] = useState(false);
  const [altoFalante, setAltoFalante] = useState(false);

  useEffect(() => {
    const passo = window.setInterval(() => setAgora(Date.now() / 1000), 500);
    return () => window.clearInterval(passo);
  }, []);

  if (!chamada) return null;
  const segundos = duracaoDaChamada(estado, agora);

  return (
    <section
      className="xbw-chamada-tela"
      aria-label={`Chamada com ${nomeDe(chamada.contato)}`}
    >
      <div className="xbw-chamada-tela__quem">
        <Retrato quem={chamada.contato} tamanho="grande" />
        <strong>{nomeDe(chamada.contato)}</strong>
        <small>
          {chamada.tipo === "video" ? "Chamada de vídeo" : "Chamada de voz"} ·{" "}
          {relogioDaChamada(segundos)}
        </small>
      </div>

      <div className="xbw-chamada-tela__botoes">
        <BotaoDeChamada
          nome="microfone"
          rotulo={semSom ? "Ligar o microfone" : "Silenciar"}
          ligado={!semSom}
          aoTocar={() => setSemSom(s => !s)}
          texto={semSom ? "Sem som" : "Silenciar"}
        />
        {chamada.tipo === "video" && (
          <BotaoDeChamada
            nome="video"
            rotulo={semCamera ? "Ligar a câmera" : "Desligar a câmera"}
            ligado={!semCamera}
            aoTocar={() => setSemCamera(c => !c)}
            texto={semCamera ? "Sem vídeo" : "Câmera"}
          />
        )}
        <BotaoDeChamada
          nome="telefone"
          rotulo="Alto-falante"
          ligado={altoFalante}
          aoTocar={() => setAltoFalante(a => !a)}
          texto="Alto-falante"
        />
      </div>

      <button
        type="button"
        className="xbw-desligar"
        onClick={() => aoDesligar(segundos)}
        aria-label="Desligar"
      >
        <Icone nome="telefone" />
      </button>
    </section>
  );
}

function BotaoDeChamada({
  nome,
  rotulo,
  texto,
  ligado,
  aoTocar,
}: {
  nome: Parameters<typeof Icone>[0]["nome"];
  rotulo: string;
  texto: string;
  ligado: boolean;
  aoTocar: () => void;
}) {
  return (
    <button
      type="button"
      className={
        ligado
          ? "xbw-chamada-tela__botao"
          : "xbw-chamada-tela__botao xbw-desligado"
      }
      onClick={aoTocar}
      aria-label={rotulo}
      aria-pressed={!ligado}
    >
      <Icone nome={nome} />
      <small>{texto}</small>
    </button>
  );
}

/**
 * A CHAMADA CHEGANDO.
 *
 * Atender e recusar tem que estar longe um do outro: sao os dois botoes que
 * mais se aperta sem olhar, e o preco de errar e alto dos dois lados.
 */
export function ChamadaChegando({
  contato,
  tipo,
  aoAtender,
  aoRecusar,
}: {
  contato: string;
  tipo: "voz" | "video";
  aoAtender: () => void;
  aoRecusar: () => void;
}) {
  return (
    <section
      className="xbw-chamada-tela"
      aria-label={`Chamada de ${nomeDe(contato)}`}
    >
      <div className="xbw-chamada-tela__quem">
        <Retrato quem={contato} tamanho="grande" />
        <strong>{nomeDe(contato)}</strong>
        <small>
          {tipo === "video" ? "Chamada de vídeo…" : "Chamada de voz…"}
        </small>
      </div>
      <div className="xbw-chamada-tela__atender">
        <button
          type="button"
          className="xbw-desligar"
          onClick={aoRecusar}
          aria-label="Recusar"
        >
          <Icone nome="telefone" />
          <small>Recusar</small>
        </button>
        <button
          type="button"
          className="xbw-atender"
          onClick={aoAtender}
          aria-label="Atender"
        >
          <Icone nome="telefone" />
          <small>Atender</small>
        </button>
      </div>
    </section>
  );
}
