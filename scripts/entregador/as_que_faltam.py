"""
AS 2 QUE FALTAM — a figura que diz QUAL desenho pedir, sem descrever pose.

    python3 scripts/entregador/as_que_faltam.py

Duas linhas, uma por buraco. Cada linha mostra a fila do relogio com a vaga
aberta no meio, e ao lado a folha que ja existe no MESMO eixo, virada ao
contrario: mesma inclinacao de bicicleta, menino de costas em vez de de frente.

── POR QUE ASSIM, E NAO DESCREVENDO A POSE ───────────────────────────────────

Tres pedidos por texto ja falharam. Descricao de pose ("tres quartos", "quase
de frente") nao prende nada: a mesma frase produziu 40% de afastamento numa leva
e 3% na outra. O que prende e um desenho que ja existe e que a propria equipe fez.

07h00 esta na tela a 240°; 01h00 esta a 60°. Sao 180° de diferenca — o MESMO
eixo, o sentido contrario. Entao 07h00 e a 01h00 com o menino virado para a
camera. Nao e espelho: espelho troca o lado do guidao e o lado da mochila, e foi
isso que quebrou o noroeste antes. E um giro de meia-volta no chao, que mostra o
rosto e o outro lado da bicicleta.

O mesmo para 05h00 (300°) e 11h00 (120°).
"""
from __future__ import annotations

import importlib.util
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parents[1]
FOLHAS = RAIZ / "assets-source/entregador"
DESTINO = RAIZ.parent / "NOTAS DE TRABALHO/entregador 24/AS_2_QUE_FALTAM.png"

spec = importlib.util.spec_from_file_location("dz", AQUI / "doze_horas.py")
dz = importlib.util.module_from_spec(spec)
spec.loader.exec_module(dz)

# (hora que falta, graus na tela, para onde vai, vizinhas, a folha do eixo oposto)
#
# NAO ha "gira o corpo N graus" aqui, e e de proposito. Esse numero depende de
# contar para que lado, e as duas contagens dao 163 e 197 — trocar as duas e o
# tipo de erro que ja custou tres levas. "Para a camera e para a esquerda de
# quem olha" nao tem dois sentidos.
BURACOS = (
    ("07h00", 240, "vem para a camera e para a ESQUERDA de quem olha",
     ("06h00", "07h30"), "01h00"),
    ("05h00", 300, "vem para a camera e para a DIREITA de quem olha",
     ("04h30", "06h00"), "11h00"),
)

CELULA = 250
ALTURA = 268
FONTES = "/usr/share/fonts/truetype/dejavu"


def fonte(t: int, negrito: bool = False):
    return ImageFont.truetype(
        f"{FONTES}/{'DejaVuSans-Bold.ttf' if negrito else 'DejaVuSans.ttf'}", t)


def separacao(peca: Image.Image) -> float:
    ex, _, dx, _ = dz.apoios(peca)
    caixa = peca.getbbox()
    return abs(dx - ex) / 100 * peca.width / (caixa[3] - caixa[1]) * 100


def carregar(nome: str) -> Image.Image:
    corpo = dz.contorno(dz.sem_fundo(Image.open(FOLHAS / f"folha_{nome}.png")))
    return dz.na_moldura(corpo, dz.altura_que_cabe([corpo]))


def main() -> None:
    largura = 30 + CELULA * 3 + 60 + CELULA + 60
    linha_alta = 44 + ALTURA + 62
    tela = Image.new("RGB", (largura, 76 + linha_alta * 2 + 26), (247, 248, 251))
    d = ImageDraw.Draw(tela)

    d.text((30, 18), "AS 2 QUE FALTAM — cada uma ja existe de costas",
           font=fonte(26, True), fill=(24, 28, 38))
    d.text((30, 50), "nao e espelho: e meia-volta no chao. Muda o lado do rosto "
                     "e o lado da bicicleta que aparece.",
           font=fonte(16), fill=(96, 104, 120))

    def celula(x, y, peca, titulo, sub, cor, tracejado=False):
        d.rounded_rectangle([x, y, x + CELULA - 12, y + ALTURA], 8,
                            fill=(255, 255, 255), outline=cor,
                            width=3 if tracejado else 1)
        if peca is not None:
            lado = ALTURA - 56
            im = peca.resize((lado, lado), Image.LANCZOS)
            tela.paste(im, (x + (CELULA - 12 - lado) // 2, y + 6), im)
        else:
            d.text((x + 46, y + ALTURA // 2 - 30), "?", font=fonte(96, True),
                   fill=(214, 219, 228))
            d.text((x + 100, y + ALTURA // 2 - 6), "e ESTA\nque falta",
                   font=fonte(19, True), fill=cor)
        d.text((x + 12, y + ALTURA - 44), titulo, font=fonte(19, True), fill=cor)
        d.text((x + 12, y + ALTURA - 21), sub, font=fonte(15), fill=(110, 118, 134))

    for i, (falta, tela_g, lado, (antes, depois), oposta) in enumerate(BURACOS):
        y = 76 + i * linha_alta
        d.text((30, y - 4), f"{falta}  —  {lado}  ·  rodas a 22%",
               font=fonte(20, True), fill=(24, 28, 38))
        y += 30

        for j, nome in enumerate((antes, falta, depois)):
            x = 30 + j * CELULA
            if nome == falta:
                celula(x, y, None, falta, "desenhar", (200, 40, 40), True)
            else:
                p = carregar(nome)
                celula(x, y, p, nome, f"ja tenho · {separacao(p):.0f}%",
                       (150, 156, 170))

        xd = 30 + 3 * CELULA + 6
        d.line([xd, y, xd, y + ALTURA], fill=(200, 206, 218), width=2)
        p = carregar(oposta)
        celula(xd + 26, y, p, oposta,
               f"o MESMO eixo · {separacao(p):.0f}%", (20, 140, 70))
        d.text((xd + 26, y + ALTURA + 8),
               f"vire o menino de frente: sai a {falta}",
               font=fonte(15, True), fill=(20, 110, 60))

    DESTINO.parent.mkdir(parents=True, exist_ok=True)
    tela.save(DESTINO)
    print(f"escrito: {DESTINO}")


if __name__ == "__main__":
    main()
