"""
AS DOZE HORAS — pega os desenhos que ele largou na pasta e poe no jogo.

    python3 scripts/entregador/doze_horas.py

Le "NOTAS DE TRABALHO/entregador 24/folhas de 1 a 12 horas/01h.png" ate "12h.png"
(serve .png, .webp ou .jpg), e para cada um faz as quatro coisas que precisam
ser feitas juntas, senao uma estraga a outra:

1. TIRA O FUNDO, se vier fundo. Desenho sem transparencia perde o fundo pela
   borda, nunca por cor no meio — assim uma camisa branca nao vira buraco.

2. POE TODOS DO MESMO TAMANHO — e este e o ponto.

   Os desenhos antigos foram encaixados pela LARGURA, e isso e a armadilha: de
   lado a bicicleta e comprida, de frente e curta. Encaixar pela largura encolhe
   o de lado e estica o de frente, e o menino MUDA DE TAMANHO ao virar a
   esquina. Medido nas folhas de hoje: 70% de altura indo para leste contra
   89,5% indo para o sul — vinte e oito por cento de diferenca, virando de
   esquina.

   Aqui o encaixe e pela ALTURA. A altura do menino de bicicleta quase nao muda
   com a direcao: de costas, de lado ou de frente, a cabeca fica na mesma
   altura do chao. E a unica regua que sobrevive ao giro.

3. MEDE ONDE CADA RODA TOCA O CHAO. Na faixa de baixo do desenho, acha os dois
   apoios — o da esquerda e o da direita — e devolve em porcentagem da moldura.
   Sao esses numeros que o jogo usa para pousar a bicicleta no mapa, cortar o
   pedaco que entra no chao e pintar a sombra debaixo do pneu. Medidos, nunca
   estimados.

4. ESCREVE OS ARQUIVOS DO JOGO. Os doze com nome de hora, e tambem os oito
   nomes de hoje preenchidos com a hora mais proxima — assim o jogo melhora a
   cada desenho que chega, sem esperar os doze nem mexer no codigo.

No fim imprime a tabela de geometria pronta para colar em rumoDoEntregador.ts.
"""
from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from PIL import Image

RAIZ = Path(__file__).resolve().parents[2]
PASTA = RAIZ.parent / "NOTAS DE TRABALHO/entregador 24/folhas de 1 a 12 horas"
DESTINO = RAIZ / "client/public/assets"

LADO = 200          # a moldura, quadrada, igual para todos
ALTURA_ALVO = 0.88  # quanto da moldura o menino ocupa de altura
BASE = 0.97         # onde fica o pneu mais baixo, contado do topo
POSES = ("pedalando1", "parado")

# Os oito nomes que o codigo usa hoje, e o angulo de cada um na tela.
RUMOS_DE_HOJE = {
    "leste": 0, "nordeste": 45, "norte": 90, "noroeste": 135,
    "oeste": 180, "sudoeste": 225, "sul": 270, "sudeste": 315,
}


def hora_na_tela(h: int) -> float:
    """O angulo na tela de uma hora do relogio. 12h = 90° (para cima)."""
    return (90.0 - (h % 12) * 30.0) % 360


def achar(hora: int) -> Path | None:
    for ext in (".png", ".webp", ".jpg", ".jpeg"):
        p = PASTA / f"{hora:02d}h{ext}"
        if p.exists():
            return p
    return None


def sem_fundo(im: Image.Image) -> Image.Image:
    """Fundo fora — pela borda, nunca por cor solta no meio do desenho."""
    im = im.convert("RGBA")
    a = np.asarray(im)[..., 3]
    if (a < 25).mean() > 0.05:
        return im  # ja veio recortado

    rgb = np.asarray(im)[..., :3].astype(np.int16)
    canto = rgb[0, 0]
    parecido = (np.abs(rgb - canto).max(axis=2) < 26)

    # alastra a partir da moldura, so por vizinhanca
    marca = np.zeros(parecido.shape, bool)
    marca[0, :] = parecido[0, :]
    marca[-1, :] = parecido[-1, :]
    marca[:, 0] = parecido[:, 0]
    marca[:, -1] = parecido[:, -1]
    while True:
        crescido = marca.copy()
        crescido[1:, :] |= marca[:-1, :]
        crescido[:-1, :] |= marca[1:, :]
        crescido[:, 1:] |= marca[:, :-1]
        crescido[:, :-1] |= marca[:, 1:]
        crescido &= parecido
        if crescido.sum() == marca.sum():
            break
        marca = crescido

    fora = np.asarray(im).copy()
    fora[..., 3] = np.where(marca, 0, fora[..., 3])
    return Image.fromarray(fora, "RGBA")


def contorno(im: Image.Image) -> Image.Image:
    """O desenho sem a folga vazia em volta."""
    caixa = im.getchannel("A").point(lambda v: 255 if v > 25 else 0).getbbox()
    return im.crop(caixa)


def altura_que_cabe(corpos: list[Image.Image]) -> int:
    """A altura comum, encolhida se o mais largo nao couber na moldura.

    A altura e a regua, mas a moldura e quadrada: uma vista de lado bem
    comprida pode estourar a largura. Quando isso acontece quem cede e a
    altura DE TODOS junto — nunca a de um so, senao volta o defeito que este
    arquivo existe para consertar.
    """
    alto = round(LADO * ALTURA_ALVO)
    largo = max(c.width * alto / c.height for c in corpos)
    if largo <= LADO:
        return alto
    ajustado = int(alto * LADO / largo)
    print(f"o mais largo nao cabe: a altura de todos cai de {alto} para "
          f"{ajustado} px ({ajustado / LADO * 100:.0f}% da moldura)")
    return ajustado


def na_moldura(corpo: Image.Image, alto: int) -> Image.Image:
    """A moldura quadrada, com o pneu na linha de baixo e o desenho no meio."""
    largo = max(1, round(corpo.width * alto / corpo.height))
    corpo = corpo.resize((largo, alto), Image.LANCZOS)
    moldura = Image.new("RGBA", (LADO, LADO), (0, 0, 0, 0))
    moldura.paste(corpo, ((LADO - largo) // 2, round(LADO * BASE) - alto), corpo)
    return moldura


def apoios(im: Image.Image) -> tuple[float, float, float, float]:
    """Onde as duas rodas encostam, em % da moldura: (esqX, esqY, dirX, dirY).

    A regra e curta e nao tem ajuste nenhum para calibrar: parte o desenho ao
    MEIO na horizontal e pega o ponto mais baixo de cada metade.

    Ela funciona porque a bicicleta e simetrica no comprimento — uma roda de
    cada lado do selim — e continua funcionando de frente, quando as duas
    quase se juntam e os dois pontos saem quase no mesmo lugar. Foi conferida
    contra as seis medidas que ja estavam no codigo, feitas a mao uma a uma:
    cinco batem dentro de meio por cento, e a sexta (a roda de tras indo para
    oeste) difere 4,4% so na horizontal, num trecho em que o contorno esta
    plano e os dois pontos encostam na mesma altura.

    Uma faixa de altura fixa NAO serve, e vale registrar: numa vista de tres
    quartos a roda de tras fica ate dezenove por cento mais alta na tela que a
    da frente, e qualquer faixa estreita o bastante para nao pegar cotovelo
    passa longe dela.
    """
    a = np.asarray(im)[..., 3] > 25
    ys, xs = np.nonzero(a)
    if len(xs) == 0:
        return (50.0, 95.0, 50.0, 95.0)

    baixo: dict[int, int] = {}
    for y, x in zip(ys, xs):
        if x not in baixo or y > baixo[x]:
            baixo[x] = y

    meio = (xs.min() + xs.max()) / 2
    esquerda = [x for x in baixo if x <= meio] or list(baixo)
    direita = [x for x in baixo if x >= meio] or list(baixo)

    # O apoio nao e UM pixel: o pneu encosta numa pegada de alguns pixels de
    # largura. Pegar o pixel mais baixo faz o ponto pular de uma ponta a outra
    # da pegada por causa de meio pixel de nada. O ponto e o MEIO da pegada.
    folga = max(1, round(im.height * 0.01))

    def apoio(lado: list[int]) -> tuple[float, float]:
        chao = max(baixo[x] for x in lado)
        pegada = [x for x in lado if baixo[x] >= chao - folga]
        return ((min(pegada) + max(pegada)) / 2, chao)

    ex, ey = apoio(esquerda)
    dx, dy = apoio(direita)
    return (
        ex / im.width * 100, (ey + 1) / im.height * 100,
        dx / im.width * 100, (dy + 1) / im.height * 100,
    )


def main() -> None:
    prontas: dict[int, Image.Image] = {}
    medida: dict[int, tuple[float, float, float, float]] = {}

    corpos = {h: contorno(sem_fundo(Image.open(achar(h))))
              for h in range(1, 13) if achar(h) is not None}
    alto = altura_que_cabe(list(corpos.values())) if corpos else 0
    for h, corpo in corpos.items():
        peca = na_moldura(corpo, alto)
        prontas[h] = peca
        medida[h] = apoios(peca)
        for pose in POSES:
            peca.save(DESTINO / f"XB_Entregador_{pose}_{h:02d}h.webp",
                      "WEBP", quality=86, method=6)

    if not prontas:
        print(f"nenhum desenho em {PASTA}")
        print("os nomes sao 01h.png, 02h.png ... 12h.png")
        return

    faltam = [h for h in range(1, 13) if h not in prontas]
    print(f"chegaram {len(prontas)} de 12" +
          (f" — faltam {', '.join(f'{h}h' for h in faltam)}" if faltam else " — completo"))

    # Os oito nomes de hoje, cada um com a hora mais perto. Assim o jogo ja
    # usa o que chegou, sem esperar o resto.
    print(f"\n{'rumo de hoje':>13}  {'vem de':>6}  {'erro':>5}   frenteX frenteY  trasX  trasY")
    linhas = []
    for rumo, alvo in RUMOS_DE_HOJE.items():
        h = min(prontas, key=lambda k: abs((hora_na_tela(k) - alvo + 180) % 360 - 180))
        erro = abs((hora_na_tela(h) - alvo + 180) % 360 - 180)
        for pose in POSES:
            prontas[h].save(DESTINO / f"XB_Entregador_{pose}_{rumo}.webp",
                            "WEBP", quality=86, method=6)
        ex, ey, dx, dy = medida[h]
        # a roda da frente e a que esta do lado para onde ele vai
        vai_para_a_direita = math.cos(math.radians(alvo)) >= 0
        fx, fy, tx, ty = (dx, dy, ex, ey) if vai_para_a_direita else (ex, ey, dx, dy)
        print(f"{rumo:>13}  {h:>5}h  {erro:4.0f}°   {fx:6.1f}  {fy:6.1f} {tx:6.1f} {ty:6.1f}")
        linhas.append(f"  {rumo}: {{ frenteX: {fx:.1f}, frenteY: {fy:.1f}, "
                      f"trasX: {tx:.1f}, trasY: {ty:.1f} }},")

    print("\n— cole isto em GEOMETRIA, em client/src/game/rumoDoEntregador.ts —")
    print("export const GEOMETRIA: Readonly<Record<Rumo, GeometriaDoRumo>> = {")
    for l in linhas:
        print(l)
    print("};")
    print("\ne suba VERSAO_DO_DESENHO em client/src/components/Entregador.tsx,")
    print("senao o navegador continua mostrando o desenho velho por uma hora.")


if __name__ == "__main__":
    main()
