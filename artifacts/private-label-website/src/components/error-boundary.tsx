import {
  Component,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import { createDiagnostic, reportDiagnostic, type SafeDiagnostic } from '@/lib/error-diagnostics';

export interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
  diagnostic: SafeDiagnostic;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  FallbackComponent?: ComponentType<ErrorFallbackProps>;
  /** Changing this clears a caught error. Pass the route to recover on navigation. */
  resetKey?: unknown;
}

interface ErrorBoundaryState {
  diagnostic: SafeDiagnostic | null;
}

function DefaultFallback({ diagnostic, resetError }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-lg w-full text-center">
        <h1 className="text-xl font-semibold text-gray-900">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          This part of the app hit an error. The rest of the app is still
          running.
        </p>
        <p className="mt-4 break-all text-xs text-gray-500" data-testid="safe-error-diagnostic">
          Reference: {diagnostic.errorId}<br />
          Category: {diagnostic.category}<br />
          Build: {diagnostic.buildId}
        </p>
        <button
          type="button"
          onClick={resetError}
          className="mt-4 rounded bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { diagnostic: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { diagnostic: createDiagnostic(error) };
  }

  componentDidCatch(_error: unknown, _info: ErrorInfo): void {
    if (this.state.diagnostic) reportDiagnostic(this.state.diagnostic);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (
      this.state.diagnostic !== null &&
      prevProps.resetKey !== this.props.resetKey
    ) {
      this.resetError();
    }
  }

  resetError = (): void => {
    this.setState({ diagnostic: null });
  };

  retry = (): void => {
    // A fresh document clears cached malformed query data that can immediately
    // crash again before a remounted query has a chance to refetch.
    window.location.reload();
  };

  render(): ReactNode {
    const { diagnostic } = this.state;
    if (diagnostic === null) {
      return this.props.children;
    }
    const Fallback = this.props.FallbackComponent ?? DefaultFallback;
    return <Fallback error={new Error("The website could not render.")} diagnostic={diagnostic} resetError={this.retry} />;
  }
}
