import React, { useState } from 'react';
import { Check, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

export function AlertRow({ alert, onAcknowledge }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleAcknowledge = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/alerts/${alert.id}/acknowledge`);
      if (onAcknowledge) {
        onAcknowledge(alert.id, response.data.unreadCount);
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getIcon = () => {
    switch (alert.type) {
      case 'CRITICAL':
        return <AlertTriangle className="w-5 h-5" />;
      case 'WARNING':
        return <AlertCircle className="w-5 h-5" />;
      case 'INFO':
        return <Info className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getIconColor = () => {
    switch (alert.type) {
      case 'CRITICAL':
        return 'text-red-600';
      case 'WARNING':
        return 'text-yellow-600';
      case 'INFO':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getRowColor = () => {
    if (alert.acknowledged) return 'bg-gray-50';
    
    switch (alert.type) {
      case 'CRITICAL':
        return 'bg-red-50';
      case 'WARNING':
        return 'bg-yellow-50';
      case 'INFO':
        return 'bg-blue-50';
      default:
        return 'bg-white';
    }
  };

  const getStatusBadgeColor = () => {
    switch (alert.type) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800';
      case 'WARNING':
        return 'bg-yellow-100 text-yellow-800';
      case 'INFO':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <tr className={`border-b border-gray-200 hover:bg-opacity-75 transition-colors ${getRowColor()}`}>
      {/* Icon */}
      <td className="px-6 py-4">
        <div className={getIconColor()}>{getIcon()}</div>
      </td>

      {/* Type Badge */}
      <td className="px-6 py-4">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor()}`}>
          {alert.type}
        </span>
      </td>

      {/* Message */}
      <td className="px-6 py-4">
        <p className="text-sm font-medium text-gray-900">{alert.message}</p>
      </td>

      {/* Location */}
      <td className="px-6 py-4">
        {alert.device ? (
          <p className="text-sm text-gray-600">
            B{alert.device.building} - F{alert.device.floor} - R{alert.device.room} - Bed {alert.device.bed}
          </p>
        ) : (
          <p className="text-sm text-gray-500">{alert.device_id}</p>
        )}
      </td>

      {/* Time */}
      <td className="px-6 py-4">
        <p className="text-sm text-gray-600">{formatTime(alert.created_at)}</p>
      </td>

      {/* Status */}
      <td className="px-6 py-4">
        {alert.acknowledged ? (
          <span className="text-xs font-semibold text-gray-500">Acknowledged</span>
        ) : (
          <span className="text-xs font-semibold text-orange-600">Unread</span>
        )}
      </td>

      {/* Action */}
      <td className="px-6 py-4">
        {!alert.acknowledged && (
          <button
            onClick={handleAcknowledge}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
          >
            <Check className="w-4 h-4" />
            {isLoading ? 'Acknowledging...' : 'Acknowledge'}
          </button>
        )}
      </td>
    </tr>
  );
}

export default AlertRow;
