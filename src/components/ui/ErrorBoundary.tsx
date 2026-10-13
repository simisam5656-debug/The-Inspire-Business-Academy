import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F2F5FF] flex items-center justify-center p-4 text-[#0F1F5C]">
          <div className="max-w-md w-full bg-white rounded-2xl p-6 sm:p-8 border border-red-200 shadow-lg text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 border border-red-100">
              <AlertCircle className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-bold font-display text-red-900 mb-2">
              Koi Kharabi Pesh Aai / Unexpected Error
            </h2>

            <p className="text-xs sm:text-sm text-[#0F1F5C]/75 leading-relaxed mb-6">
              A temporary application issue occurred. Your data is safe. Please refresh or return to the academy homepage.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                variant="primary"
                size="sm"
                onClick={this.handleReset}
                leftIcon={<Home className="w-4 h-4" />}
              >
                Return to Home
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                leftIcon={<RotateCcw className="w-4 h-4" />}
              >
                Refresh Page
              </Button>
            </div>

            {this.state.error && (
              <details className="mt-6 text-left border-t border-slate-200 pt-3">
                <summary className="text-[11px] text-slate-500 font-mono cursor-pointer hover:text-slate-800">
                  Developer Error Details
                </summary>
                <pre className="mt-2 p-2 bg-slate-900 text-red-300 text-[10px] font-mono rounded overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {this.state.error.toString()}
                  {this.state.error.stack ? `\n\n${this.state.error.stack}` : ''}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
