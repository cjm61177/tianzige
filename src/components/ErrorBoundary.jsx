import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: 24,
            textAlign: 'center',
            color: 'var(--text-secondary)',
            background: 'var(--surface)',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow)',
          }}
        >
          <p>组件加载出错，请刷新页面重试</p>
          {this.props.fallback || null}
        </div>
      );
    }

    return this.props.children;
  }
}
