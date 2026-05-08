import React from 'react';
import { Alert } from '@gravity-ui/uikit';

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert
          theme="danger"
          title={this.props.fallbackTitle ?? 'Ошибка компонента'}
          message={this.state.error?.message ?? 'Произошла непредвиденная ошибка'}
        />
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
