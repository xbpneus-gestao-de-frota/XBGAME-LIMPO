# -*- coding: utf-8 -*-
"""
RECORTA O DRONE E A CAIXA das folhas que o Fernando entregou.

A folha dos drones traz cinco vistas do mesmo aparelho. O jogo usa duas:

  frente  - a que vem NA nossa direcao, com a camera do gimbal apontada para
            quem olha. E a vista da passagem rente aos olhos.
  voando  - a de tres quartos vista um pouco de cima, que e como um drone
            aparece sobrevoando um bairro desenhado a 31 graus do chao.

As outras tres ficam na folha. Nao ha por que recortar o que nao entra.

O RECORTE E DA SILHUETA, e nao de um retangulo escolhido a mao: cada peca sai
colada no proprio contorno (getbbox sobre o alfa). Assim a posicao na tela e a
posicao do DRONE, e nao de uma moldura invisivel em volta dele — a mesma regra
que vale para o garoto em pe.
"""
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

AQUI = Path(__file__).resolve().parents[2]
FOLHAS = AQUI / "assets-source" / "drone"
DESTINO = AQUI / "client" / "public" / "assets"

# Quanto cada peca mede de largura depois de recortada. A da frente e a maior
# porque ela chega a cobrir a tela inteira na passagem.
LARGURAS = {"frente": 1000, "voando": 760, "caixa": 460, "aberta": 1100}


def pedacos(alfa: np.ndarray, minimo: int = 8000):
    rotulos, quantos = ndimage.label(alfa)
    saida = []
    for i in range(1, quantos + 1):
        ys, xs = np.where(rotulos == i)
        if len(xs) < minimo:
            continue
        saida.append((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))
    return saida


def corta(im: Image.Image, caixa) -> Image.Image:
    peca = im.crop(caixa)
    return peca.crop(peca.getbbox())


NOMES = {
    "frente": "XB_drone_frente.webp",
    "voando": "XB_drone_voando.webp",
    "caixa": "XB_caixa.webp",
    "aberta": "XB_caixa_aberta.webp",
}


def salva(peca: Image.Image, nome: str) -> None:
    largura = LARGURAS[nome]
    altura = round(peca.height * largura / peca.width)
    peca = peca.resize((largura, altura), Image.LANCZOS)
    caminho = DESTINO / NOMES[nome]
    peca.save(caminho, "WEBP", quality=92, method=6)
    print(f"  {caminho.name}: {peca.width}x{peca.height}")


def main() -> None:
    folha = Image.open(FOLHAS / "folha_drones.png").convert("RGBA")
    alfa = np.array(folha)[:, :, 3] > 24

    # A fileira de cima traz DOIS drones que se tocam pelas helices. A divisao
    # cai na coluna mais vazia entre eles — achada, e nao chutada.
    topo = [c for c in pedacos(alfa) if c[1] < 200 and c[2] - c[0] > 900]
    assert len(topo) == 1, f"esperava a fileira de cima colada, achei {len(topo)}"
    x0, y0, x1, y1 = topo[0]
    faixa = alfa[y0:y1, :]
    janela = range(x0 + 600, x0 + 850)
    corte = min(janela, key=lambda x: faixa[:, x].sum())
    print(f"a fileira de cima se divide na coluna {corte}")

    salva(corta(folha, (x0, y0, corte, y1)), "frente")

    # A de tres quartos vista de cima e a de baixo, a esquerda.
    baixo = [c for c in pedacos(alfa) if c[1] > 650 and c[0] < 400]
    assert len(baixo) == 1, f"esperava uma peca em baixo a esquerda, achei {len(baixo)}"
    salva(corta(folha, baixo[0]), "voando")

    caixa = Image.open(FOLHAS / "folha_caixa.png").convert("RGBA")
    salva(caixa.crop(caixa.getbbox()), "caixa")

    # A MESMA MALA, ABERTA. Fechada e aberta tem quase a mesma proporcao (1,10 e
    # 1,08), e e isso que deixa a troca parecer a tampa saltando em vez de uma
    # figura virando outra: os dois desenhos ocupam o mesmo quadro.
    aberta = Image.open(FOLHAS / "folha_caixa_aberta.png").convert("RGBA")
    salva(aberta.crop(aberta.getbbox()), "aberta")


if __name__ == "__main__":
    main()
