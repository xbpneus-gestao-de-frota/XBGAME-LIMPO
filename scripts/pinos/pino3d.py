"""
O PINO COMO OBJETO, NAO COMO DESENHO.

O Fernando mandou uma referencia (um pino vermelho brilhante, com uma esfera
de vidro encaixada no meio e um pratinho embaixo) e disse: "precisamos
analisar pinos mais bonitos olha esse formato". A referencia e de banco de
imagem, entao ela nao entra no jogo — o que entra e o FORMATO, refeito aqui
com as cores do jogo.

O pino velho era pintado: contorno, brilho, sombra, tudo desenhado a mao em
camadas. Por isso ele so funcionava de um jeito e num tamanho. Este e
CONSTRUIDO: uma gota, um encaixe cavado na frente, uma esfera dentro e um
pratinho embaixo, iluminados de verdade. Mudar a cor, o simbolo ou o tamanho
e mudar um numero, nao repintar.

    python3 scripts/pinos/pino3d.py
"""
from __future__ import annotations

import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, "..", ".."))

CORPO, ESFERA, PRATO, SOQUETE = 1, 2, 3, 4


def _norm(v):
    v = np.asarray(v, np.float32)
    return v / np.linalg.norm(v)


def _round_cone(px, py, pz, a, b, r1, r2):
    """Gota: uma esfera grande em cima ligada a uma pontinha embaixo."""
    ba = np.array(b, np.float32) - np.array(a, np.float32)
    l2 = float(ba @ ba)
    rr = r1 - r2
    a2 = l2 - rr * rr
    il2 = 1.0 / l2
    pax, pay, paz = px - a[0], py - a[1], pz - a[2]
    y = pax * ba[0] + pay * ba[1] + paz * ba[2]
    z = y - l2
    xx = pax * l2 - ba[0] * y
    xy = pay * l2 - ba[1] * y
    xz = paz * l2 - ba[2] * y
    x2 = xx * xx + xy * xy + xz * xz
    y2 = y * y * l2
    z2 = z * z * l2
    k = np.sign(rr) * rr * rr * x2
    d = (np.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1
    d = np.where(np.sign(z) * a2 * z2 > k, np.sqrt(np.maximum(x2 + z2, 0)) * il2 - r2, d)
    d = np.where(np.sign(y) * a2 * y2 < k, np.sqrt(np.maximum(x2 + y2, 0)) * il2 - r1, d)
    return d.astype(np.float32)


def _esfera(px, py, pz, c, r):
    return np.sqrt((px - c[0]) ** 2 + (py - c[1]) ** 2 + (pz - c[2]) ** 2) - r


def _elipsoide(px, py, pz, c, r):
    ax, ay, az = (px - c[0]) / r[0], (py - c[1]) / r[1], (pz - c[2]) / r[2]
    k0 = np.sqrt(ax * ax + ay * ay + az * az)
    bx, by, bz = ax / r[0], ay / r[1], az / r[2]
    k1 = np.sqrt(bx * bx + by * by + bz * bz)
    return (k0 * (k0 - 1.0) / np.maximum(k1, 1e-6)).astype(np.float32)


def cena(px, py, pz, com_prato: bool, com_esfera: bool = True):
    """Distancia ate o pino e de que peca ela e."""
    gota = _round_cone(px, py, pz, (0, -1.06, 0), (0, 0.50, 0), 0.020, 0.600)
    # o encaixe e cavado na frente: a gota menos uma bola
    cava = -(_esfera(px, py, pz, (0, 0.50, 0.355), 0.400))
    corpo = np.maximum(gota, cava)
    if not com_esfera:
        # SOQUETE VAZIO. A bolinha virou relogio: a cor dela muda o tempo todo,
        # entao ela nao pode estar assada na imagem. Fica so o buraco, e a bola
        # e desenhada por cima, na tela, com a cor da vez.
        # a parede de dentro do buraco e escura, senao a bola desenhada por
        # cima parece colada e nao encaixada
        return corpo.astype(np.float32), np.where(cava > gota, SOQUETE, CORPO).astype(np.int8)
    esfera = _esfera(px, py, pz, (0, 0.50, 0.205), 0.335)
    d = np.minimum(corpo, esfera)
    mat = np.where(corpo <= esfera, CORPO, ESFERA).astype(np.int8)
    if com_prato:
        prato = _elipsoide(px, py, pz, (0, -1.145, 0), (0.72, 0.115, 0.72))
        mat = np.where(prato < d, PRATO, mat).astype(np.int8)
        d = np.minimum(d, prato)
    return d.astype(np.float32), mat


def _dist(px, py, pz, com_prato, com_esfera=True):
    return cena(px, py, pz, com_prato, com_esfera)[0]


def render(cor_corpo, cor_esfera, com_prato=True, larg=256, alt=336, super_=3, com_esfera=True):
    W, H = larg * super_, alt * super_
    olho = np.array([0.0, 0.10, 3.60], np.float32)
    alvo = np.array([0.0, -0.16, 0.0], np.float32)
    ww = _norm(alvo - olho)
    uu = _norm(np.cross(ww, np.array([0, 1, 0], np.float32)))
    vv = np.cross(uu, ww)

    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    sx = (x + 0.5) / W * 2 - 1
    sy = 1 - (y + 0.5) / H * 2
    sx *= (W / H) * (alt / larg) * (larg / alt)  # mantem o pixel quadrado
    esc = 1.42
    dx = uu[0] * sx * esc * (W / H) + vv[0] * sy * esc + ww[0] * 2.6
    dy = uu[1] * sx * esc * (W / H) + vv[1] * sy * esc + ww[1] * 2.6
    dz = uu[2] * sx * esc * (W / H) + vv[2] * sy * esc + ww[2] * 2.6
    n = np.sqrt(dx * dx + dy * dy + dz * dz)
    dx, dy, dz = (dx / n).ravel(), (dy / n).ravel(), (dz / n).ravel()

    t = np.full(dx.shape, 1.6, np.float32)
    vivo = np.ones(dx.shape, bool)
    for _ in range(90):
        d = _dist(olho[0] + dx * t, olho[1] + dy * t, olho[2] + dz * t, com_prato, com_esfera)
        t = np.where(vivo, t + np.clip(d, -0.02, 0.35), t)
        vivo &= (np.abs(d) > 0.0006) & (t < 6.5)
        if not vivo.any():
            break
    bateu = t < 6.5
    px, py, pz = olho[0] + dx * t, olho[1] + dy * t, olho[2] + dz * t
    _, mat = cena(px, py, pz, com_prato, com_esfera)

    e = 0.0012
    nx = _dist(px + e, py, pz, com_prato, com_esfera) - _dist(px - e, py, pz, com_prato, com_esfera)
    ny = _dist(px, py + e, pz, com_prato, com_esfera) - _dist(px, py - e, pz, com_prato, com_esfera)
    nz = _dist(px, py, pz + e, com_prato, com_esfera) - _dist(px, py, pz - e, com_prato, com_esfera)
    ln = np.sqrt(nx * nx + ny * ny + nz * nz) + 1e-9
    nx, ny, nz = nx / ln, ny / ln, nz / ln

    # sombra de contato dentro do encaixe: o que esta enterrado escurece
    ao = np.ones_like(t)
    passo = 0.055
    for i in range(1, 6):
        h = passo * i
        dd = _dist(px + nx * h, py + ny * h, pz + nz * h, com_prato, com_esfera)
        ao -= (h - dd) * (0.85 ** i) * 0.95
    ao = np.clip(ao, 0.42, 1.0)

    def luz(dirv, cor, forca, brilho, peso_spec, dif, spec):
        L = _norm(dirv)
        ndl = np.clip(nx * L[0] + ny * L[1] + nz * L[2], 0, 1)
        hx, hy, hz = L[0] - dx, L[1] - dy, L[2] - dz
        hn = np.sqrt(hx * hx + hy * hy + hz * hz) + 1e-9
        ndh = np.clip(nx * hx / hn + ny * hy / hn + nz * hz / hn, 0, 1)
        for c in range(3):
            dif[c] += ndl * cor[c] * forca
            spec[c] += (ndh ** brilho) * cor[c] * peso_spec

    dif = [np.zeros_like(t) for _ in range(3)]
    spec = [np.zeros_like(t) for _ in range(3)]
    # a chave desenha o volume; as outras duas so tiram o preto das costas
    luz((-0.62, 0.82, 0.62), (1.00, 0.98, 0.94), 0.92, 90, 1.00, dif, spec)
    luz((0.80, -0.30, 0.45), (0.45, 0.58, 0.85), 0.22, 12, 0.05, dif, spec)
    luz((0.20, 0.45, -0.95), (0.75, 0.85, 1.00), 0.26, 26, 0.30, dif, spec)

    ndv = np.clip(-(nx * dx + ny * dy + nz * dz), 0, 1)
    fres = (1 - ndv) ** 4

    base = np.zeros((3,) + t.shape, np.float32)
    for c in range(3):
        b = np.where(mat == ESFERA, cor_esfera[c], cor_corpo[c]).astype(np.float32)
        if com_prato:
            b = np.where(mat == PRATO, cor_corpo[c] * 0.74, b)
        b = np.where(mat == SOQUETE, cor_corpo[c] * 0.30, b)
        # a cor vira luz antes de ser iluminada, senao o vermelho vira barro
        base[c] = (b / 255.0) ** 2.2

    forca_spec = np.where(mat == ESFERA, 1.30, np.where(mat == SOQUETE, 0.22, 0.70)).astype(np.float32)
    cor = np.zeros((3,) + t.shape, np.float32)
    for c in range(3):
        cor[c] = base[c] * (0.16 + 1.15 * dif[c]) * ao + spec[c] * forca_spec + fres * 0.07
    cor = np.clip(cor, 0, 1) ** (1 / 2.2)

    rgba = np.zeros((H, W, 4), np.uint8)
    for c in range(3):
        rgba[..., c] = (np.clip(cor[c], 0, 1).reshape(H, W) * 255).astype(np.uint8)
    rgba[..., 3] = (bateu.reshape(H, W) * 255).astype(np.uint8)
    im = Image.fromarray(rgba, "RGBA")

    # A PONTA ENCOSTA NO CHAO DA IMAGEM.
    # A peca sobe do ponto marcado, entao a ponta tem de ficar na ultima linha
    # do desenho — um pixel de folga embaixo e o pino flutuando acima da porta.
    a = np.asarray(im)[..., 3]
    ys, xs = np.nonzero(a > 12)
    cx = (xs.min() + xs.max()) / 2
    lp, ap = xs.max() - xs.min() + 1, ys.max() - ys.min() + 1
    k = min((larg - 2) / lp, (alt - 2) / ap)
    novo = im.crop((int(cx - lp), ys.min(), int(cx + lp), ys.max() + 1))
    novo = novo.resize((max(1, int(novo.width * k)), max(1, int(ap * k))), Image.LANCZOS)
    fim = Image.new("RGBA", (larg, alt), (0, 0, 0, 0))

    # sombra de contato: ela nasce NA ponta e se abre para os lados, nunca para
    # baixo — sombra embaixo da ponta empurraria o pino para cima do lugar.
    som = Image.new("RGBA", (larg, alt * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(som)
    rx, ry = int(larg * 0.26), int(alt * 0.030)
    d.ellipse([larg // 2 - rx, alt - ry, larg // 2 + rx, alt + ry], fill=(6, 12, 24, 135))
    som = som.filter(ImageFilter.GaussianBlur(larg * 0.030)).crop((0, 0, larg, alt))
    fim.alpha_composite(som)
    fim.alpha_composite(novo, ((larg - novo.width) // 2, alt - novo.height))
    return fim
