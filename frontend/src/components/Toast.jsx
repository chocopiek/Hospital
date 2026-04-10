import React, { useEffect } from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle, X } from 'lucide-react';

export function Toast({ alert, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const getIcon = () => {
    switch (alert.type) {
      case 'CRITICAL':
        return <AlertTriangle className="w-5 h-5" />;
      case 'WARNING':
        return <AlertCircle className="w-5 h-5" />;
      case 'INFO':
        return <Info className="w-5 h-5" />;
      default:
        return <CheckCircle className="w-5 h-5" />;
    }
  };

  const getStyles = () => {
    switch (alert.type) {
      case 'CRITICAL':
        return 'bg-red-50 border-red-200 text-red-900';
      case 'WARNING':
        return 'bg-yellow-50 border-yellow-200 text-yellow-900';
      case 'INFO':
        return 'bg-blue-50 border-blue-200 text-blue-900';
      default:
        return 'bg-green-50 border-green-200 text-green-900';
    }
  };

  const getIconColor = () => {
    switch (alert.type) {
      case 'CRITICAL':
        return 'text-red-500';
      case 'WARNING':
        return 'text-yellow-500';
      case 'INFO':
        return 'text-blue-500';
      default:
        return 'text-green-500';
    }
  };

  return (
    <div className={`toast-enter border rounded-lg p-4 mb-3 max-w-md ${getStyles()}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={getIconColor()}>{getIcon()}</div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm">{alert.type}</h3>
            <p className="text-sm mt-1">{alert.message}</p>
            {alert.device_id && (
              <p className="text-xs mt-2 opacity-75">
                Building {alert.building} - Floor {alert.floor} - Room {alert.room} - Bed {alert.bed}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export function ToastContainer({ alerts, onDismiss }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {alerts.map((alert) => (
        <Toast
          key={alert.id}
          alert={alert}
          onDismiss={() => onDismiss(alert.id)}
        />
      ))}
    </div>
  );
}

export default Toast;
