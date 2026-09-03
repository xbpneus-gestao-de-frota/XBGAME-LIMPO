# Extrair a malha de ruas de um mapa

O mapa do bairro é um desenho, não uma planta: não há vetor por trás, só
pixels. Este script mede as ruas em cima da imagem e devolve o arquivo que o
jogo lê.

```bash
pip install numpy opencv-python scikit-image scipy networkx pillow
python3 scripts/mapa/extrair_ruas.py <mapa.png> <saida.json> [--conferencia pasta/]
```

Ele grava, além do JSON, duas folhas de conferência: a malha inteira sobre o
mapa e quatro janelas ampliadas em 2x. **Olhe as duas antes de aceitar o
resultado** — a medição é boa, mas o desenho é ambíguo em alguns lugares
(pátio de galpão e calçada larga de praça também são chão de rodar, e entram).

Quando o Fernando entregar o mapa de outra região, é este script que roda de
novo. Nada aqui é específico deste bairro.
