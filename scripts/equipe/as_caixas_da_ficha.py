"""
AS TRES CAIXAS DA FICHA — bicicleta, mochila e acessorios, desenhadas por ele.

    python3 scripts/equipe/as_caixas_da_ficha.py

Le `assets-source/caixas-da-ficha/folha_das_tres_caixas.webp` e escreve
`client/public/assets/xbwapp/XBW_caixa_bicicleta.webp`, `..._mochila.webp` e
`..._acessorios.webp`.

── O FUNDO XADREZ ERA PIXEL, E NAO TRANSPARENCIA ─────────────────────────────

A folha chegou com o quadriculado cinza-e-branco DESENHADO nela: e a foto de
uma tela mostrando um arquivo transparente, e nao o arquivo transparente. Coladas
assim, as tres caixas apareceriam no aplicativo com o quadriculado em volta.

O corte nao procura o xadrez pelo desenho dele (o quadriculado tem ruido de
compressao e nao bate quadradinho por quadradinho). Procura o que o xadrez E:
cinza SEM COR NENHUMA e claro. E, para nao comer as partes claras da arte — a
fita refletiva da mochila, as letras brancas —, so vira transparente o que esta
LIGADO NA BORDA da folha. Branco cercado de preto fica onde esta.

── AS TRES SAEM DO MESMO RETANGULO ───────────────────────────────────────────

As tres caixas tem alturas diferentes na folha: a bicicleta sobe mais que o
capacete. Mas as tres PLACAS de baixo terminam na mesma linha — foi assim que
ele desenhou, e e isso que faz as tres pararem em pe lado a lado.

Entao o recorte de cada uma usa a MESMA faixa de altura e a MESMA largura de
quadro. Cada desenho fica centrado no seu quadro, a bicicleta usa mais o alto e
o capacete usa menos. Recortando cada uma rente ao proprio contorno, as tres
ficariam com proporcoes diferentes e o rodape delas nao se alinharia mais.
"""
from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np
from PIL import Image

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parents[1]
ORIGEM = RAIZ / "assets-source/caixas-da-ficha/folha_das_tres_caixas.webp"
DESTINO = RAIZ / "client/public/assets/xbwapp"

# Onde cada caixa comeca e acaba na folha, em pixel. Medido pelo alfa depois do
# corte: sao as tres colunas que sobram com desenho.
COLUNAS: list[tuple[str, int, int]] = [
    ("bicicleta", 13, 412),
    ("mochila", 418, 823),
    ("acessorios", 832, 1204),
]

# A faixa de altura comum. O fim (1112) e a linha onde as tres placas acabam.
DE_CIMA, DE_BAIXO = 251, 1112

# O quadro de cada caixa, ja no tamanho de uso. A largura e a da caixa mais
# larga da folha; a altura sai da faixa comum, na mesma escala.
LARGURA_DO_QUADRO = 340


def sem_o_xadrez(folha: Image.Image) -> np.ndarray:
    """Devolve o alfa da folha: 0 no quadriculado, 255 no desenho.

    ── POR QUE NAO DA PARA DESENHAR O XADREZ DE VOLTA E SUBTRAIR ────────────

    Seria o caminho obvio: o quadriculado tem quadradinho de dez pixels, duas
    cores, e pronto. Nao funciona — a folha e a FOTO de uma tela, redimensionada
    por um numero quebrado, e os quadradinhos nao caem todos em dez pixels
    certos. Ao longo dos mil e duzentos pixels de largura a conta escorrega uns
    seis, e a partir do meio da folha o xadrez desenhado nao bate mais com o
    xadrez da foto.

    Entao o corte nao procura o DESENHO do xadrez. Procura o que ele E, de duas
    maneiras que se completam.
    """
    a = np.asarray(folha.convert("RGB"))
    cinza = cv2.cvtColor(a, cv2.COLOR_RGB2GRAY)
    altura, largura = cinza.shape

    # Cinza sem cor nenhuma, e claro: e isso que o quadriculado e, e nada na
    # arte dele (azul, ciano, preto) e as duas coisas ao mesmo tempo.
    sem_cor = (
        (a.max(axis=2).astype(int) - a.min(axis=2).astype(int)) < 26
    ).astype(np.uint8)
    candidato = sem_cor.astype(bool) & (cinza > 190) & (cinza < 262)

    # ── 1. O QUE ESTA LIGADO NA BORDA ────────────────────────────────────
    # Pega o xadrez de fora das caixas e as duas tiras estreitas entre elas.
    balde = np.zeros((altura + 2, largura + 2), np.uint8)
    marcado = candidato.astype(np.uint8).copy()
    cantos = [(0, 0), (largura - 1, 0), (0, altura - 1), (largura - 1, altura - 1)]
    for canto in cantos:
        cv2.floodFill(
            marcado,
            balde,
            canto,
            2,
            0,
            0,
            4 | (255 << 8) | cv2.FLOODFILL_FIXED_RANGE,
        )
    de_fora = marcado == 2

    # ── 2. O XADREZ CERCADO POR DESENHO ──────────────────────────────────
    # Entre os raios da roda e dentro do quadro da bicicleta o xadrez e uma
    # ilha: nao encosta na borda, e o passo de cima nao chega la. Este passo
    # acha pelo COMPORTAMENTO — numa janela de vinte e um pixels, tudo sem cor,
    # o mais escuro por volta de 213 e o mais claro por volta de 254.
    #
    # A janela de 21 e o que separa xadrez de branco de verdade: ela e maior
    # que um quadradinho, entao dentro dela SEMPRE cabe um pedaco de cada cor.
    # A fita refletiva da mochila e branca inteira — o escuro dela nao aparece,
    # e ela fica onde esta.
    janela = np.ones((21, 21), np.uint8)
    mais_escuro = cv2.erode(cinza, janela).astype(int)
    mais_claro = cv2.dilate(cinza, janela).astype(int)
    nucleo = (
        cv2.erode(sem_cor, janela).astype(bool)
        & (mais_escuro > 192)
        & (mais_escuro < 240)
        & (mais_claro > 240)
        & (mais_claro < 262)
    )
    # A janela encolhe a ilha em dez pixels de cada lado; devolver os dez e
    # cruzar com o candidato solto recupera a borda sem invadir o desenho.
    de_dentro = (
        cv2.dilate(nucleo.astype(np.uint8), np.ones((25, 25), np.uint8)).astype(bool)
        & candidato
    )

    alfa = np.where(de_fora | de_dentro, 0, 255).astype(np.uint8)
    # Fecha buraquinhos de um pixel que o ruido de compressao abre na arte.
    return cv2.morphologyEx(alfa, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))


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
    folha = Image.open(ORIGEM)
    alfa = sem_o_xadrez(folha)
    inteira = Image.fromarray(
        np.dstack([np.asarray(folha.convert("RGB")), alfa]), "RGBA"
    )

    largura_maxima = max(fim - inicio for _, inicio, fim in COLUNAS)
    altura_da_faixa = DE_BAIXO - DE_CIMA
    escala = LARGURA_DO_QUADRO / largura_maxima
    quadro = (LARGURA_DO_QUADRO, int(round(altura_da_faixa * escala)))

    prontas = []
    for nome, inicio, fim in COLUNAS:
        pedaco = inteira.crop((inicio, DE_CIMA, fim, DE_BAIXO))
        tela = Image.new("RGBA", (largura_maxima, altura_da_faixa), (0, 0, 0, 0))
        tela.alpha_composite(pedaco, ((largura_maxima - (fim - inicio)) // 2, 0))
        prontas.append((nome, encolher(tela, quadro)))
    return prontas


if __name__ == "__main__":
    DESTINO.mkdir(parents=True, exist_ok=True)
    for nome, imagem in montar():
        caminho = DESTINO / f"XBW_caixa_{nome}.webp"
        imagem.save(caminho, "WEBP", quality=92, method=6)
        print(
            f"{caminho.relative_to(RAIZ)}  {imagem.size[0]}x{imagem.size[1]}"
            f"  {caminho.stat().st_size / 1024:.0f} KB"
        )
