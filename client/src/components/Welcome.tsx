/**
 * A tela de boas-vindas: a pessoa diz o nome e escolhe quem vai pedalar.
 *
 * Ela aparece UMA vez, entre o filme de abertura e a central, e e a primeira
 * vez que o jogo pergunta alguma coisa em vez de contar. Duas decisoes de
 * desenho valem ser ditas, porque as duas foram tomadas contra o obvio:
 *
 * 1. O CAMPO DE NOME NAO PEGA O FOCO SOZINHO. No celular, focar um campo abre
 *    o teclado, e o teclado come metade da tela — a pessoa entraria no jogo
 *    vendo um teclado por cima de oito bonecos que ela nem chegou a olhar.
 *    Primeiro se escolhe (que e a parte boa), depois se digita.
 *
 * 2. OS OITO NAO APARECEM TODOS DE UMA VEZ. Numa tela de celular, oito
 *    retratos lado a lado viram oito selos de 40 px onde nao se enxerga rosto
 *    nenhum. Entao: um grande, que da para ver a cara e ler o jeito, e uma
 *    fita de miniaturas que rola — que e como todo jogo escolhe personagem no
 *    celular, e por um bom motivo.
 */
import { useMemo, useState } from "react";
import { ENTREGADORES, LIMITE_DO_NOME, nomeValido } from "@/game/identity";
import type { EntregadorId } from "@/game/identity";
import { GAME_ASSETS } from "@/game/assets";

export default function Welcome({
  aoComecar,
}: {
  aoComecar(nome: string, entregadorId: EntregadorId): void;
}) {
  const [nome, setNome] = useState("");
  const [escolhido, setEscolhido] = useState<EntregadorId>(ENTREGADORES[0]!.id);

  const entregador = useMemo(
    () => ENTREGADORES.find(pessoa => pessoa.id === escolhido) ?? ENTREGADORES[0]!,
    [escolhido]
  );
  const pronto = nomeValido(nome);

  return (
    <section className="boasvindas" aria-labelledby="boasvindas-titulo">
      <div className="boasvindas__fundo" aria-hidden="true" />

      <header className="boasvindas__marca">
        <img src={GAME_ASSETS.logo} alt="" aria-hidden="true" />
        <span>
          <strong>XB PNEUS</strong>
          <small>CENTRAL LOGÍSTICA</small>
        </span>
      </header>

      <div className="boasvindas__miolo">
        <div className="boasvindas__palco">
          {/*
            A arte troca junto com a escolha. A `key` forca o React a montar
            uma imagem nova a cada troca, e e o que faz a entrada valer uma
            animacao em vez de o retrato mudar de cara sem avisar.
          */}
          <img
            key={entregador.id}
            className="boasvindas__retrato"
            src={entregador.arte}
            alt={`${entregador.nome}, entregador da XB`}
          />
        </div>

        <div className="boasvindas__ficha">
          <p className="boasvindas__olho">SUA PRIMEIRA ENTREGA COMEÇA AQUI</p>
          <h1 id="boasvindas-titulo">Quem vai pedalar?</h1>

          <div className="boasvindas__nomeEscolhido">
            <strong>{entregador.nome}</strong>
            <span>{entregador.jeito}</span>
          </div>

          {/*
            Uma lista de radio de verdade, e nao um punhado de divs clicaveis:
            assim a seta do teclado anda entre os oito e o leitor de tela
            anuncia "3 de 8" sozinho.
          */}
          <div
            className="boasvindas__fita"
            role="radiogroup"
            aria-label="Escolha o entregador"
          >
            {ENTREGADORES.map(pessoa => (
              <button
                key={pessoa.id}
                type="button"
                role="radio"
                aria-checked={pessoa.id === escolhido}
                className="boasvindas__selo"
                data-escolhido={pessoa.id === escolhido}
                onClick={() => setEscolhido(pessoa.id)}
              >
                <img src={pessoa.arte} alt="" aria-hidden="true" />
                <span>{pessoa.nome}</span>
              </button>
            ))}
          </div>

          <label className="boasvindas__campo">
            <span>COMO VOCÊ QUER SER CHAMADO</span>
            <input
              type="text"
              value={nome}
              maxLength={LIMITE_DO_NOME}
              placeholder="Seu nome"
              autoComplete="off"
              autoCapitalize="words"
              spellCheck={false}
              enterKeyHint="go"
              onChange={evento => setNome(evento.target.value)}
              onKeyDown={evento => {
                if (evento.key === "Enter" && pronto) {
                  aoComecar(nome, entregador.id);
                }
              }}
            />
          </label>

          <button
            className="boasvindas__acao"
            type="button"
            disabled={!pronto}
            onClick={() => aoComecar(nome, entregador.id)}
          >
            {pronto ? "COMEÇAR A JORNADA" : "ESCREVA SEU NOME"}
          </button>

          {/*
            Nao ha promessa de "da para trocar depois" escrita aqui: o motor
            aceita trocar, mas ainda nao existe botao para isso. Texto de tela
            que promete o que o jogo nao faz e a mentira mais barata de
            escrever e a mais cara de descobrir.
          */}
        </div>
      </div>
    </section>
  );
}
