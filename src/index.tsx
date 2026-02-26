import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';
import App from './App';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: Error; errorInfo?: React.ErrorInfo }> {
  state = { hasError: false, error: undefined as Error | undefined, errorInfo: undefined as React.ErrorInfo | undefined };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    this.setState({ errorInfo });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', background: '#050505', color: '#06e8f9', padding: '2rem', fontFamily: 'monospace' }}>
          <h1 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Yükleme hatası</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>{this.state.error?.message ?? 'Bilinmeyen hata'}</p>
          <pre style={{ marginTop: '1rem', color: '#f87171', fontSize: '0.7rem', whiteSpace: 'pre-wrap', maxHeight: '300px', overflow: 'auto', background: '#111', padding: '1rem', borderRadius: '0.5rem' }}>
            {this.state.error?.stack ?? ''}
          </pre>
          <pre style={{ marginTop: '0.5rem', color: '#facc15', fontSize: '0.7rem', whiteSpace: 'pre-wrap', maxHeight: '200px', overflow: 'auto', background: '#111', padding: '1rem', borderRadius: '0.5rem' }}>
            {this.state.errorInfo?.componentStack ?? ''}
          </pre>
          <p style={{ marginTop: '1rem', color: '#64748b', fontSize: '0.75rem' }}>Konsolu (F12) kontrol edin veya npm run dev ile yeniden başlatın.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
