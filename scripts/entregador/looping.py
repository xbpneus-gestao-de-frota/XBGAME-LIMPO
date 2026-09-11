"""
O LOOPING DO ENTREGADOR — a volta dele no bairro, gravada fora do navegador.

Ele pediu: "aplique jogador em algum ponto como estava antes, gere looping".

Isto NAO e o jogo: e uma copia fiel da regra do jogo, feita aqui para poder
olhar sem abrir o navegador. O que e copiado, e de onde vem cada numero:

  o caminho          — a mesma primeira corrida (base, loja, casa) que a tela
                       do mapa monta, tirada do proprio codigo
  a velocidade       — 13 km/h com o relogio do mapa correndo 3 vezes
  o tamanho na tela  — a mesma porcentagem da largura do bairro
  a escolha do rumo  — a mesma conta de fatias, com os mesmos oito desenhos
  a pausa na porta   — 1,6 segundo, e a volta recomeca

A camera segue o menino, porque parado no bairro inteiro ele tem vinte pixels e
nao da para julgar nada.
"""
from __future__ import annotations

import json
import math
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

RAIZ = Path(__file__).resolve().parents[2]
MAPA = RAIZ / "client/public/assets/XB_Bairro_Mapa.webp"
CAMINHO = Path("/home/claude/caminho.json")

TAMANHO = 0.0129          # a largura do desenho, em fracao da largura do bairro
VELOCIDADE = 13 * 1000 / 3600 * 3   # metros por segundo no relogio do mapa
PAUSA = 1.6
FPS = 20
JANELA = (620, 388)       # o pedaco do bairro que a camera mostra
LUPA = 3                  # a faixa da direita, para ver o desenho de perto
LUPA_JANELA = (78, 128)   # 3 vezes vira a faixa; medidas pares, que o video exige
RUMOS = ["leste", "nordeste", "norte", "noroeste", "oeste", "sudoeste", "sul",
         "sudeste"]


def metros_por_pixel() -> float:
    d = json.loads((RAIZ / "client/src/game/data/ruas-bairro-xb.json").read_text())
    return d["medida"]["metros_por_px"]


def andar(caminho, larg, alt, mpp):
    """O caminho com a distancia acumulada, do mesmo jeito que o jogo faz."""
    passos, total = [], 0.0
    for i, p in enumerate(caminho):
        if i:
            a, b = caminho[i - 1], p
            dx = (b[0] - a[0]) / 100 * larg
            dy = (b[1] - a[1]) / 100 * alt
            total += math.hypot(dx, dy) * mpp
        passos.append((p, total))
    return passos


def onde(passos, andado, larg, alt):
    i = 1
    while i < len(passos) - 1 and passos[i][1] < andado:
        i += 1
    (a, aa), (b, bb) = passos[i - 1], passos[i]
    vao = max(1e-6, bb - aa)
    f = min(1.0, max(0.0, (andado - aa) / vao))
    em = (a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f)
    return em, (b[0] - a[0]) / 100 * larg, (b[1] - a[1]) / 100 * alt


def desenho(dx, dy, pose):
    graus = math.degrees(math.atan2(-dy, dx))
    fatia = round(graus / 45) % 8
    return RAIZ / f"client/public/assets/XB_Entregador_{pose}_{RUMOS[fatia]}.webp"


def main() -> None:
    mapa = Image.open(MAPA).convert("RGB")
    larg, alt = mapa.size
    mpp = metros_por_pixel()
    dados = json.loads(CAMINHO.read_text())
    passos = andar(dados["caminho"], larg, alt, mpp)
    total = passos[-1][1]

    arte = {}
    for pose in ("pedalando1", "parado"):
        for r in RUMOS:
            arte[(pose, r)] = Image.open(desenho(
                math.cos(math.radians(RUMOS.index(r) * 45)),
                -math.sin(math.radians(RUMOS.index(r) * 45)), pose)).convert("RGBA")

    lg = round(larg * TAMANHO)
    um = next(iter(arte.values()))
    ag = round(um.height * lg / um.width)
    print(f"volta de {total:.0f} m, {total/VELOCIDADE:.1f} s | menino {lg}x{ag} px")

    saida = Path("/home/claude/quadros")
    saida.mkdir(exist_ok=True)
    for f in saida.glob("*.png"):
        f.unlink()

    quadros = round((total / VELOCIDADE + PAUSA) * FPS)
    jl, ja = JANELA
    cam = None
    for k in range(quadros):
        t = k / FPS
        parado = t > total / VELOCIDADE
        andado = 0.0 if parado else t * VELOCIDADE
        em, dx, dy = onde(passos, andado, larg, alt)
        px, py = em[0] / 100 * larg, em[1] / 100 * alt

        alvo = (min(max(px, jl / 2), larg - jl / 2),
                min(max(py, ja / 2), alt - ja / 2))
        cam = alvo if cam is None else (cam[0] + (alvo[0] - cam[0]) * 0.10,
                                        cam[1] + (alvo[1] - cam[1]) * 0.10)
        cx, cy = round(cam[0]), round(cam[1])
        quadro = mapa.crop((cx - jl // 2, cy - ja // 2, cx + jl // 2, cy + ja // 2)).copy()

        ex, ey = px - (cx - jl // 2), py - (cy - ja // 2)   # base do menino
        sombra = Image.new("RGBA", (jl, ja), (0, 0, 0, 0))
        ImageDraw.Draw(sombra).ellipse(
            [ex - lg * 0.26, ey + ag * 0.03 - ag * 0.12,
             ex + lg * 0.26, ey + ag * 0.03], fill=(4, 10, 18, 107))
        quadro.paste(Image.alpha_composite(
            quadro.convert("RGBA"), sombra.filter(ImageFilter.GaussianBlur(2))).convert("RGB"), (0, 0))

        pose = "parado" if parado else "pedalando1"
        graus = math.degrees(math.atan2(-dy, dx))
        r = RUMOS[round(graus / 45) % 8]
        peca = arte[(pose, r)].resize((lg, ag), Image.LANCZOS)
        quadro.paste(peca, (round(ex - lg / 2), round(ey - ag)), peca)

        # A LUPA, na faixa da direita e nao por cima do bairro: no tamanho de
        # jogo ele tem dezenove pixels — da para ver que anda, nao da para ver
        # o desenho. A faixa mostra as duas coisas ao mesmo tempo, sem tapar
        # nada.
        lx, ly = LUPA_JANELA
        cxl = min(max(round(ex) - lx // 2, 0), jl - lx)
        cyl = min(max(round(ey - ag * 0.55) - ly // 2, 0), ja - ly)
        lupa = quadro.crop((cxl, cyl, cxl + lx, cyl + ly)).resize(
            (lx * LUPA, ly * LUPA), Image.LANCZOS)
        largo = Image.new("RGB", (jl + lx * LUPA + 6, ja), (14, 26, 46))
        largo.paste(quadro, (0, 0))
        largo.paste(lupa, (jl + 6, (ja - ly * LUPA) // 2))
        largo.save(saida / f"{k:04d}.png")

    print(f"{quadros} quadros")
    mp4 = "/home/claude/entregador_looping.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS),
                    "-i", str(saida / "%04d.png"), "-c:v", "libx264",
                    "-pix_fmt", "yuv420p", "-crf", "23", mp4], check=True)
    # O GIF e so o aperitivo: dez segundos, para abrir na conversa sem pesar.
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS),
                    "-i", str(saida / "%04d.png"), "-t", "10", "-vf",
                    "fps=10,scale=520:-1:flags=lanczos,split[a][b];"
                    "[a]palettegen=max_colors=64[p];[b][p]paletteuse=dither=bayer",
                    "-loop", "0", "/home/claude/entregador_looping.gif"], check=True)
    for n in ("entregador_looping.mp4", "entregador_looping.gif"):
        print(f"  {n}: {Path('/home/claude/'+n).stat().st_size/1024:.0f} KB")


if __name__ == "__main__":
    main()
