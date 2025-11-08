import React from 'react';
import { FiAlertTriangle } from 'react-icons/fi';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
          <div className="max-w-md rounded-lg border border-red-500/20 bg-slate-800 p-8 text-center">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-red-500/10 p-4">
                <FiAlertTriangle className="text-red-500" size={48} />
              </div>
            </div>
            <h2 className="mb-2 text-2xl font-bold text-white">
              Something went wrong
            </h2>
            <p className="mb-4 text-slate-400">
              An error occurred while rendering this component.
            </p>
            {this.state.error && (
              <pre className="mb-4 overflow-auto rounded bg-slate-900 p-4 text-left text-xs text-red-400">
                {this.state.error.toString()}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
