/**
 * PERFIL COMERCIAL — o que o cliente ve antes de escrever.
 *
 * Escreve de verdade no estado: o que for salvo aqui e o que a mensagem de
 * ausencia usa para saber o horario da loja, e o que o guia de negocios mostra.
 * Nao e formulario de enfeite.
 */
import { useState } from "react";
import type { EstadoDoApp } from "@/game/xbwapp/estado";
import {
  CATEGORIAS,
  horarioDoPerfil,
  mudarPerfil,
  perfilCompleto,
} from "@/game/xbwapp/negocio";
import type { PerfilComercial } from "@/game/xbwapp/tipos";
import { Icone, Retrato } from "./pecas";

export default function TelaPerfilComercial({
  estado,
  mudar,
  aoVoltar,
}: {
  estado: EstadoDoApp;
  mudar: (f: (e: EstadoDoApp) => EstadoDoApp) => void;
  aoVoltar: () => void;
}) {
  const [rascunho, setRascunho] = useState<PerfilComercial>(estado.perfil);
  const [salvo, setSalvo] = useState(false);

  function campo(qual: keyof PerfilComercial, valor: string) {
    setRascunho(r => ({ ...r, [qual]: valor }));
    setSalvo(false);
  }

  const horarioEntendido = horarioDoPerfil(rascunho.horario);

  return (
    <section className="xbw-formulario" aria-label="Perfil comercial">
      <header className="xbw-topo">
        <button
          type="button"
          className="xbw-botao"
          onClick={aoVoltar}
          aria-label="Voltar"
        >
          <Icone nome="voltar" />
        </button>
        <strong>Perfil comercial</strong>
      </header>

      <div className="xbw-rolar">
        <div className="xbw-perfil-topo">
          <Retrato quem="voce" tamanho="grande" />
          <p>{perfilCompleto(rascunho)}% do perfil preenchido</p>
        </div>

        <label>
          <span>Nome do negócio</span>
          <input
            value={rascunho.nome}
            onChange={e => campo("nome", e.target.value)}
            placeholder="Como o cliente te chama"
          />
        </label>

        <label>
          <span>Categoria</span>
          <select
            value={rascunho.categoria}
            onChange={e => campo("categoria", e.target.value)}
          >
            {CATEGORIAS.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Descrição</span>
          <textarea
            value={rascunho.descricao}
            onChange={e => campo("descricao", e.target.value.slice(0, 160))}
            rows={3}
            placeholder="O que você faz, em uma frase"
          />
        </label>

        <label>
          <span>Endereço</span>
          <input
            value={rascunho.endereco}
            onChange={e => campo("endereco", e.target.value)}
            placeholder="Rua e número"
          />
        </label>

        <label>
          <span>Horário</span>
          <input
            value={rascunho.horario}
            onChange={e => campo("horario", e.target.value)}
            placeholder="8h às 18h"
          />
          <small className="xbw-dica">
            {horarioEntendido
              ? "A mensagem de ausência já sabe usar este horário."
              : "Escreva assim: 8h às 18h — a mensagem de ausência usa isso."}
          </small>
        </label>

        <label>
          <span>E-mail</span>
          <input
            type="email"
            value={rascunho.email}
            onChange={e => campo("email", e.target.value)}
            placeholder="contato@exemplo.com"
          />
        </label>

        <label>
          <span>Site</span>
          <input
            value={rascunho.site}
            onChange={e => campo("site", e.target.value)}
            placeholder="exemplo.com.br"
          />
        </label>
      </div>

      <div className="xbw-pe">
        {salvo && <small className="xbw-dica">Perfil salvo.</small>}
        <button
          type="button"
          className="xbw-acao"
          onClick={() => {
            mudar(e => mudarPerfil(e, rascunho));
            setSalvo(true);
          }}
        >
          Salvar perfil
        </button>
      </div>
    </section>
  );
}
