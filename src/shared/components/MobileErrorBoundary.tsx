import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class MobileErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('📱 Mobile Error Boundary caught an error:', error, errorInfo);
    
    // Log mobile-specific error details
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent.toLowerCase());
    if (isMobile) {
      console.error('📱 Mobile Error Details:', {
        userAgent: navigator.userAgent,
        screenSize: { width: window.innerWidth, height: window.innerHeight },
        touchSupport: 'ontouchstart' in window,
        errorMessage: error.message,
        errorStack: error.stack,
        componentStack: errorInfo.componentStack
      });
    }

    this.setState({ error, errorInfo });
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default mobile-friendly error UI
      return (
        <div style={{
          padding: '1rem',
          margin: '1rem',
          backgroundColor: 'var(--background-primary)',
          border: '1px solid var(--background-modifier-border)',
          borderRadius: '8px',
          color: 'var(--text-error)',
          fontSize: '14px',
          lineHeight: '1.4'
        }}>
          <h3 style={{ 
            margin: '0 0 0.5rem 0', 
            color: 'var(--text-error)',
            fontSize: '16px'
          }}>
            📱 Mobile Loading Error
          </h3>
          <p style={{ margin: '0 0 1rem 0' }}>
            The plugin encountered an error on mobile. This is usually temporary.
          </p>
          
          <div style={{ marginBottom: '1rem' }}>
            <button
              onClick={() => {
                console.log('📱 User requested plugin reload');
                // Try to reload the plugin
                try {
                  window.location.reload();
                } catch (reloadError) {
                  console.error('📱 Failed to reload:', reloadError);
                }
              }}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'var(--interactive-accent)',
                color: 'var(--text-on-accent)',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                marginRight: '0.5rem'
              }}
            >
              🔄 Reload Plugin
            </button>
            
            <button
              onClick={() => {
                console.log('📱 User requested error details');
                const errorDetails = {
                  error: this.state.error?.message,
                  stack: this.state.error?.stack,
                  componentStack: this.state.errorInfo?.componentStack,
                  userAgent: navigator.userAgent,
                  timestamp: new Date().toISOString()
                };
                console.log('📱 Error Details:', errorDetails);
                
                // Try to copy to clipboard
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
                    .then(() => console.log('📱 Error details copied to clipboard'))
                    .catch(() => console.log('📱 Failed to copy to clipboard'));
                }
              }}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'var(--background-secondary)',
                color: 'var(--text-normal)',
                border: '1px solid var(--background-modifier-border)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              📋 Copy Error Details
            </button>
          </div>
          
          <details style={{ fontSize: '12px', opacity: 0.8 }}>
            <summary style={{ cursor: 'pointer', marginBottom: '0.5rem' }}>
              Technical Details
            </summary>
            <pre style={{ 
              whiteSpace: 'pre-wrap', 
              wordBreak: 'break-word',
              backgroundColor: 'var(--background-secondary)',
              padding: '0.5rem',
              borderRadius: '4px',
              fontSize: '11px',
              overflow: 'auto',
              maxHeight: '200px'
            }}>
              {this.state.error?.message}
              {'\n\n'}
              {this.state.error?.stack}
            </pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for mobile error handling
export function useMobileErrorHandler() {
  const handleError = (error: Error, context?: string) => {
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent.toLowerCase());
    
    if (isMobile) {
      console.error(`📱 Mobile Error${context ? ` in ${context}` : ''}:`, {
        error: error.message,
        stack: error.stack,
        userAgent: navigator.userAgent,
        screenSize: { width: window.innerWidth, height: window.innerHeight },
        timestamp: new Date().toISOString()
      });
    } else {
      console.error(`Error${context ? ` in ${context}` : ''}:`, error);
    }
  };

  const handleAsyncError = (error: unknown, context?: string) => {
    if (error instanceof Error) {
      handleError(error, context);
    } else {
      const errorObj = new Error(String(error));
      handleError(errorObj, context);
    }
  };

  return { handleError, handleAsyncError };
}
