import React, { useState, useEffect } from 'react';
import { Bell, Clock } from 'lucide-react';

export function Header({ unreadAlertCount, onNotificationClick }) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="bg-white border-b border-gray-200 py-4 px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Hospital Monitoring</h2>
      </div>

      <div className="flex items-center gap-6">
        {/* Current Time */}
        <div className="flex items-center gap-2 text-gray-600">
          <Clock className="w-4 h-4" />
          <span className="font-mono text-sm">{formatTime(currentTime)}</span>
        </div>

        {/* Notification Bell */}
        <button
          onClick={onNotificationClick}
          className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <Bell className="w-6 h-6" />
          {unreadAlertCount > 0 && (
            <span className="absolute top-1 right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
              {unreadAlertCount > 99 ? '99+' : unreadAlertCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

export default Header;
