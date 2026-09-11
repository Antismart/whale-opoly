import React from 'react';
import { LogoMark } from './brand/Logo';

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
        <div
          style={{
            minHeight: '100vh',
            display: 'grid',
            placeItems: 'center',
            padding: 'var(--sp-8, 32px)',
            background: 'var(--bg, #040a15)',
            color: 'var(--text, #e0f2fe)',
          }}
        >
          <div className="empty" style={{ maxWidth: 460 }}>
            <LogoMark size={40} />
            <div className="empty-title">Something went wrong</div>
            <div className="empty-text">
              {this.state.error?.message || 'The table hit an unexpected error. Reloading usually clears it.'}
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            >
              Reload Whaleopoly
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
