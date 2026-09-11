"""
A BUSSOLA DO BAIRRO — a placa de referencia para desenhar e conferir o menino.

Ideia do Fernando: "precisamos criar uma bussola, ou um relogio de ponteiros
gigantes no centro do mapa para jogador ser renderizado corretamente".

O relogio e a metafora certa, e ela e literal: sao 24 desenhos, e o relogio tem
24 meias-horas. Cada desenho e uma meia-hora. 12h e ir para longe da camera, 6h
e vir para perto, 3h e atravessar para a direita, 9h para a esquerda.

── O QUE ESTA PLACA RESOLVE ────────────────────────────────────────────────────

O mapa e visto de cima e de lado, a 31 graus. Isso ACHATA o chao: o que vai e
vem "para o fundo" aparece encolhido a 0,515 do tamanho, e o que atravessa de
lado aparece inteiro.

A consequencia e a armadilha: GIRAR O MENINO DE IGUAL NAO DA PASSOS IGUAIS NA
TELA. Girando o corpo de 15 em 15 graus, perto do 3h a seta na tela quase nao
sai do lugar (anda 0,5 grau por grau de corpo) e perto do 12h ela dispara (quase
2 graus por grau de corpo). Sao quase quatro vezes de diferenca entre o passo
mais curto e o mais longo — e e exatamente por isso que, nos oito desenhos
antigos, as trocas de frente e de costas pulavam e as de canto nao.

E tem um segundo efeito, que empurra para o mesmo lado: de frente, a bicicleta
aparece encurtada quase a nada; de lado, aparece inteira. Entao a silhueta
tambem muda mais depressa perto do 12h e do 6h.

O conserto e um so, e sai de graca: espacar os desenhos DE IGUAL NA TELA. Perto
do 12h isso vira um giro de corpo pequeno (muitos desenhos onde a silhueta muda
depressa) e perto do 3h um giro grande (poucos desenhos onde ela muda devagar).
Os dois problemas se resolvem com a mesma regra.

── E DENTRO DO JOGO? ───────────────────────────────────────────────────────────

Dentro do jogo NAO entra bussola nenhuma. A rota ja sabe para onde ele vai — ela
e feita de ruas, e cada trecho tem uma direcao. Uma bussola invisivel no centro
seria uma SEGUNDA fonte da mesma verdade, e duas fontes da mesma verdade sempre
acabam discordando: no dia em que o mapa girar, ou o bairro mudar de tamanho, a
bussola fica para tras e o menino passa a pedalar de lado sem ninguem saber
por que.

Esta placa e ferramenta de ateliê: serve para PEDIR o desenho no angulo certo e
para CONFERIR o desenho que voltou. O jogo ja tem a sua bussola, que sao as ruas.
"""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

# A camera do mapa, medida no proprio desenho do bairro em 06/09/2026.
GRAUS_DA_CAMERA = 31.0
ACHATAMENTO = math.sin(math.radians(GRAUS_DA_CAMERA))

QUANTOS = 24  # 24 desenhos = as 24 meias-horas do relogio


def rumo_do_corpo(alfa_na_tela: float) -> float:
    """Quanto o corpo tem de girar para a seta cair NESTE angulo da tela.

    A seta na tela e a direcao do chao com a vertical espremida em ACHATAMENTO.
    Desfazer o esprememdo e so devolver a altura: divide-se de volta.
    """
    a = math.radians(alfa_na_tela)
    return math.degrees(math.atan2(math.sin(a) / ACHATAMENTO, math.cos(a))) % 360


def seta_na_tela(rumo: float) -> float:
    """O caminho de volta: girei o corpo tanto, para onde a seta aponta na tela."""
    u = math.radians(rumo)
    return math.degrees(math.atan2(math.sin(u) * ACHATAMENTO, math.cos(u))) % 360


def a_tabela() -> list[dict[str, float | str | int]]:
    """Os 24 desenhos, contados como o relogio conta: do 12h para a direita.

    n=0 e ir para o fundo (vemos as costas), n=6 e atravessar para a direita
    (perfil inteiro), n=12 e vir para a frente (vemos o rosto). Cada n vale
    meia hora de relogio.

    "tela" e para onde a seta aponta na TELA — de 15 em 15 graus, sempre igual.
    "corpo" e quanto o menino esta virado de verdade, contado a partir de estar
    de costas para a camera. Esse e o numero que se pede ao desenho.
    """
    linhas = []
    for n in range(QUANTOS):
        alfa = (90.0 - n * (360.0 / QUANTOS)) % 360
        u = rumo_do_corpo(alfa)
        hora = n // 2
        linhas.append(
            {
                "n": n,
                "tela": alfa,
                "corpo": (90.0 - u) % 360,
                "hora": f"{12 if hora == 0 else hora}h{'30' if n % 2 else ''}",
            }
        )
    return linhas


# ── o desenho da placa ─────────────────────────────────────────────────

ESCALA = 3  # desenha grande e reduz, que e como se consegue linha limpa
TINTA = (14, 26, 46)
ATIVO = (255, 138, 44)   # o laranja das lojas
FRIO = (58, 148, 255)    # o azul das casas
APAGADO = (150, 162, 180)


def _fonte(tamanho: int):
    for c in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ):
        if Path(c).exists():
            return ImageFont.truetype(c, tamanho)
    return ImageFont.load_default()


def _texto(d, xy, txt, fonte, cor, ancora="mm", contorno=None):
    if contorno:
        for dx, dy in ((-2, 0), (2, 0), (0, -2), (0, 2)):
            d.text((xy[0] + dx, xy[1] + dy), txt, font=fonte, fill=contorno,
                   anchor=ancora, align="center")
    d.text(xy, txt, font=fonte, fill=cor, anchor=ancora, align="center")


def desenhar(saida: Path, mapa: Path | None = None) -> None:
    L, A = 1760 * ESCALA, 1660 * ESCALA
    cx, cy = L // 2, 880 * ESCALA
    raio = 470 * ESCALA

    fundo = Image.new("RGB", (L, A), (247, 249, 252))
    if mapa and mapa.exists():
        # O bairro por baixo, bem lavado: e so para lembrar de onde vem o angulo.
        m = Image.open(mapa).convert("RGB")
        e = max(L / m.width, A / m.height)
        m = m.resize((int(m.width * e) + 1, int(m.height * e) + 1), Image.LANCZOS)
        m = m.crop(((m.width - L) // 2, (m.height - A) // 2,
                    (m.width - L) // 2 + L, (m.height - A) // 2 + A))
        fundo = Image.blend(fundo, m, 0.15)

    d = ImageDraw.Draw(fundo, "RGBA")
    f_titulo = _fonte(40 * ESCALA)
    f_sub = _fonte(20 * ESCALA)
    f_num = _fonte(25 * ESCALA)
    f_hora = _fonte(16 * ESCALA)
    f_corpo = _fonte(15 * ESCALA)
    f_nota = _fonte(18 * ESCALA)
    f_quina = _fonte(19 * ESCALA)

    d.ellipse([cx - raio - 13 * ESCALA, cy - raio - 13 * ESCALA,
               cx + raio + 13 * ESCALA, cy + raio + 13 * ESCALA],
              fill=(255, 255, 255, 210), outline=TINTA, width=3 * ESCALA)

    tabela = a_tabela()

    # O ANEL DE DENTRO e a comparacao que explica a placa: sao os MESMOS 24,
    # so que girando o corpo de igual. Amontoam nos lados e rareiam em cima.
    r_ruim = raio * 0.285
    d.ellipse([cx - r_ruim, cy - r_ruim, cx + r_ruim, cy + r_ruim],
              outline=APAGADO + (170,), width=2 * ESCALA)
    for n in range(QUANTOS):
        a = math.radians(seta_na_tela(90.0 - n * (360.0 / QUANTOS)))
        x, y = cx + math.cos(a) * r_ruim, cy - math.sin(a) * r_ruim
        d.line([cx + math.cos(a) * r_ruim * 0.80, cy - math.sin(a) * r_ruim * 0.80,
                x, y], fill=APAGADO + (200,), width=3 * ESCALA)
        d.ellipse([x - 6 * ESCALA, y - 6 * ESCALA, x + 6 * ESCALA, y + 6 * ESCALA],
                  fill=APAGADO)
    _texto(d, (cx, cy + r_ruim + 30 * ESCALA), "girando o corpo de igual",
           f_corpo, (120, 132, 150), contorno=(255, 255, 255))

    # OS 24 PONTEIROS BONS, de igual na tela.
    for r in tabela:
        a = math.radians(float(r["tela"]))
        dx, dy = math.cos(a), -math.sin(a)
        quina = int(r["n"]) % 6 == 0
        cor = ATIVO if quina else FRIO
        r0 = raio * 0.42
        d.line([cx + dx * r0, cy + dy * r0, cx + dx * raio, cy + dy * raio],
               fill=cor, width=(6 if quina else 3) * ESCALA)
        p = (cx + dx * raio, cy + dy * raio)
        ang = math.atan2(dy, dx)
        asa = 16 * ESCALA
        d.polygon([p,
                   (p[0] - math.cos(ang - 0.42) * asa, p[1] - math.sin(ang - 0.42) * asa),
                   (p[0] - math.cos(ang + 0.42) * asa, p[1] - math.sin(ang + 0.42) * asa)],
                  fill=cor)
        rn = raio + 46 * ESCALA
        _texto(d, (cx + dx * rn, cy + dy * rn), f"{int(r['n']):02d}", f_num, TINTA)
        rh = raio + 82 * ESCALA
        _texto(d, (cx + dx * rh, cy + dy * rh), str(r["hora"]), f_hora,
               ATIVO if quina else (110, 124, 145))
        rc = raio * 0.68
        _texto(d, (cx + dx * rc, cy + dy * rc), f"{float(r['corpo']):.0f}°",
               f_corpo, TINTA, contorno=(255, 255, 255))

    d.ellipse([cx - 9 * ESCALA, cy - 9 * ESCALA, cx + 9 * ESCALA, cy + 9 * ESCALA],
              fill=TINTA)

    borda = raio + 118 * ESCALA
    for alfa, txt, anc in (
        (90, "12h  —  vai para o fundo\nvemos as costas dele", "md"),
        (270, "6h  —  vem para a frente\nvemos o rosto dele", "ma"),
        (0, "3h\natravessa para\na direita\n(perfil inteiro)", "lm"),
        (180, "9h\natravessa para\na esquerda\n(perfil inteiro)", "rm"),
    ):
        a = math.radians(alfa)
        _texto(d, (cx + math.cos(a) * borda, cy - math.sin(a) * borda),
               txt, f_quina, TINTA, ancora=anc)

    _texto(d, (cx, 54 * ESCALA), "A BUSSOLA DO BAIRRO", f_titulo, TINTA)
    _texto(d, (cx, 100 * ESCALA),
           "24 desenhos do menino — um para cada meia-hora do relogio.    "
           f"Camera do mapa: {GRAUS_DA_CAMERA:.0f}° acima do chao, "
           f"chao achatado em {ACHATAMENTO:.3f}.",
           f_sub, (92, 106, 128))

    _texto(d, (cx, A - 122 * ESCALA),
           "OS PONTEIROS DE FORA ESTAO DE IGUAL NA TELA — 15° entre um e o "
           "seguinte. Assim todo passo do menino parece do mesmo tamanho.\n"
           "O numero pequeno dentro de cada ponteiro e quanto o CORPO dele esta "
           "virado, contado de costas para a camera (00 = de costas, 06 = perfil, "
           "12 = de frente).\n"
           "O borrao cinza no meio sao os MESMOS 24 girando o corpo de igual: "
           "amontoam nos lados e rareiam em cima e embaixo.\n"
           "E o pulo que voce ja viu de frente e de costas.",
           f_nota, (66, 80, 100), ancora="ma")

    fundo.resize((L // ESCALA, A // ESCALA), Image.LANCZOS).save(saida, quality=94)


if __name__ == "__main__":
    aqui = Path(__file__).resolve().parents[2]
    desenhar(Path("/home/claude/bussola_do_bairro.png"),
             aqui / "client/public/assets/XB_Bairro_Mapa.webp")
    print(f"{'n':>3} {'hora':>6} {'seta na tela':>13} {'corpo virado':>13}  passo do corpo")
    ant = None
    for r in a_tabela():
        c = float(r["corpo"])
        passo = "" if ant is None else f"{(c - ant) % 360:5.1f}°"
        print(f"{int(r['n']):>3} {str(r['hora']):>6} {float(r['tela']):12.0f}° "
              f"{c:12.1f}°  {passo}")
        ant = c
