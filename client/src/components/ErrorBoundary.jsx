import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('KStore crashed:', error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center px-6">
          <div className="max-w-xl w-full card p-7 ring-rust/30">
            <h1 className="font-serif text-2xl text-rust mb-2">Something broke</h1>
            <p className="text-sm text-slate mb-4">
              An error stopped the page from rendering. The details below are also in your
              browser console (F12 → Console) — copy them back to Claude to get this fixed.
            </p>
            <pre className="text-xs bg-paper rounded-md p-3 overflow-auto whitespace-pre-wrap text-ink">
              {this.state.error.message}
              {'\n\n'}
              {this.state.error.stack}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary mt-4"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
