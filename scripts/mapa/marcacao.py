"""
LER O MAPA QUE O FERNANDO PINTOU A MAO.

Ele marca o desenho e a legenda e dele, nestas palavras: linha AZUL onde a
animacao da bicicleta deve aparecer; bola VERMELHA loja, bola VERDE
residencia; RISCO vermelho ou verde e "onde mudara animacao, para entregador
andar ate a porta para entrega ou retirada"; e uma bola, um pino.

O QUE SEPARA BOLA DE RISCO E A FORMA, E NAO A COR. Este arquivo existe porque
eu errei isso duas vezes seguidas, e cada erro tinha cara de acerto:

  1. Primeiro contei QUALQUER mancha da cor como endereco. Os riscos viraram
     fileiras de pinos — ele viu na tela: "tem muita coisa duplicada".

  2. Depois separei por COMPRIMENTO DO ESQUELETO, e um risco GORDO passou:
     esqueleto curto, miolo largo. Ele viu de novo: "riscos ainda estao como
     pinos, isso nao deve existir".

  3. Depois o TELHADO E O TIJOLO do proprio desenho entraram como marca: telha
     de barro no sol e parede de tijolo sao avermelhadas o bastante para passar
     na peneira de cor, e a mancha saia redonda. Deu pino em casa que so tinha
     bola verde. Ele viu: "ainda temos um caso de duplicacao".

O que funciona e o ALONGAMENTO — o quanto a mancha e mais comprida que larga,
medido pelos eixos dela. No desenho dele a separacao e limpa e foi conferida
olhando mancha por mancha: bola fica em 1,3 a 1,6; risco comeca em 1,75 e vai
ate 4,7. Nada cai no meio. O corte em 1,70 nao e gosto meu, e onde o desenho
dele se parte em dois.

A TINTA DELE E PURA, O DESENHO EMBAIXO NUNCA E. Verde dele e verde puro,
vermelho dele e vermelho puro; telha, tijolo e terra sao cor suja, com os
outros canais altos. Medido no miolo de cada mancha a separacao tambem e
limpa: tinta dele fica em 205 a 228, telhado e tijolo em 55 a 87. Nada no
meio. Vale para bola E para risco.

Cuidados que o desenho exige:

  A FRANJA DA LINHA AZUL parece risco. O anti-serrilhado deixa um fio verde e
  vermelho colado no azul por todo o mapa. Risco de verdade anda por fora do
  azul; o fio, nao.

  A LINHA AZUL CORTA BOLAS ao ser pintada por cima. Meia bola vira fragmento e
  some. Entao as metades sao remontadas — mas so por baixo do azul, para nao
  colar bolas vizinhas que nunca se tocaram.

    python3 scripts/mapa/marcacao.py <imagem marcada>
"""
from __future__ import annotations

import json
import math
import os
import sys

import numpy as np
from PIL import Image
from scipy.ndimage import (
    binary_closing,
    binary_dilation,
    distance_transform_edt,
    label,
)
from skimage.morphology import disk

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, "..", ".."))
PREDIOS = os.path.join(RAIZ, "client/src/game/data/predios-bairro-xb.json")

# Onde o desenho dele se parte: abaixo disso e bola, acima e risco.
ALONGAMENTO_DA_BOLA = 1.70
# Uma bola tem miolo; um fio de anti-serrilhado nao.
RAIO_MINIMO = 3.5
AREA_MINIMA = 45
# Um risco precisa andar fora do azul para nao ser franja da linha.
FORA_DO_AZUL = 0.55
# Tinta dele contra telhado e tijolo: onde o desenho se parte de novo.
PUREZA_DA_TINTA = 130


def mascaras(im: Image.Image):
    a = np.asarray(im.convert("RGB")).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    azul = (b > 150) & (b - r > 60) & (b - g > 60)
    return {
        "azul": azul,
        "verde": (g > 150) & (g - r > 60) & (g - b > 60),
        "vermelho": (r > 150) & (r - g > 60) & (r - b > 60),
    }


def pureza(a: np.ndarray, xs: np.ndarray, ys: np.ndarray, dist, cor: str) -> float:
    """Quanto o miolo da mancha e tinta pura, e nao telha ou tijolo."""
    k = np.argsort(-dist[ys, xs])[:25]
    p = a[ys[k], xs[k]]
    r, g, b = p[:, 0].mean(), p[:, 1].mean(), p[:, 2].mean()
    return (r - max(g, b)) if cor == "vermelho" else (g - max(r, b))


def alongamento(xs: np.ndarray, ys: np.ndarray) -> float:
    cov = np.cov(np.vstack([xs - xs.mean(), ys - ys.mean()]))
    ev = np.sort(np.linalg.eigvalsh(cov))
    return math.sqrt(ev[1] / max(ev[0], 1e-6))


def ler(im: Image.Image):
    W, H = im.size
    a = np.asarray(im.convert("RGB")).astype(int)
    m = mascaras(im)
    azul_g = binary_dilation(m["azul"], disk(2))
    azul_f = binary_dilation(m["azul"], disk(4))
    bolas = {"verde": [], "vermelho": []}
    riscos = {"verde": [], "vermelho": []}
    for cor in ("verde", "vermelho"):
        mm = binary_closing(m[cor], disk(2))
        mm = mm | (binary_closing(mm, disk(9)) & azul_g)
        lb, n = label(mm, np.ones((3, 3)))
        tam = np.bincount(lb.ravel())
        tam[0] = 0
        dist = distance_transform_edt(mm)
        for i in range(1, n + 1):
            if tam[i] < AREA_MINIMA:
                continue
            ys, xs = np.nonzero(lb == i)
            raio = float(dist[ys, xs].max())
            if raio < RAIO_MINIMO:
                continue
            if pureza(a, xs, ys, dist, cor) < PUREZA_DA_TINTA:
                continue  # telhado, tijolo ou terra: nao e marca dele
            al = alongamento(xs, ys)
            if al < ALONGAMENTO_DA_BOLA:
                # BOLA: o pino pousa no miolo mais gordo, que e o centro dela
                j = int(np.argmax(dist[ys, xs]))
                bolas[cor].append(
                    [round(float(xs[j]) / W * 100, 3), round(float(ys[j]) / H * 100, 3), round(raio, 1)]
                )
            else:
                fora = float(np.mean([not azul_f[y, x] for y, x in zip(ys, xs)]))
                if fora < FORA_DO_AZUL:
                    continue  # franja da linha azul
                riscos[cor].append({"pts": [(int(x), int(y)) for x, y in zip(xs, ys)]})
    return bolas, riscos


def em_ordem(pts):
    """Poe os pixels de um risco em fila, de uma ponta a outra."""
    dentro = set(pts)
    viz = lambda p: [
        (p[0] + dx, p[1] + dy)
        for dx in (-1, 0, 1)
        for dy in (-1, 0, 1)
        if (dx or dy) and (p[0] + dx, p[1] + dy) in dentro
    ]
    pontas = [p for p in dentro if len(viz(p)) <= 1]
    ini = pontas[0] if pontas else next(iter(dentro))
    fila = [ini]
    visto = {ini}
    while True:
        segue = [q for q in viz(fila[-1]) if q not in visto]
        if not segue:
            break
        fila.append(segue[0])
        visto.add(segue[0])
    return fila


def esqueleto_do_risco(pts):
    """O eixo do risco, ja em fila e simplificado."""
    from skimage.morphology import skeletonize

    xs = np.array([p[0] for p in pts])
    ys = np.array([p[1] for p in pts])
    sub = np.zeros((ys.max() - ys.min() + 3, xs.max() - xs.min() + 3), bool)
    sub[ys - ys.min() + 1, xs - xs.min() + 1] = True
    esq = skeletonize(sub)
    return em_ordem([(int(x + xs.min() - 1), int(y + ys.min() - 1)) for y, x in zip(*np.nonzero(esq))])


def main() -> None:
    caminho = sys.argv[1] if len(sys.argv) > 1 else None
    if not caminho:
        print("uso: python3 scripts/mapa/marcacao.py <imagem marcada>")
        raise SystemExit(2)
    im = Image.open(caminho)
    W, H = im.size
    bolas, riscos = ler(im)
    print(
        "bolas: %d vermelhas (loja), %d verdes (residencia) | riscos: %d"
        % (len(bolas["vermelho"]), len(bolas["verde"]), len(riscos["verde"]) + len(riscos["vermelho"]))
    )

    velho = json.load(open(PREDIOS, encoding="utf-8"))
    nomes_antigos = [
        b for b in velho.get("predios", []) if b.get("tipo") == "comercio" and b.get("nome")
    ]

    # Os riscos viram TRECHO A PE, ligados a bola da mesma cor mais perto da
    # ponta que fica longe da rua. Risco sem bola por perto nao vira nada:
    # risco solto nao inventa endereco.
    ruas = json.load(
        open(os.path.join(RAIZ, "client/src/game/data/ruas-bairro-xb.json"), encoding="utf-8")
    )
    segs = []
    for t in ruas["trechos"]:
        linha = t["linha"]
        for i in range(1, len(linha)):
            segs.append((linha[i - 1], linha[i]))

    def ate_a_rua(p):
        melhor = float("inf")
        for a, b in segs:
            vx, vy = (b[0] - a[0]) / 100 * W, (b[1] - a[1]) / 100 * H
            px, py = (p[0] - a[0]) / 100 * W, (p[1] - a[1]) / 100 * H
            c = vx * vx + vy * vy
            f = 0.0 if c == 0 else max(0.0, min(1.0, (px * vx + py * vy) / c))
            melhor = min(melhor, math.hypot(px - vx * f, py - vy * f))
        return melhor

    predios = []
    for cor, tipo in (("vermelho", "comercio"), ("verde", "casa")):
        for k, (x, y, raio) in enumerate(sorted(bolas[cor], key=lambda p: (p[1], p[0]))):
            predios.append(
                {
                    "id": ("c%d" if tipo == "comercio" else "h%d") % (k + 1),
                    "tipo": tipo,
                    "nome": None,
                    "em": [x, y],
                    "porta": [x, y],
                    "area": int(math.pi * raio * raio),
                    "emJogo": True,
                    "fonte": "bola %s do Fernando" % cor,
                }
            )

    ligados = 0
    for cor, tipo in (("vermelho", "comercio"), ("verde", "casa")):
        candidatos = [b for b in predios if b["tipo"] == tipo]
        for t in riscos[cor]:
            fila = esqueleto_do_risco(t["pts"])
            if len(fila) < 6:
                continue
            cam = [[round(px / W * 100, 3), round(py / H * 100, 3)] for px, py in fila]
            if ate_a_rua(cam[-1]) < ate_a_rua(cam[0]):
                cam = cam[::-1]  # comeca sempre na rua
            dono, dd = None, float("inf")
            for b in candidatos:
                d = math.hypot((b["em"][0] - cam[-1][0]) / 100 * W, (b["em"][1] - cam[-1][1]) / 100 * H)
                if d < dd:
                    dd, dono = d, b
            if dono is None or dd > 85:
                continue
            if "aPe" in dono:
                continue
            dono["aPe"] = cam
            ligados += 1

    # os nomes provisorios acompanham a bola vermelha mais perta de onde estavam
    usados = set()
    for b in nomes_antigos:
        alvo, dd = None, float("inf")
        for c in predios:
            if c["tipo"] != "comercio" or c["id"] in usados:
                continue
            d = math.hypot((c["em"][0] - b["em"][0]) / 100 * W, (c["em"][1] - b["em"][1]) / 100 * H)
            if d < dd:
                dd, alvo = d, c
        if alvo is not None and dd < 60:
            alvo["nome"] = b["nome"]
            usados.add(alvo["id"])

    saida = {
        "mapa": {"largura": W, "altura": H},
        "_leitura": (
            "Gerado por scripts/mapa/marcacao.py a partir do desenho marcado a mao pelo "
            "Fernando. Bola = lugar, e um pino; risco = trecho a pe, onde a bicicleta para e "
            "o entregador vai andando ate a porta. O que separa os dois e o ALONGAMENTO da "
            "mancha, e nao a cor: no desenho dele bola fica em 1,3 a 1,6 e risco comeca em "
            "1,75 — nada cai no meio. Nomes de comercio sao decisao dele; os que existiam "
            "seguiram a bola vermelha mais perto de onde estavam."
        ),
        "predios": predios,
    }
    json.dump(saida, open(PREDIOS, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("enderecos: %d | riscos que viraram trecho a pe: %d" % (len(predios), ligados))


if __name__ == "__main__":
    main()
