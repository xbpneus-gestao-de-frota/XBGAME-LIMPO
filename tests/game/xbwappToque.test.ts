/**
 * O QUE ACONTECE QUANDO ALGUEM LIGA OU MANDA MENSAGEM.
 *
 * Ordem dele, 07/09/2026: "O QUE APARECERIA QUANDO CADA UM LIGAR OU MANDAR
 * MENSAGEM?" e, decidido: o comportamento do aplicativo de verdade, no azul XB,
 * com o nome e a foto de cada um, e a EMENDA pronta para a cena do video.
 */
import { describe, expect, it } from "vitest";
import { estadoInicial } from "../../client/src/game/xbwapp/estado";
import { bloquear } from "../../client/src/game/xbwapp/ajustes";
import {
  TOQUES_ATE_PERDER_SEGUNDOS,
  atenderChamada,
  perderChamada,
  receberChamada,
  recusarChamada,
  tocandoHa,
  tocouDemais,
} from "../../client/src/game/xbwapp/chamadas";
import { deveAvisar, resumoDoAviso } from "../../client/src/game/xbwapp/avisos";
import { mandarTexto, mandarFoto } from "../../client/src/game/xbwapp/enviar";
import { receber, silenciar } from "../../client/src/game/xbwapp/estado";

const base = estadoInicial(9 * 60);
const AGORA = 1000;

describe("o telefone tocando", () => {
  it("toca quando o jogo manda, com quem e de que tipo", () => {
    const e = receberChamada(base, "renan", "video", AGORA);
    expect(e.chamandoAgora?.contato).toBe("renan");
    expect(e.chamandoAgora?.tipo).toBe("video");
    expect(tocandoHa(e, AGORA + 5)).toBe(5);
  });

  it("quem está bloqueado não consegue ligar", () => {
    const e = receberChamada(bloquear(base, "renan"), "renan", "voz", AGORA);
    expect(e.chamandoAgora).toBeUndefined();
  });

  it("uma de cada vez: não toca em cima de outra", () => {
    const uma = receberChamada(base, "renan", "voz", AGORA);
    const duas = receberChamada(uma, "padaria", "voz", AGORA + 1);
    expect(duas.chamandoAgora?.contato).toBe("renan");
  });

  it("atender põe a ligação a correr e para de tocar", () => {
    const e = receberChamada(base, "renan", "voz", AGORA);
    const feito = atenderChamada(e, AGORA + 3);
    expect(feito.estado.chamandoAgora).toBeUndefined();
    expect(feito.estado.chamadaEmCurso?.contato).toBe("renan");
    expect(feito.estado.chamadaEmCurso?.comecouEm).toBe(AGORA + 3);
  });

  it("atender sem ninguém ligando não faz nada", () => {
    const feito = atenderChamada(base, AGORA);
    expect(feito.estado).toBe(base);
    expect(feito.cena).toBeUndefined();
  });

  /*
   * A EMENDA DA CENA — a parte que ele pediu que ficasse programada.
   *
   * O aplicativo CARREGA o nome da cena e DEVOLVE ao atender. Ele nunca lê o
   * conteúdo: quem desenha a cena é o jogo.
   */
  it("a chamada de vídeo carrega o nome da cena e devolve ao atender", () => {
    const e = receberChamada(base, "renan", "video", AGORA, "drone-da-abertura");
    expect(e.chamandoAgora?.cena).toBe("drone-da-abertura");
    const feito = atenderChamada(e, AGORA + 2);
    expect(feito.cena).toBe("drone-da-abertura");
    expect(feito.contato).toBe("renan");
    expect(feito.tipo).toBe("video");
  });

  it("chamada sem cena devolve sem cena — a maioria é assim", () => {
    const e = receberChamada(base, "padaria", "voz", AGORA);
    expect(atenderChamada(e, AGORA + 1).cena).toBeUndefined();
  });

  it("recusar deixa rastro: entra no histórico e na conversa", () => {
    const e = recusarChamada(receberChamada(base, "renan", "voz", AGORA));
    expect(e.chamandoAgora).toBeUndefined();
    expect(e.chamadas[0]!.rumo).toBe("perdida");
    expect(e.chamadas[0]!.contato).toBe("renan");
    expect(e.mensagens.some(m => m.conversa === "renan" && m.tipo === "chamada")).toBe(
      true
    );
  });

  it("deixar tocar demais vira perdida", () => {
    const e = receberChamada(base, "renan", "voz", AGORA);
    expect(tocouDemais(e, AGORA + 5)).toBe(false);
    expect(tocouDemais(e, AGORA + TOQUES_ATE_PERDER_SEGUNDOS)).toBe(true);
    const perdida = perderChamada(e);
    expect(perdida.chamadas[0]!.rumo).toBe("perdida");
  });
});

describe("a faixa de mensagem", () => {
  const comMensagem = receber(base, "padaria", { texto: "Pedido pronto" }, false);
  const chegada = comMensagem.mensagens[comMensagem.mensagens.length - 1]!;

  it("avisa quando chega mensagem de outra pessoa", () => {
    expect(deveAvisar(comMensagem, chegada, null)).toBe(true);
  });

  it("não avisa o que eu mesmo escrevi", () => {
    const meu = mandarTexto(base, "padaria", "oi");
    const minha = meu.mensagens[meu.mensagens.length - 1]!;
    expect(deveAvisar(meu, minha, null)).toBe(false);
  });

  it("não avisa a conversa que está aberta na frente dos olhos", () => {
    expect(deveAvisar(comMensagem, chegada, "padaria")).toBe(false);
    expect(deveAvisar(comMensagem, chegada, "renan")).toBe(true);
  });

  it("não avisa conversa silenciada", () => {
    const calada = silenciar(comMensagem, "padaria");
    expect(deveAvisar(calada, chegada, null)).toBe(false);
  });

  it("não avisa quem está bloqueado", () => {
    const sem = bloquear(comMensagem, "padaria");
    expect(deveAvisar(sem, chegada, null)).toBe(false);
  });

  it("o resumo diz o que é, quando não é texto", () => {
    const comFoto = mandarFoto(base, "padaria", "", "Foto da entrega");
    const foto = comFoto.mensagens[comFoto.mensagens.length - 1]!;
    expect(resumoDoAviso(foto)).toBe("Foto");
    expect(resumoDoAviso(chegada)).toBe("Pedido pronto");
  });
});
