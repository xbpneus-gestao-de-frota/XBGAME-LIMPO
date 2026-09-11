/**
 * O CANAL POR DENTRO — as publicacoes, e a unica coisa que da para fazer.
 *
 * Nao ha campo de escrever aqui de proposito: canal nao tem resposta. Quem
 * segue pode REAGIR, e mais nada — e e assim no aplicativo de verdade. Botar um
 * campo de escrever seria inventar um recurso que nao existe.
 */
import { hora } from "@/game/xbwapp/estado";
import type { EstadoDoApp } from "@/game/xbwapp/estado";
import {
  REACOES_DE_CANAL,
  canal as acharCanal,
  contarReacao,
  deixarDeSeguir,
  publicacoesDe,
  quantosSeguem,
  reagirNaPublicacao,
  segue,
  seguir,
  totalDeReacoes,
} from "@/game/xbwapp/canais";
import { Icone } from "./pecas";

export default function TelaCanal({
  estado,
  mudar,
  canal,
  aoVoltar,
}: {
  estado: EstadoDoApp;
  mudar: (f: (e: EstadoDoApp) => EstadoDoApp) => void;
  canal: string;
  aoVoltar: () => void;
}) {
  const c = acharCanal(estado, canal);
  const posts = publicacoesDe(estado, canal);
  const seguindo = segue(estado, canal);

  if (!c) {
    return (
      <section className="xbw-canal-tela" aria-label="Canal">
        <header className="xbw-topo">
          <button
            type="button"
            className="xbw-botao"
            onClick={aoVoltar}
            aria-label="Voltar"
          >
            <Icone nome="voltar" />
          </button>
          <strong>Canal</strong>
        </header>
        <p className="xbw-vazio">Este canal não existe mais.</p>
      </section>
    );
  }

  return (
    <section className="xbw-canal-tela" aria-label={`Canal ${c.nome}`}>
      <header className="xbw-topo">
        <button
          type="button"
          className="xbw-botao"
          onClick={aoVoltar}
          aria-label="Voltar"
        >
          <Icone nome="voltar" />
        </button>
        <span
          className="xbw-canal__foto"
          style={{ background: c.cor ?? "#12547a" }}
          aria-hidden="true"
        >
          {c.nome.slice(0, 1)}
        </span>
        <span className="xbw-topo__quem">
          <strong>
            {c.nome}
            {c.verificado && <i className="xbw-verificado">✓</i>}
          </strong>
          <small>
            {quantosSeguem(estado, canal).toLocaleString("pt-BR")} seguindo
          </small>
        </span>
      </header>

      <p className="xbw-canal__sobre">{c.descricao}</p>

      <div className="xbw-rolar">
        {posts.map(p => (
          <article key={p.id} className="xbw-post">
            <p>{p.texto}</p>
            <footer>
              <time>{hora(p.minuto)}</time>
              {totalDeReacoes(p) > 0 && (
                <small>
                  {totalDeReacoes(p).toLocaleString("pt-BR")} reações
                </small>
              )}
            </footer>
            <div className="xbw-post__reacoes">
              {REACOES_DE_CANAL.map(carinha => {
                const quantas = contarReacao(p, carinha);
                const minha = p.minhaReacao === carinha;
                if (!quantas && !seguindo) return null;
                return (
                  <button
                    key={carinha}
                    type="button"
                    className={
                      minha ? "xbw-reacao xbw-reacao--minha" : "xbw-reacao"
                    }
                    onClick={() =>
                      mudar(e => reagirNaPublicacao(e, p.id, carinha))
                    }
                    aria-pressed={minha}
                    aria-label={`Reagir com ${carinha}`}
                  >
                    {carinha}
                    {quantas > 0 && <b>{quantas}</b>}
                  </button>
                );
              })}
            </div>
          </article>
        ))}

        {!posts.length && (
          <p className="xbw-vazio">Este canal ainda não publicou nada.</p>
        )}
      </div>

      <div className="xbw-canal__pe">
        <button
          type="button"
          className={seguindo ? "xbw-acao xbw-acao--fraca" : "xbw-acao"}
          onClick={() =>
            mudar(e => (seguindo ? deixarDeSeguir(e, canal) : seguir(e, canal)))
          }
        >
          {seguindo ? "Deixar de seguir" : "Seguir"}
        </button>
      </div>
    </section>
  );
}
