/**
 * A BARRA DO CELULAR — a linha fina de cima de qualquer telefone.
 *
 * Ordem dele, 13/09/2026: "entre XB e botao de voltar ao game, precisamos
 * aplicar icones de um celular de verdade, bateria, 9G, nivel de sinal, horas
 * real do game, com data real" — e, logo depois: "coloque logo abaixo destas
 * informacoes se necessario".
 *
 * ── POR QUE ELA VAI ABAIXO, E NAO NO MEIO DA FAIXA ────────────────────────
 *
 * A faixa de cima ja tem tres moradores: o nome, a moeda de voltar e o selo.
 * O buraco entre a moeda e o selo tem menos de um dedo de largura, e hora,
 * data, sinal, rede e bateria nao cabem ali sem virar sopa de letrinha. Numa
 * linha propria, logo abaixo, cada coisa fica do tamanho que da para ler — e
 * o desenho passa a ser o de um celular de verdade, que tambem separa a barra
 * de status do resto.
 *
 * ── O QUE ELA DIZ, E DE ONDE VEM ──────────────────────────────────────────
 *
 * Hora: do jogo, pela mesma ponte que o resto do aplicativo usa. Data: de
 * verdade, do calendario dele. Sinal: da hora do jogo. Bateria: do relogio da
 * parede — quanto tempo de jogo ja rolou hoje, contra o teto de duas horas.
 * Nada aqui inventa numero proprio.
 *
 * A bateria so anda com o jogo NA FRENTE: aba escondida nao gasta. O contador
 * que faz esse trabalho e do jogo inteiro, e nao desta barra — a barra apenas
 * mostra o que ele ja sabe.
 *
 * Ela nao e botao de nada: nao se clica, nao abre tela. Por isso fica escondida
 * de quem usa leitor de tela, que ja tem a hora dita nas telas que precisam.
 */
import { useEffect, useState } from "react";

import {
  bateriaDoCelular,
  dataDoCelular,
  horaDoCelular,
  sinalDoCelular,
} from "@/game/xbwapp/oCelular";
import {
  minutosDeUsoHoje,
  somarUso,
  tetoDeUso,
} from "@/game/xbwapp/oTempoDeUso";
import { ponte } from "@/game/xbwapp/ponte";

/** De quanto em quanto tempo a barra olha os relogios. */
const PISCADA = 5000;

export default function BarraDoCelular() {
  const [minuto, setMinuto] = useState(() => ponte().minutoDoDia());
  const [hoje, setHoje] = useState(() => dataDoCelular());
  const [usados, setUsados] = useState(() => minutosDeUsoHoje());

  useEffect(() => {
    /*
     * O passo anterior fica guardado para descontar so o tempo que passou de
     * verdade: se o computador dormir entre duas batidas, o relogio da parede
     * pula horas, e somar esse pulo gastaria uma bateria que ninguem usou.
     */
    let antes = Date.now();

    const passo = window.setInterval(() => {
      const agora = Date.now();
      const correu = (agora - antes) / 1000;
      antes = agora;

      setMinuto(ponte().minutoDoDia());
      setHoje(dataDoCelular());

      const daFrente =
        typeof document === "undefined" || document.visibilityState !== "hidden";
      const passou = daFrente ? Math.min(correu, (PISCADA / 1000) * 2) : 0;
      setUsados(passou > 0 ? somarUso(passou) : minutosDeUsoHoje());
    }, PISCADA);

    return () => window.clearInterval(passo);
  }, []);

  const bateria = bateriaDoCelular(usados, tetoDeUso());
  const sinal = sinalDoCelular(minuto);

  return (
    <div className="xbw__status" aria-hidden="true">
      <span className="xbw__status-hora">{horaDoCelular(minuto)}</span>
      <span className="xbw__status-data">{hoje}</span>

      <span className="xbw__status-direita">
        <span className="xbw__sinal">
          {[1, 2, 3, 4].map(barra => (
            <i key={barra} data-aceso={barra <= sinal ? "sim" : undefined} />
          ))}
        </span>

        <span className="xbw__rede">9G</span>

        <span className="xbw__bateria">
          <span className="xbw__bateria-casca">
            <span
              className="xbw__bateria-suco"
              data-pouca={bateria <= 25 ? "sim" : undefined}
              style={{ width: `${bateria}%` }}
            />
          </span>
          <small>{bateria}%</small>
        </span>
      </span>
    </div>
  );
}
