import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[glint] Sidepanel error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen items-center justify-center p-6 text-center">
          <div>
            <p className="text-lg font-semibold text-foreground">Something went wrong</p>
            <p className="mt-1 text-sm text-muted-foreground">Try reloading the sidepanel.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
