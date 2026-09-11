"""
RECORTAR AS FOLHAS DO ENTREGADOR.

O Fernando desenhou o entregador em OITO FOLHAS, uma por rumo, com doze poses
em cada — parado, andando, com a bicicleta, pedalando, entregando a caixa e
comemorando. Noventa e seis desenhos.

    python3 scripts/entregador/recortar.py

── POR QUE TODOS SAEM DO MESMO TAMANHO ────────────────────────────────────────

Esta e a armadilha classica de conjunto de pose, e ela e invisivel ate a peca
trocar na tela: se cada desenho for cortado rente ao seu proprio contorno, o
menino ANDANDO (estreito) e o menino DE BICICLETA (largo) saem com larguras
diferentes. O jogo dimensiona pela largura — entao, no instante em que ele
desce da bicicleta, o menino cresceria de tamanho.

Por isso todos os noventa e seis saem na MESMA moldura, calculada como a caixa
que cabe todos. Trocar de pose passa a ser so trocar o desenho.

E os pes ja vem na mesma linha nas oito folhas dele: a moldura comum preserva
isso, entao o menino nao afunda nem flutua ao trocar de pose.

── O QUE ENTRA NO JOGO ────────────────────────────────────────────────────────

So o que o jogo usa hoje. As folhas inteiras ficam guardadas em
assets-source/entregador — quando o relogio e o trecho a pe existirem, e so
acrescentar o nome da pose na lista aqui embaixo.
"""
from __future__ import annotations

import os

import numpy as np
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, "..", ".."))
FOLHAS = os.path.join(RAIZ, "assets-source/entregador")
DESTINO = os.path.join(RAIZ, "client/public/assets")

RUMOS = [
    "leste", "nordeste", "norte", "noroeste",
    "oeste", "sudoeste", "sul", "sudeste",
]

# A folha dele, lida linha por linha.
#
# CUIDADO COM A SEGUNDA DA FILA DO MEIO. Eu chamei ela de "pedalando" e ela e a
# perna passando por cima do selim — subir ou descer da bicicleta. Fui pego na
# tela: "voce selecionou imagem que jogador esta descendo da bicicleta".
#
# O erro nao foi de olho e sim de NOME: eu numerei as celulas em vez de olhar o
# que cada uma mostra, e um nome errado passa a mentir sozinho para sempre.
# Cada linha aqui diz o que o desenho E — se o nome nao descreve a pose, ele
# ainda esta errado.
POSES = {
    (0, 0): "parado",
    (0, 1): "andando1",
    (0, 2): "andando2",
    (0, 3): "andando3",
    (1, 0): "comBicicleta",   # de pe ao lado dela, os dois pes no chao
    (1, 1): "montando",       # a perna por cima do selim: sobe ou desce
    (1, 2): "pedalando1",     # sentado, ereto — a pedalada de cruzeiro
    (1, 3): "pedalando2",     # sentado, a outra perna embaixo
    (2, 0): "pedalando3",     # inclinado para a frente
    (2, 1): "pedalando4",     # inclinado mais, no ritmo forte
    (2, 2): "entregando",
    (2, 3): "comemorando",
}

# O que o jogo pinta hoje. O resto espera o relogio e o trecho a pe.
NO_JOGO = ("pedalando1", "parado", "entregando", "comemorando")

# O maior que ele fica na tela e cerca de sessenta pontos de largura. Guardar
# trezentos e treze e mandar dez vezes mais pixel do que a tela usa — e o
# jogador paga isso em dados, no celular dele.
LARGURA_GUARDADA = 200


def celulas():
    for rumo in RUMOS:
        im = Image.open(os.path.join(FOLHAS, "folha_%s.png" % rumo)).convert("RGBA")
        cw, ch = im.width // 4, im.height // 3
        for (r, c), pose in POSES.items():
            yield rumo, pose, im.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch))


def main() -> None:
    # PRIMEIRA PASSADA: a moldura que cabe todos.
    e = s = 10**9
    d = i = 0
    for _, _, cel in celulas():
        a = np.asarray(cel)[..., 3]
        ys, xs = np.nonzero(a > 25)
        e, d = min(e, xs.min()), max(d, xs.max())
        s, i = min(s, ys.min()), max(i, ys.max())
    print("moldura comum: %d x %d" % (d - e + 1, i - s + 1))

    # SEGUNDA PASSADA: todos cortados nela.
    n = 0
    for rumo, pose, cel in celulas():
        if pose not in NO_JOGO:
            continue
        nome = "XB_Entregador_%s_%s.webp" % (pose, rumo)
        peca = cel.crop((e, s, d + 1, i + 1))
        alt = round(peca.height * LARGURA_GUARDADA / peca.width)
        peca = peca.resize((LARGURA_GUARDADA, alt), Image.LANCZOS)
        peca.save(os.path.join(DESTINO, nome), "WEBP", quality=86, method=6)
        n += 1
    print("desenhos no jogo: %d (%d poses x %d rumos)" % (n, len(NO_JOGO), len(RUMOS)))
    print("as outras %d ficam nas folhas, prontas" % (len(POSES) - len(NO_JOGO)))


if __name__ == "__main__":
    main()
