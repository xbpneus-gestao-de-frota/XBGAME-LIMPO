"""
AS OITO FOLHAS DO ENTREGADOR — uma por rumo, todas de verdade.

    python3 scripts/entregador/as_oito_folhas.py

── O DEFEITO QUE ISTO CONSERTA ────────────────────────────────────────────────

Ele jogou e viu: "entregador esta andando de lado, e de costas". Estava certo, e
a causa nao era a conta do rumo — era que TRES DOS OITO DESENHOS NAO EXISTIAM.

  norte (subir a tela)      usava a folha do LESTE — o menino atravessando
  nordeste (subir e direita) usava a folha do LESTE — noventa graus errado
  noroeste (subir e esquerda) usava o ESPELHO do sudoeste — que e uma folha de
                              FRENTE virada, entao ele subia a tela de rosto

Andar de lado e andar de costas nao eram defeito de codigo: eram o desenho
errado, pintado com toda a firmeza do mundo.

As folhas que faltavam chegaram em 06/09/2026 — as vistas de tras. Com elas os
oito rumos passam a ter folha propria e nao ha mais espelho nenhum.

── COMO ESTE ARQUIVO ESCOLHE ──────────────────────────────────────────────────

Nao escolhe. A escolha esta no NOME do arquivo: folha_norte.png e a do norte.
Foi decidida olhando as folhas uma a uma e conferida contra o angulo medido
entre as duas rodas — que e a direcao em que a bicicleta aponta na tela.

Poe a decisao no nome do arquivo de proposito. Uma tabela de "qual folha serve
qual rumo" escondida dentro do codigo e a coisa que ninguem reve, e foi assim
que o espelho do sudoeste ficou servindo o noroeste por um dia inteiro sem
ninguem notar.

As folhas que sobraram ficam em sobras/, com o angulo medido no nome — sao os
angulos intermediarios, para quando a lista de rumos crescer de oito para doze.

── A REGUA E A ALTURA ─────────────────────────────────────────────────────────

Todos entram na mesma moldura quadrada, encaixados pela ALTURA e nao pela
largura: de lado a bicicleta e comprida, de frente e curta, e encaixar pela
largura faz o menino mudar de tamanho ao virar a esquina. Ver
igualar_o_tamanho.py, que conta essa historia inteira.
"""
from __future__ import annotations

import importlib.util
import math
import os
from pathlib import Path

from PIL import Image

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parents[1]
FOLHAS = RAIZ / "assets-source/entregador"
DESTINO = RAIZ / "client/public/assets"

spec = importlib.util.spec_from_file_location("dz", AQUI / "doze_horas.py")
dz = importlib.util.module_from_spec(spec)
spec.loader.exec_module(dz)

POSES = ("pedalando1", "parado")

# O angulo de cada rumo na tela: 0 e para a direita, subindo no anti-horario.
RUMOS = {
    "leste": 0,
    "nordeste": 45,
    "norte": 90,
    "noroeste": 135,
    "oeste": 180,
    "sudoeste": 225,
    "sul": 270,
    "sudeste": 315,
}


def main() -> None:
    faltando = [r for r in RUMOS if not (FOLHAS / f"folha_{r}.png").exists()]
    if faltando:
        raise SystemExit("faltam folhas: " + ", ".join(faltando))

    corpos = {
        r: dz.contorno(dz.sem_fundo(Image.open(FOLHAS / f"folha_{r}.png")))
        for r in RUMOS
    }
    alto = dz.altura_que_cabe(list(corpos.values()))
    print(f"moldura {dz.LADO}x{dz.LADO}, menino com {alto} px de altura "
          f"({alto / dz.LADO * 100:.0f}% da moldura)\n")

    print(f"{'rumo':>10} {'largura':>8}   frenteX frenteY  trasX  trasY")
    linhas = []
    for rumo, alvo in RUMOS.items():
        peca = dz.na_moldura(corpos[rumo], alto)
        for pose in POSES:
            peca.save(DESTINO / f"XB_Entregador_{pose}_{rumo}.webp",
                      "WEBP", quality=86, method=6)
        ex, ey, dx, dy = dz.apoios(peca)
        direita = math.cos(math.radians(alvo)) >= 0
        fx, fy, tx, ty = (dx, dy, ex, ey) if direita else (ex, ey, dx, dy)
        largura = round(corpos[rumo].width * alto / corpos[rumo].height)
        print(f"{rumo:>10} {largura:7d}px   {fx:6.1f}  {fy:6.1f} {tx:6.1f} {ty:6.1f}")
        linhas.append(f"  {rumo}: {{ frenteX: {fx:.1f}, frenteY: {fy:.1f}, "
                      f"trasX: {tx:.1f}, trasY: {ty:.1f} }},")

    peso = sum(
        os.path.getsize(DESTINO / f"XB_Entregador_{p}_{r}.webp")
        for p in POSES for r in RUMOS
    )
    print(f"\n{len(POSES) * len(RUMOS)} arquivos, {peso / 1024:.0f} KB")
    print("\n— cole em GEOMETRIA, em client/src/game/rumoDoEntregador.ts —")
    print("export const GEOMETRIA: Readonly<Record<Rumo, GeometriaDoRumo>> = {")
    for l in linhas:
        print(l)
    print("};")
    print("\ne suba VERSAO_DO_DESENHO em client/src/components/Entregador.tsx.")


if __name__ == "__main__":
    main()
