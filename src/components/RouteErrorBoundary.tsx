import { Component, type ReactNode } from "react";

/** Keeps a failed route download from replacing the application shell. */
export default class RouteErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean; offline: boolean }
> {
  state = { failed: false, offline: false };
  private readonly updateConnection = () => {
    if (typeof window !== "undefined") {
      this.setState({ offline: !window.navigator.onLine });
    }
  };

  componentDidMount() {
    if (typeof window === "undefined") return;
    this.updateConnection();
    window.addEventListener("online", this.updateConnection);
    window.addEventListener("offline", this.updateConnection);
  }

  componentWillUnmount() {
    if (typeof window === "undefined") return;
    window.removeEventListener("online", this.updateConnection);
    window.removeEventListener("offline", this.updateConnection);
  }

  componentDidCatch(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const isChunkFailure = /ChunkLoadError|Loading chunk|dynamically imported module|Failed to fetch/i.test(message);
    if (!isChunkFailure || typeof window === 'undefined') return;
    const key = `gestio:chunk-recovery:${window.location.pathname}`;
    try {
      const lastAttempt = Number(window.sessionStorage.getItem(key) || 0);
      if (Number.isFinite(lastAttempt) && Date.now() - lastAttempt < 30_000) return;
      window.sessionStorage.setItem(key, String(Date.now()));
      window.location.reload();
    } catch {
      // Preserve the manual retry UI when storage or reload is unavailable.
    }
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <section role="alert" aria-live="assertive" className="flex min-h-screen items-center justify-center bg-surface p-6">
          <div className="card w-full max-w-lg p-6">
            <h1 autoFocus tabIndex={-1} className="text-lg font-bold text-slate-900">
              Não foi possível abrir esta tela
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {this.state.offline
                ? "Sua conexão parece estar offline. Reconecte-se e atualize a página para tentar novamente."
                : "Verifique sua conexão e atualize a página para tentar novamente."}
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                className="btn-primary w-full sm:w-auto"
                onClick={() => window.location.reload()}
              >
                Atualizar página
              </button>
              <button
                type="button"
                className="btn-secondary w-full sm:w-auto"
                onClick={() => window.location.assign('/')}
              >
                Voltar ao painel
              </button>
            </div>
          </div>
        </section>
      );
    }
    return this.props.children;
  }
}

