"""
O ENTREGADOR PROVISORIO — um desenho so, posto de volta no mapa.

Em 06/09/2026 voltou a PRIMEIRA das 24 imagens: o menino pedalando na direcao
das 4 horas. Ele pediu para por o jogador de volta no mapa "como estava antes"
e gerar um looping para ver.

Com um desenho so nao da para cobrir o relogio inteiro. O que da para fazer, e
que e honesto, e ESPELHAR: virar o desenho na horizontal troca a direcao de 4h
por 8h — o mesmo menino, o mesmo momento da pedalada, o outro lado. Com esses
dois, cada uma das oito fatias de hoje recebe a mais parecida.

O percurso da primeira corrida ajuda: 99,7% dele desce a tela (das 4h as 9h),
que e justamente onde os dois desenhos servem. As fatias de cima ficam erradas
e quase nao sao usadas.

ISTO E ANDAIME, e nao a solucao. Quando as 24 chegarem, o corte deixa de ser
"a caixa deste desenho" e passa a ser medido pela RODA: a roda e um circulo de
raio fixo, e a altura dela na tela nao muda com a direcao — entao ela e a unica
regua que mantem o menino do mesmo tamanho nas 24 imagens.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image

# O render que voltou: as 4 horas, ou 138 graus de corpo contados de costas.
ORIGEM = Path("/home/claude/repo/../render_08_4h.png")
DESTINO = Path("/home/claude/repo/client/public/assets")

LARGURA_GUARDADA = 200  # 30 px na tela, com folga de sobra para aproximar

# Os oito rumos de hoje, e qual dos dois desenhos fica mais perto de cada um.
# O angulo e o da tela: 0 = para a direita, subindo no sentido anti-horario.
RUMOS = {
    "leste": (0, "direita"),
    "nordeste": (45, "direita"),
    "norte": (90, "direita"),
    "noroeste": (135, "espelhado"),
    "oeste": (180, "espelhado"),
    "sudoeste": (225, "espelhado"),
    "sul": (270, "direita"),
    "sudeste": (315, "direita"),
}

# As duas poses que o jogo pinta hoje. "parado" ainda nao existe desenhada —
# ate ela chegar, e o mesmo desenho: melhor o menino na bicicleta na porta do
# que um quadrado vazio piscando a cada entrega.
POSES = ("pedalando1", "parado")


def recortar() -> Image.Image:
    """A moldura comum: a caixa do desenho, sem folga inventada."""
    im = Image.open(ORIGEM).convert("RGBA")
    caixa = im.getchannel("A").point(lambda v: 255 if v > 24 else 0).getbbox()
    im = im.crop(caixa)
    altura = round(im.height * LARGURA_GUARDADA / im.width)
    return im.resize((LARGURA_GUARDADA, altura), Image.LANCZOS)


def main() -> None:
    base = recortar()
    espelhado = base.transpose(Image.FLIP_LEFT_RIGHT)
    print(f"moldura comum: {base.width} x {base.height}")
    for pose in POSES:
        for rumo, (_, qual) in RUMOS.items():
            arte = base if qual == "direita" else espelhado
            saida = DESTINO / f"XB_Entregador_{pose}_{rumo}.webp"
            arte.save(saida, "WEBP", quality=82, method=6)
    n = len(POSES) * len(RUMOS)
    peso = sum(
        (DESTINO / f"XB_Entregador_{p}_{r}.webp").stat().st_size
        for p in POSES for r in RUMOS
    )
    print(f"{n} arquivos, {peso/1024:.0f} KB no total")
    print(f"tamanho na tela: TAMANHO = {1.9669 / (base.height/base.width):.3f}")
    print(f"piso no CSS:     min-width = {25.57 / (base.height/base.width):.1f} px")


if __name__ == "__main__":
    main()
