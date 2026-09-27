import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button, Result } from 'antd';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Top-level render-error boundary. Without it, any exception thrown during
 * render (e.g. an unexpected API response shape) unmounts the whole React
 * tree and leaves a blank page.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled render error', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <Result
          status="error"
          title="Something went wrong"
          subTitle="This page could not be displayed. Reload to try again; if the problem persists, contact support."
          extra={
            <Button type="primary" onClick={() => window.location.reload()}>
              Reload page
            </Button>
          }
        />
      );
    }
    return this.props.children;
  }
}
