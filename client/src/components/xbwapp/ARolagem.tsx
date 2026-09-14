/**
 * A ROLAGEM COM BARRA À VISTA — uma só, para todas as telas.
 *
 * Ordem dele, 13/09/2026: "todas telas devem ter rolagem se necessário" — e,
 * antes, "precisamos que contatos tenha padrão tela cinza, e barra de rolagem".
 *
 * ── POR QUE A BARRA É DESENHADA À MÃO ─────────────────────────────────────
 *
 * O aplicativo esconde TODA barra do navegador, de propósito, para as telas
 * ficarem limpas. Mesmo devolvendo a barra só numa tela, o navegador do jogo
 * desenha uma barra FLUTUANTE: aparece enquanto o dedo arrasta e some sozinha.
 * Numa tela parada ela não existe — que é justamente o que ele não queria ver.
 *
 * Então a barra é nossa: um trilho parado na beira e um polegar do tamanho do
 * pedaço que está à vista. Fica sempre visível e não depende de navegador.
 *
 * ── POR QUE ESTE ARQUIVO EXISTE ───────────────────────────────────────────
 *
 * Porque a segunda tela a precisar de rolagem apareceu. Copiar o trilho de
 * Contatos para a loja daria duas barras parecidas que alguém teria de manter
 * iguais — e a segunda ficaria para trás na primeira mudança. Uma só, aqui.
 *
 * ── O QUE ELA NÃO FAZ ─────────────────────────────────────────────────────
 *
 * Não arrasta: o polegar mostra onde a pessoa está, e quem rola é o dedo na
 * lista, como em qualquer telefone. Arrastar a barra é gesto de computador com
 * mouse, e esta tela é um telefone dentro de um jogo.
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export default function Rolagem({
  children,
  aspecto = "solto",
  rotulo,
}: {
  children: ReactNode;
  /** "placa" desenha o papel claro por baixo; "solto" rola sem moldura. */
  aspecto?: "placa" | "solto";
  rotulo?: string;
}) {
  const corpo = useRef<HTMLDivElement>(null);
  const [barra, setBarra] = useState({ topo: 0, altura: 100 });

  const medir = useCallback(() => {
    const el = corpo.current;
    if (!el) return;
    const inteiro = el.scrollHeight;
    const avista = el.clientHeight;
    if (inteiro <= avista + 1) {
      setBarra({ topo: 0, altura: 100 });
      return;
    }
    const altura = Math.max((avista / inteiro) * 100, 8);
    const topo = (el.scrollTop / (inteiro - avista)) * (100 - altura);
    setBarra({ topo, altura });
  }, []);

  useEffect(() => {
    medir();
    const el = corpo.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const olho = new ResizeObserver(medir);
    olho.observe(el);
    /* O conteudo tambem cresce sozinho: uma lista que chega depois muda tudo. */
    if (el.firstElementChild) olho.observe(el.firstElementChild);
    return () => olho.disconnect();
  }, [medir, children]);

  const cabe = barra.altura >= 100;

  return (
    <div className="xbw-rolagem" data-aspecto={aspecto}>
      <div
        className="xbw-rolagem__corpo"
        ref={corpo}
        onScroll={medir}
        aria-label={rotulo}
      >
        {children}
      </div>

      {!cabe && (
        <span className="xbw-rolagem__trilho" aria-hidden="true">
          <span
            className="xbw-rolagem__polegar"
            style={{ top: `${barra.topo}%`, height: `${barra.altura}%` }}
          />
        </span>
      )}
    </div>
  );
}
