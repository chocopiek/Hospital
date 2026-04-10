import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export function VitalCard({ 
  title, 
  value, 
  unit, 
  icon: Icon, 
  status = 'normal',
  trend = null,
  details = null
}) {
  const getStatusColor = () => {
    switch (status) {
      case 'critical':
        return 'bg-red-50 border-red-300';
      case 'warning':
        return 'bg-yellow-50 border-yellow-300';
      default:
        return 'bg-green-50 border-green-300';
    }
  };

  const getTextColor = () => {
    switch (status) {
      case 'critical':
        return 'text-red-700';
      case 'warning':
        return 'text-yellow-700';
      default:
        return 'text-green-700';
    }
  };

  return (
    <div className={`rounded-lg border-2 p-6 ${getStatusColor()}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        {Icon && <Icon className={`w-5 h-5 ${getTextColor()}`} />}
      </div>

      <div className="mb-4">
        <p className={`text-4xl font-bold ${getTextColor()}`}>
          {typeof value === 'number' ? value.toFixed(1) : value}
        </p>
        <p className="text-sm text-gray-600">{unit}</p>
      </div>

      {(trend || details) && (
        <div className="space-y-2 text-xs">
          {trend && (
            <div className="flex items-center gap-1 text-gray-600">
              {trend > 0 ? (
                <TrendingUp className="w-4 h-4 text-orange-500" />
              ) : trend < 0 ? (
                <TrendingDown className="w-4 h-4 text-blue-500" />
              ) : null}
              <span>
                {trend > 0 ? '+' : ''}{trend}% from last hour
              </span>
            </div>
          )}
          {details && (
            <p className="text-gray-600">
              {details}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default VitalCard;
