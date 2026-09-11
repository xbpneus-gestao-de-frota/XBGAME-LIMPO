/**
 * GERENCIAR ANUNCIOS — criar, botar no ar, pausar, encerrar e ver o resultado.
 *
 * Ordem dele: "PRECISO DE GERENCIAR ANUNCIOS COMPLETO". Entao esta tela tem o
 * ciclo inteiro, e nao so uma lista bonita.
 *
 * O RESULTADO NAO E INVENTADO. Alcance, conversas e gasto saem da conta que
 * mora em `negocio.ts`, a partir do dinheiro por dia, do publico e do tempo que
 * o anuncio ja passou no ar. Se o relogio do jogo nao andou, o numero nao anda.
 */
import { useState } from "react";
import type { EstadoDoApp } from "@/game/xbwapp/estado";
import {
  DESTINOS,
  MAIOR_POR_DIA,
  MAIS_DIAS,
  MENOR_POR_DIA,
  MENOS_DIAS,
  PUBLICOS,
  apagarAnuncio,
  comoEstaOAnuncio,
  criarAnuncio,
  emReais,
  encerrarAnuncio,
  gastoTotal,
  pausarAnuncio,
  publicarAnuncio,
  resultadoDoAnuncio,
} from "@/game/xbwapp/negocio";
import type { DestinoDoAnuncio } from "@/game/xbwapp/tipos";
import { Icone } from "./pecas";

export default function TelaAnuncios({
  estado,
  mudar,
  aoVoltar,
}: {
  estado: EstadoDoApp;
  mudar: (f: (e: EstadoDoApp) => EstadoDoApp) => void;
  aoVoltar: () => void;
}) {
  const [criando, setCriando] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [destino, setDestino] = useState<DestinoDoAnuncio>("conversa");
  const [publico, setPublico] = useState<string>(PUBLICOS[0]!.id);
  const [porDia, setPorDia] = useState(1000);
  const [dias, setDias] = useState(7);

  const total = porDia * dias;

  function criar() {
    if (!titulo.trim()) return;
    mudar(e =>
      criarAnuncio(e, { titulo, texto, destino, publico, porDia, dias })
    );
    setTitulo("");
    setTexto("");
    setCriando(false);
  }

  return (
    <section className="xbw-anuncios" aria-label="Gerenciar anúncios">
      <header className="xbw-topo">
        <button
          type="button"
          className="xbw-botao"
          onClick={aoVoltar}
          aria-label="Voltar"
        >
          <Icone nome="voltar" />
        </button>
        <strong>Gerenciar anúncios</strong>
      </header>

      <div className="xbw-rolar">
        {estado.anuncios.length > 0 && (
          <p className="xbw-resumo">
            {estado.anuncios.length} anúncios · investido{" "}
            {emReais(gastoTotal(estado))}
          </p>
        )}

        {criando ? (
          <div className="xbw-formulario xbw-formulario--dentro">
            <label>
              <span>Título</span>
              <input
                value={titulo}
                onChange={e => setTitulo(e.target.value.slice(0, 40))}
                placeholder="Entrega rápida no bairro"
              />
            </label>

            <label>
              <span>Texto do anúncio</span>
              <textarea
                value={texto}
                onChange={e => setTexto(e.target.value.slice(0, 140))}
                rows={3}
                placeholder="O que o cliente lê"
              />
            </label>

            <label>
              <span>Ao tocar, o cliente vai para</span>
              <select
                value={destino}
                onChange={e => setDestino(e.target.value as DestinoDoAnuncio)}
              >
                {DESTINOS.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.nome}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Quem vê</span>
              <select
                value={publico}
                onChange={e => setPublico(e.target.value)}
              >
                {PUBLICOS.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Por dia: {emReais(porDia)}</span>
              <input
                type="range"
                min={MENOR_POR_DIA}
                max={MAIOR_POR_DIA}
                step={100}
                value={porDia}
                onChange={e => setPorDia(Number(e.target.value))}
              />
            </label>

            <label>
              <span>
                Duração: {dias} {dias === 1 ? "dia" : "dias"}
              </span>
              <input
                type="range"
                min={MENOS_DIAS}
                max={MAIS_DIAS}
                value={dias}
                onChange={e => setDias(Number(e.target.value))}
              />
            </label>

            <p className="xbw-total">Total do período: {emReais(total)}</p>

            <div className="xbw-linha-botoes">
              <button type="button" onClick={() => setCriando(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className="xbw-acao"
                onClick={criar}
                disabled={!titulo.trim()}
              >
                Criar anúncio
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="xbw-acao xbw-acao--larga"
            onClick={() => setCriando(true)}
          >
            Criar anúncio
          </button>
        )}

        <ul className="xbw-caixas">
          {estado.anuncios.map(a => {
            const r = resultadoDoAnuncio(estado, a);
            return (
              <li key={a.id} className="xbw-caixa">
                <header>
                  <strong>{a.titulo}</strong>
                  <span
                    className={`xbw-selo-situacao xbw-selo-situacao--${a.situacao}`}
                  >
                    {comoEstaOAnuncio(a.situacao)}
                  </span>
                </header>

                {a.texto && <p>{a.texto}</p>}

                <dl className="xbw-numeros">
                  <div>
                    <dt>Alcance</dt>
                    <dd>{r.alcance.toLocaleString("pt-BR")}</dd>
                  </div>
                  <div>
                    <dt>Conversas</dt>
                    <dd>{r.conversas.toLocaleString("pt-BR")}</dd>
                  </div>
                  <div>
                    <dt>Gasto</dt>
                    <dd>{emReais(r.gasto)}</dd>
                  </div>
                </dl>

                <small className="xbw-dica">
                  {PUBLICOS.find(p => p.id === a.publico)?.nome} ·{" "}
                  {emReais(a.porDia)} por dia · {a.dias}{" "}
                  {a.dias === 1 ? "dia" : "dias"}
                </small>

                <div className="xbw-linha-botoes">
                  {a.situacao !== "no-ar" && a.situacao !== "terminado" && (
                    <button
                      type="button"
                      className="xbw-acao"
                      onClick={() => mudar(e => publicarAnuncio(e, a.id))}
                    >
                      {a.situacao === "pausado" ? "Retomar" : "Botar no ar"}
                    </button>
                  )}
                  {a.situacao === "no-ar" && (
                    <button
                      type="button"
                      onClick={() => mudar(e => pausarAnuncio(e, a.id))}
                    >
                      Pausar
                    </button>
                  )}
                  {a.situacao !== "terminado" && (
                    <button
                      type="button"
                      onClick={() => mudar(e => encerrarAnuncio(e, a.id))}
                    >
                      Encerrar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => mudar(e => apagarAnuncio(e, a.id))}
                  >
                    Apagar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        {!estado.anuncios.length && !criando && (
          <p className="xbw-vazio">
            Nenhum anúncio ainda. Crie um e ele começa a render assim que entrar
            no ar.
          </p>
        )}
      </div>
    </section>
  );
}
