"""
LE O TRACADO DE RUAS QUE O FERNANDO DESENHOU A MAO POR CIMA DO MAPA.

    python3 scripts/mapa/ler_tracado.py

── POR QUE ESTE ARQUIVO EXISTE ────────────────────────────────────────────────

O primeiro jeito de medir as ruas foi automatico: achar o asfalto pela cor e
seguir por onde ele passa (ver extrair_ruas.py). Funciona, mas erra de um jeito
que ninguem consegue consertar depois — o roteador desvia de arvore, de canteiro
e de sombra, e o resultado e um garrancho. Ele viu na tela e disse: "linhas
retas, nada de garrancho, estamos desviando de tudo, fica mais feio que passar
sob imagem de arvore."

Entao a fonte da verdade mudou de lugar: quem decide por onde a rua passa e ELE,
com um risco vermelho por cima do mapa limpo. Este arquivo so LE esse risco.

── COMO LE ────────────────────────────────────────────────────────────────────

1. SEPARA O VERMELHO. Nao basta "e vermelho": o mapa tem telhado vermelho. O que
   separa e o AZUL — na tinta dele o azul e maior que o verde, no telhado nao.
   Somado a isso, o pixel tem de ser diferente do mapa limpo no mesmo lugar.

2. AFINA ATE UM PIXEL. O risco tem quatro ou cinco pixels de largura; a rua e
   uma linha. O afinamento devolve o meio do risco.

3. ACHA CRUZAMENTOS E PONTAS, e caminha de um ao outro para virar trecho.

4. COSTURA AS QUASE-JUNCOES. Desenho a mao quase nunca encosta: a linha para a
   dez pixels da outra. Cada ponta solta procura a linha vizinha ate 26 px e se
   liga a ela, partindo a vizinha no ponto do encontro. Sem isso o bairro sai em
   pedacos e metade dos enderecos fica inalcancavel.

   Ponta que morre na moldura do mapa NAO e costurada — e saida do bairro.

5. SIMPLIFICA. O tracado de pixel tem degrau de pixel. Douglas-Peucker a 1,5 px
   tira o degrau e guarda a curva.

O que sai: uma rede de eixo unico. As duas maos da rua NAO sao desenhadas — elas
saem do codigo, deslocando o caminho para a direita de quem anda (ver rotas.ts).
Desenhar as duas seria duas fontes da mesma verdade.
"""
from __future__ import annotations

import json
import math
import os

import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from skimage.morphology import closing, disk, remove_small_objects, skeletonize

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, "..", ".."))
DESENHO = os.path.join(AQUI, "tracado_desenhado.png")
LIMPO = os.path.join(RAIZ, "..", "Claude outputs", "mapa_limpo.png")
SAIDA = os.path.join(AQUI, "tracado_do_fernando.json")

JUNTA_NOS = 10.0    # nos a menos disto um do outro sao o mesmo cruzamento
COSTURA = 26.0      # ate onde uma ponta solta procura a linha vizinha
BORDA = 14.0        # ponta a menos disto da moldura e saida do bairro
TOLERANCIA = 1.5    # px de folga na simplificacao
VIZ = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]


def so_o_vermelho(desenho: np.ndarray, limpo: np.ndarray) -> np.ndarray:
    r, g, b = desenho[..., 0], desenho[..., 1], desenho[..., 2]
    m = (r > 150) & (r - g > 90) & (b - g > 0) & (b < 190)
    m &= np.abs(desenho - limpo).max(axis=2) > 40
    return remove_small_objects(closing(m, disk(2)), 40)


def em_trechos(esq: np.ndarray):
    """Do esqueleto para (nos, trechos), caminhando de cruzamento a cruzamento."""
    grau = np.zeros(esq.shape, np.uint8)
    for dy, dx in VIZ:
        grau += np.roll(np.roll(esq, dy, 0), dx, 1).astype(np.uint8)
    grau *= esq
    marcos = ((grau >= 3) | (grau == 1)) & esq
    rot, quantos = ndi.label(marcos, structure=np.ones((3, 3)))
    nos = [tuple(p) for p in ndi.center_of_mass(np.ones_like(rot), rot, range(1, quantos + 1))]

    H, W = esq.shape
    vistos, trechos = set(), []
    for y, x in zip(*np.nonzero(rot > 0)):
        a = rot[y, x]
        for dy, dx in VIZ:
            ny, nx = y + dy, x + dx
            if not (0 <= ny < H and 0 <= nx < W) or not esq[ny, nx] or rot[ny, nx] == a:
                continue
            cam = [(y, x), (ny, nx)]
            ant, cur = (y, x), (ny, nx)
            while rot[cur] == 0:
                prox = None
                for dy2, dx2 in VIZ:
                    py, px = cur[0] + dy2, cur[1] + dx2
                    if not (0 <= py < H and 0 <= px < W) or not esq[py, px]:
                        continue
                    if (py, px) == ant or (py, px) == cur:
                        continue
                    prox = (py, px)
                    if rot[py, px]:
                        break
                if prox is None:
                    break
                cam.append(prox)
                ant, cur = cur, prox
            b = rot[cam[-1]]
            if not b:
                continue
            chave = (min(a, b), max(a, b), len(cam) // 4)
            if chave in vistos:
                continue
            vistos.add(chave)
            trechos.append([int(a) - 1, int(b) - 1, cam])
    return nos, trechos


def juntar_nos(nos, trechos):
    pai = list(range(len(nos)))

    def acha(i):
        while pai[i] != i:
            pai[i] = pai[pai[i]]
            i = pai[i]
        return i

    for i in range(len(nos)):
        for j in range(i + 1, len(nos)):
            if math.dist(nos[i], nos[j]) <= JUNTA_NOS:
                a, b = acha(i), acha(j)
                if a != b:
                    pai[a] = b
    grupos = {}
    for i in range(len(nos)):
        grupos.setdefault(acha(i), []).append(i)
    novo, centros = {}, []
    for k, (_, membros) in enumerate(sorted(grupos.items())):
        centros.append((sum(nos[i][0] for i in membros) / len(membros),
                        sum(nos[i][1] for i in membros) / len(membros)))
        for i in membros:
            novo[i] = k

    def comp(c):
        return sum(math.dist(c[i], c[i - 1]) for i in range(1, len(c)))

    saida, vistos = [], {}
    for a, b, c in trechos:
        A, B, L = novo[a], novo[b], comp(c)
        if (A == B and L < 30) or L < 6:
            continue
        k = (min(A, B), max(A, B))
        if k in vistos and abs(vistos[k] - L) < 8:
            continue
        vistos[k] = L
        saida.append([A, B, c])
    return centros, saida


def costurar(nos, trechos, alt, larg):
    def na_borda(p):
        return p[0] < BORDA or p[1] < BORDA or p[0] > alt - BORDA or p[1] > larg - BORDA

    def proj(p, a, b):
        vy, vx = b[0] - a[0], b[1] - a[1]
        L2 = vy * vy + vx * vx
        if L2 < 1e-9:
            return a, math.dist(p, a), 0.0
        t = max(0.0, min(1.0, ((p[0] - a[0]) * vy + (p[1] - a[1]) * vx) / L2))
        q = (a[0] + vy * t, a[1] + vx * t)
        return q, math.dist(p, q), t

    feitas = 0
    for _ in range(3):
        g = {}
        for A, B, _ in trechos:
            g[A] = g.get(A, 0) + 1
            g[B] = g.get(B, 0) + 1
        mudou = False
        for n in [k for k, v in g.items() if v == 1]:
            p = nos[n]
            if na_borda(p):
                continue
            melhor = None
            for i, (A, B, c) in enumerate(trechos):
                if A == n or B == n:
                    continue
                for j in range(1, len(c)):
                    q, dist, t = proj(p, c[j - 1], c[j])
                    if dist <= COSTURA and (melhor is None or dist < melhor[0]):
                        melhor = (dist, i, j, t, q)
            if melhor is None:
                continue
            _, i, j, t, q = melhor
            A, B, c = trechos[i]
            if math.dist(q, nos[A]) < 8:
                alvo = A
            elif math.dist(q, nos[B]) < 8:
                alvo = B
            else:
                nos.append(q)
                alvo = len(nos) - 1
                corte = max(1, min(len(c) - 1, j if t < 0.5 else j + 1))
                trechos[i] = [A, alvo, c[:corte] + [q]]
                trechos.append([alvo, B, [q] + c[corte:]])
            trechos.append([n, alvo, [p, q]])
            feitas += 1
            mudou = True
        if not mudou:
            break
    return feitas


def simplificar(pts, tol=TOLERANCIA):
    if len(pts) < 3:
        return pts[:]

    def rec(a, b):
        if b <= a + 1:
            return []
        x0, y0 = pts[a]
        x1, y1 = pts[b]
        dx, dy = x1 - x0, y1 - y0
        L = math.hypot(dx, dy)
        pior, k = -1.0, -1
        for i in range(a + 1, b):
            x, y = pts[i]
            d = abs(dy * (x - x0) - dx * (y - y0)) / L if L > 1e-9 else math.hypot(x - x0, y - y0)
            if d > pior:
                pior, k = d, i
        return rec(a, k) + [k] + rec(k, b) if pior > tol else []

    return [pts[i] for i in [0] + rec(0, len(pts) - 1) + [len(pts) - 1]]


def main() -> None:
    desenho = np.asarray(Image.open(DESENHO).convert("RGB")).astype(np.int16)
    limpo = np.asarray(Image.open(LIMPO).convert("RGB")).astype(np.int16)
    if desenho.shape != limpo.shape:
        raise SystemExit("o desenho tem de ter o mesmo tamanho do mapa limpo")
    alt, larg = desenho.shape[:2]

    esq = skeletonize(so_o_vermelho(desenho, limpo))
    nos, trechos = em_trechos(esq)
    nos, trechos = juntar_nos(nos, trechos)
    feitas = costurar(nos, trechos, alt, larg)

    ligado = {}
    for A, B, _ in trechos:
        ligado.setdefault(A, set()).add(B)
        ligado.setdefault(B, set()).add(A)
    vis, pedacos = set(), []
    for n in ligado:
        if n in vis:
            continue
        pilha, grupo = [n], []
        while pilha:
            u = pilha.pop()
            if u in vis:
                continue
            vis.add(u)
            grupo.append(u)
            pilha += list(ligado[u] - vis)
        pedacos.append(grupo)

    saida = [[A, B, [[round(p[1] / larg * 100, 4), round(p[0] / alt * 100, 4)]
                     for p in simplificar([(q[1], q[0]) for q in c])]]
             for A, B, c in trechos]
    metros = sum(
        math.hypot((c[i][0] - c[i - 1][0]) / 100 * larg, (c[i][1] - c[i - 1][1]) / 100 * alt) * 0.83
        for _, _, c in saida for i in range(1, len(c)))

    print(f"costuras: {feitas}")
    print(f"pedacos soltos: {len(pedacos)} (o maior com {max(len(g) for g in pedacos)} cruzamentos)")
    print(f"trechos: {len(saida)}  pontos: {sum(len(c) for _, _, c in saida)}  {metros:.0f} m")
    json.dump({"nos": [[round(p[1] / larg * 100, 4), round(p[0] / alt * 100, 4)] for p in nos],
               "trechos": saida}, open(SAIDA, "w"))
    print(f"gravado em {os.path.basename(SAIDA)}")


if __name__ == "__main__":
    main()
