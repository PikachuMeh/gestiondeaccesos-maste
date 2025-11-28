// src/ErrorBoundary.jsx - ATRAPA ERRORES SILENCIOSOS
import React from 'react';

export default class ErrorBoundary extends React.Component {
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
        <div style={{ padding: '20px', color: 'red', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
          <h1>❌ Error en la aplicación</h1>
          <p>{this.state.error?.toString()}</p>
          <button onClick={() => window.location.reload()}>Recargar</button>
        </div>
      );
    }

    return this.props.children;
  }
}
