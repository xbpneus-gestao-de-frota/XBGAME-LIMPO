/**
 * MENSAGENS AUTOMATICAS — saudacao e ausencia.
 *
 * Ordem dele: "MENSAGEM DE AUSENCIA... FUNCIONALIDADES REAIS, DENTRO DO GAME
 * NADA DE PLACEBORD". Entao ela responde de verdade: ligada e fora do horario,
 * quem escrever para o jogador recebe a frase na hora, na propria conversa.
 *
 * "Fora do horario" pergunta ao PERFIL COMERCIAL, e nao a um horario escrito
 * aqui de novo — assim mudar o horario da loja num lugar so ja acerta os dois.
 */
import type { EstadoDoApp } from "@/game/xbwapp/estado";
import { hora } from "@/game/xbwapp/estado";
import {
  estaAusente,
  horarioDoPerfil,
  mudarAutomaticas,
} from "@/game/xbwapp/negocio";
import { Icone } from "./pecas";

const RELOGIO = Array.from({ length: 24 }, (_, h) => h * 60);

export default function TelaAutomaticas({
  estado,
  mudar,
  aoVoltar,
}: {
  estado: EstadoDoApp;
  mudar: (f: (e: EstadoDoApp) => EstadoDoApp) => void;
  aoVoltar: () => void;
}) {
  const { saudacao, ausencia } = estado.automaticas;
  const janela = horarioDoPerfil(estado.perfil.horario);

  return (
    <section className="xbw-formulario" aria-label="Mensagens automáticas">
      <header className="xbw-topo">
        <button
          type="button"
          className="xbw-botao"
          onClick={aoVoltar}
          aria-label="Voltar"
        >
          <Icone nome="voltar" />
        </button>
        <strong>Mensagens automáticas</strong>
      </header>

      <div className="xbw-rolar">
        <h2 className="xbw-secao">Mensagem de saudação</h2>

        <label className="xbw-liga">
          <span>Enviar saudação</span>
          <input
            type="checkbox"
            checked={saudacao.ligada}
            onChange={e =>
              mudar(s =>
                mudarAutomaticas(s, { saudacao: { ligada: e.target.checked } })
              )
            }
          />
        </label>

        <label>
          <span>O que ela diz</span>
          <textarea
            rows={3}
            value={saudacao.texto}
            onChange={e =>
              mudar(s =>
                mudarAutomaticas(s, {
                  saudacao: { texto: e.target.value.slice(0, 200) },
                })
              )
            }
          />
        </label>

        <label>
          <span>Para quem</span>
          <select
            value={saudacao.para}
            onChange={e =>
              mudar(s =>
                mudarAutomaticas(s, {
                  saudacao: { para: e.target.value as "todos" | "novos" },
                })
              )
            }
          >
            <option value="novos">Só quem nunca falou comigo</option>
            <option value="todos">Todo mundo</option>
          </select>
        </label>

        <h2 className="xbw-secao">Mensagem de ausência</h2>

        <label className="xbw-liga">
          <span>Enviar quando eu estiver fora</span>
          <input
            type="checkbox"
            checked={ausencia.ligada}
            onChange={e =>
              mudar(s =>
                mudarAutomaticas(s, { ausencia: { ligada: e.target.checked } })
              )
            }
          />
        </label>

        <label>
          <span>O que ela diz</span>
          <textarea
            rows={3}
            value={ausencia.texto}
            onChange={e =>
              mudar(s =>
                mudarAutomaticas(s, {
                  ausencia: { texto: e.target.value.slice(0, 200) },
                })
              )
            }
          />
        </label>

        <label>
          <span>Quando enviar</span>
          <select
            value={ausencia.quando}
            onChange={e =>
              mudar(s =>
                mudarAutomaticas(s, {
                  ausencia: {
                    quando: e.target.value as
                      | "sempre"
                      | "fora-do-horario"
                      | "escolhido",
                  },
                })
              )
            }
          >
            <option value="fora-do-horario">
              Fora do horário do meu perfil
            </option>
            <option value="sempre">Sempre</option>
            <option value="escolhido">Num horário que eu escolho</option>
          </select>
        </label>

        {ausencia.quando === "fora-do-horario" && (
          <p className="xbw-dica">
            {janela
              ? `Seu perfil diz ${hora(janela.de)} às ${hora(janela.ate)}. Fora disso, a mensagem sai sozinha.`
              : "Seu perfil ainda não tem horário. Preencha o horário no perfil comercial, senão a ausência não vale."}
          </p>
        )}

        {ausencia.quando === "escolhido" && (
          <div className="xbw-duas">
            <label>
              <span>Das</span>
              <select
                value={ausencia.de}
                onChange={e =>
                  mudar(s =>
                    mudarAutomaticas(s, {
                      ausencia: { de: Number(e.target.value) },
                    })
                  )
                }
              >
                {RELOGIO.map(m => (
                  <option key={m} value={m}>
                    {hora(m)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Até</span>
              <select
                value={ausencia.ate}
                onChange={e =>
                  mudar(s =>
                    mudarAutomaticas(s, {
                      ausencia: { ate: Number(e.target.value) },
                    })
                  )
                }
              >
                {RELOGIO.map(m => (
                  <option key={m} value={m}>
                    {hora(m)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        <p className="xbw-dica">
          Agora são {hora(estado.minuto)} —{" "}
          {estaAusente(estado)
            ? "quem escrever agora recebe a mensagem de ausência."
            : "a mensagem de ausência não está valendo agora."}
        </p>
      </div>
    </section>
  );
}
