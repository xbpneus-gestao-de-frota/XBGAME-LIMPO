/**
 * O TECLADO — as teclas SAO as dele, uma a uma.
 *
 * Ele cobrou, e com razao: "TE ENTREGUEI UM TECLADO PRONTO VC REFEZ OUTRO PQ?".
 * Eu tinha usado UMA tecla da folha dele como moldura e escrito as letras por
 * cima. Isto aqui e o contrario: cada tecla e o RECORTE DELA, com a letra que
 * ele desenhou dentro. Nada de letra escrita por cima.
 *
 * ── A FILA DE BAIXO E A DELE ──────────────────────────────────────────────
 *
 * 123 · carinha · espaço · enviar · microfone — exatamente como na folha. Nao e
 * a fila que eu tinha inventado (com virgula e ponto).
 *
 * ── ONDE NAO HA DESENHO DELE ──────────────────────────────────────────────
 *
 * A folha tem so a camada de LETRAS. Numeros, simbolos e acentos nao existem
 * nela — e o jogo e em portugues, entao acento nao pode faltar. Nessas duas
 * camadas as teclas usam a MOLDURA dele (`XBW_tecla.webp`, a mesma tecla com a
 * letra apagada) e o caractere e escrito por cima. E o unico jeito honesto:
 * inventar um desenho de tecla seria refazer o teclado dele de novo.
 *
 * ── A LARGURA DE CADA TECLA E A DA IMAGEM ─────────────────────────────────
 *
 * O espaco e largo, o shift e o apagar sao medios, as letras sao estreitas —
 * e a proporcao vem do arquivo, nao de um numero que eu escolhi. Assim a fila
 * fica com o mesmo desenho da folha em qualquer tamanho de tela.
 */
import { useEffect, useState } from "react";
import { XBW_ICONES } from "@/game/xbwapp/icones";

/** As teclas dele: o nome do arquivo e o que a tecla escreve. */
const K = "/assets/xbwapp/XBW_k-";

interface Tecla {
  /** O desenho dele, quando existe. */
  desenho?: string;
  /** O que a tecla escreve. Vazio quando ela faz outra coisa. */
  letra?: string;
  /** O que aparece escrito, nas camadas sem desenho dele. */
  texto?: string;
  /** Quanto ela ocupa na fila, na proporcao da imagem dele. */
  peso: number;
  papel?:
    | "shift"
    | "apagar"
    | "numeros"
    | "acentos"
    | "letras"
    | "emoji"
    | "espaco"
    | "enviar"
    | "microfone";
  rotulo: string;
}

/*
 * Esta tecla e a que esta sendo apertada agora?
 *
 * A comparacao ignora maiuscula porque a folha dele tem uma tecla por letra,
 * e nao duas. O espaco entra pelo papel, e nao pela letra, porque " " some
 * quando alguem apara os espacos por engano.
 */
function acesa(t: Tecla, agora?: string | null): boolean {
  if (!agora) return false;
  if (agora === " ") return t.papel === "espaco";
  return (t.letra ?? "").toLowerCase() === agora.toLowerCase();
}

function letra(l: string, largura: number): Tecla {
  return {
    desenho: `${K}${l}.webp`,
    letra: l,
    peso: largura,
    rotulo: l.toUpperCase(),
  };
}

/* As larguras vem do recorte: a folha dele tem tecla estreita e tecla larga. */
const LINHA1: readonly Tecla[] = [
  letra("q", 110),
  letra("w", 107),
  letra("e", 108),
  letra("r", 107),
  letra("t", 108),
  letra("y", 109),
  letra("u", 109),
  letra("i", 108),
  letra("o", 111),
  letra("p", 114),
];

const LINHA2: readonly Tecla[] = [
  letra("a", 113),
  letra("s", 106),
  letra("d", 107),
  letra("f", 106),
  letra("g", 107),
  letra("h", 107),
  letra("j", 107),
  letra("k", 108),
  letra("l", 112),
];

const LINHA3: readonly Tecla[] = [
  { desenho: `${K}shift.webp`, papel: "shift", peso: 147, rotulo: "Maiúscula" },
  letra("z", 108),
  letra("x", 104),
  letra("c", 104),
  letra("v", 107),
  letra("b", 105),
  letra("n", 104),
  letra("m", 108),
  { desenho: `${K}apagar.webp`, papel: "apagar", peso: 157, rotulo: "Apagar" },
];

const LINHA4: readonly Tecla[] = [
  { desenho: `${K}num.webp`, papel: "numeros", peso: 124, rotulo: "Números" },
  { desenho: `${K}emoji.webp`, papel: "emoji", peso: 111, rotulo: "Carinhas" },
  { desenho: `${K}espaco.webp`, letra: " ", peso: 446, rotulo: "Espaço" },
  { desenho: `${K}enviar.webp`, papel: "enviar", peso: 137, rotulo: "Enviar" },
  { desenho: `${K}mic.webp`, papel: "microfone", peso: 114, rotulo: "Áudio" },
];

/* Numeros e acentos nao existem na folha dele: moldura dele, caractere por cima. */
function feita(texto: string, peso = 108): Tecla {
  return { texto, letra: texto, peso, rotulo: texto };
}

const NUMEROS: readonly (readonly Tecla[])[] = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map(t => feita(t)),
  ["@", "#", "R$", "%", "&", "-", "+", "(", ")", "/"].map(t => feita(t)),
  [
    { texto: "áç", papel: "acentos", peso: 147, rotulo: "Acentos" },
    ...["*", '"', "'", ":", ";", "!", "?"].map(t => feita(t)),
    {
      desenho: `${K}apagar.webp`,
      papel: "apagar",
      peso: 157,
      rotulo: "Apagar",
    },
  ],
];

const ACENTOS: readonly (readonly Tecla[])[] = [
  ["á", "é", "í", "ó", "ú", "â", "ê", "ô", "ã", "õ"].map(t => feita(t)),
  ["à", "ç", "ü", "°", "º", "ª", "…", "—", "€"].map(t => feita(t)),
  [
    {
      desenho: `${K}shift.webp`,
      papel: "shift",
      peso: 147,
      rotulo: "Maiúscula",
    },
    ...["§", "¢", "«", "»", "¿", "¡", "~"].map(t => feita(t)),
    {
      desenho: `${K}apagar.webp`,
      papel: "apagar",
      peso: 157,
      rotulo: "Apagar",
    },
  ],
];

type Camada = "letras" | "numeros" | "acentos";

export default function Teclado({
  aoEscrever,
  aoApagar,
  aoEnviar,
  podeEnviar,
  comecoDeFrase = true,
  aoFechar,
  aoGravar,
  aoCarinhas,
  teclaAcesa,
}: {
  aoEscrever: (letra: string) => void;
  aoApagar: () => void;
  aoEnviar: () => void;
  podeEnviar: boolean;
  /** Maiuscula so comeca ligada quando nao ha nada escrito. */
  comecoDeFrase?: boolean;
  aoFechar: () => void;
  /** A tecla do microfone, que na folha dele fica na fila de baixo. */
  aoGravar?: () => void;
  /** A tecla da carinha. */
  aoCarinhas?: () => void;
  /*
   * ── A TECLA QUE ACENDE SOZINHA ───────────────────────────────────────────
   *
   * Ordem dele, 08/09/2026: a resposta ao Renan nao pode simplesmente
   * aparecer escrita — a animacao tem de DIGITAR as teclas.
   *
   * Quem conduz a digitacao e a tela da conversa; aqui so chega a letra que
   * esta sendo apertada NESTE instante, para a tecla acender. O teclado nao
   * sabe que existe uma animacao, e nao precisa saber: para ele e so uma
   * tecla acesa, como seria com o dedo em cima.
   */
  teclaAcesa?: string | null;
}) {
  const [camada, setCamada] = useState<Camada>("letras");
  const [maiuscula, setMaiuscula] = useState(comecoDeFrase);

  /*
   * O TECLADO FISICO tambem escreve, enquanto este esta aberto. E como ele
   * testou no computador, e sem isto o computador ficaria so olhando.
   */
  useEffect(() => {
    function tecla(ev: KeyboardEvent) {
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      if (ev.key === "Enter") {
        ev.preventDefault();
        if (podeEnviar) aoEnviar();
        return;
      }
      if (ev.key === "Backspace") {
        ev.preventDefault();
        aoApagar();
        return;
      }
      if (ev.key.length === 1) {
        ev.preventDefault();
        aoEscrever(ev.key);
      }
    }
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [aoEscrever, aoApagar, aoEnviar, podeEnviar]);

  const linhas: readonly (readonly Tecla[])[] =
    camada === "letras"
      ? [LINHA1, LINHA2, LINHA3, LINHA4]
      : camada === "numeros"
        ? [...NUMEROS, LINHA4]
        : [...ACENTOS, LINHA4];

  function tocar(t: Tecla) {
    switch (t.papel) {
      case "shift":
        setMaiuscula(m => !m);
        return;
      case "apagar":
        aoApagar();
        return;
      case "numeros":
        setCamada(c => (c === "letras" ? "numeros" : "letras"));
        return;
      case "acentos":
        setCamada("acentos");
        return;
      case "enviar":
        if (podeEnviar) aoEnviar();
        return;
      case "microfone":
        aoGravar?.();
        return;
      case "emoji":
        aoCarinhas?.();
        return;
      default:
        break;
    }
    if (!t.letra) return;
    const escrita =
      maiuscula && camada === "letras" ? t.letra.toUpperCase() : t.letra;
    aoEscrever(escrita);
    if (maiuscula) setMaiuscula(false);
  }

  return (
    <div className="xbw-teclado" role="group" aria-label="Teclado">
      <div className="xbw-teclado__topo">
        <button type="button" onClick={aoFechar} aria-label="Fechar o teclado">
          <img src={XBW_ICONES.voltar} alt="" aria-hidden="true" />
        </button>
        <span>
          {camada === "acentos"
            ? "Acentos"
            : camada === "numeros"
              ? "Números"
              : maiuscula
                ? "MAIÚSCULAS"
                : "Letras"}
        </span>
      </div>

      {linhas.map((linha, i) => (
        <div className="xbw-teclado__linha" key={`${camada}-${i}`}>
          {linha.map((t, j) => (
            <button
              key={`${t.rotulo}-${j}`}
              type="button"
              className={
                [
                  "xbw-tecla",
                  t.desenho ? "xbw-tecla--desenho" : "",
                  acesa(t, teclaAcesa) ? "xbw-tecla--acesa" : "",
                ]
                  .filter(Boolean)
                  .join(" ")
              }
              style={{ flexGrow: t.peso, flexBasis: 0 }}
              aria-label={t.rotulo}
              aria-pressed={t.papel === "shift" ? maiuscula : undefined}
              disabled={t.papel === "enviar" && !podeEnviar}
              onClick={() => tocar(t)}
            >
              {t.desenho ? (
                <img
                  src={t.desenho}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                />
              ) : (
                <span>{t.texto}</span>
              )}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
