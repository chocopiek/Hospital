import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity, Droplets, Thermometer, Heart } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import useSocket from '../hooks/useSocket';
import VitalCard from '../components/VitalCard';
import AlertRow from '../components/AlertRow';

export function BedDetail() {
  const { device_id } = useParams();
  const navigate = useNavigate();
  const [device, setDevice] = useState(null);
  const [patient, setPatient] = useState(null);
  const [vitals, setVitals] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { on } = useSocket();

  useEffect(() => {
    fetchBedData();
  }, [device_id]);

  useEffect(() => {
    const unsubscribeVitals = on('new_vitals', (data) => {
      if (data.device_id === device_id) {
        fetchBedData();
      }
    });

    return () => {
      unsubscribeVitals();
    };
  }, [device_id, on]);

  const fetchBedData = async () => {
    try {
      setIsLoading(true);
      const [vitalsRes, alertsRes, buildingsRes] = await Promise.all([
        fetch(`/api/bed/${device_id}/vitals?limit=100`).then(r => r.json()),
        fetch('/api/alerts').then(r => r.json()),
        fetch('/api/buildings').then(r => r.json()),
      ]);

      const bedVitals = vitalsRes.vitals || [];
      setVitals(bedVitals);
      setDevice(vitalsRes.device);

      // Get patient info
      if (vitalsRes.device?.device_id) {
        // Patient info would be included in the device or fetched separately
      }

      // Filter alerts for this device
      const deviceAlerts = (alertsRes.alerts || []).filter((a) => a.device_id === device_id);
      setAlerts(deviceAlerts);

      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching bed data:', error);
      setIsLoading(false);
    }
  };

  const handleAcknowledgeAlert = (alertId, unreadCount) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId ? { ...a, acknowledged: 1 } : a
      )
    );
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Loading bed details...</p>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Device not found</p>
      </div>
    );
  }

  const latestVital = vitals[vitals.length - 1];

  // Prepare chart data
  const chartData = vitals.map((v) => ({
    time: new Date(v.recorded_at).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    HR: v.heart_rate,
    SpO2: v.spo2,
    Temp: (v.temperature * 10).toFixed(0) / 10, // Scale for visibility
    BPSys: v.bp_sys,
    BPDia: v.bp_dia,
  }));

  const getVitalStatus = (vital, type) => {
    // Simple status logic - can be enhanced with thresholds
    switch (type) {
      case 'hr':
        if (vital < 60 || vital > 100) return 'warning';
        return 'normal';
      case 'spo2':
        if (vital < 94) return 'critical';
        if (vital < 96) return 'warning';
        return 'normal';
      case 'temp':
        if (vital > 38.5 || vital < 36) return 'critical';
        if (vital > 38 || vital < 36.5) return 'warning';
        return 'normal';
      default:
        return 'normal';
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/')}
          className="mr-4 p-2 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Bed {device.bed} - Room {device.room}
          </h1>
          <p className="text-gray-600">
            Building {device.building} | Floor {device.floor}
          </p>
        </div>
      </div>

      {/* Patient Info Card */}
      {patient && (
        <div className="bg-white rounded-lg p-6 mb-6 border-l-4 border-blue-500">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Patient Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-gray-600 text-sm">Name</p>
              <p className="text-gray-900 font-semibold">{patient.name}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Age</p>
              <p className="text-gray-900 font-semibold">{patient.age || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Diagnosis</p>
              <p className="text-gray-900 font-semibold">{patient.diagnosis || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Admitted</p>
              <p className="text-gray-900 font-semibold">
                {new Date(patient.admitted_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Live Vitals Cards */}
      {latestVital && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <VitalCard
            title="Heart Rate"
            value={latestVital.heart_rate}
            unit="bpm"
            icon={Heart}
            status={getVitalStatus(latestVital.heart_rate, 'hr')}
            details="Normal range: 60-100 bpm"
          />
          <VitalCard
            title="SpO2"
            value={latestVital.spo2}
            unit="%"
            icon={Droplets}
            status={getVitalStatus(latestVital.spo2, 'spo2')}
            details="Normal: > 95%"
          />
          <VitalCard
            title="Temperature"
            value={latestVital.temperature}
            unit="°C"
            icon={Thermometer}
            status={getVitalStatus(latestVital.temperature, 'temp')}
            details="Normal: 36.5-37.5°C"
          />
          <VitalCard
            title="Blood Pressure"
            value={`${latestVital.bp_sys}/${latestVital.bp_dia}`}
            unit="mmHg"
            icon={Activity}
            status={getVitalStatus(latestVital.bp_sys, 'bp')}
            details="Normal: 120/80 mmHg"
          />
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Heart Rate & SpO2 */}
        <div className="bg-white rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Heart Rate & SpO2</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" angle={-45} textAnchor="end" height={60} />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="HR"
                stroke="#ef4444"
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="SpO2"
                stroke="#3b82f6"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Temperature */}
        <div className="bg-white rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Temperature</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" angle={-45} textAnchor="end" height={60} />
              <YAxis domain={[35, 40]} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="Temp"
                stroke="#f59e0b"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Blood Pressure */}
        <div className="bg-white rounded-lg p-6 lg:col-span-2">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Blood Pressure</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" angle={-45} textAnchor="end" height={60} />
              <YAxis domain={[60, 160]} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="BPSys"
                stroke="#8b5cf6"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="BPDia"
                stroke="#06b6d4"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alert History */}
      <div className="bg-white rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Alert History</h3>
        {alerts.length === 0 ? (
          <p className="text-gray-500">No alerts for this device</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Icon
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Message
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
                  <AlertRow
                    key={alert.id}
                    alert={alert}
                    onAcknowledge={handleAcknowledgeAlert}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default BedDetail;
