import { useEffect, useState, useRef } from 'react';
import { supabase, subscribeToChanges } from '../lib/supabase';

let isSupabaseConnected = false;
const eventListeners = {};

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const subscriptionsRef = useRef([]);

  useEffect(() => {
    if (isSupabaseConnected) {
      setIsConnected(true);
      return;
    }

    // Initialize Supabase subscriptions
    isSupabaseConnected = true;
    setIsConnected(true);

    // Subscribe to vitals table changes
    const unsubscribeVitals = subscribeToChanges('vitals', (eventType, newData, oldData) => {
      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        if (eventListeners['new_vitals']) {
          eventListeners['new_vitals'].forEach((cb) => cb(newData));
        }
      }
    });

    // Subscribe to alerts table changes
    const unsubscribeAlerts = subscribeToChanges('alerts', (eventType, newData, oldData) => {
      if (eventType === 'INSERT') {
        if (eventListeners['new_alert']) {
          eventListeners['new_alert'].forEach((cb) => cb(newData));
        }
      } else if (eventType === 'UPDATE' && newData.acknowledged && !oldData.acknowledged) {
        if (eventListeners['alert_acknowledged']) {
          eventListeners['alert_acknowledged'].forEach((cb) => cb(newData));
        }
      }
    });

    subscriptionsRef.current = [unsubscribeVitals, unsubscribeAlerts];

    return () => {
      // Clean up subscriptions on unmount
      subscriptionsRef.current.forEach((unsub) => unsub?.());
    };
  }, []);

  /**
   * Register event listener
   * @param {string} event - Event name (new_vitals, new_alert, alert_acknowledged)
   * @param {function} callback - Callback function
   * @returns {function} Unsubscribe function
   */
  const on = (event, callback) => {
    if (!eventListeners[event]) {
      eventListeners[event] = [];
    }
    eventListeners[event].push(callback);

    return () => {
      eventListeners[event] = eventListeners[event].filter((cb) => cb !== callback);
    };
  };

  /**
   * Emit event (no-op for Supabase, kept for compatibility)
   */
  const emit = (event, data) => {
    // With Supabase Realtime, we don't emit from frontend
    // The backend API routes trigger database changes which Realtime broadcasts
    console.debug(`Event "${event}" would trigger API call in Supabase architecture`);
  };

  return { supabase, isConnected, on, emit };
}

export default useSocket;
