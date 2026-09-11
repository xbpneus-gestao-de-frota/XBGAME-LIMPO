"""
AS CENAS PARADAS — o menino fora da bicicleta, na porta do lugar.

    python3 scripts/entregador/cenas_paradas.py

Le quatro folhas em `assets-source/entregador`:

    entrega_esquerda.png  entrega_direita.png   ele ESTENDE a encomenda
    coleta_esquerda.png   coleta_direita.png    ele GUARDA a encomenda na mochila

e escreve:

  * client/public/assets/XB_Entregador_entregando_<lado>.webp
  * client/public/assets/XB_Entregador_coletando_<lado>.webp
  * client/src/game/data/cenas-paradas.json

── DUAS PERGUNTAS, E NAO UMA ─────────────────────────────────────────────────

O QUE ele faz ali: coleta ou entrega. Ja estava escrito em cada parada da
corrida (o campo `papel`), e ate agora nao mudava nada na tela — pegar e largar
encomenda usavam o mesmo desenho. Agora usam o seu.

PARA QUE LADO: esquerda ou direita de quem olha. Sai do proprio traco da
caminhada, que ja existia: o primeiro ponto e onde a bicicleta ficou, o ultimo
e a porta.

Sao quatro cenas, e nao vinte e quatro por quatro: parado ele nao vai a lugar
nenhum, entao rumo nao diz nada aqui.

── A REGUA E A MESMA DAS FOLHAS DE PEDALADA ──────────────────────────────────

O menino nao pode mudar de tamanho ao descer. A altura comum sai de
`altura_que_cabe` sobre as folhas DO RELOGIO, e as cenas paradas entram nessa
mesma altura — nunca o contrario. Se a altura fosse calculada entre elas, uma
cena nova mudaria o tamanho do menino pedalando pelas costas, e ninguem
procuraria o culpado ali.

A RODA foi conferida a olho, lado a lado com as folhas de perfil, todas na mesma
altura de desenho: de 36% a 41% da altura nas folhas de pedalada, e as cenas
paradas caem dentro dessa mesma faixa. A bicicleta parada tem o tamanho da
bicicleta andando — que e o unico jeito de a troca nao virar um pulo.

── O CORTE DAS CENAS PARADAS E RETO ──────────────────────────────────────────

Nas folhas de pedalada a linha do chao e inclinada, porque as duas rodas
encostam em alturas diferentes na moldura. Aqui nao: a bicicleta esta parada em
piso plano. Usar a inclinacao medida entre os dois apoios esticaria a reta ate
cortar quinze por cento da moldura num dos lados.

── AS DUAS MANCHAS DO CHAO NAO SAO MEDIDAS: SAO ESPALHADAS ───────────────────

Pedalando, as manchas vao onde os pneus encostam, medido pixel a pixel — e tem
de ser assim, senao a sombra fica a meia bicicleta do pneu.

Parado nao da para medir, e vale dizer por que: nestas quatro folhas NAO HA uma
linha de chao unica. Procurando as colunas que encostam no ponto mais baixo,
uma folha devolve dois pedacinhos (o tenis e uma ponta de pneu), outra devolve
tres, e numa delas os dois pontos mais baixos sao os DOIS TENIS — a quatro por
cento um do outro. Duas manchas coladas viram uma so, embaixo do pe dele, e a
bicicleta ao lado fica sem sombra nenhuma: o "flutuando sobre o mapa" de volta.

Entao aqui a regra e outra, e uma so para as quatro: as duas manchas ficam a
trinta e a setenta por cento da largura do desenho, na linha do chao. Parado, a
pegada e a cena inteira — menino, bicicleta e mochila —, e nao duas pegadas de
pneu. No tamanho em que ele aparece, as duas manchas se encontram numa sombra
so debaixo do conjunto, que e exatamente o que se quer ver.
"""
from __future__ import annotations

import importlib.util
import json
from pathlib import Path

from PIL import Image

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parents[1]
FOLHAS = RAIZ / "assets-source/entregador"
DESTINO = RAIZ / "client/public/assets"
LISTA = RAIZ / "client/src/game/data/cenas-paradas.json"

spec = importlib.util.spec_from_file_location("dz", AQUI / "doze_horas.py")
dz = importlib.util.module_from_spec(spec)
spec.loader.exec_module(dz)

# papel na corrida -> nome da pose no arquivo do jogo
POSE = {"entrega": "entregando", "coleta": "coletando"}
LADOS = ("esquerda", "direita")


def main() -> None:
    relogio = [dz.contorno(dz.sem_fundo(Image.open(p)))
               for p in sorted(FOLHAS.glob("folha_[0-9]*h[0-9]*.png"))]
    if not relogio:
        raise SystemExit(f"nenhuma folha do relogio em {FOLHAS}")
    alto = dz.altura_que_cabe(relogio)

    cenas = []
    print(f"moldura {dz.LADO}x{dz.LADO} · menino com {alto} px "
          f"({alto / dz.LADO * 100:.0f}% da moldura)\n")
    print(f"{'papel':>8} {'lado':>9} {'frenteX':>8} {'frenteY':>8} "
          f"{'trasX':>7} {'trasY':>7} {'chao':>6}")
    for papel in POSE:
        for lado in LADOS:
            origem = FOLHAS / f"{papel}_{lado}.png"
            if not origem.exists():
                raise SystemExit(f"falta {origem}")
            peca = dz.na_moldura(dz.contorno(dz.sem_fundo(Image.open(origem))), alto)
            peca.save(DESTINO / f"XB_Entregador_{POSE[papel]}_{lado}.webp",
                      "WEBP", quality=86, method=6)

            caixa = peca.getbbox() or (0, 0, peca.width, peca.height)
            chao = caixa[3] / peca.height * 100
            esq = caixa[0] / peca.width * 100
            dir_ = caixa[2] / peca.width * 100
            um = esq + (dir_ - esq) * 0.30
            outro = esq + (dir_ - esq) * 0.70
            # A mancha "da frente" e a maior, e fica do lado onde a acao
            # acontece — para onde a encomenda vai.
            fx, tx = (outro, um) if lado == "direita" else (um, outro)
            fy = ty = chao

            print(f"{papel:>8} {lado:>9} {fx:8.1f} {fy:8.1f} {tx:7.1f} "
                  f"{ty:7.1f} {chao:5.1f}%")
            cenas.append({"papel": papel, "lado": lado,
                          "frenteX": round(fx, 1), "frenteY": round(fy, 1),
                          "trasX": round(tx, 1), "trasY": round(ty, 1),
                          "chaoY": round(chao, 1)})

    LISTA.write_text(json.dumps({
        "nota": ("Gerado por scripts/entregador/cenas_paradas.py. Sao as cenas "
                 "em que o menino esta fora da bicicleta, na porta do lugar: "
                 "'entrega' e estender a encomenda, 'coleta' e guarda-la na "
                 "mochila. O lado e o de quem olha, e sai do traco da caminhada. "
                 "frenteX/Y e trasX/Y sao os dois apoios no chao, em porcentagem "
                 "da moldura; chaoY e a linha do chao, onde o corte e reto."),
        "cenas": cenas,
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"\nlista: {LISTA.relative_to(RAIZ)}")


if __name__ == "__main__":
    main()
