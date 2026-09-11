/**
 * A FAIXA QUE DESCE QUANDO CHEGA MENSAGEM.
 *
 * Retrato e nome sao DA PESSOA — ordem dele: "NOME E FOTO SERA DE CADA
 * USUARIO". Quem tem desenho aparece com o desenho, quem nao tem aparece com as
 * iniciais na roda de cor, a mesma regra do resto do aplicativo.
 *
 * Tocar na faixa abre a conversa; o ✕ so tira a faixa. As duas coisas precisam
 * existir: quem esta no meio de outra coisa nao quer ser levado embora sem
 * querer, e quem quer ir precisa de um caminho de um toque.
 */
import { nomeDe } from "@/game/xbwapp/contatos";
import { resumoDoAviso } from "@/game/xbwapp/avisos";
import type { Mensagem } from "@/game/xbwapp/tipos";
import { Retrato } from "./pecas";

export default function FaixaDeAviso({
  mensagem,
  aoAbrir,
  aoFechar,
}: {
  mensagem: Mensagem;
  aoAbrir: () => void;
  aoFechar: () => void;
}) {
  return (
    <div className="xbw-faixa" role="status" aria-live="polite">
      <button type="button" className="xbw-faixa__toque" onClick={aoAbrir}>
        <Retrato quem={mensagem.conversa} tamanho="pequeno" />
        <span>
          <strong>{nomeDe(mensagem.conversa)}</strong>
          <small>{resumoDoAviso(mensagem)}</small>
        </span>
      </button>
      <button
        type="button"
        className="xbw-faixa__fechar"
        onClick={aoFechar}
        aria-label="Dispensar aviso"
      >
        ✕
      </button>
    </div>
  );
}
