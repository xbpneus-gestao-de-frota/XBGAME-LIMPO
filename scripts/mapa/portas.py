"""
A PORTA DE CADA PREDIO — o ponto dele que encosta na rua.

Por que este arquivo existe separado da extracao das ruas: a porta NAO e um
dado do predio, e uma RELACAO entre o predio e a malha. Toda vez que a malha
muda — um trecho retracado, um atalho inventado que sai — as portas que
apontavam para o pedaco que mudou passam a apontar para o nada, e o jogo
manda o entregador entregar no meio de um quintal.

Foi exatamente o que aconteceu em 04/09/2026: as ruas foram conferidas uma a
uma contra o desenho e corrigidas, e duas portas ficaram a dois e a quatro
por cento da rua mais perto. Rodar isto depois de mexer na malha e a regra.

DUAS PORTAS NAO PODEM SER A MESMA. Dois predios vizinhos projetam no mesmo
ponto de rua com facilidade — uma esquina atrai os dois. Ai a entrega na casa
18 acontece no mesmo lugar da casa 19, e uma delas nunca e vista. Quando isso
acontece, a porta do predio MENOR anda pela propria rua ate se separar: quem
tem mais fachada tem mais direito ao ponto bom.

    python3 scripts/mapa/portas.py
"""
from __future__ import annotations

import json
import math
import os

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, "..", ".."))
RUAS = os.path.join(RAIZ, "client/src/game/data/ruas-bairro-xb.json")
PREDIOS = os.path.join(RAIZ, "client/src/game/data/predios-bairro-xb.json")

# Duas portas mais perto que isto (em % do mapa) contam como a mesma porta.
PERTO_DEMAIS = 0.28
# Quanto a porta anda pela rua a cada tentativa de se separar.
PASSO = 0.30


def segmentos(ruas: dict) -> list[tuple[float, float, float, float]]:
    saida = []
    for t in ruas["trechos"]:
        linha = t["linha"]
        for i in range(1, len(linha)):
            a, b = linha[i - 1], linha[i]
            saida.append((a[0], a[1], b[0], b[1]))
    return saida


def na_rua(p, segs):
    """O ponto da malha mais perto de p, e a direcao da rua ali."""
    melhor, perto, rumo = None, float("inf"), (1.0, 0.0)
    for ax, ay, bx, by in segs:
        vx, vy = bx - ax, by - ay
        c = vx * vx + vy * vy
        f = 0.0 if c == 0 else ((p[0] - ax) * vx + (p[1] - ay) * vy) / c
        f = max(0.0, min(1.0, f))
        qx, qy = ax + vx * f, ay + vy * f
        d = math.hypot(p[0] - qx, p[1] - qy)
        if d < perto:
            perto, melhor = d, (qx, qy)
            n = math.hypot(vx, vy)
            rumo = (vx / n, vy / n) if n else (1.0, 0.0)
    return melhor, rumo


def main() -> None:
    ruas = json.load(open(RUAS, encoding="utf-8"))
    dados = json.load(open(PREDIOS, encoding="utf-8"))
    segs = segmentos(ruas)

    # Os maiores primeiro: quem tem mais fachada escolhe antes.
    predios = [p for p in dados["predios"] if p.get("emJogo")]
    predios.sort(key=lambda p: -p["area"])

    tomados: list[tuple[float, float]] = []
    mexidos = 0

    # O RISCO MANDA MAIS QUE A CONTA.
    #
    # Quando o Fernando desenhou um risco ate a porta, a ponta dele na rua e
    # onde a bicicleta para — e isso e escolha dele, nao projecao minha. Esses
    # predios escolhem primeiro; a conta so resolve os que ele nao riscou.
    #
    # Mesmo aqui duas portas podem cair no mesmo ponto: dois riscos vizinhos
    # que descem para a mesma esquina. A segunda anda pela propria rua ate se
    # separar — a mesma regra de sempre, porque duas entregas no mesmo ponto
    # sao uma entrega invisivel.
    for p in predios:
        if not p.get("aPe"):
            continue
        alvo, rumo = na_rua(p["aPe"][0], segs)
        x, y = alvo
        for tentativa in range(24):
            if all(math.hypot(x - tx, y - ty) > PERTO_DEMAIS for tx, ty in tomados):
                break
            lado = 1 if tentativa % 2 == 0 else -1
            k = (tentativa // 2 + 1) * PASSO * lado
            cand, _ = na_rua((alvo[0] + rumo[0] * k, alvo[1] + rumo[1] * k), segs)
            x, y = cand
        p["porta"] = [round(x, 4), round(y, 4)]
        p["aPe"][0] = [round(x, 4), round(y, 4)]
        tomados.append((x, y))

    for p in predios:
        if p.get("aPe"):
            continue
        alvo, rumo = na_rua(p["em"], segs)
        x, y = alvo
        for tentativa in range(24):
            if all(math.hypot(x - tx, y - ty) > PERTO_DEMAIS for tx, ty in tomados):
                break
            lado = 1 if tentativa % 2 == 0 else -1
            k = (tentativa // 2 + 1) * PASSO * lado
            cand = (alvo[0] + rumo[0] * k, alvo[1] + rumo[1] * k)
            # continua colado na rua: reprojeta depois de andar
            cand, _ = na_rua(cand, segs)
            x, y = cand
        antes = p.get("porta")
        p["porta"] = [round(x, 4), round(y, 4)]
        if antes is None or math.hypot(antes[0] - x, antes[1] - y) > 0.01:
            mexidos += 1
        tomados.append((x, y))

    json.dump(dados, open(PREDIOS, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    fora = 0
    junto = 0
    for i, (ax, ay) in enumerate(tomados):
        q, _ = na_rua((ax, ay), segs)
        if math.hypot(ax - q[0], ay - q[1]) > 0.15:
            fora += 1
        for bx, by in tomados[i + 1:]:
            if math.hypot(ax - bx, ay - by) <= 0.2:
                junto += 1
    print(f"portas: {len(tomados)} | mexidas: {mexidos} | fora da rua: {fora} | coladas: {junto}")


if __name__ == "__main__":
    main()
