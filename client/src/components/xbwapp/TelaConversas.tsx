/**
 * A LISTA DE CONVERSAS — a porta do aplicativo.
 *
 * ── SO APARECE QUEM JA FALOU ──────────────────────────────────────────────
 *
 * Lista cheia de nome sem assunto e o jeito mais rapido de a pessoa parar de
 * ler a lista. Aqui so entra conversa que TEM mensagem; o resto mora em
 * "Contatos", que e onde se procura alguem de proposito.
 */
import { useMemo, useState } from "react";
import { CONTATOS, contato, nomeDe } from "@/game/xbwapp/contatos";
import {
  arquivar,
  conversasOrdenadas,
  fixar,
  hora,
  ultimaDe,
} from "@/game/xbwapp/estado";
import type { EstadoDoApp } from "@/game/xbwapp/estado";
import type { IdContato } from "@/game/xbwapp/tipos";
import { Contador, Icone, Retrato, Tique } from "./pecas";

export default function TelaConversas({
  estado,
  mudar,
  aoAbrir,
  aoVoltarAoJogo,
}: {
  estado: EstadoDoApp;
  mudar: (f: (e: EstadoDoApp) => EstadoDoApp) => void;
  aoAbrir: (conversa: IdContato) => void;
  /*
   * A PORTA DE VOLTA PARA O BAIRRO.
   *
   * Ordem dele, 08/09/2026: um botao bonito ao lado de "Todos os contatos",
   * para voltar ao jogo.
   *
   * Ela fica AQUI, na primeira tela, e em nenhum outro lugar. Quem esta no
   * meio de uma conversa nao quer sair do aplicativo, quer voltar para a
   * lista — e o botao de voltar da conversa ja faz isso. Espalhar a saida
   * por todas as telas so daria mais jeitos de sair sem querer.
   */
  aoVoltarAoJogo?: () => void;
}) {
  const [procura, setProcura] = useState("");
  const [vendoArquivadas, setVendoArquivadas] = useState(false);
  const [aberta, setAberta] = useState<IdContato | null>(null);

  const lista = useMemo(() => {
    const ids = conversasOrdenadas(estado, vendoArquivadas);
    const busca = procura.trim().toLowerCase();
    if (!busca) return ids;
    return ids.filter(id => {
      const nome = nomeDe(id).toLowerCase();
      const ultima = ultimaDe(estado, id)?.texto.toLowerCase() ?? "";
      return nome.includes(busca) || ultima.includes(busca);
    });
  }, [estado, procura, vendoArquivadas]);

  const arquivadas = conversasOrdenadas(estado, true).length;

  return (
    <section className="xbw-lista" aria-label="Conversas">
      <header className="xbw-topo xbw-topo--marca">
        {vendoArquivadas ? (
          <>
            <button
              type="button"
              className="xbw-botao"
              onClick={() => setVendoArquivadas(false)}
              aria-label="Voltar"
            >
              <Icone nome="voltar" />
            </button>
            <strong className="xbw-marca">Arquivadas</strong>
          </>
        ) : (
          <strong className="xbw-marca">
            XBW<em>APP</em>
          </strong>
        )}
      </header>

      <label className="xbw-procura">
        <Icone nome="busca" />
        <input
          type="search"
          value={procura}
          onChange={e => setProcura(e.target.value)}
          placeholder="Pesquisar"
          aria-label="Pesquisar conversas"
        />
      </label>

      {!vendoArquivadas && arquivadas > 0 && (
        <button
          type="button"
          className="xbw-arquivadas"
          onClick={() => setVendoArquivadas(true)}
        >
          <Icone nome="arquivar" />
          <span>Arquivadas</span>
          <em>{arquivadas}</em>
        </button>
      )}

      <ul className="xbw-conversas">
        {lista.map(id => {
          const ultima = ultimaDe(estado, id);
          const naoLidas = estado.naoLidas[id] ?? 0;
          const fixada = estado.fixadas.includes(id);
          return (
            <li
              key={id}
              className={
                aberta === id ? "xbw-item xbw-item--aberto" : "xbw-item"
              }
            >
              <button
                type="button"
                className="xbw-item__toque"
                onClick={() => aoAbrir(id)}
                onContextMenu={ev => {
                  ev.preventDefault();
                  setAberta(a => (a === id ? null : id));
                }}
              >
                <Retrato quem={id} />
                <span className="xbw-item__miolo">
                  <span className="xbw-item__linha">
                    <strong>{nomeDe(id)}</strong>
                    <time>{ultima ? hora(ultima.minuto) : ""}</time>
                  </span>
                  <span className="xbw-item__linha">
                    <small>
                      {ultima?.de === "voce" && (
                        <Tique estado={ultima.estado} />
                      )}
                      {ultima?.texto ?? ""}
                    </small>
                    <span className="xbw-item__marcas">
                      {estado.silenciadas.includes(id) && (
                        <Icone nome="silenciar" classe="xbw-tique" />
                      )}
                      {fixada && <Icone nome="fixar" classe="xbw-tique" />}
                      <Contador quantas={naoLidas} />
                    </span>
                  </span>
                </span>
              </button>

              {aberta === id && (
                <div
                  className="xbw-acoes"
                  role="group"
                  aria-label={`Ações de ${nomeDe(id)}`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      mudar(e => fixar(e, id));
                      setAberta(null);
                    }}
                  >
                    <Icone nome="fixar" /> {fixada ? "Desafixar" : "Fixar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      mudar(e => arquivar(e, id));
                      setAberta(null);
                    }}
                  >
                    <Icone nome="arquivar" />{" "}
                    {vendoArquivadas ? "Desarquivar" : "Arquivar"}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {lista.length === 0 && (
        <p className="xbw-vazio">
          {procura
            ? "Nada encontrado."
            : "Nenhuma conversa ainda. Abra um contato e escreva."}
        </p>
      )}

      {!vendoArquivadas && (
        <Contatos aoAbrir={aoAbrir} aoVoltarAoJogo={aoVoltarAoJogo} />
      )}
    </section>
  );
}

/** Quem ainda nao falou com voce, mas existe. */
function Contatos({
  aoAbrir,
  aoVoltarAoJogo,
}: {
  aoAbrir: (c: IdContato) => void;
  aoVoltarAoJogo?: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="xbw-contatos">
      {/*
       * OS DOIS BOTOES DIVIDEM A MESMA LINHA.
       *
       * O de contatos manda na largura, porque o texto dele muda ("Todos os
       * contatos" e "Fechar contatos"). O de voltar tem largura propria e
       * nao encolhe: e a saida, e saida que aperta quando o vizinho cresce
       * vira saida que erra o dedo.
       */}
      <div className="xbw-contatos__linha">
        <button
          type="button"
          className="xbw-contatos__abrir"
          onClick={() => setAberto(a => !a)}
        >
          <Icone nome="contato" />{" "}
          {aberto ? "Fechar contatos" : "Todos os contatos"}
        </button>
        {aoVoltarAoJogo && (
          <button
            type="button"
            className="xbw-contatos__jogo"
            onClick={aoVoltarAoJogo}
          >
            <Icone nome="voltar" />
            <span>Voltar ao game</span>
          </button>
        )}
      </div>
      {aberto && (
        <ul>
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
      )}
    </div>
  );
}
