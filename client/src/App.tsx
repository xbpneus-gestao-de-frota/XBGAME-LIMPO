/**
 * Direção visual: o aplicativo inteiro é o jogo. Nenhum chrome externo compete
 * com a experiência Pit Lane Industrial em tela cheia.
 */
import ErrorBoundary from "./components/ErrorBoundary";
import GameCanvas from "./components/GameCanvas";

export default function App() {
  return (
    <ErrorBoundary>
      <GameCanvas />
    </ErrorBoundary>
  );
}
