"""
O BOTAO DO MUNDO — a porta de volta ao jogo, no alto do aplicativo.

    python3 scripts/abas/o_botao_do_mundo.py

Le `assets-source/abas/mundo.webp` e escreve
`client/public/assets/xbwapp/XBW_botao_mundo.webp`.

── POR QUE ELE MORA AQUI, JUNTO DOS ICONES DO RODAPE ─────────────────────────

Porque e a mesma familia de arte e o mesmo corte: disco de vidro com aro aceso,
recortado pelo DISCO e nao pelo brilho. A unica diferenca e que este e um so,
entao nao ha raio comum a combinar com ninguem — o quadro sai do proprio disco.

── E POR QUE ELE SUBSTITUI UM BOTAO QUE ERA PINTADO EM CSS ───────────────────

O botao de voltar ao jogo era uma moeda laranja desenhada em CSS com um
alfinete branco recortado dentro. Ele fazia PAR com o botao que abre o
aplicativo la no mapa: a mesma moeda vista dos dois lados da mesma porta.

Ordem dele, 14/09/2026: "vamos trocar tambem o botao laranja da parte superior
por estes". O par se desfaz de proposito — do lado do aplicativo, o desenho
agora diz PARA ONDE se volta (o mundo), e nao so que ha uma porta. Do lado do
mapa a moeda laranja continua, porque la o simbolo certo continua sendo o balao
da conversa.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parents[1]
ORIGEM = RAIZ / "assets-source/abas/mundo.webp"
DESTINO = RAIZ / "client/public/assets/xbwapp/XBW_botao_mundo.webp"

LADO_DO_QUADRO = 120
# Quanto do quadro o disco ocupa. O resto e a sobra do brilho — a mesma folga
# dos cinco do rodape, para o alto e o rodape lerem como o mesmo jogo.
PARTE_DO_DISCO = 0.86


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


def montar() -> Image.Image:
    im = Image.open(ORIGEM).convert("RGBA")
    al = np.asarray(im)[:, :, 3]
    # O disco e o que esta bem opaco; o brilho em volta e meia-tinta.
    ys, xs = np.nonzero(al > 205)
    cx, cy = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2
    raio = max(xs.max() - xs.min(), ys.max() - ys.min()) / 2
    meio = raio / PARTE_DO_DISCO
    caixa = (
        int(round(cx - meio)),
        int(round(cy - meio)),
        int(round(cx + meio)),
        int(round(cy + meio)),
    )
    return encolher(im.crop(caixa), (LADO_DO_QUADRO, LADO_DO_QUADRO))


if __name__ == "__main__":
    DESTINO.parent.mkdir(parents=True, exist_ok=True)
    imagem = montar()
    imagem.save(DESTINO, "WEBP", quality=92, method=6)
    print(
        f"{DESTINO.relative_to(RAIZ)}  {imagem.size[0]}x{imagem.size[1]}"
        f"  {DESTINO.stat().st_size / 1024:.0f} KB"
    )
