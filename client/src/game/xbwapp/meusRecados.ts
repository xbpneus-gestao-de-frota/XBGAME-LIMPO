/**
 * OS RECADOS — os seus e os dos outros.
 *
 * Ver recado ja existia. Faltava PUBLICAR, que e a metade que importa: um mural
 * so de leitura e um jornal, e nao um aplicativo de mensagem.
 *
 * ── O RECADO SOME SOZINHO, E ISSO E O DESENHO ─────────────────────────────
 *
 * Vinte e quatro horas. Nao e limitacao: e o que faz a pessoa postar. Ninguem
 * pensa duas vezes antes de escrever uma coisa que some amanha, e e por isso
 * que recado tem o tom solto que conversa nao tem.
 */
import type { EstadoDoApp } from "./estado";
import type { IdContato, Recado } from "./tipos";

/** DECISAO DELE: quanto tempo um recado fica de pe, em minutos. */
export const DURACAO_DO_RECADO = 24 * 60;

/** As cores de fundo de um recado escrito. */
/** As cores de fundo de um recado escrito — a paleta do XB. */
export const CORES_DE_RECADO: readonly string[] = [
  "#12547a",
  "#0d1b33",
  "#18bfea",
  "#20272d",
  "#0b6f92",
];

let contador = 0;

export function reiniciarNumeracaoDeRecados(): void {
  contador = 0;
}

/** Publica um recado seu. */
export function publicarRecado(
  estado: EstadoDoApp,
  texto: string,
  cor = CORES_DE_RECADO[0],
  imagem?: string
): EstadoDoApp {
  const limpo = texto.trim();
  if (!limpo && !imagem) return estado;
  contador += 1;
  const recado: Recado = {
    id: `meu-${contador}`,
    dono: "voce",
    texto: limpo,
    cor,
    imagem,
    minuto: estado.minuto,
    visto: true,
    vistoPor: [],
  };
  return { ...estado, recados: [recado, ...estado.recados] };
}

export function apagarRecado(estado: EstadoDoApp, id: string): EstadoDoApp {
  const r = estado.recados.find(x => x.id === id);
  if (!r || r.dono !== "voce") return estado;
  return { ...estado, recados: estado.recados.filter(x => x.id !== id) };
}

/** Alguem viu o seu recado. */
export function alguemViu(
  estado: EstadoDoApp,
  id: string,
  quem: IdContato
): EstadoDoApp {
  return {
    ...estado,
    recados: estado.recados.map(r =>
      r.id === id && r.dono === "voce" && !(r.vistoPor ?? []).includes(quem)
        ? { ...r, vistoPor: [...(r.vistoPor ?? []), quem] }
        : r
    ),
  };
}

/** Os recados que ainda estao de pe. */
export function recadosDePe(estado: EstadoDoApp): readonly Recado[] {
  return estado.recados.filter(
    r => estado.minuto - r.minuto < DURACAO_DO_RECADO
  );
}

/** Os seus recados, dos mais novos para os mais velhos. */
export function meusRecados(estado: EstadoDoApp): readonly Recado[] {
  return recadosDePe(estado)
    .filter(r => r.dono === "voce")
    .sort((a, b) => b.minuto - a.minuto);
}

/** Os dos outros — e quem esta bloqueado nao aparece. */
export function recadosDosOutros(estado: EstadoDoApp): readonly Recado[] {
  return recadosDePe(estado).filter(
    r => r.dono !== "voce" && !estado.bloqueados.includes(r.dono)
  );
}

/**
 * QUANTO TEMPO O RECADO AINDA TEM, em palavra.
 *
 * "Há 3 h" diz mais que um horario: quem le um recado quer saber se aquilo
 * ainda vale, e nao que horas eram quando foi escrito.
 */
export function haQuantoTempo(estado: EstadoDoApp, recado: Recado): string {
  const minutos = Math.max(0, estado.minuto - recado.minuto);
  if (minutos < 1) return "agora";
  if (minutos < 60) return `há ${minutos} min`;
  return `há ${Math.floor(minutos / 60)} h`;
}
