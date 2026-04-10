import React, { useState, useEffect } from 'react';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import axios from 'axios';
import useSocket from '../hooks/useSocket';
import AlertRow from '../components/AlertRow';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const { on } = useSocket();

  useEffect(() => {
    fetchAlerts();
  }, []);

  useEffect(() => {
    const unsubscribeAlert = on('new_alert', () => {
      fetchAlerts();
    });

    const unsubscribeAck = on('alert_acknowledged', () => {
      fetchAlerts();
    });

    return () => {
      unsubscribeAlert();
      unsubscribeAck();
    };
  }, [on]);

  useEffect(() => {
    applyFilter();
  }, [alerts, filter]);

  const fetchAlerts = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_URL}/api/alerts`);
      setAlerts(response.data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      setIsLoading(false);
    }
  };

  const applyFilter = () => {
    let filtered = [...alerts];

    if (filter === 'CRITICAL') {
      filtered = filtered.filter((a) => a.type === 'CRITICAL');
    } else if (filter === 'WARNING') {
      filtered = filtered.filter((a) => a.type === 'WARNING');
    } else if (filter === 'UNREAD') {
      filtered = filtered.filter((a) => !a.acknowledged);
    }

    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    setFilteredAlerts(filtered);
  };

  const handleAcknowledgeAlert = (alertId, unreadCount) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId ? { ...a, acknowledged: 1 } : a
      )
    );
  };

  const stats = {
    total: alerts.length,
    unread: alerts.filter((a) => !a.acknowledged).length,
    critical: alerts.filter((a) => a.type === 'CRITICAL').length,
    warning: alerts.filter((a) => a.type === 'WARNING').length,
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Alerts Center</h1>
        <p className="text-gray-600">Manage and track all device alerts</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500">
          <p className="text-gray-600 text-sm">Total Alerts</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border-l-4 border-orange-500">
          <p className="text-gray-600 text-sm">Unread</p>
          <p className="text-2xl font-bold text-orange-600">{stats.unread}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border-l-4 border-red-500">
          <p className="text-gray-600 text-sm">Critical</p>
          <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border-l-4 border-yellow-500">
          <p className="text-gray-600 text-sm">Warning</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.warning}</p>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-3 mb-8 flex-wrap">
        {[
          { label: 'All Alerts', value: 'ALL' },
          { label: 'Unread', value: 'UNREAD', icon: Info },
          { label: 'Critical', value: 'CRITICAL', icon: AlertTriangle },
          { label: 'Warning', value: 'WARNING', icon: AlertCircle },
        ].map((btn) => (
          <button
            key={btn.value}
            onClick={() => setFilter(btn.value)}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              filter === btn.value
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-600'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Alerts Table */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading alerts...</p>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">No alerts match your filter</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                    Icon
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                    Type
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                    Message
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                    Location
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                    Time
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.map((alert) => (
                  <AlertRow
                    key={alert.id}
                    alert={alert}
                    onAcknowledge={handleAcknowledgeAlert}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default Alerts;
