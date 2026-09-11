/**
 * A DISTANCIA REAL DE CADA CORRIDA.
 *
 * Ordem antiga dele, que continua valendo: o pagamento e CALCULO DE FRETE, e
 * frete tem parte por quilometro. Entao o aplicativo nao pode inventar
 * quilometragem — ele PERGUNTA ao bairro.
 *
 * Aqui a conta e a mesma que o resto do jogo ja faz: a rota pelas ruas
 * riscadas, medida em metros, da porta da loja ate a porta da casa. Nada de
 * linha reta: linha reta atravessa quarteirao, e o cliente que mora "logo ali"
 * atras do muro pagaria como vizinho de parede.
 *
 * A corrida inteira e BASE → LOJA → CASA, porque e isso que o entregador
 * pedala de verdade.
 */
import { ENDERECOS, BASE, type Endereco } from "../addresses";
import { metrosDaRota, rota } from "../rotas";
import { contato } from "./contatos";
import type { IdContato } from "./tipos";

function simplificar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

/** Acha no bairro a porta de um contato do aplicativo. */
export function enderecoDe(quem: IdContato): Endereco | undefined {
  const c = contato(quem);
  if (!c) return undefined;

  // Loja: bate pelo nome do comercio no desenho.
  const alvo = simplificar(c.tipo === "loja" ? c.nome : (c.endereco ?? ""));
  if (alvo) {
    const porNome = ENDERECOS.find(e => simplificar(e.nome) === alvo);
    if (porNome) return porNome;
  }

  /*
   * MORADOR: PELO NUMERO DA CASA, e nao pelo nome.
   *
   * As casas do desenho ganharam nome de gente — "casa da dona Ilda" — no dia
   * em que o bairro foi batizado. O contato do aplicativo continua guardando o
   * ENDERECO ("casa 8"), que e o que o jogo usa para dizer onde entregar, e a
   * busca por nome parou de achar: "casa 8" nao e "casa da dona Ilda".
   *
   * O numero nunca se perdeu — vive no id do endereco e no campo `numero`. E
   * por ele que a casa e encontrada agora, o que tambem deixa o bairro livre
   * para rebatizar moradores sem quebrar entrega nenhuma.
   */
  const numero = Number(/casa\s*(\d+)/i.exec(c.endereco ?? "")?.[1] ?? NaN);
  if (Number.isFinite(numero)) {
    return ENDERECOS.find(e => e.papel === "casa" && e.numero === numero);
  }
  return undefined;
}

function kmEntre(de: Endereco, para: Endereco): number {
  return metrosDaRota(rota(de.em, para.em)) / 1000;
}

/**
 * Os quilometros da corrida inteira: base, loja, casa.
 *
 * Quando um dos dois nao existe no desenho do bairro, devolve zero — e zero
 * quilometro faz o frete cair para a parte fixa, que e uma resposta honesta
 * ("nao sei a distancia") e nao um numero bonito inventado.
 */
export function kmDaCorrida(loja: IdContato, cliente: IdContato): number {
  const a = enderecoDe(loja);
  const b = enderecoDe(cliente);
  if (!a || !b) return 0;
  return kmEntre(BASE, a) + kmEntre(a, b);
}

/** So o trecho da entrega — da loja ate a porta. E o que o cliente ve. */
export function kmDaEntrega(loja: IdContato, cliente: IdContato): number {
  const a = enderecoDe(loja);
  const b = enderecoDe(cliente);
  if (!a || !b) return 0;
  return kmEntre(a, b);
}

/**
 * O PRAZO NAO E NUMERO ESCRITO A MAO.
 *
 * Ja foi aprendido neste projeto: prazo fixo mente do outro lado do bairro —
 * generoso na casa da esquina, impossivel na borda do mapa. Ele e o TEMPO
 * HONESTO DE PEDALAR ate a porta, vezes uma folga. So a folga e decisao dele.
 */
export const VELOCIDADE_DA_BICICLETA_KMH = 12;
/** DECISAO DELE: quanto de folga o prazo tem em cima do tempo honesto. */
export const FOLGA_DO_PRAZO = 1.6;
/** DECISAO DELE: o prazo nunca e menor que isto, mesmo na porta ao lado. */
export const PRAZO_MINIMO_MIN = 8;

export function prazoEmMinutos(loja: IdContato, cliente: IdContato): number {
  const km = kmDaCorrida(loja, cliente);
  const honesto = (km / VELOCIDADE_DA_BICICLETA_KMH) * 60;
  return Math.max(PRAZO_MINIMO_MIN, Math.round(honesto * FOLGA_DO_PRAZO));
}
