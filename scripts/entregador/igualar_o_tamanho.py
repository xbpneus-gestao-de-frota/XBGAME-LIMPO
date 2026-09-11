"""
IGUALAR O TAMANHO DO MENINO NAS OITO DIRECOES DE HOJE.

    python3 scripts/entregador/igualar_o_tamanho.py

── O DEFEITO ──────────────────────────────────────────────────────────────────

As folhas que estao no jogo hoje foram encaixadas na moldura pela LARGURA do
desenho. Parece inofensivo e nao e: de lado a bicicleta e COMPRIDA, de frente e
CURTA. Encaixar pela largura encolhe o desenho de lado e estica o de frente.

Medido nas proprias folhas, em porcentagem da altura da moldura:

    leste 70,0   nordeste 70,0   norte 70,0   noroeste 83,0
    oeste 74,5   sudoeste 83,0   sul 89,5     sudeste 87,0

O menino indo para leste tem SETENTA por cento da moldura; indo para o sul tem
quase noventa. Vinte e oito por cento de diferenca de tamanho — e ele passa de
um para o outro ao virar uma esquina.

── O CONSERTO ─────────────────────────────────────────────────────────────────

A regua passa a ser a ALTURA. A altura de um menino em cima de uma bicicleta
quase nao muda com a direcao: de costas, de lado ou de frente, a cabeca fica na
mesma altura do chao. E o comprimento que muda, e por isso ele nao serve.

Todos vao para 88% da moldura, com o pneu mais baixo em 97%. Oitenta e oito
porque e onde ja estao o sul e o sudeste — que sao os rumos que ele viu na tela
quando aprovou o tamanho, porque a primeira corrida desce quase inteira. Assim
o que ele aprovou continua igual, e os outros param de encolher.

Depois de igualar, a geometria de contato muda de lugar e e MEDIDA DE NOVO —
senao a sombra e o pouso ficam apontando para onde a roda estava antes.

Isto e conserto do que existe. Quando as doze folhas novas chegarem, quem manda
e o doze_horas.py, que ja nasce com esta mesma regua.
"""
from __future__ import annotations

import importlib.util
import math
from pathlib import Path

import numpy as np
from PIL import Image

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parents[1]
DESTINO = RAIZ / "client/public/assets"

spec = importlib.util.spec_from_file_location("dz", AQUI / "doze_horas.py")
dz = importlib.util.module_from_spec(spec)
spec.loader.exec_module(dz)

POSES = ("pedalando1", "parado")


def main() -> None:
    antes: dict[str, float] = {}
    corpos: dict[str, Image.Image] = {}
    for rumo in dz.RUMOS_DE_HOJE:
        im = Image.open(DESTINO / f"XB_Entregador_pedalando1_{rumo}.webp").convert("RGBA")
        ys, _ = np.nonzero(np.asarray(im)[..., 3] > 25)
        antes[rumo] = (ys.max() - ys.min() + 1) / im.height * 100
        corpos[rumo] = dz.contorno(im)
    alto = dz.altura_que_cabe(list(corpos.values()))

    print(f"{'rumo':>10} {'altura antes':>13} {'depois':>8}   frenteX frenteY  trasX  trasY")
    linhas = []
    for rumo, alvo in dz.RUMOS_DE_HOJE.items():
        peca = dz.na_moldura(corpos[rumo], alto)
        for pose in POSES:
            peca.save(DESTINO / f"XB_Entregador_{pose}_{rumo}.webp",
                      "WEBP", quality=86, method=6)

        ex, ey, dx, dy = dz.apoios(peca)
        # a roda da frente e a do lado para onde ele vai
        direita = math.cos(math.radians(alvo)) >= 0
        fx, fy, tx, ty = (dx, dy, ex, ey) if direita else (ex, ey, dx, dy)
        print(f"{rumo:>10} {antes[rumo]:12.1f}% {alto/dz.LADO*100:7.0f}%   "
              f"{fx:6.1f}  {fy:6.1f} {tx:6.1f} {ty:6.1f}")
        linhas.append(f"  {rumo}: {{ frenteX: {fx:.1f}, frenteY: {fy:.1f}, "
                      f"trasX: {tx:.1f}, trasY: {ty:.1f} }},")

    print("\nexport const GEOMETRIA: Readonly<Record<Rumo, GeometriaDoRumo>> = {")
    for l in linhas:
        print(l)
    print("};")


if __name__ == "__main__":
    main()
