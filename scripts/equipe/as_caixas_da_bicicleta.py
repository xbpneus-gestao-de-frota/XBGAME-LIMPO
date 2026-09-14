"""
AS DUAS CAIXAS DA BICICLETA — a Loja e a Oficina, desenhadas por ele.

    python3 scripts/equipe/as_caixas_da_bicicleta.py

Le `assets-source/portaria/loja.webp` e `.../oficina.webp` e escreve
`client/public/assets/xbwapp/XBW_portaria_loja.webp` e `..._oficina.webp`.

Estas ja vieram com transparencia de verdade — ao contrario da folha das tres
caixas da ficha, que veio com o quadriculado desenhado. Entao aqui nao ha corte
nenhum: e recortar rente ao desenho, pôr as duas no MESMO quadro e encolher.

── POR QUE O MESMO QUADRO, SE SO SAO DUAS ────────────────────────────────────

Porque elas ficam uma ao lado da outra, e caixa que e imagem nao se estica sem
entortar. Com quadros de tamanhos diferentes, a da esquerda acabaria um dedo
acima da da direita — o tipo de desalinho que ninguem sabe nomear mas todo
mundo ve.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parents[1]
ORIGEM = RAIZ / "assets-source/portaria"
DESTINO = RAIZ / "client/public/assets/xbwapp"

CAIXAS = ["loja", "oficina"]

# O quadro pronto. Na tela do telefone cada uma ocupa perto de metade da
# largura; 460 pixels da folga para tela de retina sem virar peso de download.
LARGURA_DO_QUADRO = 460


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
    recortadas = []
    for nome in CAIXAS:
        im = Image.open(ORIGEM / f"{nome}.webp").convert("RGBA")
        recortadas.append((nome, im.crop(im.getbbox())))

    largura = max(im.width for _, im in recortadas)
    altura = max(im.height for _, im in recortadas)
    escala = LARGURA_DO_QUADRO / largura
    quadro = (LARGURA_DO_QUADRO, int(round(altura * escala)))

    prontas = []
    for nome, im in recortadas:
        tela = Image.new("RGBA", (largura, altura), (0, 0, 0, 0))
        # Centrada na largura e encostada embaixo: as duas param na mesma linha.
        tela.alpha_composite(im, ((largura - im.width) // 2, altura - im.height))
        prontas.append((nome, encolher(tela, quadro)))
    return prontas


if __name__ == "__main__":
    DESTINO.mkdir(parents=True, exist_ok=True)
    for nome, imagem in montar():
        caminho = DESTINO / f"XBW_portaria_{nome}.webp"
        imagem.save(caminho, "WEBP", quality=92, method=6)
        print(
            f"{caminho.relative_to(RAIZ)}  {imagem.size[0]}x{imagem.size[1]}"
            f"  {caminho.stat().st_size / 1024:.0f} KB"
        )
