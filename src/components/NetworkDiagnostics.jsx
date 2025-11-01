import React, { useState, useEffect } from 'react';

const NetworkDiagnostics = () => {
  const [diagnostics, setDiagnostics] = useState({
    browser: 'Unknown',
    platform: 'Unknown',
    online: false,
    localStorage: false,
    sessionStorage: false,
    cookies: false,
    apiConnection: 'Untested'
  });
  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (test, status, message) => {
    setTestResults(prev => [...prev, {
      test,
      status,
      message,
      timestamp: new Date().toISOString()
    }]);
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setTestResults([]);
    addResult('Starting diagnostics', 'info', 'Beginning comprehensive network and browser tests...');

    // 1. Browser Detection
    const browserInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      isBrave: !!(navigator.brave && navigator.brave.isBrave)
    };

    addResult('Browser Detection', 'info', JSON.stringify(browserInfo, null, 2));

    // 2. Storage Tests
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
      addResult('localStorage', 'success', 'localStorage is working');
    } catch (error) {
      addResult('localStorage', 'error', `localStorage failed: ${error.message}`);
    }

    try {
      sessionStorage.setItem('test', 'test');
      sessionStorage.removeItem('test');
      addResult('sessionStorage', 'success', 'sessionStorage is working');
    } catch (error) {
      addResult('sessionStorage', 'error', `sessionStorage failed: ${error.message}`);
    }

    // 3. Network Connection Test
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://constant-lists-api.onrender.com';
      addResult('API URL', 'info', `Testing connection to: ${apiUrl}`);

      const response = await fetch(`${apiUrl}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'omit' // Don't send cookies for this test
      });

      if (response.ok) {
        const data = await response.text();
        addResult('API Connection', 'success', `Server responded: ${response.status} - ${data}`);
      } else {
        addResult('API Connection', 'warning', `Server responded with ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      addResult('API Connection', 'error', `Network error: ${error.message}`);
    }

    // 4. Authentication Test
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://constant-lists-api.onrender.com';
      
      addResult('Auth Test', 'info', 'Testing authentication endpoint...');
      
      const response = await fetch(`${apiUrl}/api/auth/debug-users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        addResult('Auth Endpoint', 'success', `Auth endpoint accessible. Users in DB: ${data.users?.length || 0}`);
      } else {
        addResult('Auth Endpoint', 'warning', `Auth endpoint responded with ${response.status}`);
      }
    } catch (error) {
      addResult('Auth Endpoint', 'error', `Auth endpoint error: ${error.message}`);
    }

    // 5. CORS Test
    try {
      addResult('CORS Test', 'info', 'Testing CORS policy...');
      
      const apiUrl = import.meta.env.VITE_API_URL || 'https://constant-lists-api.onrender.com';
      const response = await fetch(`${apiUrl}/api/health`, {
        method: 'OPTIONS'
      });
      
      addResult('CORS Test', 'success', 'CORS preflight successful');
    } catch (error) {
      addResult('CORS Test', 'error', `CORS error: ${error.message}`);
    }

    // 6. Connection Quality Test
    if (navigator.connection) {
      const conn = navigator.connection;
      addResult('Connection Quality', 'info', JSON.stringify({
        effectiveType: conn.effectiveType,
        downlink: conn.downlink,
        rtt: conn.rtt,
        saveData: conn.saveData
      }, null, 2));
    } else {
      addResult('Connection Quality', 'warning', 'Connection API not available');
    }

    setIsRunning(false);
    addResult('Diagnostics Complete', 'success', 'All tests completed. Share these results with support.');
  };

  const exportResults = () => {
    const results = {
      timestamp: new Date().toISOString(),
      browser: navigator.userAgent,
      platform: navigator.platform,
      tests: testResults
    };
    
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `network-diagnostics-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🔧 Network Diagnostics</h1>
      <p>This page helps diagnose login and network issues, especially for Windows 11/Brave browser users.</p>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={runDiagnostics}
          disabled={isRunning}
          style={{
            padding: '10px 20px',
            backgroundColor: isRunning ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            marginRight: '10px'
          }}
        >
          {isRunning ? 'Running Tests...' : 'Run Diagnostics'}
        </button>
        
        {testResults.length > 0 && (
          <button 
            onClick={exportResults}
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Export Results
          </button>
        )}
      </div>

      {testResults.length > 0 && (
        <div style={{ 
          backgroundColor: '#f8f9fa', 
          border: '1px solid #dee2e6', 
          borderRadius: '4px',
          padding: '20px',
          maxHeight: '600px',
          overflowY: 'auto'
        }}>
          <h3>Test Results:</h3>
          {testResults.map((result, index) => (
            <div 
              key={index}
              style={{
                padding: '10px',
                marginBottom: '10px',
                borderLeft: `4px solid ${
                  result.status === 'success' ? '#28a745' :
                  result.status === 'error' ? '#dc3545' :
                  result.status === 'warning' ? '#ffc107' : '#17a2b8'
                }`,
                backgroundColor: 'white',
                borderRadius: '0 4px 4px 0'
              }}
            >
              <div style={{ 
                fontWeight: 'bold', 
                color: result.status === 'success' ? '#155724' :
                      result.status === 'error' ? '#721c24' :
                      result.status === 'warning' ? '#856404' : '#0c5460'
              }}>
                {result.test}
              </div>
              <div style={{ 
                marginTop: '5px', 
                fontSize: '14px',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap'
              }}>
                {result.message}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '30px' }}>
        <h3>Manual Steps for Brave Browser:</h3>
        <ol>
          <li><strong>Disable Shields:</strong> Click the Brave shield icon and turn off "Shields"</li>
          <li><strong>Allow All Cookies:</strong> Settings → Privacy → Cookies → "Allow all cookies"</li>
          <li><strong>Disable Strict Site Isolation:</strong> brave://flags/#site-isolation-trial-opt-out → "Disabled"</li>
          <li><strong>Clear Site Data:</strong> Settings → Additional Settings → Privacy → Clear browsing data</li>
          <li><strong>Try Incognito Mode:</strong> Open the site in a private window</li>
        </ol>
      </div>
    </div>
  );
};

export default NetworkDiagnostics;