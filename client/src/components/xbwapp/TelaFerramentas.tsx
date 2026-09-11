/**
 * FERRAMENTAS — a aba comercial, a mesma do WhatsApp Business.
 *
 * Ordem dele, 07/09/2026: "POR ULTIMO FERRAMENTAS, PRECISO DE GERENCIAR
 * ANUNCIOS COMPLETO, GUIA DE NEGOCIOS, PERFIL. CATALOGO, ANUNCIOS, GUIA DE
 * NEGOCIOS, COBRANÇA, MENSAGEM DE AUSENCIA... DENTRO DO GAME NADA DE
 * PLACEBORD".
 *
 * Esta tela e so o indice. Cada linha abre uma ferramenta que MEXE no estado de
 * verdade — nao ha nenhuma que so mostre desenho.
 */
import { hora } from "@/game/xbwapp/estado";
import type { EstadoDoApp } from "@/game/xbwapp/estado";
import {
  aReceber,
  emReais,
  estatisticas,
  perfilCompleto,
} from "@/game/xbwapp/negocio";
import { PRODUTOS } from "@/game/xbwapp/catalogo";
import { Icone } from "./pecas";
import type { NomeDeIcone } from "@/game/xbwapp/icones";

export type Ferramenta =
  | "perfil"
  | "catalogo"
  | "anuncios"
  | "guia"
  | "cobranca"
  | "automaticas"
  | "respostas"
  | "etiquetas"
  | "estatisticas"
  | "ajustes";

export default function TelaFerramentas({
  estado,
  aoAbrir,
}: {
  estado: EstadoDoApp;
  aoAbrir: (qual: Ferramenta) => void;
}) {
  const numeros = estatisticas(estado);
  const noAr = estado.anuncios.filter(a => a.situacao === "no-ar").length;
  const abertas = estado.cobrancas.filter(c => c.situacao === "enviada").length;
  const automaticasLigadas =
    (estado.automaticas.saudacao.ligada ? 1 : 0) +
    (estado.automaticas.ausencia.ligada ? 1 : 0);

  return (
    <section className="xbw-ferramentas" aria-label="Ferramentas">
      <header className="xbw-topo xbw-topo--marca">
        <strong className="xbw-marca">Ferramentas</strong>
      </header>

      <div className="xbw-rolar">
        <h2 className="xbw-secao">Seu negócio</h2>
        <ul className="xbw-itens">
          <Linha
            icone="contato"
            titulo="Perfil comercial"
            abaixo={
              perfilCompleto(estado.perfil) === 100
                ? "Completo"
                : `${perfilCompleto(estado.perfil)}% preenchido`
            }
            aoTocar={() => aoAbrir("perfil")}
          />
          <Linha
            icone="pagamento"
            titulo="Catálogo"
            abaixo={`${PRODUTOS.length} produtos do bairro`}
            aoTocar={() => aoAbrir("catalogo")}
          />
          <Linha
            icone="enquete"
            titulo="Gerenciar anúncios"
            abaixo={
              estado.anuncios.length
                ? `${estado.anuncios.length} anúncios · ${noAr} no ar`
                : "Nenhum anúncio ainda"
            }
            aoTocar={() => aoAbrir("anuncios")}
          />
          <Linha
            icone="local"
            titulo="Guia de negócios"
            abaixo="Os comércios do bairro"
            aoTocar={() => aoAbrir("guia")}
          />
          <Linha
            icone="documento"
            titulo="Cobrança"
            abaixo={
              abertas
                ? `${abertas} em aberto · ${emReais(aReceber(estado))}`
                : "Nenhuma cobrança em aberto"
            }
            aoTocar={() => aoAbrir("cobranca")}
          />
        </ul>

        <h2 className="xbw-secao">Atendimento</h2>
        <ul className="xbw-itens">
          <Linha
            icone="relogio"
            titulo="Mensagens automáticas"
            abaixo={
              automaticasLigadas
                ? `${automaticasLigadas} ligada${automaticasLigadas > 1 ? "s" : ""}`
                : "Saudação e ausência desligadas"
            }
            aoTocar={() => aoAbrir("automaticas")}
          />
          <Linha
            icone="responder"
            titulo="Respostas rápidas"
            abaixo={`${estado.respostasRapidas.length} guardadas`}
            aoTocar={() => aoAbrir("respostas")}
          />
          <Linha
            icone="fixar"
            titulo="Etiquetas"
            abaixo="Organize as conversas de trabalho"
            aoTocar={() => aoAbrir("etiquetas")}
          />
        </ul>

        <h2 className="xbw-secao">Números</h2>
        <ul className="xbw-itens">
          <Linha
            icone="onda"
            titulo="Estatísticas"
            abaixo={`${numeros.enviadas} enviadas · ${numeros.lidas} lidas`}
            aoTocar={() => aoAbrir("estatisticas")}
          />
          <Linha
            icone="abaAjustes"
            titulo="Configurações"
            abaixo={`Relógio do bairro: ${hora(estado.minuto)}`}
            aoTocar={() => aoAbrir("ajustes")}
          />
        </ul>
      </div>
    </section>
  );
}

function Linha({
  icone,
  titulo,
  abaixo,
  aoTocar,
}: {
  icone: NomeDeIcone;
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
