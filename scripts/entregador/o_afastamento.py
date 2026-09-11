"""
O AFASTAMENTO DAS RODAS — a figura que explica a faixa para a equipe de arte.

    python3 scripts/entregador/o_afastamento.py

Poe tres desenhos lado a lado com a MEDIDA desenhada em cima: a distancia
horizontal entre os dois pontos em que os pneus encostam no chao, em % da
altura do desenho. Uma de mais, uma de menos, uma certa.

── POR QUE ESTA FIGURA EXISTE ────────────────────────────────────────────────

Chegaram 44 folhas em cinco levas e vinte serviram. As recusadas erraram de
dois jeitos opostos, e os dois vieram do mesmo lugar: o pedido dizia "no maximo
16%" — um TETO SEM PISO. Quem leu o teto foi para 3% e entregou outra vista de
frente; quem nao leu ficou nos 26% de uma pose de perfil.

Numero em texto nao resolveu duas vezes. Entao aqui a medida esta DESENHADA em
cima do desenho: as duas bolinhas onde os pneus tocam e o colchete entre elas.

── DE ONDE SAI A MEDIDA ──────────────────────────────────────────────────────

De `doze_horas.apoios`, a mesma funcao que o jogo usa para saber onde a roda
encosta — nao ha uma segunda regra so para a figura. Os tres passam pela mesma
regua de altura antes (`na_moldura`), senao comparar percentagem seria comparar
desenhos de tamanhos diferentes.
"""
from __future__ import annotations

import importlib.util
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parents[1]
FOLHAS = RAIZ / "assets-source/entregador"
DESTINO = RAIZ.parent / "NOTAS DE TRABALHO/entregador 24/O_AFASTAMENTO_DAS_RODAS.png"

spec = importlib.util.spec_from_file_location("dz", AQUI / "doze_horas.py")
dz = importlib.util.module_from_spec(spec)
spec.loader.exec_module(dz)

# (arquivo, cor, chamada, explicacao)
OS_TRES = (
    (FOLHAS / "sobras/repetida_205.png", (200, 40, 40),
     "DE MAIS", "as primeiras — bicicleta de perfil"),
    (FOLHAS / "sobras/repetida_270c.png", (200, 40, 40),
     "DE MENOS", "as de agora — reta para a camera"),
    (FOLHAS / "folha_01h00.png", (20, 140, 70),
     "O CERTO", "a folha 01h00, que ja esta pronta"),
)

LARGURA = 1380
MARGEM = 24
VAO = 20
QUADRO = 430          # a altura da caixa onde o desenho aparece
NUMERO = 62           # a altura reservada para o numero grande
LEGENDA = 52          # duas linhas de legenda
RODAPE = 84

FONTES = "/usr/share/fonts/truetype/dejavu"


def fonte(tamanho: int, negrito: bool = False) -> ImageFont.FreeTypeFont:
    nome = "DejaVuSans-Bold.ttf" if negrito else "DejaVuSans.ttf"
    return ImageFont.truetype(f"{FONTES}/{nome}", tamanho)


def no_meio(d: ImageDraw.ImageDraw, y: int, texto: str, f, cor, x0=0, x1=LARGURA) -> None:
    largo = d.textlength(texto, font=f)
    d.text(((x0 + x1 - largo) / 2, y), texto, font=f, fill=cor)


def main() -> None:
    corpos = [dz.contorno(dz.sem_fundo(Image.open(p))) for p, *_ in OS_TRES]
    alto = dz.altura_que_cabe(corpos)
    pecas = [dz.na_moldura(c, alto) for c in corpos]

    painel = (LARGURA - 2 * MARGEM - 2 * VAO) // 3
    topo = 112
    altura = topo + QUADRO + 12 + NUMERO + LEGENDA + 18 + RODAPE
    tela = Image.new("RGB", (LARGURA, altura), (247, 248, 251))
    d = ImageDraw.Draw(tela)

    no_meio(d, 20, "O AFASTAMENTO DAS RODAS — o que separa o certo do errado",
            fonte(33, True), (24, 28, 38))
    no_meio(d, 66, "a distancia horizontal entre os dois pontos em que os pneus "
                   "tocam o chao, em % da altura do desenho",
            fonte(18), (96, 104, 120))

    for i, ((_, cor, chamada, explica), peca) in enumerate(zip(OS_TRES, pecas)):
        x0 = MARGEM + i * (painel + VAO)
        d.rectangle([x0, topo, x0 + painel, topo + QUADRO],
                    fill=(255, 255, 255), outline=(214, 219, 228))

        escala = min((painel - 40) / peca.width, (QUADRO - 40) / peca.height)
        largo, alt = round(peca.width * escala), round(peca.height * escala)
        px, py = x0 + (painel - largo) // 2, topo + (QUADRO - alt) // 2
        tela.paste(peca.resize((largo, alt), Image.LANCZOS), (px, py),
                   peca.resize((largo, alt), Image.LANCZOS))

        ex, ey, dx, dy = dz.apoios(peca)
        pex, pey = px + ex / 100 * largo, py + ey / 100 * alt
        pdx, pdy = px + dx / 100 * largo, py + dy / 100 * alt
        # % DA ALTURA DO DESENHO, e nao da moldura: quem for medir vai medir
        # contra o menino, nao contra um quadrado que so existe aqui dentro.
        caixa = peca.getbbox()
        desenhado = (caixa[3] - caixa[1]) if caixa else peca.height
        sep = abs(dx - ex) / 100 * peca.width / desenhado * 100

        # o colchete: desce de cada apoio ate uma linha comum e liga os dois
        chao = max(pey, pdy) + 34
        for cx, cy in ((pex, pey), (pdx, pdy)):
            d.line([cx, cy, cx, chao], fill=cor, width=3)
            d.ellipse([cx - 6, cy - 6, cx + 6, cy + 6], fill=cor)
        d.line([pex, chao, pdx, chao], fill=cor, width=3)

        ny = topo + QUADRO + 12
        no_meio(d, ny, f"{sep:.0f}%", fonte(52, True), cor, x0, x0 + painel)
        no_meio(d, ny + NUMERO, chamada, fonte(18, True), cor, x0, x0 + painel)
        no_meio(d, ny + NUMERO + 24, explica, fonte(16), (86, 94, 110),
                x0, x0 + painel)

    ry = altura - RODAPE
    d.rectangle([0, ry, LARGURA, altura], fill=(236, 241, 236))
    no_meio(d, ry + 14, "ALVO: entre 19% e 26%, no ponto 22%. Medido nas folhas "
                        "01h00 (23%) e 11h00 (22%),", fonte(19, True), (20, 110, 60))
    no_meio(d, ry + 44, "que ficam na MESMA virada que 07h00 e 05h00 — so que de "
                        "costas em vez de de frente.", fonte(17), (70, 90, 78))

    DESTINO.parent.mkdir(parents=True, exist_ok=True)
    tela.save(DESTINO)
    print(f"escrito: {DESTINO}")


if __name__ == "__main__":
    main()
