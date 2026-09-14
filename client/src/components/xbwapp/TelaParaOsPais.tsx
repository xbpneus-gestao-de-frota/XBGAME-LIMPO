/**
 * PARA OS PAIS — o que é este limite, e como mudá-lo.
 *
 * Ordem dele, 13/09/2026: "dentro de ferramentas, devemos ter a tela
 * explicando aos pais, e pode ser salva com senha dos pais e regulagem de
 * tempo".
 *
 * ── POR QUE A EXPLICACAO VEM ANTES DOS BOTOES ─────────────────────────────
 *
 * Quem chega aqui e um adulto que viu o filho parar no meio do jogo e quer
 * entender o que aconteceu. Se a primeira coisa na tela fosse um campo de
 * senha, a resposta dele seria desligar o limite sem saber o que desligou.
 * Entao a tela explica primeiro, em frases curtas, e so depois oferece os dois
 * numeros que ele pode mexer.
 *
 * ── A TRANCA E DE CRIANCA, E A TELA DIZ ISSO ──────────────────────────────
 *
 * A senha guarda um resumo do que foi digitado, para a palavra nao ficar
 * escrita por ai — mas quem sabe mexer no navegador passa por ela. A tela fala
 * isso com todas as letras. Prometer proteção que nao existe seria pior que
 * nao ter tranca nenhuma: o adulto confiaria numa cerca de papel.
 *
 * ── OS LIMITES DOS NUMEROS SAO DELE ───────────────────────────────────────
 *
 * Jogo: de 15 minutos a duas horas. Descanso: de 10 a 30 minutos, como ele
 * pediu. Numero fora disso nao e recusado com sermão — e aparado para o mais
 * perto que cabe, e o campo mostra o que ficou valendo.
 */
import { useState } from "react";

import { TETO_DE_USO_EM_MINUTOS } from "@/game/xbwapp/oCelular";
import {
  DESCANSO_MAXIMO,
  DESCANSO_MINIMO,
  apararDescanso,
  definirDescanso,
  definirSenhaDosPais,
  definirTetoDeUso,
  descansoEmMinutos,
  senhaDosPaisConfere,
  temSenhaDosPais,
  tetoDeUso,
} from "@/game/xbwapp/oTempoDeUso";
import { Icone } from "./pecas";

/** O jogo nunca fica com menos de um quarto de hora nem com mais de duas. */
const JOGO_MINIMO = 15;
const JOGO_MAXIMO = 120;

function apararJogo(minutos: number): number {
  if (!Number.isFinite(minutos)) return TETO_DE_USO_EM_MINUTOS;
  return Math.min(JOGO_MAXIMO, Math.max(JOGO_MINIMO, Math.round(minutos)));
}

export default function TelaParaOsPais({ aoVoltar }: { aoVoltar: () => void }) {
  const [destrancada, setDestrancada] = useState(() => !temSenhaDosPais());
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState(false);

  const [jogo, setJogo] = useState(() => tetoDeUso());
  const [descanso, setDescanso] = useState(() => descansoEmMinutos());
  const [novaSenha, setNovaSenha] = useState("");
  const [salvo, setSalvo] = useState(false);

  function entrar() {
    if (senhaDosPaisConfere(senha)) {
      setDestrancada(true);
      setErro(false);
      setSenha("");
      return;
    }
    setErro(true);
  }

  function guardar() {
    const jogoValido = apararJogo(jogo);
    const descansoValido = apararDescanso(descanso);
    definirTetoDeUso(jogoValido);
    definirDescanso(descansoValido);
    if (novaSenha) definirSenhaDosPais(novaSenha);
    setJogo(jogoValido);
    setDescanso(descansoValido);
    setNovaSenha("");
    setSalvo(true);
  }

  return (
    <section className="xbw-pais" aria-label="Para os pais">
      <header className="xbw-topo">
        <button
          type="button"
          className="xbw-botao"
          onClick={aoVoltar}
          aria-label="Voltar"
        >
          <Icone nome="voltar" />
        </button>
        <strong className="xbw-marca">Para os pais</strong>
      </header>

      <div className="xbw-rolar">
        <div className="xbw-pais__texto">
          <h2>O celular do jogo tem bateria</h2>
          <p>
            Ele começa carregado e vai descendo enquanto o jogo está na frente.
            Janela minimizada ou computador dormindo não gastam bateria.
          </p>
          <p>
            Quando a bateria acaba, o jogo é salvo e aparece uma tela dizendo
            que o celular foi recarregar. Nada se perde: no fim do descanso ele
            volta exatamente de onde parou, com a bateria cheia.
          </p>
          <p>
            O total do dia fica guardado nesta máquina. Fechar e abrir o jogo
            não devolve tempo, e apagar o jogo salvo também não.
          </p>
        </div>

        {!destrancada ? (
          <div className="xbw-pais__tranca">
            <label>
              <span>Senha</span>
              <input
                type="password"
                value={senha}
                onChange={e => {
                  setSenha(e.target.value);
                  setErro(false);
                }}
              />
            </label>
            {erro && <p className="xbw-pais__erro">Senha não confere.</p>}
            <button type="button" className="xbw-pais__salvar" onClick={entrar}>
              Entrar
            </button>
          </div>
        ) : (
          <div className="xbw-pais__ajustes">
            <label>
              <span>Tempo de jogo por dia</span>
              <input
                type="number"
                min={JOGO_MINIMO}
                max={JOGO_MAXIMO}
                value={jogo}
                onChange={e => {
                  setJogo(Number(e.target.value));
                  setSalvo(false);
                }}
              />
              <small>
                de {JOGO_MINIMO} a {JOGO_MAXIMO} minutos
              </small>
            </label>

            <label>
              <span>Descanso quando a bateria acaba</span>
              <input
                type="number"
                min={DESCANSO_MINIMO}
                max={DESCANSO_MAXIMO}
                value={descanso}
                onChange={e => {
                  setDescanso(Number(e.target.value));
                  setSalvo(false);
                }}
              />
              <small>
                de {DESCANSO_MINIMO} a {DESCANSO_MAXIMO} minutos
              </small>
            </label>

            <label>
              <span>Senha dos pais</span>
              <input
                type="password"
                value={novaSenha}
                placeholder={temSenhaDosPais() ? "trocar a senha" : "criar senha"}
                onChange={e => {
                  setNovaSenha(e.target.value);
                  setSalvo(false);
                }}
              />
              <small>
                Deixe em branco para manter a atual. Esta senha é uma tranca de
                criança, e não segurança: quem souber mexer no navegador passa
                por ela.
              </small>
            </label>

            <button type="button" className="xbw-pais__salvar" onClick={guardar}>
              Salvar
            </button>
            {salvo && <p className="xbw-pais__salvo">Guardado.</p>}
          </div>
        )}
      </div>
    </section>
  );
}
