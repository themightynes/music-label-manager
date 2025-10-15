import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: (error: Error) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    retryCount: 0
  };

  public static getDerivedStateFromError(error: Error): State {
    return { 
      hasError: true, 
      error,
      errorInfo: null,
      retryCount: 0
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.setState({ errorInfo });
    
    // Check if it's a database error and auto-retry once
    const isDatabaseError = error.message?.toLowerCase().includes('database') ||
                          error.message?.toLowerCase().includes('connection') ||
                          error.message?.toLowerCase().includes('unavailable');
    
    if (isDatabaseError && this.state.retryCount < 1) {
      setTimeout(() => {
        console.log('Auto-retrying after database error...');
        this.setState(prevState => ({ 
          hasError: false, 
          error: null,
          errorInfo: null,
          retryCount: prevState.retryCount + 1 
        }));
      }, 3000); // Auto-retry after 3 seconds
    }
  }

  private handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null,
      errorInfo: null,
      retryCount: this.state.retryCount + 1
    });
  };

  public render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error);
      }

      const isDatabaseError = this.state.error.message?.toLowerCase().includes('database') ||
                            this.state.error.message?.toLowerCase().includes('connection') ||
                            this.state.error.message?.toLowerCase().includes('unavailable');

      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
          <div className="bg-gray-900 p-8 rounded-lg border border-red-500 max-w-md">
            <h2 className="text-xl font-bold text-red-500 mb-4">
              {isDatabaseError ? 'Database Connection Issue' : 'Something went wrong'}
            </h2>
            <p className="text-gray-300 mb-4">
              {isDatabaseError 
                ? 'We\'re having trouble connecting to the database. This is usually temporary and will resolve itself shortly.'
                : 'An unexpected error occurred. Please refresh the page and try again.'}
            </p>
            
            {isDatabaseError && this.state.retryCount === 0 && (
              <p className="text-yellow-500 text-sm mb-4">
                Auto-retrying in a moment...
              </p>
            )}
            
            {process.env.NODE_ENV === 'development' && (
              <details className="text-sm text-gray-400 mb-4">
                <summary className="cursor-pointer">Error details</summary>
                <pre className="mt-2 p-2 bg-gray-800 rounded overflow-auto text-xs">
                  {this.state.error.message}
                  {this.state.errorInfo && (
                    <>
                      {'\n\n'}Component Stack:
                      {this.state.errorInfo.componentStack}
                    </>
                  )}
                </pre>
              </details>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={this.handleRetry}
                className="bg-yellow-500 text-black px-4 py-2 rounded hover:bg-yellow-600 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/game'}
                className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}