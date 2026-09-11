"""
OS MOLDES DO ENTREGADOR — um por posição do relógio.

    python3 scripts/entregador/moldes.py

Le `assets-source/entregador/folha_HHhMM.png`, recorta todos na mesma regua,
mede onde cada roda encosta e escreve:

  * client/public/assets/XB_Entregador_<pose>_<HHhMM>.webp — o que o jogo pinta
  * client/src/game/data/moldes-entregador.json — a lista que o jogo le

── POR QUE O NOME DO ARQUIVO E A HORA ─────────────────────────────────────────

Ele conta as direcoes em horas de relogio, e o relogio tem 24 meias-horas: 12h e
ir para o fundo, 6h e vir para a frente, 3h e atravessar para a direita. Cada
meia-hora sao quinze graus NA TELA.

O nome do arquivo e a DECISAO de qual folha serve qual direcao — tomada olhando
o desenho. O script nao adivinha: ele confere. Mede o angulo entre os dois
pontos onde as rodas encostam, que e a direcao em que a bicicleta aponta, e
reclama quando a medida briga com o nome.

A conferencia tem um limite conhecido e vale dizer: a medida nao sabe qual das
duas rodas e a da frente, entao ela pega a folha GIRADA e nao pega a folha
INVERTIDA. Ir para leste e ir para oeste dao a mesma linha.

── QUANTOS MOLDES ─────────────────────────────────────────────────────────────

Quantos houver. O jogo escolhe o molde mais perto do rumo, entao acrescentar uma
folha e largar o arquivo aqui e rodar isto — nao ha lista para editar no codigo.

Medido nas 67 rotas do bairro, com o erro do desenho em graus:

    8 moldes     erro medio 12,0°   passa de 25° em 0,5% do tempo
   14 moldes     erro medio  8,4°   passa de 25° em 3,6% do tempo
   24 moldes     erro medio  3,6°   passa de 25° em 0,01% do tempo

Repare no meio da tabela: catorze moldes acertam MAIS na media e erram FEIO com
sete vezes mais frequencia. E o buraco — o pedaco do relogio onde nao ha folha
nenhuma vira um erro grande sempre que ele passa por ali. Meio conjunto e pior
que um conjunto pequeno e parelho.
"""
from __future__ import annotations

import importlib.util
import json
import math
import re
from pathlib import Path

from PIL import Image

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parents[1]
FOLHAS = RAIZ / "assets-source/entregador"
DESTINO = RAIZ / "client/public/assets"
LISTA = RAIZ / "client/src/game/data/moldes-entregador.json"

spec = importlib.util.spec_from_file_location("dz", AQUI / "doze_horas.py")
dz = importlib.util.module_from_spec(spec)
spec.loader.exec_module(dz)

POSES = ("pedalando1", "parado")
RODAS_JUNTAS = 8  # abaixo disto o eixo entre as rodas e ruido
NOME = re.compile(r"^folha_(\d{2})h(00|30)\.png$")


def graus_da_hora(hh: int, mm: int) -> float:
    """A direcao na tela de uma posicao do relogio. 12h00 = 90° (para cima)."""
    n = (hh % 12) * 2 + (1 if mm == 30 else 0)
    return (90.0 - n * 15.0) % 360.0


def angulo_medido(peca: Image.Image) -> tuple[float, float]:
    """A direcao entre as duas rodas, e o quanto elas estao separadas."""
    ex, ey, dx, dy = dz.apoios(peca)
    vx, vy = dx - ex, dy - ey
    return (math.degrees(math.atan2(-vy, vx)) % 360.0, math.hypot(vx, vy))


def diferenca(a: float, b: float) -> float:
    d = abs((a - b) % 360.0)
    return min(d, 360.0 - d)


def main() -> None:
    achadas = []
    for f in sorted(FOLHAS.glob("folha_*.png")):
        m = NOME.match(f.name)
        if m:
            achadas.append((int(m.group(1)), int(m.group(2)), f))
    if not achadas:
        raise SystemExit(f"nenhuma folha_HHhMM.png em {FOLHAS}")

    corpos = {(h, mm): dz.contorno(dz.sem_fundo(Image.open(f))) for h, mm, f in achadas}
    alto = dz.altura_que_cabe(list(corpos.values()))
    print(f"{len(achadas)} moldes · moldura {dz.LADO}x{dz.LADO} · menino com "
          f"{alto} px ({alto / dz.LADO * 100:.0f}% da moldura)\n")

    moldes = []
    print(f"{'molde':>7} {'na tela':>8} {'medido':>8} {'sobra':>6}   frenteX frenteY  trasX  trasY")
    for (hh, mm) in sorted(corpos, key=lambda k: graus_da_hora(*k)):
        nome = f"{hh:02d}h{mm:02d}"
        alvo = graus_da_hora(hh, mm)
        peca = dz.na_moldura(corpos[(hh, mm)], alto)
        for pose in POSES:
            peca.save(DESTINO / f"XB_Entregador_{pose}_{nome}.webp",
                      "WEBP", quality=86, method=6)
        ex, ey, dx, dy = dz.apoios(peca)
        medido, separacao = angulo_medido(peca)

        # a medida nao distingue frente de tras: conferir o EIXO, nao o sentido
        sobra = min(diferenca(medido, alvo), diferenca(medido, alvo + 180))
        aviso = ""

        graus = alvo
        if separacao < RODAS_JUNTAS:
            # Aponta para a camera: as rodas se juntam e o eixo vira ruido — meio
            # pixel de diferenca vira dezenas de graus. Aqui o nome do arquivo e
            # mais confiavel que a medida, e e ele que vale.
            if diferenca(alvo, 90) > 25 and diferenca(alvo, 270) > 25:
                aviso = "  <-- rodas juntas, mas o rumo nao e de frente nem de costas"
            sobra = 0.0
        else:
            # A MEDIDA MANDA, e nao a grade.
            #
            # O nome do arquivo diz a posicao pretendida; a medida diz para onde a
            # bicicleta REALMENTE aponta. Quando as duas discordam, forcar a grade
            # e mentir: o jogo mostraria esta folha num rumo em que ela aponta
            # torto. Entao o angulo guardado e o medido, endireitado para a
            # meia-volta certa (a medida nao sabe qual roda e a da frente; o nome
            # sabe).
            graus = medido if diferenca(medido, alvo) <= 90 else (medido + 180) % 360
            if sobra > 15:
                aviso = f"  <-- a folha aponta para {medido:.0f}°, e nao para {alvo:.0f}°"

        direita = math.cos(math.radians(alvo)) >= 0
        fx, fy, tx, ty = (dx, dy, ex, ey) if direita else (ex, ey, dx, dy)
        print(f"{nome:>7} {graus:7.0f}° {medido:7.0f}° {sobra:5.0f}°   "
              f"{fx:6.1f}  {fy:6.1f} {tx:6.1f} {ty:6.1f}{aviso}")
        moldes.append({"nome": nome, "graus": round(graus, 1),
                       "frenteX": round(fx, 1), "frenteY": round(fy, 1),
                       "trasX": round(tx, 1), "trasY": round(ty, 1)})

    # OS BURACOS DO RELOGIO, para saber o que pedir.
    #
    # Uma posicao esta coberta quando existe algum molde a menos de quinze graus
    # dela — que e a mesma folga com que se recusa uma folha. Nao precisa haver
    # um desenho EXATO em cada meia hora: precisa nao haver vao grande.
    tem = [m["graus"] for m in moldes]
    faltam = []
    for n in range(24):
        g = (90.0 - n * 15.0) % 360.0
        if min(diferenca(g, t) for t in tem) > 15:
            hh = (n // 2) or 12
            faltam.append(f"{hh:02d}h{'30' if n % 2 else '00'}")
    print(f"\nfaltam {len(faltam)} das 24: " + (", ".join(faltam) if faltam else "nenhuma"))

    # E o que realmente importa: o maior VAO entre dois moldes vizinhos. E ele
    # que define o pior erro possivel do desenho — metade dele.
    ordem = sorted(tem)
    vaos = [(round((ordem[(k + 1) % len(ordem)] - a) % 360, 1), round(a, 1))
            for k, a in enumerate(ordem)]
    vaos.sort(reverse=True)
    print("maiores vaos: " + ", ".join(f"{v:.0f}° depois de {a:.0f}°" for v, a in vaos[:4]))

    LISTA.write_text(json.dumps({
        "nota": ("Gerado por scripts/entregador/moldes.py a partir de "
                 "assets-source/entregador. O nome e a posicao do relogio: 12h00 "
                 "e ir para o fundo, 06h00 e vir para a frente, 03h00 e "
                 "atravessar para a direita. 'graus' e a direcao na tela, e "
                 "frenteX/Y e trasX/Y sao os dois pontos onde as rodas encostam, "
                 "em porcentagem da moldura, medidos pixel a pixel."),
        "moldes": moldes,
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"lista: {LISTA.relative_to(RAIZ)}")


if __name__ == "__main__":
    main()
