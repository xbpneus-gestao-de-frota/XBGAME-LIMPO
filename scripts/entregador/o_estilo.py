"""
REFAZER NESTE ESTILO — a figura que a arte usa para acertar as 20 de pedalada.

    python3 scripts/entregador/o_estilo.py

Em cima, as quatro cenas paradas: sao o estilo que vale. Embaixo, as vinte
folhas de pedalada NA ORDEM DE QUANTO APARECEM NA TELA, com a porcentagem de
tempo de cada uma.

── POR QUE A ORDEM IMPORTA ───────────────────────────────────────────────────

"O jogador esta sofrendo muitas mutacoes de estilo durante o percurso."

Ele esta certo, e a causa e aritmetica: sao vinte desenhos feitos em cinco levas
diferentes, e o jogo troca de desenho a cada dois segundos. Cada troca e um
pulinho de estilo — mochila de outro tamanho, pneu de outra grossura, brilho de
outra intensidade.

Pedir vinte desenhos de uma vez ja falhou cinco vezes nesta arte. Entao a figura
poe a fila em ordem de uso, medida em quarenta rotas do bairro: as NOVE
primeiras cobrem 73% do tempo de tela, e as doze primeiras cobrem 85%. Refazer
nove conserta quase tudo o que ele ve; refazer as vinte conserta o resto.

Os numeros de uso sao medidos com a mesma regra de troca que o jogo usa — a
mesma olhada adiante, a mesma folga na divisa e a mesma espera minima.
"""
from __future__ import annotations

import importlib.util
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parents[1]
FOLHAS = RAIZ / "assets-source/entregador"
DESTINO = RAIZ.parent / "NOTAS DE TRABALHO/entregador 24/REFAZER_NESTE_ESTILO.png"

spec = importlib.util.spec_from_file_location("dz", AQUI / "doze_horas.py")
dz = importlib.util.module_from_spec(spec)
spec.loader.exec_module(dz)

# % do tempo de tela, medido em 40 rotas do bairro com a regra de troca do jogo
USO = [
    ("02h00", 11.5), ("08h30", 11.4), ("02h30", 10.1), ("04h30", 9.7),
    ("09h00", 7.5), ("04h00", 6.8), ("10h00", 6.5), ("09h30", 5.1),
    ("07h30", 4.5), ("08h00", 4.5), ("06h00", 3.6), ("10h30", 3.5),
    ("03h00", 2.5), ("11h30", 2.1), ("01h30", 2.1), ("12h00", 1.9),
    ("11h00", 1.9), ("12h30", 1.8), ("03h30", 1.6), ("01h00", 1.4),
]
PRIMEIRA_LEVA = 9        # quantas cobrem 73% do tempo
FONTES = "/usr/share/fonts/truetype/dejavu"


def fonte(t: int, negrito: bool = False):
    return ImageFont.truetype(
        f"{FONTES}/{'DejaVuSans-Bold.ttf' if negrito else 'DejaVuSans.ttf'}", t)


def main() -> None:
    relogio = [dz.contorno(dz.sem_fundo(Image.open(p)))
               for p in sorted(FOLHAS.glob("folha_[0-9]*h[0-9]*.png"))]
    alto = dz.altura_que_cabe(relogio)

    def peca(nome: str) -> Image.Image:
        return dz.na_moldura(
            dz.contorno(dz.sem_fundo(Image.open(FOLHAS / f"{nome}.png"))), alto)

    novas = ["entrega_esquerda", "entrega_direita", "coleta_esquerda", "coleta_direita"]
    COLS, CEL = 7, 236
    linhas = (len(USO) + COLS - 1) // COLS
    topo = 96 + CEL + 72
    largura = COLS * CEL + 24
    tela = Image.new("RGB", (largura, topo + linhas * (CEL + 40) + 30), (250, 250, 252))
    d = ImageDraw.Draw(tela)

    d.text((16, 16), "REFAZER NESTE ESTILO", font=fonte(30, True), fill=(24, 28, 38))
    d.text((16, 54),
           "em cima, o estilo que vale (as quatro ultimas) — embaixo, as vinte de "
           "pedalada na ordem de quanto aparecem na tela",
           font=fonte(16), fill=(96, 104, 120))

    d.rectangle([10, 92, largura - 14, 92 + CEL + 30], fill=(238, 247, 241),
                outline=(20, 140, 70), width=2)
    for i, n in enumerate(novas):
        x = 20 + i * CEL
        im = peca(n).resize((CEL - 16, CEL - 16), Image.LANCZOS)
        tela.paste(im, (x, 98), im)
        d.text((x + 4, 98 + CEL - 12), n.replace("_", " · "),
               font=fonte(14, True), fill=(20, 120, 70))
    d.text((20 + 4 * CEL + 16, 98 + CEL // 2 - 40), "O ESTILO",
           font=fonte(26, True), fill=(20, 140, 70))
    d.text((20 + 4 * CEL + 16, 98 + CEL // 2 - 6),
           "mochila com as barras de luz,\nroda de raios finos, tenis com\nsola "
           "branca, ciano de tinta e\nnao de neon",
           font=fonte(15), fill=(60, 110, 84))

    acumulado = 0.0
    for i, (nome, pct) in enumerate(USO):
        acumulado += pct
        r, c = divmod(i, COLS)
        x, y = 12 + c * CEL, topo + r * (CEL + 40)
        primeira = i < PRIMEIRA_LEVA
        cor = (200, 40, 40) if primeira else (170, 176, 188)
        im = peca(f"folha_{nome}").resize((CEL - 16, CEL - 16), Image.LANCZOS)
        if not primeira:
            im = Image.merge("RGBA", (*im.convert("RGBA").split()[:3],
                                      im.split()[3].point(lambda v: int(v * 0.45))))
        tela.paste(im, (x, y), im)
        d.rectangle([x, y, x + CEL - 16, y + CEL - 16], outline=cor,
                    width=3 if primeira else 1)
        d.text((x + 4, y + CEL - 12), f"{i + 1}º  {nome}",
               font=fonte(16, True), fill=cor)
        d.text((x + 4, y + CEL + 8), f"{pct:.1f}% do tempo  ·  ate aqui "
                                     f"{acumulado:.0f}%",
               font=fonte(13), fill=(110, 118, 134))

    d.text((12, topo - 40),
           f"AS {PRIMEIRA_LEVA} DE VERMELHO COBREM 73% DO TEMPO DE TELA — "
           "sao estas primeiro. As de cinza vem depois.",
           font=fonte(18, True), fill=(200, 40, 40))

    DESTINO.parent.mkdir(parents=True, exist_ok=True)
    tela.save(DESTINO)
    print(f"escrito: {DESTINO}")


if __name__ == "__main__":
    main()
