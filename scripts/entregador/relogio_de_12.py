"""
O RELOGIO DE 12 HORAS — a placa para pedir os doze desenhos.

Ele decidiu em 06/09/2026: "vou fazer de todos os formatos de 1 a 12 horas".

Doze desenhos, um por hora do relogio, com o 12h indo para longe da camera e o
6h vindo para perto. Esta placa existe por um motivo so, e e o motivo que faz
esta encomenda dar certo ou errado:

── GIRAR O CORPO DE IGUAL NAO DA HORAS IGUAIS ────────────────────────────────

O bairro e visto de cima e de lado, a 31 graus. Isso ACHATA o chao: o que vai
para o fundo aparece com pouco mais da metade do tamanho, o que atravessa de
lado aparece inteiro.

Consequencia: para as doze setas ficarem de igual NA TELA — 30 graus entre uma
e a seguinte, que e o que o jogador ve — o corpo do menino NAO gira de igual.
Perto do 12h ele gira dezesseis graus por hora; perto do 3h gira quarenta e
oito. Quase tres vezes mais.

Se ele desenhar os doze girando o corpo de 30 em 30, as horas de cima e de
baixo saem quase iguais entre si (desperdicio) e as dos lados saem com um pulo
grande no meio (o "salto" que ja aparecia nos oito antigos).

Por isso a placa traz DOIS numeros em cada ponteiro: a hora, que e o que ele ve
na tela, e o giro do corpo, que e o que ele pede ao desenho.

    python3 scripts/entregador/relogio_de_12.py

Sai em "NOTAS DE TRABALHO/entregador 24/folhas de 1 a 12 horas/RELOGIO.png".
"""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

RAIZ = Path(__file__).resolve().parents[2]
MAPA = RAIZ / "client/public/assets/XB_Bairro_Mapa.webp"
PASTA = RAIZ.parent / "NOTAS DE TRABALHO/entregador 24/folhas de 1 a 12 horas"

GRAUS_DA_CAMERA = 31.0
ACHATAMENTO = math.sin(math.radians(GRAUS_DA_CAMERA))
QUANTOS = 12

ESCALA = 3
TINTA = (14, 26, 46)
ATIVO = (255, 138, 44)
FRIO = (58, 148, 255)
FALTA = (226, 74, 74)
APAGADO = (150, 162, 180)

# O desenho que o jogo usa hoje para a hora mais proxima, e se ele e de
# verdade. "espelho" e desenho real virado; "emprestado" e outro rumo servindo
# de quebra-galho ate a folha chegar.
# O que ele JA desenhou, e a que hora cada folha serve. O angulo e o medido na
# propria folha, entre os dois pontos onde as rodas encostam.
HOJE = {
    12: ("norte", "de verdade", 0),
    1: ("costas_048", "de verdade", 12),
    2: ("costas_026", "de verdade", 4),
    3: ("leste", "de verdade", 7),
    4: ("frente_331", "de verdade", 1),
    5: ("nada", "emprestado", 28),
    6: ("sul", "de verdade", 0),
    7: ("nada", "emprestado", 29),
    8: ("sudoeste", "de verdade", 1),
    9: ("oeste", "de verdade", 9),
    10: ("costas_143", "de verdade", 7),
    11: ("costas_129", "de verdade", 9),
}


def rumo_do_corpo(alfa_na_tela: float) -> float:
    a = math.radians(alfa_na_tela)
    return math.degrees(math.atan2(math.sin(a) / ACHATAMENTO, math.cos(a))) % 360


def a_tabela() -> list[dict]:
    linhas = []
    for n in range(QUANTOS):
        alfa = (90.0 - n * (360.0 / QUANTOS)) % 360
        corpo = (90.0 - rumo_do_corpo(alfa)) % 360
        hora = 12 if n == 0 else n
        linhas.append({"n": n, "hora": hora, "tela": alfa, "corpo": corpo})
    return linhas


def _fonte(t: int):
    for c in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
              "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"):
        if Path(c).exists():
            return ImageFont.truetype(c, t)
    return ImageFont.load_default()


def _texto(d, xy, txt, fonte, cor, ancora="mm", contorno=None):
    if contorno:
        d.text(xy, txt, font=fonte, fill=contorno, anchor=ancora,
               stroke_width=4, stroke_fill=contorno)
    d.text(xy, txt, font=fonte, fill=cor, anchor=ancora)


def main() -> None:
    PASTA.mkdir(parents=True, exist_ok=True)
    L, A = 1700 * ESCALA, 1560 * ESCALA
    cx, cy = L // 2, 780 * ESCALA
    raio = 400 * ESCALA

    fundo = Image.new("RGB", (L, A), (247, 249, 252))
    if MAPA.exists():
        m = Image.open(MAPA).convert("RGB")
        e = max(L / m.width, A / m.height)
        m = m.resize((int(m.width * e) + 1, int(m.height * e) + 1), Image.LANCZOS)
        m = m.crop(((m.width - L) // 2, (m.height - A) // 2,
                    (m.width - L) // 2 + L, (m.height - A) // 2 + A))
        fundo = Image.blend(fundo, m, 0.13)

    d = ImageDraw.Draw(fundo, "RGBA")
    f_tit = _fonte(40 * ESCALA)
    f_sub = _fonte(20 * ESCALA)
    f_hora = _fonte(30 * ESCALA)
    f_corpo = _fonte(17 * ESCALA)
    f_nota = _fonte(18 * ESCALA)
    f_sel = _fonte(14 * ESCALA)

    d.ellipse([cx - raio - 14 * ESCALA, cy - raio - 14 * ESCALA,
               cx + raio + 14 * ESCALA, cy + raio + 14 * ESCALA],
              fill=(255, 255, 255, 215), outline=TINTA, width=3 * ESCALA)

    # O anel de dentro: os MESMOS doze girando o corpo de 30 em 30. Amontoam
    # nos lados. E a prova visual de por que a tabela existe.
    rr = raio * 0.30
    d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], outline=APAGADO + (170,),
              width=2 * ESCALA)
    for n in range(QUANTOS):
        corpo = (90.0 - n * 30.0) % 360
        a = math.radians(corpo)
        # de volta para a tela: espremer a vertical
        tela = math.degrees(math.atan2(math.sin(a) * ACHATAMENTO, math.cos(a)))
        t = math.radians(tela)
        x, y = cx + math.cos(t) * rr, cy - math.sin(t) * rr
        d.line([cx + math.cos(t) * rr * 0.78, cy - math.sin(t) * rr * 0.78, x, y],
               fill=APAGADO + (200,), width=3 * ESCALA)
        d.ellipse([x - 6 * ESCALA, y - 6 * ESCALA, x + 6 * ESCALA, y + 6 * ESCALA],
                  fill=APAGADO)
    _texto(d, (cx, cy + rr + 26 * ESCALA), "girando o corpo de 30 em 30",
           f_corpo, (120, 132, 150), contorno=(255, 255, 255))

    for r in a_tabela():
        a = math.radians(r["tela"])
        dx, dy = math.cos(a), -math.sin(a)
        quina = r["n"] % 3 == 0
        _, estado, erro = HOJE[r["hora"]]
        cor = FALTA if estado == "emprestado" else (ATIVO if quina else FRIO)
        r0 = raio * 0.44
        d.line([cx + dx * r0, cy + dy * r0, cx + dx * raio, cy + dy * raio],
               fill=cor, width=(7 if quina else 4) * ESCALA)
        p = (cx + dx * raio, cy + dy * raio)
        ang = math.atan2(dy, dx)
        asa = 18 * ESCALA
        d.polygon([p,
                   (p[0] - math.cos(ang - 0.42) * asa, p[1] - math.sin(ang - 0.42) * asa),
                   (p[0] - math.cos(ang + 0.42) * asa, p[1] - math.sin(ang + 0.42) * asa)],
                  fill=cor)
        rn = raio + 52 * ESCALA
        _texto(d, (cx + dx * rn, cy + dy * rn), f"{r['hora']}h", f_hora, cor)
        rc = raio * 0.70
        _texto(d, (cx + dx * rc, cy + dy * rc), f"corpo {r['corpo']:.0f}°",
               f_corpo, TINTA, contorno=(255, 255, 255))
        # O selo vai LOGO ABAIXO da hora, nao mais longe no raio: nas setas
        # deitadas (3h e 9h) o raio poe os dois no mesmo lugar e um come o outro.
        _texto(d, (cx + dx * rn, cy + dy * rn + 30 * ESCALA),
               "FALTA ESTA" if estado == "emprestado" else f"pronta ({erro}° fora)",
               f_sel, FALTA if estado == "emprestado" else (110, 124, 145))

    d.ellipse([cx - 9 * ESCALA, cy - 9 * ESCALA, cx + 9 * ESCALA, cy + 9 * ESCALA],
              fill=TINTA)

    _texto(d, (cx, 58 * ESCALA), "FALTAM DUAS DAS DOZE", f_tit, TINTA, "ma")
    _texto(d, (cx, 108 * ESCALA),
           "12h = indo para o fundo (de costas)   ·   6h = vindo para a frente "
           "(de rosto)   ·   3h = atravessando para a direita",
           f_sub, (90, 104, 126), "ma")

    y = A - 250 * ESCALA
    for linha in (
        "DEZ DAS DOZE JA ESTAO PRONTAS com as folhas que ele desenhou — a maior sobra de angulo e de doze graus.",
        "FALTAM DUAS: as 5 horas e as 7 horas. Sao as duas quase de frente, uma virada para cada lado.",
        "O NUMERO DENTRO DE CADA SETA E O GIRO DO CORPO — e o que se pede ao desenho, contado de costas para a camera.",
        "Sem essas duas, passar de oito para doze moldes PIORA esses dois pedacos do bairro: o desenho mais perto",
        "erra vinte e oito graus, contra quinze que erra hoje. Com elas, o erro medio cai de 12,7° para 8,7°.",
    ):
        _texto(d, (cx, y), linha, f_nota, (66, 80, 100), "ma")
        y += 34 * ESCALA

    saida = PASTA / "RELOGIO.png"
    fundo.resize((L // ESCALA, A // ESCALA), Image.LANCZOS).save(saida)
    print(f"placa: {saida}")
    print(f"{'hora':>5} {'seta na tela':>13} {'giro do corpo':>14}  {'passo':>6}  hoje")
    ant = None
    for r in a_tabela():
        c = r["corpo"]
        passo = "" if ant is None else f"{(c - ant) % 360:5.1f}°"
        print(f"{r['hora']:>4}h {r['tela']:12.0f}° {c:13.1f}°  {passo:>6}  "
              f"{HOJE[r['hora']][1]}")
        ant = c


if __name__ == "__main__":
    main()
