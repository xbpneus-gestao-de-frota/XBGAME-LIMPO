/**
 * OS MORADORES NA PORTA DE CASA.
 *
 * Ordem dele, 13/09/2026: "coloque um morador na frente de sua casa, e vamos
 * começar a dar vida maior ao game, aplique morador bem pequeno, quando for
 * aumentado zoom dê pra ver".
 *
 * ── O QUE ESTA PEÇA FAZ, E O QUE ELA NÃO FAZ ──────────────────────────────
 *
 * Ela põe cada morador desenhado em pé na porta da sua própria casa. Não anda,
 * não acena, não pisca: é presença, não animação. Vinte e quatro horas por dia
 * a Dona Marlene está na porta da casa 6 — e é justamente por não se mexer que
 * ela não disputa atenção com o entregador, que é a única coisa que a pessoa
 * precisa achar de longe.
 *
 * ── O TAMANHO, E POR QUE ELE NÃO TEM PISO ─────────────────────────────────
 *
 * "Bem pequeno, quando for aumentado zoom dê pra ver."
 *
 * O garoto da praça e o entregador encolhem pela RAIZ do zoom e ainda têm um
 * tamanho mínimo de tela, para nunca sumirem. O morador encolhe pela mesma raiz
 * e NÃO tem mínimo: de longe ele é um pontinho na calçada, e de perto ele é uma
 * pessoa. É essa a diferença entre cenário e peça de jogo, e é exatamente o que
 * ele pediu.
 *
 * ── ELES VÊM ANTES DA LUZ ─────────────────────────────────────────────────
 *
 * Como o garoto e a mala. Pintados depois das camadas de luz, ficariam com a
 * cor do meio-dia enquanto o bairro inteiro entardece — que é o defeito que faz
 * um desenho parecer COLADO por cima do outro. Aqui eles escurecem junto com o
 * telhado que está atrás deles, porque estão dentro do mesmo ar.
 *
 * Quem chama esta peça é a tela do mapa, e é lá que fica a chave de ligar.
 */
import { ALTURA_DO_MORADOR, MORADORES_NA_RUA } from "@/game/osMoradoresNaRua";

export default function MoradoresNaPorta() {
  return (
    <>
      {MORADORES_NA_RUA.map((m) => (
        <div
          key={m.id}
          className="morador"
          style={{
            left: `${m.em.x}%`,
            top: `${m.em.y}%`,
            ["--morador-altura" as string]: `${ALTURA_DO_MORADOR}%`,
          }}
          aria-hidden="true"
        >
          {/*
            Pendurado pelo PÉ, como o garoto: o desenho é recortado rente ao
            contorno, então a linha de baixo dele é a sola do sapato — e o ponto
            do mapa é onde ele pisa, que aqui é a soleira da própria casa.
          */}
          <img className="morador__desenho" src={m.corpo} alt="" draggable={false} />
        </div>
      ))}
    </>
  );
}
