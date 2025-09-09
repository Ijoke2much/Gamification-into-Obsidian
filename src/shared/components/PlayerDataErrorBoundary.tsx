import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class PlayerDataErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('PlayerDataErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          padding: '20px',
          border: '2px solid var(--background-modifier-error)',
          borderRadius: '8px',
          backgroundColor: 'var(--background-secondary)',
          color: 'var(--text-error)',
          textAlign: 'center'
        }}>
          <h3>⚠️ Player Data Error</h3>
          <p>Something went wrong while loading player data.</p>
          <p style={{ fontSize: '0.8em', opacity: 0.7 }}>
            {this.state.error?.message || 'Unknown error'}
          </p>
          <button 
            style={{
              marginTop: '10px',
              padding: '8px 16px',
              backgroundColor: 'var(--interactive-accent)',
              color: 'var(--text-on-accent)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
            onClick={() => {
              this.setState({ hasError: false, error: undefined });
              window.location.reload();
            }}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for functional components to handle player data errors
export function usePlayerDataErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = React.useCallback((error: Error) => {
    console.error('Player data error:', error);
    setError(error);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  const retry = React.useCallback(() => {
    clearError();
    // Trigger player store refresh
    import('../state/playerStore').then(({ playerStore }) => {
      playerStore.refreshPlayerData().catch(handleError);
    });
  }, [clearError, handleError]);

  return { error, handleError, clearError, retry };
}
