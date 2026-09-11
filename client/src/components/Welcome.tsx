/**
 * A tela de boas-vindas: a XB Technology recebe quem acabou de chegar.
 *
 * O filme termina no portao da trilha. Esta tela NAO corta esse quadro — ela
 * continua nele. A pessoa nao e levada para um formulario noutro lugar: ela
 * segue parada no portao, e quem fala com ela e a XB Technology, o sistema que
 * acompanha a crianca pelo resto do jogo.
 *
 * Sobre a marca, duas regras que valem aqui e no jogo inteiro:
 *
 * 1. O NOME E "XB TECHNOLOGY". Nao e a fabricante de pneus — e o sistema
 *    inteligente que vive dentro da historia.
 * 2. A MARCA APARECE UMA VEZ SO. A arte do portao ja tem o simbolo aceso em
 *    cima; repetir o logotipo num cabecalho por cima dela seria dizer a mesma
 *    coisa duas vezes na mesma tela. Aqui a marca aparece so como quem esta
 *    falando, em letra pequena, e mais nada.
 *
 * Duas decisoes de uso, tomadas contra o obvio:
 *
 * - O CAMPO DE NOME NAO PEGA O FOCO SOZINHO. No celular, focar campo abre
 *   teclado, e teclado come metade da tela: a pessoa entraria vendo um teclado
 *   por cima da cena que ela nem chegou a olhar.
 * - OS OITO ROLAM DE LADO. Lado a lado num celular eles virariam selos sem
 *   rosto. Um de cada vez em tamanho de ver, e a fita rola.
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
    () =>
      ENTREGADORES.find(pessoa => pessoa.id === escolhido) ?? ENTREGADORES[0]!,
    [escolhido]
  );
  const pronto = nomeValido(nome);

  return (
    <section className="portao" aria-labelledby="portao-titulo">
      {/*
        O quadro em que o filme parou. Fica de fundo, sem borda e sem moldura:
        a ideia e que a cena nao terminou, so ficou quieta esperando resposta.
      */}
      <div
        className="portao__cena"
        style={{ backgroundImage: `url(${GAME_ASSETS.openingClipPoster})` }}
        aria-hidden="true"
      />

      {/* A voz da XB Technology. E o unico lugar da tela com marca. */}
      <div className="portao__painel">
        <p className="portao__quem">XB TECHNOLOGY</p>

        <h1 id="portao-titulo" className="portao__fala">
          Chegou gente nova na trilha.{" "}
          <strong>Quem vai pegar essa bike?</strong>
        </h1>

        <p className="portao__jeito" aria-live="polite">
          <b>{entregador.nome}</b> — {entregador.jeito}
        </p>

        {/*
          Lista de radio de verdade, e nao divs clicaveis: a seta do teclado
          anda entre os oito e o leitor de tela anuncia a posicao sozinho.
        */}
        <div
          className="portao__fila"
          role="radiogroup"
          aria-label="Escolha quem vai pegar a bike"
        >
          {ENTREGADORES.map(pessoa => (
            <button
              key={pessoa.id}
              type="button"
              role="radio"
              aria-checked={pessoa.id === escolhido}
              className="portao__pessoa"
              data-escolhido={pessoa.id === escolhido}
              onClick={() => setEscolhido(pessoa.id)}
            >
              <img src={pessoa.arte} alt="" aria-hidden="true" />
              <span>{pessoa.nome}</span>
            </button>
          ))}
        </div>

        <label className="portao__campo">
          <span>E COMO EU TE CHAMO?</span>
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
          className="portao__acao"
          type="button"
          disabled={!pronto}
          onClick={() => aoComecar(nome, entregador.id)}
        >
          {pronto ? "ABRIR O PORTÃO →" : "ESCREVA SEU NOME"}
        </button>
      </div>
    </section>
  );
}
