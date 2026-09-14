/**
 * A CHAMADA DO RENAN VIRA CENA.
 *
 * Ordem dele, 12/09/2026: "aplicar a chamada de Renan na cut cine".
 *
 * A ligacao ja existia inteira — tocava, tremia, tinha retrato, recusar e
 * atender. So que atender caia DIRETO na conversa escrita: quem aceitava uma
 * chamada de video nunca via video nenhum.
 *
 * Estes testes seguram as quatro coisas que, se soltarem, devolvem o buraco:
 *
 *   · A CHAMADA CARREGA O NOME DA CENA. Sem ele o jogo nao tem como saber que
 *     ha filme para tocar, e cai na conversa como antes.
 *   · A CENA TEM COMECO, MEIO E FIM na ordem, e acaba. Cena que nao acaba
 *     prende a pessoa na abertura.
 *   · A LIGACAO CAI ANTES DE ACABAR. E o motivo de os dois irem para o texto;
 *     se ela simplesmente terminasse, o "Bom dia!!" da conversa ficaria solto.
 *   · AS FALAS DA LINHA NAO REPETEM A CONVERSA. O roteiro escrito continua
 *     dono das palavras dele; a legenda so cobre o pedaco que a linha comeu.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import {
  CENA_DA_ABERTURA,
  DURACAO_DA_CENA_MS,
  FALAS_NA_LINHA,
  TEMPOS_DA_CENA,
  barrasDeSinal,
  legendaAgora,
  momentoDaCena,
  segundosNoAr,
} from "@/game/aCenaDaChamada";
import { ROTEIRO_RENAN } from "@/game/xbwapp/roteiros";

const CSS = readFileSync("client/src/index.css", "utf8");
const TELA = readFileSync("client/src/components/GameCanvas.tsx", "utf8");

describe("a cena da chamada do Renan", () => {
  it("a chamada da abertura carrega o nome da cena", () => {
    /*
     * O aplicativo nao desenha cena nenhuma: ele leva o nome junto da chamada e
     * devolve "atendeu". Se o nome sumir daqui, o jogo nunca sabe que ha filme.
     *
     * Desde 13/09 sao DUAS chamadas do Renan, e o nome que vai junto depende de
     * qual esta tocando — por isso ele aparece escolhido, e nao fixo.
     */
    expect(TELA).toContain("cena:");
    expect(TELA).toContain("CENA_DA_ABERTURA");
    expect(TELA).toContain("? CENA_DA_PIZZA");
    expect(CENA_DA_ABERTURA).toBe("renan-abertura");
  });

  it("so chamada de video com cena segura a conversa", () => {
    /*
     * Voz, ou video sem cena, tem de cair na conversa como sempre caiu. Ninguem
     * pode ficar esperando um filme que nao existe.
     */
    expect(TELA).toContain('if (cena && tipo === "video")');
  });

  it("a cena passa pelos quatro momentos, na ordem", () => {
    const t = TEMPOS_DA_CENA;
    expect(momentoDaCena(0)).toBe("conectando");
    expect(momentoDaCena(t.conectando + 10)).toBe("no-ar");
    expect(momentoDaCena(t.conectando + t.noAr + 10)).toBe("caindo");
    expect(momentoDaCena(t.conectando + t.noAr + t.caindo + 10)).toBe("fim");
  });

  it("a cena acaba — ninguem fica preso na abertura", () => {
    expect(DURACAO_DA_CENA_MS).toBeGreaterThan(0);
    expect(DURACAO_DA_CENA_MS).toBeLessThanOrEqual(12000);
    expect(momentoDaCena(DURACAO_DA_CENA_MS)).toBe("fim");
  });

  it("desligar funciona desde o primeiro segundo", () => {
    const tela = readFileSync(
      "client/src/components/CenaDaChamada.tsx",
      "utf8"
    );
    expect(tela).toContain("cena-chamada__desligar");
    expect(tela).toContain("onClick={terminar}");
  });

  it("o relogio so anda depois de a imagem entrar", () => {
    expect(segundosNoAr(0)).toBe(0);
    expect(segundosNoAr(TEMPOS_DA_CENA.conectando)).toBe(0);
    expect(segundosNoAr(TEMPOS_DA_CENA.conectando + 1500)).toBe(1);
  });

  it("o sinal cai antes de a imagem morrer", () => {
    /*
     * Sem aviso, a queda parece defeito do jogo e nao da linha. As barrinhas
     * sao o unico aviso que a pessoa tem.
     */
    const t = TEMPOS_DA_CENA;
    expect(barrasDeSinal(t.conectando + 100)).toBe(3);
    expect(barrasDeSinal(t.conectando + t.noAr - 100)).toBeLessThan(3);
    expect(barrasDeSinal(t.conectando + t.noAr + t.caindo - 100)).toBe(0);
  });

  it("as falas da linha nao repetem nenhuma fala do roteiro escrito", () => {
    /*
     * O roteiro continua dono das palavras dele. Se a legenda dissesse "Bom
     * dia!!", a conversa comecaria repetindo o que a cena ja falou.
     */
    const doRoteiro = new Set<string>();
    for (const passo of Object.values(ROTEIRO_RENAN.passos))
      for (const fala of passo.falas ?? []) doRoteiro.add(fala.texto.trim());

    expect(doRoteiro.size).toBeGreaterThan(0);
    for (const fala of FALAS_NA_LINHA)
      expect(doRoteiro.has(fala.texto.trim())).toBe(false);
  });

  it("as legendas entram na ordem e somem no fim", () => {
    expect(legendaAgora(0)).toBeUndefined();
    expect(legendaAgora(FALAS_NA_LINHA[0].aos + 10)).toBe(
      FALAS_NA_LINHA[0].texto
    );
    expect(legendaAgora(DURACAO_DA_CENA_MS)).toBeUndefined();
    const aos = FALAS_NA_LINHA.map(f => f.aos);
    expect([...aos].sort((a, b) => a - b)).toEqual(aos);
  });

  it("a cena fica acima do aplicativo, senao ela existe e ninguem ve", () => {
    /*
     * Ja aconteceu uma vez com a tela de chamada: existia, respondia ao teclado
     * e era invisivel, escondida atras do proprio bairro. O aplicativo mora em
     * 420; a cena tem de estar acima disso.
     */
    const bloco = CSS.slice(CSS.indexOf(".cena-chamada {"));
    const altura = /z-index:\s*(\d+)/.exec(bloco);
    expect(altura).not.toBeNull();
    expect(Number(altura?.[1])).toBeGreaterThan(420);
  });

  it("nenhuma regra da cena usa fonte sem familia — regra morta", () => {
    /*
     * `font: 600 1rem/1.2 inherit` e regra INVALIDA: o navegador joga a linha
     * inteira fora e o texto fica no padrao. Custou uma volta inteira, com o
     * "Desligar" saindo em italico. Nao pode voltar.
     */
    const bloco = CSS.slice(CSS.indexOf("A CENA DA CHAMADA — 12/09/2026"));
    const fontes = (bloco.match(/font:\s*[^;]+;/g) ?? []).filter(f =>
      /\d/.test(f)
    );
    expect(fontes.length).toBeGreaterThan(0);
    for (const f of fontes) expect(f).toMatch(/(sans-serif|serif|monospace)/);
  });
});
