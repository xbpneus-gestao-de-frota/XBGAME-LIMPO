/**
 * A VIDA DO MAPA — o que se mexe no bairro alem da corrida.
 *
 * Fica numa peca so, por cima do desenho e por baixo dos pinos, e pinta tres
 * coisas diferentes com regras diferentes:
 *
 *   O QUE RESPIRA   a fonte e as petalas. Ficam ligadas sempre, lentas.
 *   O QUE ENCANTA   a fumaca de chamine e o passarinho. UM POR VEZ, sorteado,
 *                   com silencio entre um e outro.
 *   O QUE ACENDE    o coreto e a rua do comercio. Nao sao sorteados: dependem
 *                   da hora do dia, e so aparecem no entardecer.
 *
 * As posicoes e as regras moram em game/aVidaDoMapa; aqui so se pinta.
 *
 * ── POR QUE ISTO NAO E CORRIGIDO PELO ZOOM ────────────────────────────────
 *
 * O entregador encolhe quando a pessoa aproxima, porque ele e uma PECA DE JOGO
 * — maior que a pessoa que representa. A fumaca que sai de uma chamine nao e
 * peca: ela e do tamanho da chamine, e cresce junto com ela. Por isso aqui as
 * medidas sao porcentagem do mapa e nada mais.
 */
import { useEffect, useState } from "react";
import {
  ENCANTO_DURA_MS,
  PONTOS,
  QUE_ACENDEM,
  QUE_RESPIRAM,
  esperaDoProximo,
  proximoEncanto,
  type PontoDeVida,
} from "@/game/aVidaDoMapa";

/** Onde o ponto fica, em estilo pronto. */
function onde(p: PontoDeVida): React.CSSProperties {
  return { left: `${p.x}%`, top: `${p.y}%` };
}

export default function VidaDoMapa() {
  /*
   * O ENCANTO DA VEZ.
   *
   * Um numero, e nao uma lista: a regra do plano e "um lugar por vez". Guardar
   * uma lista aqui seria abrir a porta para dois ao mesmo tempo sem ninguem
   * decidir isso.
   */
  const [encanto, setEncanto] = useState<PontoDeVida | null>(null);

  useEffect(() => {
    let vivo = true;
    let relogio: ReturnType<typeof setTimeout>;
    let ultimo: number | null = null;

    const acender = () => {
      if (!vivo) return;
      const p = proximoEncanto(ultimo);
      ultimo = p.numero;
      setEncanto(p);
      relogio = setTimeout(() => {
        if (!vivo) return;
        setEncanto(null);
        relogio = setTimeout(acender, esperaDoProximo());
      }, ENCANTO_DURA_MS);
    };

    // O mapa nao abre com fumaca saindo: o primeiro encanto tambem espera.
    relogio = setTimeout(acender, esperaDoProximo());
    return () => {
      vivo = false;
      clearTimeout(relogio);
    };
  }, []);

  return (
    <div className="vida" aria-hidden="true">
      {QUE_RESPIRAM.map(p => (
        <span
          key={p.numero}
          className={`vida__ponto vida__${p.efeito}`}
          style={onde(p)}
        />
      ))}

      {QUE_ACENDEM.map(p => (
        <span
          key={p.numero}
          className="vida__ponto vida__acende"
          style={onde(p)}
        />
      ))}

      {encanto && (
        <span
          key={encanto.numero}
          className={`vida__ponto vida__${encanto.efeito}`}
          style={onde(encanto)}
        />
      )}
    </div>
  );
}

/** Quantos pontos ja se mexem, e quantos esperam desenho. Serve aos testes. */
export const CONTAGEM = {
  vivos: PONTOS.filter(p => p.efeito !== null).length,
  esperando: PONTOS.filter(p => p.efeito === null).length,
};
