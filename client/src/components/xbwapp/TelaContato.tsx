/**
 * OS DADOS DA CONVERSA — o perfil de quem esta do outro lado.
 *
 * Retrato grande, o recado do perfil, a galeria do que ja foi trocado, e as
 * decisoes que so cabem aqui: silenciar, papel de parede so desta conversa,
 * mensagens temporarias, etiqueta de trabalho, bloquear.
 *
 * ── BLOQUEAR FICA POR ULTIMO, E EM VERMELHO ───────────────────────────────
 *
 * E a decisao mais pesada da tela. Em cima, no meio de coisas leves como papel
 * de parede, ela seria apertada sem querer.
 */
import { useState } from "react";
import { contato, nomeDe } from "@/game/xbwapp/contatos";
import { midiaDa } from "@/game/xbwapp/mensagens";
import {
  ETIQUETAS,
  PAPEIS,
  TEMPOS,
  bloquear,
  desbloquear,
  etiquetar,
  mudarTemporarias,
  papelDa,
  trocarPapel,
} from "@/game/xbwapp/ajustes";
import { comoEstaAReputacao } from "@/game/xbwapp/efeitos";
import { silenciar } from "@/game/xbwapp/estado";
import type { EstadoDoApp } from "@/game/xbwapp/estado";
import type { IdContato, TempoTemporario } from "@/game/xbwapp/tipos";
import { Icone, Retrato } from "./pecas";

export default function TelaContato({
  estado,
  mudar,
  quem,
  aoVoltar,
  aoLigar,
}: {
  estado: EstadoDoApp;
  mudar: (f: (e: EstadoDoApp) => EstadoDoApp) => void;
  quem: IdContato;
  aoVoltar: () => void;
  aoLigar?: (tipo: "voz" | "video") => void;
}) {
  const [vendoMidia, setVendoMidia] = useState(false);
  const c = contato(quem);
  const grupo = estado.grupos.find(g => g.id === quem);
  const midia = midiaDa(estado, quem);
  const bloqueado = estado.bloqueados.includes(quem);
  const etiquetasDaConversa = estado.etiquetas[quem] ?? [];

  return (
    <section className="xbw-contato" aria-label={`Dados de ${nomeDe(quem)}`}>
      <header className="xbw-topo">
        <button
          type="button"
          className="xbw-botao"
          onClick={aoVoltar}
          aria-label="Voltar"
        >
          <Icone nome="voltar" />
        </button>
        <strong className="xbw-marca">Dados da conversa</strong>
      </header>

      <div className="xbw-contato__cabeca">
        <Retrato quem={quem} tamanho="grande" />
        <strong>{nomeDe(quem)}</strong>
        <small>{c?.sobre ?? grupo?.descricao ?? ""}</small>
        {c?.endereco && <small>{c.endereco}</small>}
        {c?.horario && <small>{c.horario}</small>}
        <span className="xbw-contato__acoes">
          <button type="button" onClick={() => aoLigar?.("voz")}>
            <Icone nome="telefone" /> <span>Ligar</span>
          </button>
          <button type="button" onClick={() => aoLigar?.("video")}>
            <Icone nome="video" /> <span>Vídeo</span>
          </button>
          <button type="button" onClick={() => mudar(e => silenciar(e, quem))}>
            <Icone nome="silenciar" />
            <span>
              {estado.silenciadas.includes(quem) ? "Reativar" : "Silenciar"}
            </span>
          </button>
        </span>
      </div>

      {c && (
        <>
          <h3 className="xbw-titulo">Como ele te vê</h3>
          <p className="xbw-contato__reputacao">
            {comoEstaAReputacao(estado.reputacao[quem] ?? 50)}
          </p>
        </>
      )}

      {grupo && (
        <>
          <h3 className="xbw-titulo">{grupo.membros.length} participantes</h3>
          <ul className="xbw-membros">
            {grupo.membros.map(m => (
              <li key={m}>
                <Retrato quem={m} tamanho="pequeno" />
                <span>{m === "voce" ? "Você" : nomeDe(m)}</span>
                {grupo.donos.includes(m) && <em>dono</em>}
              </li>
            ))}
          </ul>
        </>
      )}

      <h3 className="xbw-titulo">Mídia, links e docs</h3>
      {midia.length === 0 ? (
        <p className="xbw-vazio">Nada trocado ainda.</p>
      ) : (
        <button
          type="button"
          className="xbw-contato__midia"
          onClick={() => setVendoMidia(v => !v)}
        >
          <Icone nome="galeria" /> {midia.length} item(ns)
        </button>
      )}
      {vendoMidia && (
        <div className="xbw-galeria">
          {midia.map(m => (
            <span key={m.id}>
              {m.imagem ? (
                <img src={m.imagem} alt="" draggable={false} />
              ) : (
                <Icone nome={m.tipo === "audio" ? "audio" : "documento"} />
              )}
            </span>
          ))}
        </div>
      )}

      <h3 className="xbw-titulo">Papel de parede desta conversa</h3>
      <div className="xbw-papeis">
        {PAPEIS.map(p => (
          <button
            key={p.id}
            type="button"
            className={
              papelDa(estado, quem) === p.id
                ? "xbw-papel xbw-papel--atual"
                : "xbw-papel"
            }
            style={{ background: p.fundo }}
            onClick={() => mudar(e => trocarPapel(e, p.id, quem))}
          >
            <span>{p.nome}</span>
          </button>
        ))}
      </div>

      <h3 className="xbw-titulo">Mensagens temporárias</h3>
      <div className="xbw-escolhas">
        {TEMPOS.map(t => (
          <button
            key={t.valor}
            type="button"
            className={
              (estado.temporarias[quem] ?? 0) === t.valor
                ? "xbw-escolha xbw-escolha--atual"
                : "xbw-escolha"
            }
            onClick={() =>
              mudar(e => mudarTemporarias(e, quem, t.valor as TempoTemporario))
            }
          >
            {t.nome}
          </button>
        ))}
      </div>

      <h3 className="xbw-titulo">Etiquetas</h3>
      <div className="xbw-escolhas">
        {ETIQUETAS.map(et => (
          <button
            key={et.id}
            type="button"
            className={
              etiquetasDaConversa.includes(et.id)
                ? "xbw-escolha xbw-escolha--atual"
                : "xbw-escolha"
            }
            style={
              etiquetasDaConversa.includes(et.id)
                ? { background: et.cor, color: "#04301f" }
                : undefined
            }
            onClick={() => mudar(e => etiquetar(e, quem, et.id))}
          >
            {et.nome}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="xbw-bloquear"
        onClick={() =>
          mudar(e => (bloqueado ? desbloquear(e, quem) : bloquear(e, quem)))
        }
      >
        <Icone nome="abaCadeado" />
        {bloqueado ? `Desbloquear ${nomeDe(quem)}` : `Bloquear ${nomeDe(quem)}`}
      </button>
    </section>
  );
}
