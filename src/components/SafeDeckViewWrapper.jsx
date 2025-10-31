import React from 'react';

class SafeDeckViewWrapper extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      errorCount: 0,
      lastError: null 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[SAFE WRAPPER] Caught DeckViewEdit error:', error);
    console.error('[SAFE WRAPPER] Error info:', errorInfo);
    
    this.setState(prevState => ({
      hasError: true,
      errorCount: prevState.errorCount + 1,
      lastError: error
    }));
    
    // If it's a forEach error, try to force a re-render after a short delay
    if (error.message && error.message.includes('forEach')) {
      console.log('[SAFE WRAPPER] forEach error detected, attempting recovery in 1 second...');
      setTimeout(() => {
        this.setState({ hasError: false });
      }, 1000);
    }
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      errorCount: 0,
      lastError: null 
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#fee', 
          border: '1px solid #faa',
          borderRadius: '8px',
          margin: '20px'
        }}>
          <h2>🛠️ Deck Loading Issue</h2>
          <p>The deck editor encountered a technical issue. This is likely a temporary problem.</p>
          
          <div style={{ marginBottom: '15px' }}>
            <strong>Error Count:</strong> {this.state.errorCount}
          </div>
          
          {this.state.lastError && (
            <details style={{ marginBottom: '15px' }}>
              <summary>Technical Details</summary>
              <pre style={{ 
                background: '#f5f5f5', 
                padding: '10px', 
                fontSize: '12px',
                overflow: 'auto'
              }}>
                {this.state.lastError.message}
                {this.state.lastError.stack && '\n\nStack:\n' + this.state.lastError.stack}
              </pre>
            </details>
          )}
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={this.handleRetry}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: '#007bff', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Try Again
            </button>
            
            <button 
              onClick={() => window.location.reload()}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: '#6c757d', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Refresh Page
            </button>
          </div>
          
          <div style={{ marginTop: '15px', fontSize: '14px', color: '#666' }}>
            <p>💡 <strong>If this keeps happening:</strong></p>
            <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
              <li>Try refreshing the page</li>
              <li>Check your internet connection</li>
              <li>The issue may resolve automatically</li>
            </ul>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default SafeDeckViewWrapper;