/**
 * A CENA DA CHAMADA — o Renan na tela, e a linha caindo.
 *
 * Ver o porque dos tempos e das falas em `aCenaDaChamada.ts`. Aqui e so o
 * desenho.
 *
 * ── O RETRATO DELE E REDONDO, E A TELA E RETA ─────────────────────────────
 *
 * O unico desenho grande do Renan e recortado em circulo. Esticado para encher
 * a tela, os quatro cantos ficariam vazios. Entao atras dele entra o MESMO
 * desenho, gigante e borrado — que e exatamente o que os aplicativos de video
 * fazem quando a imagem nao tem o formato da tela. Nada de desenho novo.
 *
 * ── A JANELINHA DA PROPRIA CAMERA ─────────────────────────────────────────
 *
 * Fica apagada, escrito que a camera esta desligada. Nao e enfeite: a pessoa
 * deste jogo nao pode sair de casa, e mostrar a propria cara e a primeira coisa
 * que quem esta em casa nao faz. E tambem nao existe desenho dela — inventar um
 * rosto para o jogador seria escolher por ele.
 *
 * ── DESLIGAR FUNCIONA DESDE O PRIMEIRO SEGUNDO ────────────────────────────
 *
 * Mesma regra do filme de abertura. Quem ja viu a cena nao fica preso nela.
 */
import { useEffect, useRef, useState } from "react";
import { GAME_ASSETS } from "@/game/assets";
import { QUEM_LIGA } from "@/game/aChamada";
import {
  CENA_DA_ABERTURA,
  DURACAO_DA_CENA_MS,
  barrasDeSinal,
  falasDaCena,
  legendaAgora,
  momentoDaCena,
  segundosNoAr,
} from "@/game/aCenaDaChamada";

const relogio = (segundos: number) =>
  `${String(Math.floor(segundos / 60)).padStart(2, "0")}:${String(segundos % 60).padStart(2, "0")}`;

/*
 * A MESMA CENA SERVE AS DUAS CHAMADAS.
 *
 * A segunda (a da pizza) e o mesmo desenho, os mesmos tempos e a mesma queda
 * de linha — muda so o que ele tenta dizer. Uma tela por chamada seria duas
 * telas para consertar quando uma coisa quebrasse, e elas ficariam diferentes
 * sem ninguem perceber.
 *
 * Sem dizer qual, vale a da abertura: era a unica quando isto nasceu, e nada
 * que ja chamava esta tela precisou mudar.
 */
export default function CenaDaChamada({
  aoTerminar,
  cena = CENA_DA_ABERTURA,
}: {
  aoTerminar: () => void;
  cena?: string;
}) {
  const [passado, setPassado] = useState(0);
  const comecou = useRef<number>(0);
  const terminou = useRef(false);

  const terminar = () => {
    if (terminou.current) return;
    terminou.current = true;
    aoTerminar();
  };

  useEffect(() => {
    comecou.current = performance.now();
    let quadro = 0;
    const passo = () => {
      const agora = performance.now() - comecou.current;
      setPassado(agora);
      if (agora >= DURACAO_DA_CENA_MS) {
        terminar();
        return;
      }
      quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const momento = momentoDaCena(passado);
  const legenda = legendaAgora(passado, falasDaCena(cena));
  const barras = barrasDeSinal(passado);

  return (
    <div
      className="cena-chamada"
      data-cena={cena}
      data-momento={momento}
      role="dialog"
      aria-modal="true"
      aria-label={`Chamada de vídeo com ${QUEM_LIGA.nome}`}
    >
      <img
        className="cena-chamada__fundo"
        src={GAME_ASSETS.renanRetrato}
        alt=""
        aria-hidden="true"
        draggable={false}
      />
      <img
        className="cena-chamada__rosto"
        src={GAME_ASSETS.renanRetrato}
        alt={`${QUEM_LIGA.nome} na chamada de vídeo`}
        draggable={false}
      />
      <div className="cena-chamada__grao" aria-hidden="true" />

      <header className="cena-chamada__alto">
        <div className="cena-chamada__quem">
          <strong>{QUEM_LIGA.nome}</strong>
          <small>
            {momento === "conectando"
              ? "Conectando…"
              : momento === "caindo"
                ? "Conexão instável…"
                : momento === "fim"
                  ? "Encerrada"
                  : relogio(segundosNoAr(passado))}
          </small>
        </div>
        <span
          className="cena-chamada__sinal"
          data-barras={barras}
          aria-label={`Sinal: ${barras} de 3`}
        >
          <i />
          <i />
          <i />
        </span>
      </header>

      <div className="cena-chamada__eu" aria-hidden="true">
        <i />
        <span>câmera desligada</span>
      </div>

      {legenda ? (
        <p className="cena-chamada__legenda" key={legenda}>
          {legenda}
        </p>
      ) : null}

      {momento === "fim" ? (
        <p className="cena-chamada__fim">Chamada encerrada</p>
      ) : null}

      <button
        type="button"
        className="cena-chamada__desligar"
        onClick={terminar}
        hidden={momento === "fim"}
        autoFocus
      >
        <span aria-hidden="true">✆</span>
        <em>Desligar</em>
      </button>
    </div>
  );
}
