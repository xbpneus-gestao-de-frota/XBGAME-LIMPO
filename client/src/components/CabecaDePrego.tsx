/**
 * O CABECA DE PREGO NA PRACINHA — o primeiro vilao, levantando peso.
 *
 * Ordem dele, 14/09/2026, com um risco amarelo por cima da captura do mapa:
 * "bem no ponto amarelo, crie uma animacao do primeiro vilao que
 * apresentaremos cabeca de prego, deixe a animacao rodando neste local pintado
 * de amarelo".
 *
 * ── O QUE ESTA PECA FAZ, E O QUE ELA NAO FAZ ──────────────────────────────
 *
 * Ela poe o vilao no ponto do risco e deixa ele levantando peso, para sempre.
 * Nao anda, nao reage, nao conversa e nao atrapalha entrega nenhuma: por
 * enquanto ele e CENARIO — um sujeito que treina na pracinha e que a pessoa vai
 * passar de bicicleta ao lado dezenas de vezes antes de descobrir quem ele e.
 *
 * E de proposito. Quando o vilao virar jogo, ele ja vai ser um conhecido do
 * bairro em vez de uma novidade que apareceu no dia em que virou obstaculo.
 *
 * ── O RELOGIO NAO ESTA AQUI ───────────────────────────────────────────────
 *
 * Nao ha useState, nao ha useEffect e nao ha setInterval nesta peca, e isso e
 * o ponto: as quatro poses vivem numa tira so e quem troca de pose e o CSS.
 *
 * Um relogio no React custaria um redesenho do mapa inteiro a cada passo —
 * sete por giro, para sempre, com a corrida acontecendo em volta — e
 * continuaria trocando quadro com a aba escondida. O CSS nao faz nem uma coisa
 * nem outra.
 *
 * ── ELE VEM ANTES DA LUZ ──────────────────────────────────────────────────
 *
 * Como o garoto, a mala e os moradores. Pintado depois das camadas de luz, ele
 * ficaria com a cor do meio-dia enquanto o bairro inteiro entardece — que e o
 * defeito que faz um desenho parecer COLADO por cima do outro. Quem chama esta
 * peca e a tela do mapa, e e la que fica a chave de ligar.
 */
import { GAME_ASSETS } from "@/game/assets";
import { ALTURA_DO_QUADRO, ONDE_ELE_TREINA } from "@/game/oCabecaDePrego";

export default function CabecaDePrego() {
  return (
    <div
      className="vilao"
      style={{
        left: `${ONDE_ELE_TREINA.x}%`,
        top: `${ONDE_ELE_TREINA.y}%`,
        ["--vilao-altura" as string]: `${ALTURA_DO_QUADRO}%`,
        ["--vilao-tira" as string]: `url(${GAME_ASSETS.cabecaDePregoTira})`,
      }}
      aria-hidden="true"
    />
  );
}
