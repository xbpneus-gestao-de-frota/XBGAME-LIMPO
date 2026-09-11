"""
O RENAN DAS GRADES — as cinco folhas de 10/09/2026 viram os desenhos do jogo.

    python3 scripts/entregador/grades.py

Ordem dele, 10/09/2026: "vamos refazer renan, aplique esse formato de animacao,
acredito que sera bem melhor, analise melhorias que deixem uma animacao
profissional sem ficar piscando".

Le `assets-source/entregador/grades/`:

    costas_esquerda.png   8 desenhos, de costas (12h00) virando ate a esquerda
    costas_direita.png    8 desenhos, de costas (12h00) virando ate a direita
    frente_esquerda.png   8 desenhos, de frente (06h00) virando ate a esquerda
    frente_direita.png    8 desenhos, de frente (06h00) virando ate a direita
    paradas.png           coleta e entrega em DOIS TEMPOS, para os dois lados

e escreve:

  * client/public/assets/XB_Entregador_pedalando1_<HHhMM>.webp — um por rumo
  * client/public/assets/XB_Entregador_<coletando|entregando>_<lado>_<1|2>.webp
  * client/src/game/data/moldes-entregador.json — os rumos (substitui moldes.py)
  * client/src/game/data/cenas-paradas.json — as cenas, agora com dois tempos

Este arquivo SUBSTITUI `moldes.py` e `cenas_paradas.py` para o Renan: aqueles
leem uma folha por rumo; as grades trazem oito rumos por folha.

── A REGUA: OS DESENHOS QUE SE REPETEM ENTRE AS FOLHAS ───────────────────────

As cinco folhas vieram em escalas diferentes (o gerador desenhou cada uma do seu
tamanho). A regua anterior igualava a ALTURA de cada desenho, e aqui ela mentiria:
de frente a roda de perto desce mais na tela do que de lado, entao o desenho de
frente e naturalmente uns oito por cento mais alto. Igualar a altura de cada um
encolheria o menino de frente e esticaria o de lado — ele mudaria de tamanho ao
virar a esquina.

Entao a escala e da FOLHA, e nao do desenho: dentro de cada folha as proporcoes
ficam como o gerador desenhou. E as folhas se costuram pelas pontas, onde o mesmo
rumo aparece em duas delas (de costas reto, de frente reto, de lado para cada
lado): mesmo desenho, mesma altura. Tres pontas acertam as quatro folhas; a
quarta ponta confere a costura (fechou em 1,7%). A folha das cenas entra pela
roda: a bicicleta parada tem o aro do tamanho do aro da bicicleta de perfil.

── O RUMO DE CADA DESENHO E MEDIDO PELAS RODAS ────────────────────────────────

O aro das rodas e a linha ciano. O centro de cada aro e o eixo da roda; a reta
entre os dois eixos e a direcao em que a bicicleta aponta NA TELA — a mesma conta
que o jogo faz com a rua. O ponto mais baixo nao serve (em vista de costas o
tenis desce mais que o pneu, e a regra antiga errava ate dez graus por isso).

Quando so um aro aparece (de frente e de costas quase puras, a outra roda fica
atras do menino), o rumo e repartido por igual NO CHAO entre o desenho reto e o
primeiro medido — igual no chao, e nao na tela, porque a camera de 31 graus
achata a profundidade: perto do reto um passo pequeno no chao e um passo grande
na tela.

── O QUE SAI DE CADA DESENHO ──────────────────────────────────────────────────

  * CORPO OPACO. As folhas chegaram com o corpo a 98-99% (o mapa aparecia de
    leve atraves do menino). Tudo que e corpo vira 100%.
  * SEM NEVOA. Pontinhos quase transparentes em volta (sobra do recorte do
    gerador) saem; a borda suave do contorno fica.
  * RODA NO CHAO. Os dois apoios sao medidos debaixo de cada aro — nunca o
    tenis — e o jogo pousa o menino no meio deles.

── AS CENAS PARADAS: A BICICLETA NAO SE MEXE AO DESCER ───────────────────────

Nas cenas a bicicleta esta de perfil, estacionada, e o menino ao lado. O ponto
de pouso e o MEIO DAS DUAS RODAS da bicicleta parada — o mesmo tipo de ponto do
desenho pedalando. Assim, quando ele desce, a bicicleta fica onde estava e so o
menino muda; e entre o primeiro e o segundo tempo da cena a bicicleta tambem nao
pula.
"""
from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parents[1]
GRADES = RAIZ / "assets-source/entregador/grades"
DESTINO = RAIZ / "client/public/assets"
MOLDES = RAIZ / "client/src/game/data/moldes-entregador.json"
CENAS = RAIZ / "client/src/game/data/cenas-paradas.json"

LADO = 200            # moldura quadrada, igual para todos (a mesma dos desenhos antigos)
BASE = 0.97           # onde fica o ponto mais baixo do desenho
CAMERA = math.radians(31.0)
JUNTOS_DEMAIS = 3.5   # dois rumos mais perto que isto: fica um so
ENTRE_EIXOS = 2.07    # distancia entre os eixos da bicicleta, em larguras de aro

# Cada folha de pedalada: para que lado vira, e se vai para o fundo ou vem.
PEDALADA = {
    "costas_esquerda": ("fundo", -1),
    "costas_direita": ("fundo", +1),
    "frente_esquerda": ("frente", -1),
    "frente_direita": ("frente", +1),
}

# O desenho reto aparece duas vezes (de costas em duas folhas, de frente em
# duas). Fica um de cada.
REPETIDOS = {("costas_direita", 0), ("frente_esquerda", 0)}


# ── recorte ─────────────────────────────────────────────────────────────────

def desenhos_da_folha(caminho: Path) -> list[np.ndarray]:
    """Os oito desenhos, na ordem da folha (linha de cima, depois a de baixo)."""
    a = np.asarray(Image.open(caminho).convert("RGBA")).copy()
    corpo = a[..., 3] > 40
    lab, n = ndi.label(ndi.binary_dilation(corpo, iterations=6))
    caixas = ndi.find_objects(lab)
    area = ndi.sum(corpo, lab, range(1, n + 1))
    achados = []
    for i, sl in enumerate(caixas):
        if area[i] < 2000:
            continue
        y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        linha = 0 if (y0 + y1) / 2 < a.shape[0] / 2 else 1
        peca = a[y0:y1, x0:x1].copy()
        peca[..., 3] = np.where(lab[y0:y1, x0:x1] == i + 1, peca[..., 3], 0)
        achados.append((linha, x0, limpar(peca)))
    achados.sort(key=lambda t: (t[0], t[1]))
    if len(achados) != 8:
        raise SystemExit(f"{caminho.name}: esperava 8 desenhos, achei {len(achados)}")
    return [p for _, _, p in achados]


def limpar(peca: np.ndarray) -> np.ndarray:
    """Corpo 100% opaco e sem nevoa; a borda suave do contorno fica."""
    al = peca[..., 3].astype(np.int32)
    solido = al >= 128
    perto = ndi.binary_dilation(solido, iterations=3)
    al = np.where(perto, al, 0)            # nevoa longe do corpo sai
    al = np.where(al >= 235, 255, al)      # o que e corpo fica opaco
    al = np.where(al < 12, 0, al)          # poeira de alfa sai
    peca = peca.copy()
    peca[..., 3] = al.astype(np.uint8)
    return peca


def aros(peca: np.ndarray) -> list[dict]:
    """Os aneis ciano das rodas, do mais baixo (mais perto da camera) ao mais alto."""
    r, g, b, al = (peca[..., k].astype(int) for k in range(4))
    ciano = (al > 100) & (b > 140) & (g > 110) & (r < 120) & ((b - r) > 80)
    H = peca.shape[0]
    lab, n = ndi.label(ndi.binary_dilation(ciano, iterations=5))
    saida = []
    for i, sl in enumerate(ndi.find_objects(lab)):
        if sl[0].stop - sl[0].start < H * 0.16 or sl[0].stop < H * 0.55:
            continue
        m = ciano[sl] & (lab[sl] == i + 1)
        ys, xs = np.nonzero(m)
        if len(xs) < 40:
            continue
        cx = (xs.min() + xs.max()) / 2
        cy = (ys.min() + ys.max()) / 2
        rx = max(1.0, (xs.max() - xs.min()) / 2)
        ry = max(1.0, (ys.max() - ys.min()) / 2)
        raio = np.sqrt(((xs - cx) / rx) ** 2 + ((ys - cy) / ry) ** 2)
        saida.append({
            "cx": sl[1].start + cx,
            "cy": sl[0].start + cy,
            "w": int(xs.max() - xs.min() + 1),
            "h": int(ys.max() - ys.min() + 1),
            "baixo": int(sl[0].start + ys.max()),
            # quanto do ciano cai no contorno de uma elipse: 1,0 e um aro
            # inteiro; um pedaco de aro ou a borda da caixa XB dao bem menos
            "anel": float(((raio > 0.72) & (raio < 1.08)).mean()),
        })
    saida.sort(key=lambda d: -d["baixo"])
    return saida


def chao_debaixo(peca: np.ndarray, cx: float, meia: float) -> tuple[float, float]:
    """Onde o pneu encosta: o pixel opaco mais baixo nas colunas do aro."""
    al = peca[..., 3] > 60
    x0 = max(0, int(cx - meia))
    x1 = min(peca.shape[1], int(cx + meia) + 1)
    col = al[:, x0:x1]
    linhas = np.nonzero(col.any(axis=1))[0]
    if len(linhas) == 0:
        return cx, float(peca.shape[0] - 1)
    y = int(linhas.max())
    xs = np.nonzero(col[y])[0] + x0
    return float((xs.min() + xs.max()) / 2), float(y + 1)


def pegada_mais_baixa(peca: np.ndarray) -> tuple[float, float]:
    """O meio da faixa mais baixa do desenho — onde o pneu de perto encosta."""
    al = peca[..., 3] > 60
    linhas = np.nonzero(al.any(axis=1))[0]
    y = int(linhas.max())
    folga = max(1, round(peca.shape[0] * 0.01))
    xs = np.nonzero(al[y - folga:y + 1].any(axis=0))[0]
    return float((xs.min() + xs.max()) / 2), float(y + 1)


# ── rumo ────────────────────────────────────────────────────────────────────

def tela_do_chao(t: float, vai: str, lado: int) -> float:
    """Rumo na tela (graus, 90 = para cima) de uma virada t no chao (0 = reto)."""
    tr = math.radians(t)
    sx = lado * math.sin(tr)
    sy = math.cos(tr) * math.sin(CAMERA) * (1 if vai == "fundo" else -1)
    return math.degrees(math.atan2(sy, sx)) % 360


def chao_da_tela(g: float, vai: str) -> float:
    """A virada no chao que da este rumo na tela."""
    base = 90.0 if vai == "fundo" else 270.0
    phi = abs(((g - base + 180) % 360) - 180)
    return math.degrees(math.atan(math.tan(math.radians(min(phi, 89.9))) * math.sin(CAMERA)))


def rumo_pelas_rodas(rs: list[dict], vai: str, lado: int) -> float | None:
    """A reta entre os dois eixos. None quando so um aro aparece."""
    if len(rs) < 2:
        return None
    perto, longe = rs[0], rs[1]
    if abs(perto["cx"] - longe["cx"]) < 25:
        return None
    # A roda de perto e a de tras quando ele vai para o fundo, e a da frente
    # quando ele vem. Em qualquer caso a frente fica do lado para onde ele vira.
    frente, tras = (longe, perto) if vai == "fundo" else (perto, longe)
    if (frente["cx"] - tras["cx"]) * lado < 0:
        frente, tras = tras, frente
    g = math.degrees(math.atan2(-(frente["cy"] - tras["cy"]), frente["cx"] - tras["cx"])) % 360
    return g


def hora(g: float) -> str:
    """O nome do arquivo: a hora do relogio com minutos (12h00 = para cima)."""
    minutos = round(((90.0 - g) % 360.0) / 30.0 * 60.0)
    h, m = divmod(minutos, 60)
    h %= 12
    return f"{(h or 12):02d}h{m:02d}"


def diferenca(a: float, b: float) -> float:
    d = abs((a - b) % 360.0)
    return min(d, 360.0 - d)


# ── moldura ─────────────────────────────────────────────────────────────────

def na_moldura(peca: np.ndarray, escala: float):
    """A moldura pronta, e a conta que leva um ponto da folha para ela.

    As medidas (aros, pegadas) sao feitas na FOLHA, em tamanho grande, e so
    depois trazidas para a moldura: medir no desenho ja reduzido perde o aro
    fino e troca o pneu pelo tenis.
    """
    im = Image.fromarray(peca, "RGBA")
    w = max(1, round(im.width * escala))
    h = max(1, round(im.height * escala))
    im = im.resize((w, h), Image.LANCZOS)
    if w > LADO or h > round(LADO * BASE):
        raise SystemExit(f"desenho {w}x{h} nao cabe na moldura {LADO}")
    ox, oy = (LADO - w) // 2, round(LADO * BASE) - h
    moldura = Image.new("RGBA", (LADO, LADO), (0, 0, 0, 0))
    moldura.paste(im, (ox, oy), im)
    sx, sy = w / peca.shape[1], h / peca.shape[0]
    return moldura, (lambda x, y: (ox + x * sx, oy + y * sy))


def pct(v: float) -> float:
    return round(v / LADO * 100, 1)


def altura(peca: np.ndarray) -> int:
    ys = np.nonzero((peca[..., 3] > 40).any(axis=1))[0]
    return int(ys.max() - ys.min() + 1)


def reguas(folhas: dict[str, list[np.ndarray]]) -> dict[str, float]:
    """A escala de cada folha, costurada pelos desenhos que se repetem.

    O mesmo rumo aparece em duas folhas nas quatro pontas: de costas reto (nas
    duas de costas), de frente reto (nas duas de frente), de lado para a direita
    (fim da costas_direita e da frente_direita) e de lado para a esquerda. Mesmo
    desenho, mesma altura — entao a razao das alturas nas pontas e a razao das
    escalas. Tres pontas bastam; a quarta confere (fechou em 1,7% em 10/09).
    """
    h = {n: [altura(p) for p in ps] for n, ps in folhas.items()}
    s = {"costas_esquerda": 1.0}
    s["costas_direita"] = h["costas_esquerda"][0] / h["costas_direita"][0]
    s["frente_direita"] = s["costas_direita"] * h["costas_direita"][7] / h["frente_direita"][7]
    s["frente_esquerda"] = s["frente_direita"] * h["frente_direita"][0] / h["frente_esquerda"][0]
    fecho = s["frente_esquerda"] * h["frente_esquerda"][7] / (s["costas_esquerda"] * h["costas_esquerda"][7])
    # A folha das cenas: pela RODA. A bicicleta parada esta de perfil, como a do
    # fim da frente_direita; os aros das duas tem de ter o mesmo tamanho.
    def aro_medio(ps: list[np.ndarray]) -> float:
        tam = []
        for p in ps:
            rs = sorted(aros(p), key=lambda r: -(r["w"] * r["h"]))[:2]
            tam += [r["h"] for r in rs]
        return float(np.median(tam))
    s["paradas"] = s["frente_direita"] * aro_medio(folhas["frente_direita"][6:8]) / aro_medio(folhas["paradas"])
    # E o tamanho final: o maior desenho de todos cabe na moldura.
    maior = 0.0
    for n, ps in folhas.items():
        for p in ps:
            maior = max(maior, p.shape[0] * s[n] / (LADO * BASE * 0.985), p.shape[1] * s[n] / (LADO * 0.985))
    g = 1.0 / maior
    print(f"reguas: " + ", ".join(f"{n} {v * g:.3f}" for n, v in s.items()) +
          f"  (a quarta ponta fechou com {abs(fecho - 1) * 100:.1f}% de diferenca)")
    return {n: v * g for n, v in s.items()}


def main() -> None:
    folhas = {nome: desenhos_da_folha(GRADES / f"{nome}.png") for nome in [*PEDALADA, "paradas"]}

    escala = reguas(folhas)

    # ── pedalada ──
    medidos = []
    for nome, (vai, lado) in PEDALADA.items():
        pecas = folhas[nome]
        graus: list[float | None] = []
        for k, p in enumerate(pecas):
            if k == 0:
                graus.append(90.0 if vai == "fundo" else 270.0)
                continue
            graus.append(rumo_pelas_rodas(aros(p), vai, lado))
        # os que so mostram um aro: repartidos por igual no chao ate o primeiro medido
        primeiro = next((k for k, g in enumerate(graus) if k > 0 and g is not None), None)
        if primeiro is None:
            raise SystemExit(f"{nome}: nenhum desenho com as duas rodas visiveis")
        t1 = chao_da_tela(graus[primeiro], vai)  # type: ignore[arg-type]
        for k in range(1, primeiro):
            graus[k] = tela_do_chao(t1 * k / primeiro, vai, lado)
        # depois do primeiro medido, um que falhe fica entre os vizinhos
        for k in range(primeiro + 1, 8):
            if graus[k] is None:
                graus[k] = graus[k - 1]
        for k, p in enumerate(pecas):
            if (nome, k) in REPETIDOS:
                continue
            medidos.append({"folha": nome, "k": k, "graus": float(graus[k]), "peca": p,
                            "vai": vai, "lado": lado})

    # dois rumos quase iguais: fica um (o do meio da folha, que e o mais parelho)
    medidos.sort(key=lambda m: m["graus"])
    fica: list[dict] = []
    for m in medidos:
        if fica and diferenca(m["graus"], fica[-1]["graus"]) < JUNTOS_DEMAIS:
            continue
        fica.append(m)
    if len(fica) > 1 and diferenca(fica[0]["graus"], fica[-1]["graus"]) < JUNTOS_DEMAIS:
        fica.pop()

    moldes = []
    print(f"{len(fica)} rumos (de {len(medidos)}) · moldura {LADO}x{LADO}\n")
    print(f"{'nome':>6} {'graus':>6}  folha              frenteX frenteY  trasX  trasY")
    for m in fica:
        moldura, levar = na_moldura(m["peca"], escala[m["folha"]])
        peca = m["peca"]
        rs = aros(peca)
        vai, lado = m["vai"], m["lado"]
        if len(rs) >= 2 and abs(rs[0]["cx"] - rs[1]["cx"]) >= 25:
            perto, longe = rs[0], rs[1]
            frente, tras = (longe, perto) if vai == "fundo" else (perto, longe)
            if (frente["cx"] - tras["cx"]) * lado < 0:
                frente, tras = tras, frente
            fx, fy = levar(*chao_debaixo(peca, frente["cx"], frente["w"] / 4))
            tx, ty = levar(*chao_debaixo(peca, tras["cx"], tras["w"] / 4))
            uma_roda = False
        else:
            # Uma roda so a vista: a outra esta atras do menino. As duas pegadas
            # ficam no mesmo ponto — inventar a de tras poria a sombra e o corte
            # do chao num lugar onde nao ha pneu nenhum.
            # O pneu que encosta e o de perto, o mais baixo do desenho (o aro
            # dele quase some, de tao de frente): a pegada e o meio da ultima
            # faixa de pixels.
            cx, cy = levar(*pegada_mais_baixa(peca))
            fx, fy, tx, ty = cx, cy, cx, cy
            uma_roda = True
        nome = hora(m["graus"])
        moldura.save(DESTINO / f"XB_Entregador_pedalando1_{nome}.webp", "WEBP",
                     quality=90, method=6)
        molde = {"nome": nome, "graus": round(m["graus"], 1),
                 "frenteX": pct(fx), "frenteY": pct(fy),
                 "trasX": pct(tx), "trasY": pct(ty),
                 "folha": f"{m['folha']}#{m['k'] + 1}"}
        if uma_roda:
            molde["umaRoda"] = True
        moldes.append(molde)
        print(f"{nome:>6} {m['graus']:6.1f}  {m['folha']:<17}#{m['k'] + 1} "
              f"{pct(fx):6.1f}  {pct(fy):6.1f} {pct(tx):6.1f} {pct(ty):6.1f}")

    ordem = sorted(x["graus"] for x in moldes)
    vaos = sorted(((ordem[(i + 1) % len(ordem)] - g) % 360, g) for i, g in enumerate(ordem))[::-1]
    print("\nmaiores vaos: " + ", ".join(f"{v:.0f}° depois de {g:.0f}°" for v, g in vaos[:4]))

    MOLDES.write_text(json.dumps({
        "nota": ("Gerado por scripts/entregador/grades.py a partir das cinco "
                 "grades em assets-source/entregador/grades. O nome e a posicao "
                 "do relogio com minutos (12h00 = ir para o fundo, 03h00 = "
                 "atravessar para a direita). 'graus' e a direcao na tela, medida "
                 "pela reta entre os dois eixos das rodas; frenteX/Y e trasX/Y "
                 "sao onde cada pneu encosta, em porcentagem da moldura. 'folha' "
                 "diz de qual desenho da grade saiu."),
        "moldes": moldes,
    }, ensure_ascii=False, indent=1), encoding="utf-8")

    # ── cenas paradas: dois tempos por lado ──
    # linha de cima: virado para a direita (coleta 1, coleta 2, entrega 1, entrega 2)
    # linha de baixo: o mesmo, para a esquerda
    ordem_da_folha = [("coleta", "direita", 1), ("coleta", "direita", 2),
                      ("entrega", "direita", 1), ("entrega", "direita", 2),
                      ("coleta", "esquerda", 1), ("coleta", "esquerda", 2),
                      ("entrega", "esquerda", 1), ("entrega", "esquerda", 2)]
    pose = {"coleta": "coletando", "entrega": "entregando"}
    por_cena: dict[tuple[str, str], list[dict]] = {}
    print(f"\n{'cena':>18} {'frenteX':>8} {'trasX':>7} {'chao':>6}")
    for (papel, lado, tempo), p in zip(ordem_da_folha, folhas["paradas"]):
        moldura, levar = na_moldura(p, escala["paradas"])
        arr = np.asarray(moldura)
        # A RODA DE TRAS E A QUE APARECE INTEIRA. A da frente fica quase sempre
        # atras da perna dele ou da caixa no chao, e o aro dela vem em pedacos
        # (medir por pedaco poe o apoio no tenis). Entao se mede a de tras, e a
        # da frente sai do entre-eixos: 2,07 aros, medido nas quatro cenas em que
        # as duas rodas aparecem (231 a 237 px de eixo a eixo, aro de 113 px).
        inteiros = [r for r in aros(p) if r["anel"] >= 0.9 and 0.85 < r["w"] / r["h"] < 1.15]
        if not inteiros:
            raise SystemExit(f"cena {papel} {lado} {tempo}: nao achei a roda inteira")
        # a bicicleta parada aponta para o mesmo lado em que ele entrega
        sentido = 1 if lado == "direita" else -1
        # a roda inteira que estiver mais para tras; se a unica inteira for a
        # da frente, a de tras sai dela pelo entre-eixos
        roda = min(inteiros, key=lambda r: sentido * r["cx"])
        eh_a_de_tras = (roda["cx"] - p.shape[1] / 2) * sentido < 0
        rx, chao = levar(*chao_debaixo(p, roda["cx"], roda["w"] / 4))
        outra = roda["cx"] + (1 if eh_a_de_tras else -1) * sentido * ENTRE_EIXOS * roda["w"]
        ox, _ = levar(outra, 0)
        tx, fx = (rx, ox) if eh_a_de_tras else (ox, rx)
        moldura.save(DESTINO / f"XB_Entregador_{pose[papel]}_{lado}_{tempo}.webp",
                     "WEBP", quality=90, method=6)
        # O corte do chao fica no pe DELE, e nao no pneu: ele esta na frente da
        # bicicleta, mais perto da camera, e o tenis desce mais que a roda.
        # Cortar na linha do pneu comeria o pe.
        pe = float(np.nonzero((arr[..., 3] > 60).any(axis=1))[0].max() + 1)
        # As duas manchas do chao continuam na regra das cenas antigas: a trinta
        # e a setenta por cento da largura, na linha do pe — uma sombra so
        # debaixo do conjunto (menino, bicicleta e caixa). O que muda e o POUSO:
        # o meio das rodas da bicicleta parada, e nao o meio do desenho.
        cols = np.nonzero((arr[..., 3] > 60).any(axis=0))[0]
        esq, dir_ = float(cols.min()), float(cols.max() + 1)
        um, outro = esq + (dir_ - esq) * 0.30, esq + (dir_ - esq) * 0.70
        mfx, mtx = (outro, um) if lado == "direita" else (um, outro)
        g = {"frenteX": pct(mfx), "frenteY": pct(pe), "trasX": pct(mtx),
             "trasY": pct(pe), "chaoY": pct(pe),
             "pousoX": pct((fx + tx) / 2), "pousoY": pct(chao)}
        por_cena.setdefault((papel, lado), []).append(g)
        print(f"{papel + ' ' + lado + ' ' + str(tempo):>18} {pct(fx):8.1f} {pct(tx):7.1f} {g['chaoY']:5.1f}%  pouso {g['pousoX']:.1f}/{g['pousoY']:.1f}")

    cenas = []
    for (papel, lado), quadros in por_cena.items():
        cenas.append({"papel": papel, "lado": lado, **quadros[0], "quadros": quadros})
    CENAS.write_text(json.dumps({
        "nota": ("Gerado por scripts/entregador/grades.py. Cenas com o menino fora "
                 "da bicicleta, na porta do lugar, em DOIS TEMPOS: na coleta ele "
                 "pega a caixa (1) e guarda na mochila (2); na entrega ele estende "
                 "a caixa (1) e fica com a mao aberta (2). O lado e o de quem olha. "
                 "frenteX/Y e trasX/Y sao as duas manchas do chao (30% e 70% da "
                 "largura, na linha do pe); pousoX/Y e o meio das duas rodas da "
                 "bicicleta parada, o ponto que fica em cima do caminho, para a "
                 "bicicleta nao se mexer quando ele desce. 'quadros' traz a "
                 "geometria de cada tempo."),
        "cenas": cenas,
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"\nlistas: {MOLDES.relative_to(RAIZ)} · {CENAS.relative_to(RAIZ)}")


if __name__ == "__main__":
    main()
