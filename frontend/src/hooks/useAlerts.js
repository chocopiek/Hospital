import { useState, useCallback } from 'react';

export function useAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const addAlert = useCallback((alertData) => {
    const newAlert = {
      id: `${Date.now()}-${Math.random()}`,
      ...alertData,
      timestamp: new Date().toISOString(),
    };

    setAlerts((prev) => [newAlert, ...prev]);
    setUnreadCount((prev) => prev + 1);

    // Auto-remove after 8 seconds
    setTimeout(() => {
      setAlerts((prev) => prev.filter((a) => a.id !== newAlert.id));
    }, 8000);

    return newAlert.id;
  }, []);

  const dismissAlert = useCallback((alertId) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const updateUnreadCount = useCallback((count) => {
    setUnreadCount(count);
  }, []);

  return {
    alerts,
    unreadCount,
    addAlert,
    dismissAlert,
    updateUnreadCount,
  };
}

export default useAlerts;
