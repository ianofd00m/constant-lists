import React, { useState, useEffect } from 'react';

/**
 * Enhanced progress indicator for large collection imports
 * Shows detailed progress across multiple phases with pause/resume capability
 */
export const CollectionImportProgress = ({ 
  isVisible,
  phase = 'preparing', // 'preparing', 'api', 'processing', 'storing', 'complete'
  current = 0,
  total = 0,
  message = '',
  errors = [],
  onPause,
  onResume,
  onCancel,
  isPaused = false,
  canPause = true,
  estimatedTimeRemaining = null,
  storageUsed = null,
  compressionRatio = null
}) => {
  const [startTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!isVisible || isPaused) return;
    
    const timer = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isVisible, isPaused, startTime]);

  if (!isVisible) return null;

  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  const hasErrors = errors && errors.length > 0;

  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const getPhaseDescription = () => {
    switch (phase) {
      case 'preparing': return '🔧 Preparing import...';
      case 'api': return '🌐 Fetching card data from Scryfall...';
      case 'processing': return '⚙️ Processing card information...';
      case 'storing': return '💾 Saving to collection...';
      case 'complete': return '✅ Import complete!';
      default: return '📊 Processing...';
    }
  };

  const getProgressColor = () => {
    if (hasErrors) return 'bg-red-500';
    if (phase === 'complete') return 'bg-green-500';
    if (isPaused) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Collection Import Progress
          </h3>
          {phase !== 'complete' && (
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Cancel import"
            >
              ✖️
            </button>
          )}
        </div>

        {/* Phase Description */}
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">
            {getPhaseDescription()}
          </p>
          {message && (
            <p className="text-xs text-gray-500">{message}</p>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>{current} of {total}</span>
            <span>{percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
          <div>
            <span className="text-gray-500">Elapsed:</span>
            <span className="ml-1 font-mono">{formatTime(elapsedTime)}</span>
          </div>
          {estimatedTimeRemaining && (
            <div>
              <span className="text-gray-500">Remaining:</span>
              <span className="ml-1 font-mono">{formatTime(estimatedTimeRemaining)}</span>
            </div>
          )}
          {storageUsed && (
            <div>
              <span className="text-gray-500">Storage:</span>
              <span className="ml-1 font-mono">{(storageUsed / 1024 / 1024).toFixed(1)}MB</span>
            </div>
          )}
          {compressionRatio && (
            <div>
              <span className="text-gray-500">Compression:</span>
              <span className="ml-1 font-mono">{compressionRatio}%</span>
            </div>
          )}
        </div>

        {/* Error Summary */}
        {hasErrors && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-sm text-red-700 font-medium">
              ⚠️ {errors.length} error(s) encountered
            </p>
            <details className="mt-2">
              <summary className="text-xs text-red-600 cursor-pointer hover:text-red-800">
                View errors
              </summary>
              <div className="mt-2 max-h-24 overflow-y-auto">
                {errors.slice(0, 5).map((error, idx) => (
                  <p key={idx} className="text-xs text-red-600 mb-1">
                    • {error}
                  </p>
                ))}
                {errors.length > 5 && (
                  <p className="text-xs text-red-500 italic">
                    ... and {errors.length - 5} more
                  </p>
                )}
              </div>
            </details>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex justify-end space-x-3">
          {phase !== 'complete' && canPause && (
            <button
              onClick={isPaused ? onResume : onPause}
              className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                isPaused
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-yellow-600 hover:bg-yellow-700 text-white'
              }`}
            >
              {isPaused ? '▶️ Resume' : '⏸️ Pause'}
            </button>
          )}
          {phase === 'complete' && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            >
              Close
            </button>
          )}
        </div>

        {/* Advanced Info */}
        <details className="mt-4">
          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
            Advanced Details
          </summary>
          <div className="mt-2 p-2 bg-gray-50 rounded text-xs space-y-1">
            <div><strong>Phase:</strong> {phase}</div>
            <div><strong>Started:</strong> {new Date(startTime).toLocaleTimeString()}</div>
            <div><strong>Cards Processed:</strong> {current}/{total}</div>
            {isPaused && <div className="text-yellow-600"><strong>Status:</strong> Paused</div>}
            {hasErrors && <div className="text-red-600"><strong>Errors:</strong> {errors.length}</div>}
          </div>
        </details>
      </div>
    </div>
  );
};

export default CollectionImportProgress;