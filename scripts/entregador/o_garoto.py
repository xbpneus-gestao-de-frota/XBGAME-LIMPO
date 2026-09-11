"""
O GAROTO EM PE — o dono das bicicletas, parado na praca.

    python3 scripts/entregador/o_garoto.py

Le `assets-source/entregador/garoto_em_pe.png` e escreve
`client/public/assets/XB_Garoto_em_pe.webp`.

── POR QUE ESTE NAO PASSA PELA REGUA DO RELOGIO ──────────────────────────────

As folhas de pedalada entram todas numa moldura quadrada comum, porque elas
TROCAM entre si — e trocar de moldura seria o menino mudar de tamanho ao virar a
esquina. Este aqui nao troca com nada: e um so, parado.

Entao ele e recortado rente ao contorno, e so. O corte rente tem uma vantagem que
importa: o pe dele fica exatamente na linha de baixo da imagem, e ai o ponto que
pousa no mapa e o pe — sem medida nenhuma, sem numero para envelhecer torto.
"""
from __future__ import annotations

import importlib.util
from pathlib import Path

from PIL import Image

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parents[1]
ORIGEM = RAIZ / "assets-source/entregador/garoto_em_pe.png"
DESTINO = RAIZ / "client/public/assets/XB_Garoto_em_pe.webp"

spec = importlib.util.spec_from_file_location("dz", AQUI / "doze_horas.py")
dz = importlib.util.module_from_spec(spec)
spec.loader.exec_module(dz)


def main() -> None:
    if not ORIGEM.exists():
        raise SystemExit(f"falta {ORIGEM}")
    corpo = dz.contorno(dz.sem_fundo(Image.open(ORIGEM)))
    corpo.save(DESTINO, "WEBP", quality=88, method=6)
    print(f"{corpo.width}x{corpo.height} px · proporcao "
          f"{corpo.width / corpo.height:.3f}")
    print(f"escrito: {DESTINO.relative_to(RAIZ)}")


if __name__ == "__main__":
    main()
