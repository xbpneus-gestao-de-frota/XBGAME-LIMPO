/**
 * CONTATOS — todo mundo do bairro, numa aba só dela.
 *
 * Ordem dele, 13/09/2026: "precisamos adicionar mais um botão que deve ser
 * contatos que ficou faltando".
 *
 * ── POR QUE ELA VOLTOU COMO ABA, E NAO COMO O BOTAO DE ANTES ──────────────
 *
 * "Todos os contatos" existia dentro da lista de conversas, como um botao que
 * abria e fechava uma gaveta no pé da tela. Em 12/09 ele mandou tirar, para a
 * placa clara das conversas crescer — e a gaveta foi desligada.
 *
 * O que se perdeu junto foi a unica porta para falar com quem AINDA NAO
 * escreveu. A lista de conversas, por regra, so mostra quem ja falou; sem
 * contatos, o resto do bairro deixa de existir para quem joga.
 *
 * Como aba, ela devolve essa porta sem tirar nada da tela de conversas: sao
 * duas telas, cada uma com um trabalho. A de conversas responde "o que estao
 * me dizendo?"; esta responde "com quem eu falo?".
 *
 * ── QUEM APARECE, E EM QUE ORDEM ──────────────────────────────────────────
 *
 * Todo mundo, na ordem em que o bairro foi escrito. Nao ha alfabeto nem
 * separacao por tipo de proposito: o bairro tem poucas portas, e uma lista
 * curta que a pessoa aprende de cor vale mais que uma lista organizada que
 * ela precisa reler toda vez.
 *
 * ── A PLACA CLARA E A BARRA DE ROLAGEM ────────────────────────────────────
 *
 * Ordem dele, 13/09/2026: "contatos tem que ter padrao tela cinza, e barra de
 * rolagem". A placa clara e a barra vivem em `Rolagem`, que e a mesma peca que
 * a loja usa — a barra do navegador nao serve aqui, e o porque esta la.
 */
import Rolagem from "./ARolagem";
import { CONTATOS, contato } from "@/game/xbwapp/contatos";
import type { IdContato } from "@/game/xbwapp/tipos";
import { Retrato } from "./pecas";

export default function TelaContatos({
  aoAbrir,
}: {
  aoAbrir: (c: IdContato) => void;
}) {
  return (
    <section className="xbw-agenda" aria-label="Contatos">
      <header className="xbw-topo xbw-topo--marca">
        <strong className="xbw-marca">Contatos</strong>
      </header>

      <Rolagem aspecto="placa">
        <ul className="xbw-agenda__lista">
          {CONTATOS.map(c => (
            <li key={c.id}>
              <button type="button" onClick={() => aoAbrir(c.id)}>
                <Retrato quem={c.id} tamanho="pequeno" />
                <span>
                  <strong>{c.nome}</strong>
                  <small>{contato(c.id)?.sobre}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Rolagem>
    </section>
  );
}
