import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ERROR BOUNDARY] Caught error:');
    console.error(error);
    console.error('[ERROR BOUNDARY] Error info:');
    console.error(errorInfo);
    
    // Check if it's a forEach error
    if (error && error.message && error.message.includes('forEach')) {
      console.error('[ERROR BOUNDARY] forEach error detected!');
      console.error('[ERROR BOUNDARY] Error stack:', error.stack);
    }

    this.setState({
      error: error,
      errorInfo: errorInfo || null
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', backgroundColor: '#fee', border: '1px solid #faa' }}>
          <h2>Something went wrong.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            <summary>Error details</summary>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
          <button 
            onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
            style={{ marginTop: '10px', padding: '5px 10px' }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
