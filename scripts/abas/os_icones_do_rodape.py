"""
OS CINCO DESENHOS DO RODAPE — conversas, contatos, pedidos, ferramentas, equipe.

    python3 scripts/abas/os_icones_do_rodape.py

Le `assets-source/abas/*.webp` e escreve
`client/public/assets/xbwapp/XBW_aba3-<nome>.webp`.

── POR QUE TODOS NO MESMO QUADRO QUADRADO ────────────────────────────────────

Porque eles ficam lado a lado no rodape, e o brilho em volta de cada um tem uma
sobra diferente: o de ferramentas espalha mais que o de contatos. Recortando
cada um rente ao proprio brilho, o disco de dentro — que e o que o olho ve como
"o botao" — sairia de um tamanho diferente em cada aba, e o rodape ficaria com
os cinco botoes desencontrados sem nenhum erro aparecer.

Entao o recorte e pelo DISCO, e nao pelo brilho: acha-se o circulo opaco de
cada desenho, usa-se o maior raio dos cinco, e todos entram num quadro com a
mesma folga em volta. O brilho que passar do quadro e cortado — ele e
espalhamento, e nao desenho.

── E O QUADRO E O TRIPLO DO TAMANHO DE TELA ──────────────────────────────────

No rodape cada icone tem uns trinta pixels de lado. Cento e vinte da folga para
tela de retina e para o dia em que ele pedir os icones maiores — ja aconteceu
uma vez, em 13/09, e o desenho nao pode ser o limite.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parents[1]
ORIGEM = RAIZ / "assets-source/abas"
DESTINO = RAIZ / "client/public/assets/xbwapp"

ICONES = ["conversas", "contatos", "pedidos", "ferramentas", "equipe"]

LADO_DO_QUADRO = 120
# Quanto do quadro o disco ocupa. O resto e a sobra do brilho.
PARTE_DO_DISCO = 0.86


def raio_do_disco(im: Image.Image) -> tuple[float, float, float]:
    """Centro e raio do disco opaco — o botao, sem o brilho espalhado em volta."""
    al = np.asarray(im)[:, :, 3]
    # O disco e o que esta bem opaco; o brilho e meia-tinta.
    ys, xs = np.nonzero(al > 205)
    cx, cy = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2
    raio = max(xs.max() - xs.min(), ys.max() - ys.min()) / 2
    return cx, cy, raio


def encolher(im: Image.Image, tamanho: tuple[int, int]) -> Image.Image:
    """Encolhe com o alfa PRE-MULTIPLICADO, para a borda nao escurecer."""
    a = np.asarray(im).astype(np.float64)
    al = a[:, :, 3:4] / 255.0
    juntos = np.concatenate([a[:, :, :3] * al, a[:, :, 3:4]], axis=2)
    menor = Image.fromarray(juntos.astype(np.uint8), "RGBA").resize(
        tamanho, Image.LANCZOS
    )
    b = np.asarray(menor).astype(np.float64)
    a2 = np.clip(b[:, :, 3:4] / 255.0, 1e-6, 1)
    rgb = np.clip(b[:, :, :3] / a2, 0, 255)
    return Image.fromarray(
        np.concatenate([rgb, b[:, :, 3:4]], axis=2).astype(np.uint8), "RGBA"
    )


def montar() -> list[tuple[str, Image.Image]]:
    lidos = []
    for nome in ICONES:
        im = Image.open(ORIGEM / f"{nome}.webp").convert("RGBA")
        lidos.append((nome, im, raio_do_disco(im)))

    # O maior disco manda: com ele dentro do quadro, os menores sobram folga.
    maior = max(r for _, _, (_, _, r) in lidos)
    meio_quadro = maior / PARTE_DO_DISCO

    prontos = []
    for nome, im, (cx, cy, _) in lidos:
        caixa = (
            int(round(cx - meio_quadro)),
            int(round(cy - meio_quadro)),
            int(round(cx + meio_quadro)),
            int(round(cy + meio_quadro)),
        )
        # `crop` fora da imagem devolve transparente, que e o que se quer.
        prontos.append(
            (nome, encolher(im.crop(caixa), (LADO_DO_QUADRO, LADO_DO_QUADRO)))
        )
    return prontos


if __name__ == "__main__":
    DESTINO.mkdir(parents=True, exist_ok=True)
    for nome, imagem in montar():
        caminho = DESTINO / f"XBW_aba3-{nome}.webp"
        imagem.save(caminho, "WEBP", quality=92, method=6)
        print(
            f"{caminho.relative_to(RAIZ)}  {imagem.size[0]}x{imagem.size[1]}"
            f"  {caminho.stat().st_size / 1024:.0f} KB"
        )
