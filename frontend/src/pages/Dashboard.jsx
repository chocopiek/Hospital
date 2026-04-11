import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, AlertCircle, Wifi, Bed } from 'lucide-react';
import useSocket from '../hooks/useSocket';
import BedTile from '../components/BedTile';

export function Dashboard({ navigateToAlerts, onNavigateReset }) {
  const [buildings, setBuildings] = useState({});
  const [selectedBuilding, setSelectedBuilding] = useState('A');
  const [stats, setStats] = useState({
    totalBeds: 0,
    onlineDevices: 0,
    criticalAlerts: 0,
    warningAlerts: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const { on } = useSocket();
  const navigate = useNavigate();

  // Fetch initial data
  useEffect(() => {
    fetchBuildingData();
    fetchStats();
  }, []);

  // Listen for real-time updates
  useEffect(() => {
    const unsubscribeVitals = on('new_vitals', () => {
      fetchBuildingData();
      fetchStats();
    });

    const unsubscribeAlert = on('new_alert', () => {
      fetchStats();
    });

    return () => {
      unsubscribeVitals();
      unsubscribeAlert();
    };
  }, [on]);

  // Handle navigation to alerts
  useEffect(() => {
    if (navigateToAlerts) {
      navigate('/alerts');
      onNavigateReset();
    }
  }, [navigateToAlerts, navigate, onNavigateReset]);

  const fetchBuildingData = async () => {
    try {
      const response = await fetch('/api/buildings');
      const data = await response.json();
      setBuildings(data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching buildings:', error);
      setBuildings({});
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const buildingFloors = buildings[selectedBuilding] || {};
  const buildingKeys = Object.keys(buildings).sort();

  return (
    <div className="p-6">
      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {/* Total Beds */}
        <div className="bg-white rounded-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Beds</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalBeds}</p>
            </div>
            <Bed className="w-8 h-8 text-blue-500 opacity-50" />
          </div>
        </div>

        {/* Online Devices */}
        <div className="bg-white rounded-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Online Devices</p>
              <p className="text-3xl font-bold text-gray-900">{stats.onlineDevices}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.totalBeds > 0 && (
                  `${Math.round((stats.onlineDevices / stats.totalBeds) * 100)}% online`
                )}
              </p>
            </div>
            <Wifi className="w-8 h-8 text-green-500 opacity-50" />
          </div>
        </div>

        {/* Critical Alerts */}
        <div className="bg-white rounded-lg p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Critical Alerts</p>
              <p className="text-3xl font-bold text-red-600">{stats.criticalAlerts}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500 opacity-50" />
          </div>
        </div>

        {/* Warning Alerts */}
        <div className="bg-white rounded-lg p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Warning Alerts</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.warningAlerts}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-yellow-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Building Selector */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Select Building</h2>
        <div className="flex gap-3">
          {buildingKeys.map((building) => (
            <button
              key={building}
              onClick={() => setSelectedBuilding(building)}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                selectedBuilding === building
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-900 border border-gray-300 hover:border-blue-600'
              }`}
            >
              Building {building}
            </button>
          ))}
        </div>
      </div>

      {/* Building Contents */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading building data...</p>
        </div>
      ) : Object.keys(buildingFloors).length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">No devices found in this building</p>
        </div>
      ) : (
        Object.keys(buildingFloors)
          .sort((a, b) => parseInt(a) - parseInt(b))
          .map((floor) => (
            <div key={floor} className="mb-8">
              <div className="bg-gray-900 text-white px-4 py-3 rounded-lg font-bold mb-4">
                Floor {floor}
              </div>

              {Object.keys(buildingFloors[floor])
                .sort()
                .map((room) => (
                  <div key={room} className="mb-6">
                    <h4 className="text-sm font-bold text-gray-700 mb-3">Room {room}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {buildingFloors[floor][room].map((device) => (
                        <BedTile
                          key={device.device_id}
                          device={device}
                          patient={device.patient}
                        />
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          ))
      )}
    </div>
  );
}

export default Dashboard;
