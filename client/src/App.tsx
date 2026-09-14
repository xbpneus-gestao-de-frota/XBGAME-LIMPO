/**
 * Direção visual: o aplicativo inteiro é o jogo. Nenhum chrome externo compete
 * com a experiência Pit Lane Industrial em tela cheia.
 */
import ErrorBoundary from "./components/ErrorBoundary";
import GameCanvas from "./components/GameCanvas";
import TelaDeRecarga from "./components/TelaDeRecarga";

export default function App() {
  return (
    <ErrorBoundary>
      <GameCanvas />
      {/*
       * O DESCANSO DO CELULAR FICA POR CIMA DE TUDO, e por isso mora aqui e
       * nao dentro do aplicativo: dentro dele bastaria voltar ao mapa para
       * continuar jogando com a bateria morta.
       */}
      <TelaDeRecarga />
    </ErrorBoundary>
  );
}
