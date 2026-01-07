import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorFallback } from './ErrorFallback';
import { captureException, addBreadcrumb } from '@/lib/sentry';
import { logger } from '@/lib/utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component that catches JavaScript errors anywhere in the
 * child component tree, logs those errors, and displays a fallback UI.
 * 
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 * ```
 * 
 * With custom error handler:
 * ```tsx
 * <ErrorBoundary onError={(error, info) => logToService(error, info)}>
 *   <App />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error in development
    logger.error('ErrorBoundary caught an error:', error);
    logger.error('Component stack:', errorInfo.componentStack);
    
    // Call optional error handler prop
    this.props.onError?.(error, errorInfo);
    
    // Send to Sentry in production
    if (!__DEV__) {
      captureException(error, {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
      });
    }
    
    // Add breadcrumb for debugging
    addBreadcrumb(
      `ErrorBoundary caught: ${error.message}`,
      'error',
      { componentStack: errorInfo.componentStack?.slice(0, 500) },
      'error'
    );
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Render custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // Render default error fallback UI
      return (
        <ErrorFallback 
          error={this.state.error} 
          resetError={this.resetError} 
        />
      );
    }

    return this.props.children;
  }
}



