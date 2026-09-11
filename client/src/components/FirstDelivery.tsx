/**
 * A primeira entrada na central.
 *
 * Quem abre o jogo pela primeira vez tem UMA coisa a fazer: a primeira
 * entrega. A central completa mostra, antes disso, caixa zerada, reputacao
 * zerada, 0 de 4 de experiencia, 0 operadores, "sem bike livre", "segunda bike
 * bloqueada" e quatro cadeados — ou seja, apresenta tudo o que a pessoa ainda
 * NAO pode fazer antes daquilo que ela pode. Esta tela tira tudo isso da
 * frente e deixa so a corrida.
 *
 * Ela vale enquanto nenhuma entrega foi concluida E nenhuma esta a caminho.
 * Assim que a pessoa despacha ou termina a primeira, a central de verdade
 * aparece — e ai os numeros e os cadeados ja significam alguma coisa: viraram
 * promessa em vez de parede.
 */
import { Gauge } from "lucide-react";
import type { CSSProperties } from "react";
import { GAME_ASSETS } from "@/game/assets";
import { ROUTES } from "@/game/progression";
import type { GameSnapshot } from "@/game/types";
import type { GameHandle } from "@/game/scene";
import { formatCredits } from "./format";

/**
 * A tela vale a pena? Fica aqui, e nao espalhada no meio do render, para a
 * regra poder ser lida (e conferida) num lugar so.
 */
export function ehPrimeiraEntrada(snapshot: GameSnapshot): boolean {
  return (
    snapshot.campaign.deliveries === 0 &&
    snapshot.campaign.activeDeliveries.length === 0
  );
}

export default function FirstDelivery({
  snapshot,
  handle,
}: {
  snapshot: GameSnapshot;
  handle: GameHandle;
}) {
  const rota = ROUTES[0]!;
  const previa = handle.previewRoute(rota.id);
  const pronto = previa.ok;
  const duracao = previa.plan?.duration ?? Math.max(3, rota.durationSeconds);
  const premio = previa.plan?.netReward ?? Math.max(0, rota.baseReward);

  return (
    <section
      className="game-screen primeira"
      aria-labelledby="primeira-titulo"
      style={
        {
          "--primeira-arte": `url(${GAME_ASSETS.referenceVertical})`,
        } as CSSProperties
      }
    >
      <div className="primeira__fundo" aria-hidden="true" />

      <header className="primeira__marca">
        <img src={GAME_ASSETS.logo} alt="" aria-hidden="true" />
        <span>
          <strong>XB TECHNOLOGY</strong>
          <small>CENTRAL LOGÍSTICA</small>
        </span>
      </header>

      <div className="primeira__cartao">
        <p className="primeira__olho">JORNADA INICIAL</p>
        <h1 id="primeira-titulo">SUA PRIMEIRA ENTREGA</h1>
        <p className="primeira__rota">{rota.name}</p>

        <div className="primeira__fatos">
          <span>
            <strong>{duracao}s</strong>
            <small>DE ROTA</small>
          </span>
          <span>
            <strong>{formatCredits(premio)}</strong>
            <small>NO CAIXA</small>
          </span>
        </div>

        <p className="primeira__ajuda">
          Pedale até o fim da rota. É essa corrida que coloca a operação em
          movimento.
        </p>

        <button
          className="primeira__acao"
          onClick={() => handle.startRun(rota.id)}
          disabled={!pronto}
        >
          <Gauge size={18} aria-hidden="true" />
          {pronto ? "PILOTAR" : "INDISPONÍVEL"}
        </button>

        {/*
         * Despachar continua existindo, mas em voz baixa. Antes eram dois
         * botoes do mesmo tamanho lado a lado, e quem chegava agora nao tinha
         * como saber qual dos dois era o caminho.
         */}
        <button
          className="primeira__alternativa"
          onClick={() => handle.dispatchRoute(rota.id)}
          disabled={!pronto}
        >
          prefiro que a central despache por mim
        </button>

        {!pronto && previa.message && (
          <p className="primeira__aviso" role="status">
            {previa.message}
          </p>
        )}
      </div>
    </section>
  );
}
