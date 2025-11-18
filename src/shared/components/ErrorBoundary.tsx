import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Notice } from 'obsidian';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log the error for debugging
    console.error(`[ErrorBoundary${this.props.componentName ? ` - ${this.props.componentName}` : ''}]:`, error, errorInfo);
    
    // Show user-friendly notification
    new Notice(`Something went wrong${this.props.componentName ? ` in ${this.props.componentName}` : ''}. Please check the console for details.`, 5000);
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div style={{
          padding: '20px',
          border: '2px solid var(--color-red)',
          borderRadius: '8px',
          background: 'rgba(244, 67, 54, 0.1)',
          textAlign: 'center',
          margin: '16px'
        }}>
          <div style={{
            fontSize: '24px',
            marginBottom: '12px',
            color: 'var(--color-red)'
          }}>
            ⚠️ Something went wrong
          </div>
          
          <div style={{
            marginBottom: '16px',
            color: 'var(--text-normal)'
          }}>
            {this.props.componentName ? `The ${this.props.componentName} component ` : 'This component '}
            encountered an error and couldn't be displayed.
          </div>
          
          <details style={{
            marginBottom: '16px',
            textAlign: 'left',
            background: 'var(--background-secondary)',
            padding: '12px',
            borderRadius: '4px'
          }}>
            <summary style={{ cursor: 'pointer', marginBottom: '8px', fontWeight: 'bold' }}>
              Error Details
            </summary>
            <div style={{ fontSize: '12px', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
              <strong>Error:</strong> {this.state.error?.message}
              {this.state.errorInfo?.componentStack && (
                <>
                  <br /><br />
                  <strong>Component Stack:</strong>
                  {this.state.errorInfo.componentStack}
                </>
              )}
            </div>
          </details>
          
          <button
            onClick={() => {
              this.setState({ hasError: false, error: undefined, errorInfo: undefined });
            }}
            style={{
              padding: '8px 16px',
              background: 'var(--interactive-accent)',
              color: 'var(--text-on-accent)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier use
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string,
  fallback?: ReactNode
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary 
      componentName={componentName} 
      fallback={fallback}
    >
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Hook for error reporting within functional components
export function useErrorHandler() {
  return (error: Error, errorInfo?: any) => {
    console.error('[Error Handler]:', error, errorInfo);
    new Notice(`An error occurred: ${error.message}`, 5000);
  };
}
