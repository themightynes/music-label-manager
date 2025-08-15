import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: (error: Error) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error);
      }

      return (
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="bg-gray-900 p-8 rounded-lg border border-red-500 max-w-md">
            <h2 className="text-xl font-bold text-red-500 mb-4">Something went wrong</h2>
            <p className="text-gray-300 mb-4">
              An unexpected error occurred. Please refresh the page and try again.
            </p>
            <details className="text-sm text-gray-400">
              <summary className="cursor-pointer">Error details</summary>
              <pre className="mt-2 p-2 bg-gray-800 rounded overflow-auto">
                {this.state.error.message}
              </pre>
            </details>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 bg-yellow-500 text-black px-4 py-2 rounded hover:bg-yellow-600"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}