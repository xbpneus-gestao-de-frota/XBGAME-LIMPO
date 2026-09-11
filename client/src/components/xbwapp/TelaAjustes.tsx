/**
 * AJUSTES E PERFIL — quem voce e dentro do aplicativo.
 *
 * ── A REPUTACAO MORA AQUI, E EM PALAVRA ───────────────────────────────────
 *
 * "62 de reputacao" nao muda decisao nenhuma. "Bem falado na Padaria" muda: a
 * pessoa entende por que aquela loja chamou ela primeiro. O numero fica
 * guardado no jogo; a tela mostra o que ele QUER DIZER.
 */
import { CONTATOS, VOCE, nomeDe } from "@/game/xbwapp/contatos";
import { comoEstaAReputacao } from "@/game/xbwapp/efeitos";
import type { EstadoDoApp } from "@/game/xbwapp/estado";
import { useState } from "react";
import { trocarTema } from "@/game/xbwapp/ajustes";
import { favoritas } from "@/game/xbwapp/mensagens";
import type { IdContato } from "@/game/xbwapp/tipos";
import {
  TelaFavoritas,
  TelaMeuCodigo,
  TelaNotificacoes,
  TelaPrivacidade,
  type DentroDeConfig,
} from "./TelaConfiguracoesDentro";
import { Icone, Retrato } from "./pecas";

export default function TelaAjustes({
  estado,
  mudar,
  entregador,
  aoVoltar,
  aoAbrirConversa,
}: {
  estado: EstadoDoApp;
  mudar: (f: (e: EstadoDoApp) => EstadoDoApp) => void;
  entregador?: { nome: string; foto?: string };
  /** Quando as configuracoes vem de Ferramentas, ha para onde voltar. */
  aoVoltar?: () => void;
  aoAbrirConversa?: (quem: IdContato) => void;
}) {
  /*
   * As quatro linhas de baixo eram so texto. Ordem dele: "NADA DE PLACEBORD".
   * Agora cada uma abre uma tela que mexe no estado de verdade.
   */
  const [dentro, setDentro] = useState<DentroDeConfig | null>(null);

  if (dentro === "notificacoes")
    return (
      <TelaNotificacoes
        estado={estado}
        mudar={mudar}
        aoVoltar={() => setDentro(null)}
      />
    );
  if (dentro === "privacidade")
    return (
      <TelaPrivacidade
        estado={estado}
        mudar={mudar}
        aoVoltar={() => setDentro(null)}
      />
    );
  if (dentro === "codigo")
    return (
      <TelaMeuCodigo entregador={entregador} aoVoltar={() => setDentro(null)} />
    );
  if (dentro === "favoritas")
    return (
      <TelaFavoritas
        estado={estado}
        mudar={mudar}
        aoVoltar={() => setDentro(null)}
        aoAbrirConversa={aoAbrirConversa ?? (() => setDentro(null))}
      />
    );

  const comQuemFalou = CONTATOS.filter(c =>
    estado.mensagens.some(m => m.conversa === c.id)
  );

  return (
    <section className="xbw-ajustes" aria-label="Ajustes">
      <header className="xbw-topo xbw-topo--marca">
        {aoVoltar && (
          <button
            type="button"
            className="xbw-botao"
            onClick={aoVoltar}
            aria-label="Voltar"
          >
            <Icone nome="voltar" />
          </button>
        )}
        <strong className="xbw-marca">Configurações</strong>
      </header>

      <div className="xbw-perfil">
        {entregador?.foto ? (
          <img
            src={entregador.foto}
            alt=""
            className="xbw-perfil__foto"
            draggable={false}
          />
        ) : (
          <span className="xbw-perfil__foto xbw-perfil__foto--vazia">
            <Icone nome="avatarVazio" />
          </span>
        )}
        <span>
          <strong>{entregador?.nome ?? "Entregador"}</strong>
          <small>{VOCE.sobre}</small>
        </span>
      </div>

      <h3 className="xbw-titulo">Como o bairro te vê</h3>
      <ul className="xbw-reputacao">
        {comQuemFalou.map(c => {
          const pontos = estado.reputacao[c.id] ?? 50;
          return (
            <li key={c.id}>
              <Retrato quem={c.id} tamanho="pequeno" />
              <span>
                <strong>{nomeDe(c.id)}</strong>
                <small>{comoEstaAReputacao(pontos)}</small>
              </span>
              <span className="xbw-regua" aria-hidden="true">
                <i style={{ width: `${pontos}%` }} />
              </span>
            </li>
          );
        })}
      </ul>
      {comQuemFalou.length === 0 && (
        <p className="xbw-vazio">Você ainda não falou com ninguém.</p>
      )}

      <h3 className="xbw-titulo">O aplicativo</h3>
      <ul className="xbw-itens">
        <Opcao
          icone="abaSino"
          titulo="Notificações"
          abaixo={
            estado.silenciadas.length > 0
              ? `${estado.silenciadas.length} conversas silenciadas`
              : "Todas ligadas"
          }
          aoTocar={() => setDentro("notificacoes")}
        />
        <Opcao
          icone="abaCadeado"
          titulo="Privacidade"
          abaixo={
            estado.bloqueados.length > 0
              ? `${estado.bloqueados.length} bloqueados`
              : "Visto, foto, status e recibos"
          }
          aoTocar={() => setDentro("privacidade")}
        />
        <Opcao
          icone="abaQr"
          titulo="Meu código"
          abaixo="O código que as lojas usam para te achar"
          aoTocar={() => setDentro("codigo")}
        />
        <Opcao
          icone="estrela"
          titulo="Mensagens favoritas"
          abaixo={`${favoritas(estado).length} com estrela`}
          aoTocar={() => setDentro("favoritas")}
        />
      </ul>

      <h3 className="xbw-titulo">Aparência</h3>
      <label className="xbw-liga">
        <span>Tema claro</span>
        <input
          type="checkbox"
          checked={estado.aparencia.tema === "claro"}
          onChange={ev =>
            mudar(e => trocarTema(e, ev.target.checked ? "claro" : "escuro"))
          }
        />
      </label>
    </section>
  );
}

/** Uma linha de Configurações que ABRE alguma coisa. */
function Opcao({
  icone,
  titulo,
  abaixo,
  aoTocar,
}: {
  icone: Parameters<typeof Icone>[0]["nome"];
  titulo: string;
  abaixo: string;
  aoTocar: () => void;
}) {
  return (
    <li>
      <button type="button" onClick={aoTocar}>
        <Icone nome={icone} />
        <span>
          <strong>{titulo}</strong>
          <small>{abaixo}</small>
        </span>
        <i className="xbw-seta" aria-hidden="true">
          ›
        </i>
      </button>
    </li>
  );
}
