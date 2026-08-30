import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  // Sem este log a pilha do componente se perde e a falha vira apenas tela azul.
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Falha não tratada na interface do XBPNEUS Racing", error);
    console.error("Componente de origem:", info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main
          className="error-screen"
          role="alert"
          aria-labelledby="error-title"
        >
          <section className="error-panel">
            <AlertTriangle size={48} aria-hidden="true" />
            <p className="eyebrow">
              <span>BOX</span> PARADA DE SEGURANÇA
            </p>
            <h1 id="error-title">Não foi possível abrir a operação.</h1>
            <p>
              O jogo encontrou uma falha inesperada. Recarregue a página para
              tentar novamente; seu progresso salvo permanece no dispositivo.
            </p>
            {this.state.error?.message && (
              <pre className="error-detail">{this.state.error.message}</pre>
            )}
            <button
              onClick={() => window.location.reload()}
              className="xb-button xb-button--primary"
              autoFocus
            >
              <RotateCcw size={18} aria-hidden="true" />
              RECARREGAR JOGO
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
