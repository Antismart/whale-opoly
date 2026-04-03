import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{
          padding: 40,
          textAlign: 'center',
          color: '#e0f2fe',
          background: '#040a15',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column' as const,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16
        }}>
          <div style={{ fontSize: 48 }}>&#x1F40B;</div>
          <h2>Something went wrong</h2>
          <p style={{ color: '#7aa2c4' }}>{this.state.error?.message || 'Unexpected error'}</p>
          <button
            onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            style={{
              padding: '10px 20px',
              borderRadius: 10,
              border: '1px solid rgba(14, 165, 233, 0.4)',
              background: 'rgba(14, 165, 233, 0.15)',
              color: '#e0f2fe',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Reload Game
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
