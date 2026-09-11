"""
O MAPA DO RELOGIO — a folha que vai para a equipe de arte.

    python3 scripts/entregador/mapa_relogio.py

Sai em "NOTAS DE TRABALHO/entregador 24/MAPA_DO_RELOGIO.png".

E uma folha so, para imprimir e por na parede: as vinte e quatro direcoes, o
giro de corpo de cada uma, quais ja existem e quais faltam desenhar.

── O QUE ELA PRECISA DIZER, E POR QUE ─────────────────────────────────────────

O bairro e visto de cima e de lado, a 31 graus. Isso ACHATA o chao: o que vai
para o fundo aparece com pouco mais da metade do tamanho, o que atravessa de
lado aparece inteiro.

Consequencia — e e a coisa toda: para as vinte e quatro setas ficarem de igual
NA TELA, o corpo do menino NAO gira de igual. Perto do 12h ele gira oito graus
por meia hora; perto do 3h gira vinte e quatro. Tres vezes mais.

Se a equipe desenhar girando o corpo de 15 em 15, as posicoes de cima e de
baixo saem quase iguais entre si (desperdicio de desenho) e as dos lados dao um
pulo no meio da curva (que e o defeito que o jogador ve).

Por isso cada seta traz DOIS numeros: a hora, que e o que o jogador ve na tela,
e o giro do corpo, que e o que se pede ao desenho.
"""
from __future__ import annotations

import math
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parents[1]
FOLHAS = RAIZ / "assets-source/entregador"
SAIDA = RAIZ.parent / "NOTAS DE TRABALHO/entregador 24/MAPA_DO_RELOGIO.png"

GRAUS_DA_CAMERA = 31.0
ACHATAMENTO = math.sin(math.radians(GRAUS_DA_CAMERA))
QUANTOS = 24
NOME = re.compile(r"^folha_(\d{2})h(00|30)\.png$")

E = 2  # desenha grande e reduz, que e o que da linha limpa
TINTA = (14, 26, 46)
PRONTA = (30, 150, 90)
FALTA = (226, 46, 46)
QUINA = (255, 138, 44)
CINZA = (150, 162, 180)

# QUEM JA EXISTE E LIDO DA PASTA, e nao escrito aqui.
#
# Escrito a mao, esta lista mentiu duas vezes no mesmo dia: uma folha que eu
# chamava de 07h30 apontava para 211° — era a 08h00 — e havia duas quase iguais
# perto do 04h00 e nenhuma no 04h30. Lista a mao envelhece; a pasta nao.
def ja_tem() -> dict[str, str]:
    tem = {}
    for f in FOLHAS.glob("folha_*.png"):
        m = NOME.match(f.name)
        if m:
            tem[f"{m.group(1)}h{m.group(2)}"] = "pronta"
    return tem


def nome_da_vez(n: int) -> str:
    hh = n // 2
    return f"{12 if hh == 0 else hh:02d}h{'30' if n % 2 else '00'}"


def corpo_para(alfa_na_tela: float) -> float:
    """Quanto o corpo gira para a seta cair NESTE angulo da tela."""
    a = math.radians(alfa_na_tela)
    u = math.degrees(math.atan2(math.sin(a) / ACHATAMENTO, math.cos(a))) % 360
    return (90.0 - u) % 360


def tabela():
    for n in range(QUANTOS):
        tela = (90.0 - n * 15.0) % 360
        yield n, nome_da_vez(n), tela, corpo_para(tela)


def _f(t: int):
    for c in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
              "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"):
        if Path(c).exists():
            return ImageFont.truetype(c, t)
    return ImageFont.load_default()


def _t(d, xy, txt, fonte, cor, anc="mm", contorno=None):
    if contorno:
        d.text(xy, txt, font=fonte, fill=cor, anchor=anc, stroke_width=4,
               stroke_fill=contorno)
    else:
        d.text(xy, txt, font=fonte, fill=cor, anchor=anc)


def main() -> None:
    SAIDA.parent.mkdir(parents=True, exist_ok=True)
    JA_TEM = ja_tem()
    L, A = 1500 * E, 3220 * E
    im = Image.new("RGB", (L, A), (250, 251, 253))
    d = ImageDraw.Draw(im, "RGBA")

    f_tit = _f(52 * E)
    f_sub = _f(24 * E)
    f_txt = _f(21 * E)
    f_hora = _f(26 * E)
    f_corpo = _f(17 * E)
    f_sel = _f(15 * E)
    f_cab = _f(20 * E)

    _t(d, (L // 2, 40 * E), "O RELÓGIO DO ENTREGADOR — 24 DESENHOS", f_tit, TINTA, "ma")
    _t(d, (L // 2, 104 * E),
       "12h = indo para o fundo (as costas)   ·   6h = vindo para a frente (o rosto)   ·   3h = atravessando para a direita",
       f_sub, (96, 110, 132), "ma")

    # ── o relogio ──────────────────────────────────────────────────────────
    cx, cy = L // 2, 700 * E
    raio = 420 * E
    d.ellipse([cx - raio - 16 * E, cy - raio - 16 * E, cx + raio + 16 * E, cy + raio + 16 * E],
              fill=(255, 255, 255, 255), outline=TINTA, width=3 * E)

    # o anel de dentro: os mesmos 24 girando o corpo de igual
    rr = raio * 0.26
    d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], outline=CINZA + (150,), width=2 * E)
    for n in range(QUANTOS):
        corpo = (90.0 - n * 15.0) % 360
        a = math.radians(corpo)
        tela = math.degrees(math.atan2(math.sin(a) * ACHATAMENTO, math.cos(a)))
        t = math.radians(tela)
        x, y = cx + math.cos(t) * rr, cy - math.sin(t) * rr
        d.line([cx + math.cos(t) * rr * 0.75, cy - math.sin(t) * rr * 0.75, x, y],
               fill=CINZA + (190,), width=2 * E)
    _t(d, (cx, cy + rr + 24 * E), "girando o corpo de 15 em 15", f_sel, (128, 140, 158))

    for n, nome, tela, corpo in tabela():
        a = math.radians(tela)
        dx, dy = math.cos(a), -math.sin(a)
        tem = JA_TEM.get(nome)
        cor = PRONTA if tem else FALTA
        cheia = n % 6 == 0
        r0 = raio * 0.42
        d.line([cx + dx * r0, cy + dy * r0, cx + dx * raio, cy + dy * raio],
               fill=cor + (255,), width=(7 if cheia else 4) * E)
        p = (cx + dx * raio, cy + dy * raio)
        ang = math.atan2(dy, dx)
        asa = 17 * E
        d.polygon([p,
                   (p[0] - math.cos(ang - 0.42) * asa, p[1] - math.sin(ang - 0.42) * asa),
                   (p[0] - math.cos(ang + 0.42) * asa, p[1] - math.sin(ang + 0.42) * asa)],
                  fill=cor + (255,))
        rn = raio + 46 * E
        _t(d, (cx + dx * rn, cy + dy * rn), nome, f_hora, cor if not cheia else QUINA)
        _t(d, (cx + dx * rn, cy + dy * rn + 26 * E),
           "pronta" if tem else "DESENHAR", f_sel, cor)
        rc = raio * 0.66
        _t(d, (cx + dx * rc, cy + dy * rc), f"{corpo:.0f}°", f_corpo, TINTA,
           contorno=(255, 255, 255))
    d.ellipse([cx - 9 * E, cy - 9 * E, cx + 9 * E, cy + 9 * E], fill=TINTA)

    # ── a tabela ───────────────────────────────────────────────────────────
    y = (cy + raio + 120 * E)
    _t(d, (110 * E, y), "POSIÇÃO", f_cab, (110, 124, 145), "la")
    _t(d, (330 * E, y), "PARA ONDE VAI NA TELA", f_cab, (110, 124, 145), "la")
    _t(d, (760 * E, y), "GIRAR O CORPO", f_cab, (110, 124, 145), "la")
    _t(d, (1010 * E, y), "PASSO", f_cab, (110, 124, 145), "la")
    _t(d, (1160 * E, y), "SITUAÇÃO", f_cab, (110, 124, 145), "la")
    y += 34 * E
    d.line([100 * E, y, L - 100 * E, y], fill=(210, 218, 230), width=2 * E)

    LADOS = {90: "para cima, para o fundo", 0: "para a direita",
             270: "para baixo, para a frente", 180: "para a esquerda"}
    ant = None
    for n, nome, tela, corpo in tabela():
        y += 42 * E
        tem = JA_TEM.get(nome)
        cor = PRONTA if tem else FALTA
        if n % 2 == 0:
            d.rectangle([100 * E, y - 18 * E, L - 100 * E, y + 22 * E],
                        fill=(245, 247, 250, 255))
        _t(d, (110 * E, y), nome, f_txt, TINTA, "lm")
        lado = LADOS.get(round(tela), "")
        _t(d, (330 * E, y), f"{tela:.0f}°" + (f"   — {lado}" if lado else ""),
           f_txt, (70, 84, 106), "lm")
        _t(d, (760 * E, y), f"{corpo:.0f}°", f_txt, TINTA, "lm")
        passo = "" if ant is None else f"+{(corpo - ant) % 360:.0f}°"
        _t(d, (1010 * E, y), passo, f_txt, (128, 140, 158), "lm")
        _t(d, (1160 * E, y), "pronta" if tem else "DESENHAR", f_txt, cor, "lm")
        ant = corpo

    faltam = [nome for _, nome, _, _ in tabela() if nome not in JA_TEM]
    y += 60 * E
    d.rectangle([100 * E, y - 10 * E, L - 100 * E, y + 330 * E],
                fill=(255, 248, 240, 255), outline=(240, 200, 150), width=2 * E)
    y += 26 * E
    _t(d, (130 * E, y), f"FALTAM {len(faltam)} DESENHOS: " + ", ".join(faltam),
       _f(24 * E), (180, 90, 20), "lm")
    for linha in (
        "",
        "COMO O DESENHO PRECISA VIR",
        "· Fundo transparente, ou fundo liso de uma cor só. Nada de cenário, nada de chão.",
        "· SEM SOMBRA desenhada. O jogo pinta a sombra a partir do pneu; sombra no desenho vira sombra dobrada.",
        "· A bicicleta inteira dentro do quadro, sem cortar pneu.",
        "· Mesma distância de câmera e mesmo enquadramento nos 24. O programa corrige diferenças pequenas",
        "  pela altura do menino, mas não inventa o que foi cortado.",
        "· Mesma pose de pedalada nos 24, se der. Ele fica mais calmo assim.",
        "· Nome do arquivo: folha_HHhMM.png — folha_05h00.png, folha_07h30.png, e assim por diante.",
    ):
        y += 27 * E
        _t(d, (130 * E, y), linha, f_txt if not linha.isupper() else _f(22 * E),
           (110, 70, 20) if linha.isupper() else (80, 94, 116), "lm")

    # ── a fita de referencia: o que ja existe ──────────────────────────────
    y += 70 * E
    _t(d, (110 * E, y), "O QUE JÁ EXISTE — o estilo a seguir", _f(24 * E), TINTA, "lm")
    y += 40 * E
    prontas = [n for _, n, _, _ in tabela() if n in JA_TEM]
    lado = 150 * E
    x = 110 * E
    for nome in prontas:
        f = FOLHAS / f"folha_{nome}.png"
        if not f.exists():
            f = FOLHAS / "sobras" / f"folha_{nome}.png"
        if not f.exists():
            continue
        a = Image.open(f).convert("RGBA")
        fundo = Image.new("RGBA", a.size, (255, 255, 255, 255))
        fundo.alpha_composite(a)
        im.paste(fundo.convert("RGB").resize((lado, lado), Image.LANCZOS), (x, y))
        d.rectangle([x, y, x + lado, y + lado], outline=(220, 228, 238), width=2 * E)
        _t(d, (x + lado // 2, y + lado + 18 * E), nome, f_sel, (90, 104, 126))
        x += lado + 12 * E
        if x + lado > L - 100 * E:
            x = 110 * E
            y += lado + 44 * E

    im.resize((L // E, A // E), Image.LANCZOS).save(SAIDA)
    print(f"mapa: {SAIDA}")
    print(f"prontas {len(prontas)} · faltam {len(faltam)}: " + ", ".join(faltam))


if __name__ == "__main__":
    main()
