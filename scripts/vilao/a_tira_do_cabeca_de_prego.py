"""
A TIRA DO CABECA DE PREGO — o primeiro vilao, levantando peso na pracinha.

    python3 scripts/vilao/a_tira_do_cabeca_de_prego.py

Le as quatro poses em `assets-source/cabeca-de-prego/` e escreve
`client/public/assets/XB_Cabeca_De_Prego_tira.webp`: os quatro quadros lado a
lado, do mesmo tamanho, num arquivo so.

── POR QUE UMA TIRA, E NAO QUATRO ARQUIVOS ───────────────────────────────────

Quatro arquivos e um relogio no React trocando o `src` custa tres coisas que
uma tira nao custa: o primeiro giro da animacao pisca (o segundo quadro ainda
esta baixando quando chega a vez dele), o mapa inteiro se redesenha a cada
troca, e o navegador continua trocando quadro com a aba escondida.

Com a tira, o quadro e a POSICAO DO FUNDO, e quem troca e o CSS. Uma imagem so,
zero relogio, zero redesenho — e o navegador pausa sozinho quando ninguem esta
olhando. O compasso mora no `@keyframes`, ao lado do resto do bairro.

── O ALINHAMENTO: PELO PE, E POR NENHUM OUTRO LUGAR ──────────────────────────

Numa levantada de peso o que NAO se mexe sao as botas. Alinhados pelo meio do
desenho — que e o que um recorte automatico faz —, os quadros poem o vilao um
pouco mais para ca e um pouco mais para la a cada passo, e ele DESLIZA pela
pracinha enquanto levanta. Alinhados pela sola, ele levanta o peso e fica onde
esta, que e a unica coisa que a animacao precisa acertar.

Os numeros abaixo sao a medida das botas de cada render: o meio das duas e a
sola da mais baixa. Foram achados pelo laranja forte das botas e pela borracha
escura embaixo delas, e conferidos um por um em cima do desenho.

── A LINHA DO CHAO NAO E A BORDA DE BAIXO ────────────────────────────────────

Aqui esta a diferenca entre este e o garoto da praca. O garoto e recortado rente
ao contorno e a linha de baixo da imagem E a sola do tenis — entao o ponto do
mapa e o pe, sem conta nenhuma.

O vilao nao: a barra esta na FRENTE dele, e visto de cima o que esta na frente
aparece MAIS EMBAIXO na tela. As anilhas encostam no chao uns duzentos pixels
abaixo das botas dele. Cortar na sola comeria as anilhas; cortar embaixo das
anilhas poe o pe dele no meio da imagem.

Por isso a tira guarda os dois, e diz onde esta a sola: LINHA_DO_PE, la embaixo.
E esse numero que o CSS usa para pendurar o desenho, e e por isso que ele esta
escrito aqui e repetido no jogo — com um teste amarrando os dois.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parents[1]
ORIGEM = RAIZ / "assets-source/cabeca-de-prego"
DESTINO = RAIZ / "client/public/assets/XB_Cabeca_De_Prego_tira.webp"

# (arquivo, x do meio das duas botas, y da sola mais baixa), em pixel do render.
# A ORDEM E O COMPASSO: 0 e o fundo do agachamento e 3 e o travamento em pe.
POSES: list[tuple[str, float, float]] = [
    ("1_embaixo.webp", 640.5, 1053),
    ("2_saindo_do_chao.webp", 652.0, 1084),
    ("3_meio_da_puxada.webp", 650.0, 1090),
    ("4_em_pe.webp", 687.5, 1191),
]

# Mesa de trabalho folgada: cada render entra nela deslocado ate que a sola
# caia sempre no mesmo lugar.
MESA = (1800, 1500)
ANCORA = (900, 1250)

# O recorte comum. A largura foi escolhida para deixar a ANCORA no meio exato:
# assim o `translate(-50%, ...)` do CSS ja poe o pe dele no ponto do mapa, sem
# nenhum acerto de lado. A altura pega do alto da cabeca em pe (o quadro mais
# alto) ate a anilha mais baixa (o quadro mais fundo).
RECORTE = (250, 80, 1550, 1451)

# O quadro pronto. Trinta pixels de altura e o que ele ocupa no mapa de longe;
# cento e vinte, no zoom cheio de uma tela grande. Trezentos e vinte da folga
# para tela de retina sem virar peso de download.
QUADRO = (304, 320)


def encolher(im: Image.Image, tamanho: tuple[int, int]) -> Image.Image:
    """Encolhe com o alfa PRE-MULTIPLICADO.

    Sem pre-multiplicar, o preto transparente de fora entra na media junto com
    o desenho e a borda escurece — a orla suja que denuncia recorte. A trinta
    pixels de altura essa orla e uma parte grande do que se ve dele.
    """
    a = np.asarray(im).astype(np.float64)
    alfa = a[:, :, 3:4] / 255.0
    juntos = np.concatenate([a[:, :, :3] * alfa, a[:, :, 3:4]], axis=2)
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
    quadros = []
    for nome, meio_dos_pes, sola in POSES:
        pose = Image.open(ORIGEM / nome).convert("RGBA")
        mesa = Image.new("RGBA", MESA, (0, 0, 0, 0))
        mesa.alpha_composite(
            pose,
            (
                int(round(ANCORA[0] - meio_dos_pes)),
                int(round(ANCORA[1] - sola)),
            ),
        )
        quadros.append(encolher(mesa.crop(RECORTE), QUADRO))

    tira = Image.new("RGBA", (QUADRO[0] * len(quadros), QUADRO[1]), (0, 0, 0, 0))
    for i, q in enumerate(quadros):
        tira.paste(q, (QUADRO[0] * i, 0))
    return tira


def linha_do_pe() -> float:
    """Onde a sola dele cai, contada do alto da tira. O CSS repete este numero."""
    return (ANCORA[1] - RECORTE[1]) / (RECORTE[3] - RECORTE[1])


if __name__ == "__main__":
    tira = montar()
    DESTINO.parent.mkdir(parents=True, exist_ok=True)
    tira.save(DESTINO, "WEBP", quality=92, method=6)
    print(f"{DESTINO.relative_to(RAIZ)}  {tira.size[0]}x{tira.size[1]}")
    print(f"quadros: {len(POSES)}  cada um {QUADRO[0]}x{QUADRO[1]}")
    print(f"linha do pe: {linha_do_pe() * 100:.2f}% da altura")
    print(f"peso: {DESTINO.stat().st_size / 1024:.0f} KB")
