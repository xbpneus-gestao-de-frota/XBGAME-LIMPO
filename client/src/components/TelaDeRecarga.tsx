/**
 * "VAMOS RECARREGAR O CELULAR E JÁ VOLTAMOS."
 *
 * Ordem dele, 13/09/2026: "app salva jogo atual, aparece uma tela que vamos
 * recarregar celular e ja voltamos, deve ser periodo de 10 a 30 minutos
 * podendo ser configurado pelos pais".
 *
 * ── POR QUE ELA MORA FORA DO APLICATIVO ───────────────────────────────────
 *
 * A bateria aparece no aplicativo, mas o limite nao e do aplicativo: e do
 * jogo inteiro. Se esta tela vivesse dentro do XBWAPP, bastaria voltar ao mapa
 * para continuar pedalando com o celular morto — e o limite nao seria limite.
 * Por isso ela mora na raiz, por cima de tudo, e nao tem botao de fechar.
 *
 * ── O QUE ACONTECE, NA ORDEM ──────────────────────────────────────────────
 *
 * 1. A bateria chega a zero.
 * 2. O jogo GRAVA — pela mesma porta por onde o aplicativo pede tudo ao jogo.
 *    Ninguem perde a entrega que acabou de fazer.
 * 3. A tela entra, com o relogio do descanso correndo.
 * 4. No fim do descanso o celular volta carregado: o tempo do dia zera e a
 *    tela sai sozinha, sem pedir nada a ninguem.
 *
 * ── POR QUE NAO HA "PULAR" ────────────────────────────────────────────────
 *
 * Um botao de pular transformaria o descanso em aviso, e aviso nao descansa.
 * Quem precisa mudar o tempo muda no lugar certo: a tela dos pais, dentro de
 * Ferramentas. Fechar o jogo tambem nao adianta — o fim do descanso fica
 * guardado com hora marcada, e nao contado enquanto a tela esta aberta.
 */
import { useEffect, useState } from "react";

import { bateriaDoCelular } from "@/game/xbwapp/oCelular";
import { ponte } from "@/game/xbwapp/ponte";
import {
  comecarDescanso,
  faltaDoDescanso,
  minutosDeUsoHoje,
  terminarDescanso,
  tetoDeUso,
} from "@/game/xbwapp/oTempoDeUso";

/** De quanto em quanto tempo a tela olha o relogio. */
const BATIDA = 1000;

function relogio(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function TelaDeRecarga() {
  const [falta, setFalta] = useState(() => faltaDoDescanso());

  useEffect(() => {
    const olhar = () => {
      const restando = faltaDoDescanso();

      if (restando > 0) {
        setFalta(restando);
        return;
      }

      /* Estava descansando e acabou: o celular volta carregado. */
      if (falta > 0) {
        terminarDescanso();
        setFalta(0);
        return;
      }

      /* Ainda nao descansava: a bateria acabou agora? */
      if (bateriaDoCelular(minutosDeUsoHoje(), tetoDeUso()) <= 0) {
        ponte().salvarTudo();
        comecarDescanso();
        setFalta(faltaDoDescanso());
      }
    };

    olhar();
    const passo = window.setInterval(olhar, BATIDA);
    return () => window.clearInterval(passo);
  }, [falta]);

  if (falta <= 0) return null;

  return (
    <div className="recarga" role="dialog" aria-modal="true">
      <div className="recarga__cartao">
        <span className="recarga__pilha" aria-hidden="true">
          <span className="recarga__suco" />
        </span>

        <h1>Vamos recarregar o celular</h1>
        <p className="recarga__fala">Já voltamos.</p>

        <strong className="recarga__relogio">{relogio(falta)}</strong>

        <p className="recarga__rodape">
          O jogo foi salvo. Quando o celular carregar, ele volta sozinho de onde
          parou.
        </p>
      </div>
    </div>
  );
}
