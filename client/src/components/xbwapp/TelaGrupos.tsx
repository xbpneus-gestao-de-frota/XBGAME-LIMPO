/**
 * GRUPOS, COMUNIDADES E LISTAS DE TRANSMISSAO.
 *
 * As tres moram na mesma aba porque a pessoa procura as tres pelo mesmo motivo
 * — "quero falar com mais de um" — e sao diferentes por um detalhe que muda
 * tudo:
 *
 *   GRUPO: todo mundo se ve e todo mundo se fala.
 *   COMUNIDADE: varios grupos com um aviso comum em cima.
 *   TRANSMISSAO: a mesma mensagem sai para varios, cada um recebe na conversa
 *   dele e ninguem ve os outros.
 *
 * A tela diz essa diferenca em uma linha embaixo de cada botao. Sem isso, a
 * pessoa manda para a lista achando que e grupo e apresenta dez clientes uns
 * aos outros sem querer.
 */
import { useState } from "react";
import { CONTATOS, nomeDe } from "@/game/xbwapp/contatos";
import {
  criarComunidade,
  criarGrupo,
  criarTransmissao,
  apagarTransmissao,
  meusGrupos,
  porGrupoNaComunidade,
} from "@/game/xbwapp/grupos";
import { transmitir } from "@/game/xbwapp/enviar";
import type { EstadoDoApp } from "@/game/xbwapp/estado";
import type { IdContato } from "@/game/xbwapp/tipos";
import { Icone, Retrato } from "./pecas";

type Fazendo = "grupo" | "comunidade" | "transmissao" | null;

export default function TelaGrupos({
  estado,
  mudar,
  aoAbrir,
}: {
  estado: EstadoDoApp;
  mudar: (f: (e: EstadoDoApp) => EstadoDoApp) => void;
  aoAbrir: (conversa: IdContato) => void;
}) {
  const [fazendo, setFazendo] = useState<Fazendo>(null);
  const [mandandoPara, setMandandoPara] = useState<string | null>(null);
  const grupos = meusGrupos(estado);

  return (
    <section className="xbw-grupos" aria-label="Grupos e comunidades">
      <header className="xbw-topo xbw-topo--marca">
        <strong className="xbw-marca">Grupos</strong>
      </header>

      <div className="xbw-criar">
        <button type="button" onClick={() => setFazendo("grupo")}>
          <Icone nome="abaGrupos" />
          <span>
            <strong>Novo grupo</strong>
            <small>todo mundo se vê e se fala</small>
          </span>
        </button>
        <button type="button" onClick={() => setFazendo("comunidade")}>
          <Icone nome="abaStatus" />
          <span>
            <strong>Nova comunidade</strong>
            <small>vários grupos com um aviso em cima</small>
          </span>
        </button>
        <button type="button" onClick={() => setFazendo("transmissao")}>
          <Icone nome="encaminhar" />
          <span>
            <strong>Nova transmissão</strong>
            <small>cada um recebe sozinho, ninguém vê os outros</small>
          </span>
        </button>
      </div>

      {grupos.length > 0 && (
        <>
          <h3 className="xbw-titulo">Meus grupos</h3>
          <ul className="xbw-lojas">
            {grupos.map(g => (
              <li key={g.id}>
                <button type="button" onClick={() => aoAbrir(g.id)}>
                  <Retrato quem={g.id} />
                  <span>
                    <strong>{g.nome}</strong>
                    <small>{g.membros.length} participantes</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {estado.comunidades.length > 0 && (
        <>
          <h3 className="xbw-titulo">Comunidades</h3>
          <ul className="xbw-lojas">
            {estado.comunidades.map(c => (
              <li key={c.id}>
                <span className="xbw-comunidade">
                  <strong>{c.nome}</strong>
                  <small>
                    {c.grupos.length === 0
                      ? "nenhum grupo dentro ainda"
                      : c.grupos.map(g => nomeDe(g)).join(", ")}
                  </small>
                  {grupos.length > 0 && (
                    <select
                      aria-label={`Pôr um grupo em ${c.nome}`}
                      value=""
                      onChange={ev =>
                        ev.target.value &&
                        mudar(e =>
                          porGrupoNaComunidade(e, c.id, ev.target.value)
                        )
                      }
                    >
                      <option value="">Pôr um grupo aqui…</option>
                      {grupos
                        .filter(g => !c.grupos.includes(g.id))
                        .map(g => (
                          <option key={g.id} value={g.id}>
                            {g.nome}
                          </option>
                        ))}
                    </select>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {estado.transmissoes.length > 0 && (
        <>
          <h3 className="xbw-titulo">Listas de transmissão</h3>
          <ul className="xbw-lojas">
            {estado.transmissoes.map(l => (
              <li key={l.id}>
                <button type="button" onClick={() => setMandandoPara(l.id)}>
                  <Icone nome="encaminhar" />
                  <span>
                    <strong>{l.nome}</strong>
                    <small>{l.destinos.map(d => nomeDe(d)).join(", ")}</small>
                  </span>
                </button>
                <button
                  type="button"
                  className="xbw-botao"
                  onClick={() => mudar(e => apagarTransmissao(e, l.id))}
                  aria-label={`Apagar ${l.nome}`}
                >
                  <Icone nome="lixeira" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {fazendo && (
        <Criar
          o={fazendo}
          aoFechar={() => setFazendo(null)}
          aoCriar={(nome, escolhidos) => {
            mudar(e =>
              fazendo === "grupo"
                ? criarGrupo(e, nome, escolhidos)
                : fazendo === "comunidade"
                  ? criarComunidade(e, nome)
                  : criarTransmissao(e, nome, escolhidos)
            );
            setFazendo(null);
          }}
        />
      )}

      {mandandoPara && (
        <MandarNaLista
          nome={
            estado.transmissoes.find(l => l.id === mandandoPara)?.nome ?? ""
          }
          aoFechar={() => setMandandoPara(null)}
          aoMandar={texto => {
            const lista = estado.transmissoes.find(l => l.id === mandandoPara);
            if (lista) mudar(e => transmitir(e, lista.destinos, texto));
            setMandandoPara(null);
          }}
        />
      )}
    </section>
  );
}

function Criar({
  o,
  aoCriar,
  aoFechar,
}: {
  o: Exclude<Fazendo, null>;
  aoCriar: (nome: string, escolhidos: readonly IdContato[]) => void;
  aoFechar: () => void;
}) {
  const [nome, setNome] = useState("");
  const [escolhidos, setEscolhidos] = useState<readonly IdContato[]>([]);
  const precisaDeGente = o !== "comunidade";

  const titulo =
    o === "grupo"
      ? "Novo grupo"
      : o === "comunidade"
        ? "Nova comunidade"
        : "Nova transmissão";

  return (
    <div className="xbw-folha" role="dialog" aria-label={titulo}>
      <button
        type="button"
        className="xbw-folha__fora"
        onClick={aoFechar}
        aria-label="Fechar"
      />
      <div className="xbw-folha__corpo">
        <p className="xbw-folha__titulo">{titulo}</p>
        <label className="xbw-linha-de-forma">
          <span>Nome</span>
          <input
            value={nome}
            onChange={e => setNome(e.target.value)}
            maxLength={40}
          />
        </label>

        {precisaDeGente && (
          <>
            <p className="xbw-folha__titulo">Quem participa</p>
            <ul className="xbw-escolher-lista">
              {CONTATOS.filter(
                c => c.tipo === "pessoa" || c.tipo === "loja"
              ).map(c => {
                const dentro = escolhidos.includes(c.id);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      className={dentro ? "xbw-escolhido" : undefined}
                      onClick={() =>
                        setEscolhidos(atuais =>
                          dentro
                            ? atuais.filter(x => x !== c.id)
                            : [...atuais, c.id]
                        )
                      }
                    >
                      <Retrato quem={c.id} tamanho="pequeno" />
                      <span>{c.nome}</span>
                      {dentro && <Icone nome="tiqueLido" classe="xbw-tique" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        <button
          type="button"
          className="xbw-principal"
          disabled={!nome.trim() || (precisaDeGente && escolhidos.length === 0)}
          onClick={() => aoCriar(nome, escolhidos)}
        >
          Criar
        </button>
      </div>
    </div>
  );
}

function MandarNaLista({
  nome,
  aoMandar,
  aoFechar,
}: {
  nome: string;
  aoMandar: (texto: string) => void;
  aoFechar: () => void;
}) {
  const [texto, setTexto] = useState("");
  return (
    <div className="xbw-folha" role="dialog" aria-label={`Mandar para ${nome}`}>
      <button
        type="button"
        className="xbw-folha__fora"
        onClick={aoFechar}
        aria-label="Fechar"
      />
      <div className="xbw-folha__corpo">
        <p className="xbw-folha__titulo">Mandar para {nome}</p>
        <label className="xbw-linha-de-forma">
          <span>Mensagem</span>
          <textarea
            value={texto}
            onChange={e => setTexto(e.target.value)}
            rows={3}
          />
        </label>
        <button
          type="button"
          className="xbw-principal"
          disabled={!texto.trim()}
          onClick={() => aoMandar(texto)}
        >
          Mandar para todos
        </button>
      </div>
    </div>
  );
}
