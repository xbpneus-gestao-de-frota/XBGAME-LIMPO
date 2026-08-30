/**
 * Formatadores compartilhados da interface. Uma única instância de Intl evita
 * recriar o formatador em cada arquivo e mantém o padrão pt-BR consistente.
 */
export const money = new Intl.NumberFormat("pt-BR");

/** Moeda interna da campanha. Nunca representa dinheiro real. */
export function formatCredits(value: number): string {
  return `XB$ ${money.format(value)}`;
}
