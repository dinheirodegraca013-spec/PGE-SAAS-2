import { Component, type ReactNode } from "react";

/** Keeps a failed route download from replacing the application shell. */
export default class RouteErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <section role="alert" className="card p-6">
          <h1 className="text-lg font-bold text-slate-900">
            Não foi possível abrir esta tela
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Verifique sua conexão e atualize a página para tentar novamente.
          </p>
          <button
            type="button"
            className="btn-primary mt-4"
            onClick={() => window.location.reload()}
          >
            Atualizar página
          </button>
        </section>
      );
    }
    return this.props.children;
  }
}
