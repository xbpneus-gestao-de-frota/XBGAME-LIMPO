"""
OS DESENHOS DA LOJA E DA OFICINA — os seis jeitos de andar e as quatro pecas.

    python3 scripts/equipe/os_desenhos_da_loja.py

Le `assets-source/loja/*.webp` e `assets-source/oficina/*.webp` e escreve
`client/public/assets/xbwapp/XBW_loja_<item>.webp` e `XBW_peca_<peca>.webp`.

── TODOS NO MESMO QUADRO, E POR QUE ISSO IMPORTA AQUI ────────────────────────

Eles aparecem numa LISTA, um embaixo do outro. Recortado cada um rente ao
proprio contorno, o caiaque — que e comprido e baixo — sairia do mesmo tamanho
de altura que a bicicleta, que e alta e estreita. Na lista, o caiaque viraria um
risco gigante e a bicicleta uma miniatura.

Entao todos entram num quadro de mesma proporcao, centrados, e cada desenho usa
do quadro o que a forma dele pede. E a mesma regra das caixas da ficha, pelo
mesmo motivo.

── E O QUADRO E DEITADO ──────────────────────────────────────────────────────

Porque a linha da lista e deitada: o desenho fica a esquerda e o nome a direita.
Num quadro em pe, a bicicleta mandaria na altura de todas as linhas e a lista
ficaria com seis degraus altissimos, so para caber um caiaque no meio deles.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parents[1]
DESTINO = RAIZ / "client/public/assets/xbwapp"

# (pasta de origem, comeco do nome de saida, os nomes)
GRUPOS = [
    (
        "loja",
        "XBW_loja_",
        ["bicicleta", "patins", "triciclo", "patinete", "caiaque", "skate"],
    ),
    ("oficina", "XBW_peca_", ["tire", "chain", "brake", "wheels"]),
]

# O quadro deitado da linha da lista, ja no tamanho de uso.
QUADRO = (300, 210)


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


def num_quadro(im: Image.Image) -> Image.Image:
    """Poe o desenho recortado dentro do quadro deitado, centrado e com folga."""
    rente = im.crop(im.getbbox())
    larg, alt = QUADRO
    # 92% do quadro, para o brilho de cada desenho nao encostar na borda.
    escala = min(larg * 0.92 / rente.width, alt * 0.92 / rente.height)
    cabe = rente.resize(
        (max(1, round(rente.width * escala)), max(1, round(rente.height * escala))),
        Image.LANCZOS,
    )
    tela = Image.new("RGBA", QUADRO, (0, 0, 0, 0))
    tela.alpha_composite(cabe, ((larg - cabe.width) // 2, (alt - cabe.height) // 2))
    return tela


if __name__ == "__main__":
    DESTINO.mkdir(parents=True, exist_ok=True)
    for pasta, comeco, nomes in GRUPOS:
        for nome in nomes:
            origem = RAIZ / f"assets-source/{pasta}/{nome}.webp"
            grande = Image.open(origem).convert("RGBA")
            # Encolhe ANTES de emoldurar seria mais rapido e perderia nitidez:
            # o recorte rente muda o tamanho, e encolher duas vezes borra.
            pronta = num_quadro(
                encolher(grande, (grande.width // 2, grande.height // 2))
            )
            caminho = DESTINO / f"{comeco}{nome}.webp"
            pronta.save(caminho, "WEBP", quality=92, method=6)
            print(
                f"{caminho.relative_to(RAIZ)}  {pronta.size[0]}x{pronta.size[1]}"
                f"  {caminho.stat().st_size / 1024:.0f} KB"
            )
