/**
 * O AVISO NO ALTO DA TELA: o selo, o toque e a troca de retrato.
 *
 * Tres ordens dele do dia 08/09/2026 caem aqui:
 *
 *   1. "teo e renan sao a mesma pessoa, apos contratado, mudar a imagem de
 *      renan para imagem do antigo teo, no whats app"
 *   2. "ESSES SERAO ICONES DE NOVAS MENSAGENS QUE DEVEM APARECER NO CANTO
 *      SUPERIOR DA TELA AO CHEGAR MENSAGENS"
 *   3. "PRECISAMOS GERAR UM TOQUE CADA VEZ QUE RECEBERMOS NOTIFICACOES"
 *
 * O que estes testes protegem, em uma frase: o retrato tem de trocar num lugar
 * so, os dois selos tem de existir de verdade como arquivo, e o toque nao pode
 * fazer barulho para quem desligou o som.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { GAME_ASSETS } from "@/game/assets";
import {
  RENAN,
  oRenanFoiContratado,
  oRenanRecebeuEquipamento,
  renanJaEhDaCasa,
  renanJaEstaEquipado,
} from "@/game/xbwapp/contatos";
import { XBW_ICONES } from "@/game/xbwapp/icones";
import { tocarAvisoDeMensagem } from "@/game/oToqueDoAviso";

describe("o Renan e o equipamento", () => {
  beforeEach(() => {
    oRenanFoiContratado(false);
    oRenanRecebeuEquipamento(false);
  });

  it("comeca com o retrato do amigo, e nao do entregador", () => {
    expect(RENAN.foto).toBe(GAME_ASSETS.renanAvatar);
    expect(renanJaEstaEquipado()).toBe(false);
  });

  it("CONTRATAR nao muda o retrato — regra dele", () => {
    /*
     * "renan so muda de desenho no aplicativo, apos receber equipamentos".
     * Contrato nao muda a roupa de ninguem; a caixa com o uniforme muda.
     */
    oRenanFoiContratado();
    expect(renanJaEhDaCasa()).toBe(true);
    expect(RENAN.foto).toBe(GAME_ASSETS.renanAvatar);
  });

  it("o EQUIPAMENTO muda o retrato", () => {
    oRenanRecebeuEquipamento();
    expect(renanJaEstaEquipado()).toBe(true);
    expect(RENAN.foto).toBe(GAME_ASSETS.renanEquipado);
  });

  it("o nome e o id sao os mesmos do comeco ao fim", () => {
    oRenanFoiContratado();
    oRenanRecebeuEquipamento();
    expect(RENAN.nome).toBe("Renan");
    expect(RENAN.id).toBe("renan");
  });

  it("o retrato de uniforme aponta para um arquivo que existe", () => {
    const arquivo = resolve(
      "client/public",
      GAME_ASSETS.renanEquipado.replace(/^\//, "")
    );
    expect(() => readFileSync(arquivo)).not.toThrow();
  });
});

describe("os dois selos de mensagem nova", () => {
  it("apontam para arquivos que existem mesmo", () => {
    for (const caminho of [XBW_ICONES.avisoVerde, XBW_ICONES.avisoPrata]) {
      const arquivo = resolve("client/public", caminho.replace(/^\//, ""));
      expect(() => readFileSync(arquivo)).not.toThrow();
    }
  });

  it("sao dois desenhos diferentes, e nao o mesmo repetido", () => {
    expect(XBW_ICONES.avisoVerde).not.toBe(XBW_ICONES.avisoPrata);
  });
});

describe("o toque de mensagem nova", () => {
  /** Uma janela de mentira: so o que o toque encosta. */
  const janelaDeMentira = () => {
    const vibrou: number[][] = [];
    const criados: string[] = [];
    class ContextoFalso {
      state = "running";
      currentTime = 0;
      destination = {};
      createOscillator() {
        criados.push("osc");
        return {
          type: "",
          frequency: { value: 0 },
          connect: (x: unknown) => x,
          start: () => undefined,
          stop: () => undefined,
        };
      }
      createGain() {
        return {
          gain: {
            setValueAtTime: () => undefined,
            linearRampToValueAtTime: () => undefined,
            exponentialRampToValueAtTime: () => undefined,
          },
          connect: (x: unknown) => x,
        };
      }
      close() {
        return Promise.resolve();
      }
    }
    const janela = {
      navigator: { vibrate: (p: number | number[]) => vibrou.push([p].flat()) },
      AudioContext: ContextoFalso,
      setTimeout: (fn: () => void) => {
        void fn;
        return 0;
      },
    };
    return { janela, vibrou, criados };
  };

  it("toca uma vez e fecha sozinho quando o som esta ligado", () => {
    const { janela, criados } = janelaDeMentira();
    tocarAvisoDeMensagem(true, janela as unknown as Window & typeof globalThis);
    // Dois sinos, cada um com a nota e a oitava: quatro osciladores.
    expect(criados).toHaveLength(4);
  });

  it("fica calado para quem desligou o som", () => {
    const { janela, criados } = janelaDeMentira();
    tocarAvisoDeMensagem(
      false,
      janela as unknown as Window & typeof globalThis,
    );
    expect(criados).toHaveLength(0);
  });

  it("treme o aparelho mesmo no silencioso", () => {
    const { janela, vibrou } = janelaDeMentira();
    tocarAvisoDeMensagem(
      false,
      janela as unknown as Window & typeof globalThis,
    );
    expect(vibrou).toHaveLength(1);
  });

  it("nao explode quando o navegador nao tem som nenhum", () => {
    expect(() =>
      tocarAvisoDeMensagem(true, {
        navigator: {},
      } as unknown as Window & typeof globalThis),
    ).not.toThrow();
    expect(() => tocarAvisoDeMensagem(true, undefined)).not.toThrow();
  });
});
