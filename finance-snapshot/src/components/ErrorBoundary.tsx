import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Class-based error boundary — catches render errors in the child tree.
 * Use to isolate unstable subtrees (charts, third-party components).
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Caught render error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div
          style={{
            padding: '24px',
            color: 'var(--color-danger)',
            background: '#fff1f2',
            border: '1px solid #fecdd3',
            borderRadius: 'var(--radius)',
            fontSize: 14,
          }}
        >
          Something went wrong rendering this section.
        </div>
      );
    }
    return this.props.children;
  }
}
