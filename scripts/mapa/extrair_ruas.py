#!/usr/bin/env python3
"""Mede a malha de ruas de um mapa desenhado e grava o arquivo que o jogo le.

O mapa e um desenho, nao uma planta: nao ha vetor por tras, so pixels. A
medicao acontece em tres passos, e cada um conserta o erro do anterior.

  1. ONDE HA ASFALTO, pela cor. Um nucleo seguro (asfalto claro, matiz quente,
     pouca saturacao) cresce por reconstrucao geodesica para dentro da sombra
     das arvores, que e escura mas guarda a mesma matiz. Sozinho isso engole
     calcada, entrada de garagem e canteiro.

  2. ONDE HA RUA, por filtro de cume (Sato) nas larguras de uma rua. Rua e uma
     fita larga e comprida; calcada e rabisco fino. O filtro separa os dois
     sem depender de cor.

  3. POR ONDE A RUA PASSA. Cada trecho e um caminho de menor custo entre dois
     cruzamentos, num campo onde asfalto e barato e verde e praticamente
     intransponivel.

O passo 3 e o que conserta o resto. O esqueleto de pixels erra de dois jeitos
OPOSTOS: parte a rua onde a arvore tapa, e inventa rua onde o jardim encosta
no meio-fio. Numa medicao deste bairro, 12 trechos atravessavam gramado antes
do roteador e nenhum depois. Por isso os cruzamentos vem do esqueleto (que
acerta ONDE as ruas se cruzam) e o tracado vem do roteador (que acerta POR
ONDE elas passam).

O que este script NAO consegue decidir: se uma area de asfalto e rua ou patio.
Patio de galpao e calcada larga de praca sao chao de rodar e entram na malha.
Nao e defeito de medicao, e ambiguidade do desenho — confira as folhas.
"""
from __future__ import annotations

import argparse
import json
import os
import sys

import cv2
import networkx as nx
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy import ndimage as ndi
from scipy.spatial import Delaunay
from skimage.filters import sato
from skimage.graph import route_through_array
from skimage.morphology import (reconstruction, remove_small_holes,
                                remove_small_objects, skeletonize)

AZUL = (24, 191, 234)
AMARELO = (255, 214, 64)
VIZINHOS = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]

# ── 1. onde ha asfalto ─────────────────────────────────────────────────────

def mascara_de_asfalto(rgb: np.ndarray) -> np.ndarray:
    """Cor de asfalto, crescida para dentro da sombra sem pular para telhado.

    A reconstrucao geodesica e o ponto: ela so deixa o nucleo crescer por
    dentro do que ja e parecido e ENCOSTADO nele. Um limiar solto, sem essa
    amarra espacial, alaga telhado bege e chao seco do mapa inteiro.
    """
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV).astype(float)
    matiz, satur, valor = hsv[..., 0] * 2, hsv[..., 1] / 255, hsv[..., 2] / 255
    nucleo = ((matiz >= 18) & (matiz <= 62) & (satur < 0.34)
              & (valor > 0.40) & (valor < 0.92))
    permitido = ((matiz >= 10) & (matiz <= 75) & (satur < 0.45)
                 & (valor > 0.22) & (valor < 0.97))
    return reconstruction(nucleo.astype(np.uint8),
                          permitido.astype(np.uint8),
                          method="dilation").astype(bool)


def mascara_de_verde(rgb: np.ndarray) -> np.ndarray:
    """Grama e folhagem. E o unico 'nao pode passar' que o desenho da de graca."""
    r, g, b = rgb[..., 0].astype(float), rgb[..., 1].astype(float), rgb[..., 2].astype(float)
    verde = (g > r * 1.02) & (g > b * 1.10)
    return cv2.dilate(verde.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool)


# ── 2. onde ha rua ─────────────────────────────────────────────────────────

def cara_de_rua(rgb: np.ndarray, larguras=(8, 11, 14, 18)) -> np.ndarray:
    """Resposta de cume na largura de uma rua: alta na fita, baixa no rabisco."""
    r, g, b = rgb[..., 0].astype(np.float32), rgb[..., 1].astype(np.float32), rgb[..., 2].astype(np.float32)
    claro = (0.30 * r + 0.55 * g + 0.15 * b) - 2.2 * np.maximum(0, g - (r + b) / 2)
    claro = cv2.GaussianBlur(claro, (0, 0), 2.5)
    lo, hi = np.percentile(claro, 2), np.percentile(claro, 98)
    claro = np.clip((claro - lo) / max(hi - lo, 1e-6), 0, 1)
    resposta = sato(claro, sigmas=list(larguras), black_ridges=False)
    return (resposta / (resposta.max() + 1e-9)).astype(np.float32)


# ── os cruzamentos, tirados do esqueleto ───────────────────────────────────

def _contar_vizinhos(sk: np.ndarray) -> np.ndarray:
    nucleo = np.array([[1, 1, 1], [1, 0, 1], [1, 1, 1]], np.uint8)
    return ndi.convolve(sk.astype(np.uint8), nucleo, mode="constant")


def cruzamentos(rua_prob: np.ndarray, asfalto: np.ndarray) -> list[tuple[float, float]]:
    """Pontas e cruzamentos do esqueleto da malha — so as POSICOES importam.

    O tracado do esqueleto e ruim (parte na sombra, inventa no jardim) e por
    isso e jogado fora; o que ele acerta, e que o roteador nao teria como
    adivinhar sozinho, e onde uma rua encontra a outra.
    """
    forte = rua_prob > np.percentile(rua_prob, 90)
    fraco = rua_prob > np.percentile(rua_prob, 72)
    fita = reconstruction(forte.astype(np.uint8), fraco.astype(np.uint8),
                          method="dilation").astype(bool)
    elipse = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11))
    fita = cv2.morphologyEx(fita.astype(np.uint8), cv2.MORPH_CLOSE, elipse).astype(bool)
    fita = remove_small_holes(fita, max_size=3000)
    fita = remove_small_objects(fita, max_size=1500)
    qtd, rotulo, dados, _ = cv2.connectedComponentsWithStats(fita.astype(np.uint8), 8)
    fita = rotulo == 1 + int(np.argmax(dados[1:, cv2.CC_STAT_AREA]))

    sk = skeletonize(fita)
    vizinhos = _contar_vizinhos(sk)
    # so ONDE AS RUAS SE CRUZAM. Ponta solta de esqueleto quase sempre e
    # entrada de garagem ou rabisco, e cada uma custa uma rodada de roteador.
    marcos = sk & (vizinhos >= 3)
    rot, quantos = ndi.label(marcos, structure=np.ones((3, 3)))
    centros = ndi.center_of_mass(marcos, rot, range(1, quantos + 1))
    pontos = [(float(x), float(y)) for y, x in centros]

    # semeia onde ha rua e nao ha cruzamento nenhum por perto, senao ruas
    # longas e sem esquina ficam de fora da malha
    tem = np.zeros(rua_prob.shape, bool)
    for x, y in pontos:
        tem[int(y) % tem.shape[0], int(x) % tem.shape[1]] = True
    longe = ndi.distance_transform_edt(~tem)
    orfaos = (rua_prob > np.percentile(rua_prob, 86)) & (longe > 95)
    ys, xs = np.where(orfaos)
    pontos += [(float(x), float(y)) for x, y in zip(xs[::37], ys[::37])]
    return juntar_proximos(pontos, 34)


def juntar_proximos(pontos, raio: float):
    """Cruzamentos colados sao o mesmo cruzamento visto duas vezes."""
    saida: list[tuple[float, float]] = []
    for p in pontos:
        for i, q in enumerate(saida):
            if (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 < raio * raio:
                saida[i] = ((q[0] + p[0]) / 2, (q[1] + p[1]) / 2)
                break
        else:
            saida.append(p)
    return saida


# ── 3. por onde a rua passa ────────────────────────────────────────────────

def campo_de_custo(rua_prob, asfalto, verde) -> np.ndarray:
    """Barato no asfalto, caro fora dele, proibido no verde.

    O 300x do verde nao e enfeite: sem ele o caminho mais curto corta jardim
    entre duas casas, que e o erro mais visivel que esta medicao pode ter.
    """
    custo = 1.0 / (0.02 + np.clip(rua_prob / (rua_prob.max() + 1e-9), 0, 1))
    custo[~asfalto] *= 25.0
    custo[verde] *= 300.0
    return custo.astype(np.float32)


def encaixar(ponto, rua_prob, raio=14):
    """Puxa o cruzamento para o pixel mais 'rua' que houver ao redor."""
    altura, largura = rua_prob.shape
    x, y = int(round(ponto[0])), int(round(ponto[1]))
    x0, x1 = max(0, x - raio), min(largura, x + raio + 1)
    y0, y1 = max(0, y - raio), min(altura, y + raio + 1)
    janela = rua_prob[y0:y1, x0:x1]
    dy, dx = np.unravel_index(int(np.argmax(janela)), janela.shape)
    return (float(x0 + dx), float(y0 + dy))


def _comprimento(traco) -> float:
    a = np.asarray(traco, float)
    return float(np.hypot(*(a[1:] - a[:-1]).T).sum()) if len(a) > 1 else 0.0


def _simplificar(traco, tol=1.8):
    a = np.asarray(traco, np.float32).reshape(-1, 1, 2)
    return [tuple(map(float, p[0])) for p in cv2.approxPolyDP(a, tol, False)]


def montar_malha(nos, custo, distancia_maxima=420.0,
                 custo_maximo=12_000.0, desvio_maximo=1.7,
                 encostar=22.0) -> nx.Graph:
    """Liga vizinhos de Delaunay e aceita o trecho se ele andou no asfalto.

    Delaunay porque rua liga vizinho, nao qualquer um: testar todos os pares
    seria caro e ainda inventaria atalhos que nao existem.
    """
    G = nx.Graph()
    for i, p in enumerate(nos):
        G.add_node(i, pos=(float(p[0]), float(p[1])))
    if len(nos) < 4:
        return G

    P = np.array(nos, float)
    pares = set()
    for triangulo in Delaunay(P).simplices:
        for i in range(3):
            a, b = sorted((int(triangulo[i]), int(triangulo[(i + 1) % 3])))
            pares.add((a, b))

    for a, b in sorted(pares):
        reta = float(np.hypot(*(P[a] - P[b])))
        if reta > distancia_maxima:
            continue
        caminho, total = route_through_array(
            custo,
            (int(round(nos[a][1])), int(round(nos[a][0]))),
            (int(round(nos[b][1])), int(round(nos[b][0]))),
            fully_connected=True, geometric=True)
        pontos = [(float(x), float(y)) for y, x in caminho]
        comp = _comprimento(pontos)
        if total / max(comp, 1e-6) > custo_maximo:
            continue                                  # saiu do asfalto
        if comp > desvio_maximo * reta:
            continue                                  # deu volta: ja ha caminho melhor
        # se o tracado passa colado noutro no, a rua verdadeira e partida ali
        arr = np.asarray(pontos)
        pulou = any(
            j not in (a, b)
            and np.hypot(arr[:, 0] - q[0], arr[:, 1] - q[1]).min() < encostar
            for j, q in enumerate(nos))
        if pulou:
            continue
        G.add_edge(a, b, traco=_simplificar(pontos), comp=comp)

    G.remove_nodes_from([n for n in list(G.nodes) if G.degree(n) == 0])
    if G.number_of_nodes():
        G = G.subgraph(max(nx.connected_components(G), key=len)).copy()
    return podar_pontas(G, 85.0)


def podar_pontas(G: nx.Graph, minimo: float) -> nx.Graph:
    """Ponta curta que nao leva a lugar nenhum e ruido, nao rua sem saida."""
    mudou = True
    while mudou:
        mudou = False
        for no in [n for n in G.nodes if G.degree(n) == 1]:
            outro = next(iter(G[no]))
            if G[no][outro]["comp"] < minimo:
                G.remove_node(no)
                mudou = True
    return G


# ── saida ──────────────────────────────────────────────────────────────────

def exportar(G: nx.Graph, largura: int, altura: int, arquivo_mapa: str,
             metros_por_px: float) -> dict:
    """Coordenada em PORCENTAGEM, nunca em pixel.

    Assim o arquivo sobrevive a reexportar a imagem noutro tamanho. Guardar
    pixel amarra o dado a uma resolucao que ninguem prometeu manter.
    """
    def pct(p):
        return [round(p[0] / largura * 100, 4), round(p[1] / altura * 100, 4)]

    ordem = sorted(G.nodes, key=lambda n: (round(G.nodes[n]["pos"][1] / 40),
                                           G.nodes[n]["pos"][0]))
    indice = {n: i + 1 for i, n in enumerate(ordem)}
    nos = {f"n{indice[n]:03d}": {"em": pct(G.nodes[n]["pos"]),
                                 "saidas": G.degree(n)} for n in ordem}
    trechos = []
    for u, v, d in G.edges(data=True):
        a, b = sorted((indice[u], indice[v]))
        traco = d["traco"] if indice[u] == a else d["traco"][::-1]
        trechos.append({"de": f"n{a:03d}", "ate": f"n{b:03d}",
                        "px": round(d["comp"], 1),
                        "linha": [pct(p) for p in traco]})
    trechos.sort(key=lambda t: (t["de"], t["ate"]))
    return {
        "mapa": {"arquivo": arquivo_mapa, "largura": largura, "altura": altura},
        "medida": {
            "unidade": "porcentagem do mapa (0-100), origem no canto superior esquerdo",
            "asfalto_px": round(sum(t["px"] for t in trechos), 1),
            "metros_por_px": metros_por_px,
            "nota_escala": ("ESCOLHA, nao medida: o desenho nao tem escala. "
                            "Trocar aqui muda toda distancia do mapa, e "
                            "portanto todo frete cobrado por ela."),
        },
        "nos": nos,
        "trechos": trechos,
    }


def _fonte(tamanho, negrito=True):
    nome = "DejaVuSans-Bold.ttf" if negrito else "DejaVuSans.ttf"
    try:
        return ImageFont.truetype(f"/usr/share/fonts/truetype/dejavu/{nome}", tamanho)
    except OSError:
        return ImageFont.load_default()


def folha_geral(rgb, G, destino, resumo):
    im = Image.fromarray(rgb)
    fundo = Image.blend(im, Image.new("RGB", im.size, (6, 10, 15)), 0.50)
    brilho = Image.new("RGBA", im.size, (0, 0, 0, 0))
    pincel = ImageDraw.Draw(brilho)
    for _, _, d in G.edges(data=True):
        pincel.line([tuple(p) for p in d["traco"]], fill=AZUL + (170,), width=11, joint="curve")
    fundo = Image.alpha_composite(fundo.convert("RGBA"),
                                  brilho.filter(ImageFilter.GaussianBlur(9))).convert("RGB")
    d = ImageDraw.Draw(fundo)
    for _, _, dd in G.edges(data=True):
        d.line([tuple(p) for p in dd["traco"]], fill=AZUL, width=4, joint="curve")
    for n, dd in G.nodes(data=True):
        x, y = dd["pos"]
        r = 8 if G.degree(n) >= 3 else 5
        d.ellipse((x - r, y - r, x + r, y + r),
                  fill=AMARELO if G.degree(n) >= 3 else (255, 255, 255),
                  outline=(6, 10, 15), width=2)
    d.rectangle((0, 0, im.width, 78), fill=(6, 10, 15))
    d.text((22, 12), "MALHA DE RUAS", font=_fonte(27), fill=(255, 255, 255))
    d.text((24, 48), resumo, font=_fonte(19, False), fill=(150, 160, 172))
    fundo.save(destino, quality=95)


def folha_de_perto(rgb, G, destino, verde_pct):
    im = Image.fromarray(rgb.copy())
    d0 = ImageDraw.Draw(im)
    for _, _, dd in G.edges(data=True):
        d0.line([tuple(p) for p in dd["traco"]], fill=AZUL, width=5, joint="curve")
    for n, dd in G.nodes(data=True):
        x, y = dd["pos"]
        r = 8 if G.degree(n) >= 3 else 5
        d0.ellipse((x - r, y - r, x + r, y + r),
                   fill=AMARELO if G.degree(n) >= 3 else (255, 255, 255),
                   outline=(6, 10, 15), width=2)
    lx, ly = im.width // 4, im.height // 4
    janelas = [(im.width // 2 - lx, 30, "centro"),
               (im.width - lx - 40, 20, "nordeste"),
               (40, im.height // 2, "oeste"),
               (im.width // 2, im.height - ly - 60, "sudeste")]
    zoom = 2
    folha = Image.new("RGB", (lx * zoom * 2 + 36, ly * zoom * 2 + 96), (6, 10, 15))
    dd = ImageDraw.Draw(folha)
    dd.text((16, 14), "CONFERENCIA DE PERTO · 2x", font=_fonte(22), fill=(255, 255, 255))
    dd.text((16, 44), f"tracado sobre gramado: {verde_pct:.1f}% (o alvo e zero)",
            font=_fonte(18, False), fill=(150, 160, 172))
    for i, (x0, y0, nome) in enumerate(janelas):
        corte = im.crop((x0, y0, x0 + lx, y0 + ly)).resize((lx * zoom, ly * zoom), Image.LANCZOS)
        px = 12 + (i % 2) * (lx * zoom + 12)
        py = 78 + (i // 2) * (ly * zoom + 12)
        folha.paste(corte, (px, py))
        dd = ImageDraw.Draw(folha)
        dd.rectangle((px, py, px + lx * zoom - 1, py + ly * zoom - 1), outline=(40, 52, 66), width=2)
        dd.rectangle((px, py, px + 190, py + 30), fill=(6, 10, 15))
        dd.text((px + 10, py + 5), nome, font=_fonte(18, False), fill=AZUL)
    folha.save(destino, quality=95)


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("mapa")
    p.add_argument("saida")
    p.add_argument("--conferencia", help="pasta onde gravar as duas folhas")
    p.add_argument("--metros-por-px", type=float, default=0.83,
                   help="ESCOLHA sua, nao medida. Muda toda distancia do mapa.")
    args = p.parse_args()

    rgb = np.array(Image.open(args.mapa).convert("RGB"))
    altura, largura = rgb.shape[:2]
    print(f"mapa {largura}x{altura}")

    asfalto = mascara_de_asfalto(rgb)
    verde = mascara_de_verde(rgb)
    rua_prob = cara_de_rua(rgb)
    print(f"  asfalto {100*asfalto.mean():.1f}% · verde {100*verde.mean():.1f}%")

    nos = [encaixar(p, rua_prob) for p in cruzamentos(rua_prob, asfalto)]
    print(f"  cruzamentos: {len(nos)}")

    G = montar_malha(nos, campo_de_custo(rua_prob, asfalto, verde))
    graus = [g for _, g in G.degree()]
    print(f"  malha: {G.number_of_nodes()} nos, {G.number_of_edges()} trechos, "
          f"{sum(1 for g in graus if g >= 3)} cruzamentos")

    # a prova: quanto do tracado caiu em cima de grama
    sobre_verde = []
    for _, _, d in G.edges(data=True):
        pts = np.asarray(d["traco"], int)
        sobre_verde.append(verde[pts[:, 1].clip(0, altura - 1),
                                 pts[:, 0].clip(0, largura - 1)].mean())
    verde_pct = 100 * float(np.mean(sobre_verde)) if sobre_verde else 0.0
    inteira = G.number_of_nodes() > 0 and nx.is_connected(G)
    print(f"  sobre gramado: {verde_pct:.2f}%  ·  malha inteira ligada: {inteira}")
    if not inteira:
        print("  AVISO: a malha ficou em pedacos soltos — a rota vai falhar.", file=sys.stderr)

    dados = exportar(G, largura, altura, os.path.basename(args.mapa), args.metros_por_px)
    with open(args.saida, "w", encoding="utf-8") as f:
        json.dump(dados, f, ensure_ascii=False, indent=1)
    km = dados["medida"]["asfalto_px"] * args.metros_por_px / 1000
    print(f"  gravado {args.saida} · {km:.1f} km de rua na escala escolhida")

    if args.conferencia:
        os.makedirs(args.conferencia, exist_ok=True)
        resumo = (f"{G.number_of_nodes()} nos · {G.number_of_edges()} trechos · "
                  f"{sum(1 for g in graus if g >= 3)} cruzamentos · {km:.1f} km")
        folha_geral(rgb, G, os.path.join(args.conferencia, "malha.png"), resumo)
        folha_de_perto(rgb, G, os.path.join(args.conferencia, "conferencia.png"), verde_pct)
        print(f"  folhas em {args.conferencia}/ — OLHE AS DUAS antes de aceitar")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
