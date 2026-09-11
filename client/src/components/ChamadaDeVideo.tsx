/**
 * A TELA DA CHAMADA — o celular tocando, na tela inteira.
 *
 * "Deve ser aplicada na tela toda; o game é mobile." Entao ela nao e um cartao
 * no meio do bairro: ela TOMA a tela, como uma ligacao toma o celular na mao de
 * quem esta jogando. O bairro fica atras dela e volta quando ela sair.
 *
 * ── E FEITA, E NAO COLADA ─────────────────────────────────────────────────
 *
 * O desenho dele foi seguido de perto — as cores, o cabecalho, o retrato
 * redondo, os tres botoes do meio, os dois de baixo e a assinatura. Mas ela e
 * MONTADA, e nao uma imagem por cima da tela: botao e botao, pega o teclado, o
 * leitor de tela sabe ler, e nada quebra em tela larga ou estreita.
 *
 * Imagem inteira colada seria mais rapido de por e impossivel de usar sem
 * mouse — e este jogo foi pensado com uma crianca com deficiencia do lado de ca.
 *
 * ── OS TRES DO MEIO NAO SAO BOTOES ────────────────────────────────────────
 *
 * Camera, silenciar e mensagem estao no desenho e ficam na tela, porque sao
 * eles que fazem aquilo parecer um aplicativo de verdade. Mas ainda nao fazem
 * nada, entao entram como enfeite marcado como enfeite: quem navega por teclado
 * nao para neles, e o leitor de tela nao os anuncia como coisa clicavel.
 * Prometer botao que nao responde e pior do que nao ter botao.
 */
import { useEffect, useRef } from "react";
import { GAME_ASSETS } from "@/game/assets";
import { QUEM_LIGA, tocarOCelular, type Toque } from "@/game/aChamada";

const DO_MEIO = [
  { icone: "▣", nome: "Câmera" },
  { icone: "⃠", nome: "Silenciar" },
  { icone: "💬", nome: "Mensagem" },
] as const;

export default function ChamadaDeVideo({
  comSom,
  aoAtender,
  aoRecusar,
}: {
  comSom: boolean;
  aoAtender: () => void;
  aoRecusar: () => void;
}) {
  const toque = useRef<Toque | null>(null);

  useEffect(() => {
    toque.current = tocarOCelular(comSom);
    return () => {
      toque.current?.parar();
      toque.current = null;
    };
  }, [comSom]);

  /** Atender e recusar param o toque na hora, antes de qualquer outra coisa. */
  const responder = (oQue: () => void) => () => {
    toque.current?.parar();
    toque.current = null;
    oQue();
  };

  return (
    <div
      className="chamada"
      role="dialog"
      aria-modal="true"
      aria-label={`${QUEM_LIGA.nome} está ligando por vídeo`}
    >
      <div className="chamada__tela">
        <header className="chamada__marca">
          <span className="chamada__logo" aria-hidden="true">
            X
          </span>
          <strong>
            XBW<span>APP</span>
          </strong>
          <small>{QUEM_LIGA.lema}</small>
        </header>

        <div className="chamada__quem">
          <img
            className="chamada__retrato"
            src={GAME_ASSETS.renanRetrato}
            alt=""
            draggable={false}
          />
          <p className="chamada__nome">{QUEM_LIGA.nome}</p>
          <p className="chamada__estado">{QUEM_LIGA.chamada}</p>
        </div>

        <ul className="chamada__meio" aria-hidden="true">
          {DO_MEIO.map(item => (
            <li key={item.nome}>
              <span>{item.icone}</span>
              <em>{item.nome}</em>
            </li>
          ))}
        </ul>

        <div className="chamada__resposta">
          <button
            type="button"
            className="chamada__botao chamada__botao--recusa"
            onClick={responder(aoRecusar)}
          >
            <span aria-hidden="true">✕</span>
            <em>Recusar</em>
          </button>
          <button
            type="button"
            className="chamada__botao chamada__botao--atende"
            onClick={responder(aoAtender)}
            autoFocus
          >
            <span aria-hidden="true">✆</span>
            <em>Atender</em>
          </button>
        </div>

        <footer className="chamada__rodape" aria-hidden="true">
          {QUEM_LIGA.rodape.map(linha => (
            <span key={linha}>{linha}</span>
          ))}
        </footer>
      </div>
    </div>
  );
}
