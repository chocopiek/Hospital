import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { ToastContainer } from './components/Toast';
import useSocket from './hooks/useSocket';
import useAlerts from './hooks/useAlerts';
import Dashboard from './pages/Dashboard';
import BedDetail from './pages/BedDetail';
import Alerts from './pages/Alerts';
import Settings from './pages/Settings';
import './App.css';

function App() {
  const { on } = useSocket();
  const { alerts, unreadCount, addAlert, dismissAlert, updateUnreadCount } = useAlerts();
  const [navigateToAlerts, setNavigateToAlerts] = useState(false);

  useEffect(() => {
    // Listen for new vitals
    const unsubscribeVitals = on('new_vitals', (data) => {
      // Vitals can be used for dashboard updates
      console.log('New vitals:', data);
    });

    // Listen for new alerts
    const unsubscribeAlerts = on('new_alert', (data) => {
      addAlert({
        type: data.type,
        message: data.message,
        device_id: data.device_id,
        building: data.building,
        floor: data.floor,
        room: data.room,
        bed: data.bed,
      });
    });

    // Listen for alert acknowledgment
    const unsubscribeAck = on('alert_acknowledged', (data) => {
      updateUnreadCount(data.unreadCount);
    });

    return () => {
      unsubscribeVitals();
      unsubscribeAlerts();
      unsubscribeAck();
    };
  }, [on, addAlert, updateUnreadCount]);

  const handleNotificationClick = () => {
    setNavigateToAlerts(true);
  };

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-gray-100">
        <Sidebar unreadAlertCount={unreadCount} />

        <div className="flex-1 flex flex-col overflow-hidden">
          <Header unreadAlertCount={unreadCount} onNotificationClick={handleNotificationClick} />

          <main className="flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<Dashboard navigateToAlerts={navigateToAlerts} onNavigateReset={() => setNavigateToAlerts(false)} />} />
              <Route path="/bed/:device_id" element={<BedDetail />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>

        <ToastContainer alerts={alerts} onDismiss={dismissAlert} />
      </div>
    </BrowserRouter>
  );
}

export default App;
