/**
 * OS MORADORES DO BAIRRO, dentro do aplicativo.
 *
 * Os oito primeiros retratos chegaram desenhados em 08/09/2026. Estes testes
 * seguram as duas coisas que quebram calado quando entra gente nova:
 *
 *   · TODO RETRATO APONTA PARA UM ARQUIVO QUE EXISTE. Foto errada nao explode
 *     em teste nenhum: ela some da tela e vira uma roda cinza, e ninguem
 *     percebe ate abrir a lista.
 *   · TODO MORADOR TEM PORTA NO MAPA. O nome do contato e do bairro tem de
 *     casar, senao a entrega sai para lugar nenhum e o frete cai para a parte
 *     fixa sem ninguem entender por que.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { CONTATOS, MORADORES } from "@/game/xbwapp/contatos";
import { enderecoDe } from "@/game/xbwapp/distancias";
import { CASAS as CASAS_DO_BAIRRO } from "@/game/addresses";
import { fichaDe } from "@/game/xbwapp/fichas";

describe("os moradores", () => {
  it("todo retrato do aplicativo aponta para um arquivo que existe", () => {
    const semArquivo: string[] = [];
    for (const c of CONTATOS) {
      if (!c.foto) continue;
      try {
        readFileSync(resolve("client/public", c.foto.replace(/^\//, "")));
      } catch {
        semArquivo.push(`${c.nome} → ${c.foto}`);
      }
    }
    expect(semArquivo).toEqual([]);
  });

  it("todo morador tem porta no desenho do bairro", () => {
    const semPorta = MORADORES.filter(m => !enderecoDe(m.id)).map(m => m.nome);
    expect(semPorta).toEqual([]);
  });

  it("quem nao tem retrato tem cor de roda — ninguem fica sem cara", () => {
    for (const m of MORADORES) {
      expect(Boolean(m.foto) || Boolean(m.cor)).toBe(true);
    }
  });

  it("o numero da casa do contato e o numero da casa no mapa", () => {
    for (const m of MORADORES) {
      const numero = Number(/casa\s*(\d+)/i.exec(m.endereco ?? "")?.[1]);
      expect(enderecoDe(m.id)!.numero).toBe(numero);
    }
  });

  it("os oito primeiros ja chegaram desenhados", () => {
    const comFoto = MORADORES.filter(m => m.foto);
    expect(comFoto.length).toBeGreaterThanOrEqual(8);
  });
});

/**
 * O BAIRRO E A AGENDA TEM DE CONTAR A MESMA HISTORIA.
 *
 * Este grupo nasceu de um defeito real, em 13/09/2026: o desenho do bairro ja
 * chamava a casa 20 de "casa da dona Alzira", e a ficha do aplicativo chamava
 * a mesma casa de "Seu Onofre". Nenhum teste reclamava, porque cada lado
 * estava certo sozinho. O jogador e que veria os dois nomes.
 *
 * E o mesmo tipo de defeito das trinta casas sem morador: o balcao mandava
 * entrega para um endereco que nao tinha gente do outro lado.
 */
describe("o bairro desenhado e a agenda do aplicativo", () => {
  it("toda casa do desenho tem morador na agenda", () => {
    const naAgenda = new Set(
      MORADORES.map(m => Number(/casa\s*(\d+)/i.exec(m.endereco ?? "")?.[1]))
    );
    const semMorador = CASAS_DO_BAIRRO.filter(
      c => !naAgenda.has(c.numero!)
    ).map(c => `${c.numero} (${c.nome})`);
    expect(semMorador).toEqual([]);
  });

  it("o nome do contato e o mesmo nome da ficha", () => {
    const diferentes = MORADORES.filter(m => fichaDe(m.id).nome !== m.nome).map(
      m => `${m.id}: agenda "${m.nome}" · ficha "${fichaDe(m.id).nome}"`
    );
    expect(diferentes).toEqual([]);
  });

  /*
   * O nome do desenho e "casa da dona Alzira" ou "casa da familia Fontes"; o
   * da agenda e "Dona Alzira" ou "Neide Fontes". Nao sao iguais, e nao devem
   * ser — mas a ULTIMA PALAVRA do desenho e quem a pessoa e, e ela tem de
   * aparecer no nome que o jogador le. E o que impede um segundo batismo.
   */
  it("quem mora na casa e quem o desenho diz que mora", () => {
    const fora: string[] = [];
    for (const casa of CASAS_DO_BAIRRO) {
      const quem = casa.nome.trim().split(/\s+/).pop()!;
      const nome = fichaDe(`casa${casa.numero}`).nome;
      if (!nome.includes(quem)) fora.push(`${casa.nome} → "${nome}"`);
    }
    expect(fora).toEqual([]);
  });
});
