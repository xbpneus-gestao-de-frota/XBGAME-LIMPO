/**
 * O DRONE DA XBPNEUS — a cena que responde ao "vamos resolver isso".
 *
 * "Um drone passa por nossos olhos icando a caixa, voa proximo do entregador,
 * desce a caixa no chao e volta para frente de nossos olhos."
 *
 * ── O VOO E DA TELA; A CAIXA, DO BAIRRO ───────────────────────────────────
 *
 * Sao duas pecas em duas reguas diferentes, e a divisao nao e capricho.
 *
 * O VOO acontece na TELA. Ele passa rente aos nossos olhos: entra por fora de
 * uma borda e sai pela outra, e "borda" so quer dizer alguma coisa na moldura. A
 * primeira versao disto voava dentro da foto do bairro, que e tres vezes maior
 * que a moldura — o aparelho aparecia um instante e ia embora para um canto do
 * bairro que ninguem estava vendo.
 *
 * A CAIXA, depois que encosta, e do BAIRRO. Ela cai ao lado do garoto e continua
 * ao lado dele quando a pessoa arrasta ou aproxima o mapa. Caixa presa na tela
 * ficaria boiando sobre o bairro no primeiro arrasto.
 *
 * A troca acontece no instante em que a caixa encosta no chao, e nesse instante
 * as duas estao no mesmo lugar: o alvo do voo foi traduzido do bairro para a
 * tela por aReguaDoVoo. Nao ha salto para ver.
 *
 * ── ELE VIRA DE FRENTE DUAS VEZES ─────────────────────────────────────────
 *
 * Sao dois desenhos do mesmo aparelho: o de frente, com a camera apontada para
 * quem joga, e o de tres quartos visto de cima, que e como um drone aparece
 * sobre um bairro desenhado a 31 graus do chao. O de frente entra nas duas
 * pontas — na passagem e na volta — e o de cima no meio, com um cruzamento de
 * meio segundo. Cortar seco faria o aparelho piscar; cruzando, ele so gira.
 */
import { useEffect } from "react";
import { GAME_ASSETS } from "@/game/assets";
import {
  ABERTURA_MS,
  BRILHO_DA_CAIXA_MS,
  MARCOS,
  ONDE_A_CAIXA_CAI,
  TAMANHOS,
  VOO_MS,
  aReguaDoVoo,
  type JanelaDoMapa,
} from "@/game/oDrone";

/**
 * O VOO, na regua da tela.
 *
 * Avisa quando a caixa encosta no chao (aoSoltar) e quando o aparelho sai de
 * vista (aoTerminar) — o primeiro acende a caixa no bairro, o segundo apaga esta
 * camada inteira.
 */
export default function ODrone({
  janela,
  aoSoltar,
  aoTerminar,
}: {
  janela: JanelaDoMapa;
  aoSoltar?: () => void;
  aoTerminar?: () => void;
}) {
  useEffect(() => {
    const soltou = window.setTimeout(
      () => aoSoltar?.(),
      MARCOS.soltou * VOO_MS,
    );
    const fim = window.setTimeout(() => aoTerminar?.(), VOO_MS);
    return () => {
      window.clearTimeout(soltou);
      window.clearTimeout(fim);
    };
  }, [aoSoltar, aoTerminar]);

  const regua = aReguaDoVoo(janela);
  const numeros = {
    ["--drone-x" as string]: `${regua.droneX.toFixed(2)}%`,
    ["--drone-y" as string]: `${regua.droneY.toFixed(2)}%`,
    ["--caixa-x" as string]: `${regua.caixaX.toFixed(2)}%`,
    ["--caixa-chao" as string]: `${regua.caixaChao.toFixed(2)}%`,
    ["--caixa-no-ar" as string]: `${regua.caixaNoAr.toFixed(2)}%`,
    ["--drone-longe" as string]: `${regua.droneLonge.toFixed(2)}%`,
    ["--caixa-longe" as string]: `${regua.caixaLonge.toFixed(2)}%`,
    ["--drone-perto" as string]: `${TAMANHOS.droneDePerto}%`,
    ["--drone-volta" as string]: `${TAMANHOS.droneNaVolta}%`,
    ["--caixa-perto" as string]: `${TAMANHOS.caixaDePerto}%`,
    ["--voo" as string]: `${VOO_MS}ms`,
  };

  return (
    <div className="drone-cena" style={numeros} aria-hidden="true">
      <img
        className="drone-caixa"
        src={GAME_ASSETS.droneCaixa}
        alt=""
        draggable={false}
      />
      <div className="drone">
        {/*
          O DE FRENTE MANDA NO TAMANHO, o de cima so se sobrepoe. O primeiro fica
          no fluxo e e ele quem da altura ao aparelho; se os dois fossem soltos,
          a caixa do drone teria altura zero e o voo aconteceria num ponto.
        */}
        <img
          className="drone__desenho drone__desenho--frente"
          src={GAME_ASSETS.droneFrente}
          alt=""
          draggable={false}
        />
        <img
          className="drone__desenho drone__desenho--voando"
          src={GAME_ASSETS.droneVoando}
          alt=""
          draggable={false}
        />
      </div>
    </div>
  );
}

/**
 * A MALA DEPOIS QUE ENCOSTA — esta mora no bairro, e abre ali mesmo.
 *
 * "Apenas uma animacao simples da caixa abrindo ao lado do garoto, nada de zoom
 * da caixa."
 *
 * Pendurada pela BASE, como o garoto: o ponto do mapa e onde ela toca o chao, e
 * nao o meio dela.
 *
 * ── A ABERTURA E UMA TROCA DE DESENHO, e nada mais ────────────────────────
 *
 * Sao dois desenhos da mesma mala, e eles tem quase o mesmo retangulo — fechada
 * 1,10 de largura por altura, aberta 1,08. E por isso que trocar um pelo outro
 * le como a TAMPA SALTANDO, e nao como uma figura virando outra.
 *
 * Antes do salto ela AGACHA um tico. E o gesto que qualquer coisa faz antes de
 * pular, e sem ele a tampa apenas apareceria aberta. Depois disso a mala fica
 * parada para sempre: peca que continua animada e peca que o navegador continua
 * desenhando.
 */
export function CaixaNoChao({
  aberta = false,
  foiEmbora = false,
}: {
  aberta?: boolean;
  /* A cena acabou: a encomenda sai de cena junto com quem veio busca-la. */
  foiEmbora?: boolean;
}) {
  return (
    <span
      className={`caixa-no-chao${aberta ? " caixa-no-chao--aberta" : ""}${
        foiEmbora ? " caixa-no-chao--foi-embora" : ""
      }`}
      style={{
        left: `${ONDE_A_CAIXA_CAI.x}%`,
        top: `${ONDE_A_CAIXA_CAI.y}%`,
        ["--caixa-no-mapa" as string]: `${TAMANHOS.caixaNoBairro * 1.05}%`,
        ["--brilho-da-caixa" as string]: `${BRILHO_DA_CAIXA_MS}ms`,
        ["--abre" as string]: `${ABERTURA_MS}ms`,
      }}
      aria-hidden="true"
    >
      <img
        className="caixa-no-chao__desenho caixa-no-chao__desenho--fechada"
        src={GAME_ASSETS.droneCaixa}
        alt=""
        draggable={false}
      />
      <img
        className="caixa-no-chao__desenho caixa-no-chao__desenho--aberta"
        src={GAME_ASSETS.caixaAberta}
        alt=""
        draggable={false}
      />
    </span>
  );
}
