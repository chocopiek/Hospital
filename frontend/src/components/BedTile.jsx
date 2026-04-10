import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, AlertTriangle } from 'lucide-react';

export function BedTile({ device, patient }) {
  const vitals = device.latestVital;
  const lastSeen = device.last_seen ? new Date(device.last_seen) : null;
  const now = new Date();
  const isOnline = lastSeen && (now - lastSeen) / (1000 * 60) < 5;

  const getStatusColor = () => {
    if (!isOnline) return 'bg-gray-100 border-gray-300';
    
    const criticalAlerts = device.unreadAlerts?.filter((a) => a.type === 'CRITICAL') || [];
    if (criticalAlerts.length > 0) return 'bg-red-50 border-red-300';
    
    const warningAlerts = device.unreadAlerts?.filter((a) => a.type === 'WARNING') || [];
    if (warningAlerts.length > 0) return 'bg-yellow-50 border-yellow-300';
    
    return 'bg-white border-green-300';
  };

  const getStatusBadgeColor = () => {
    if (!isOnline) return 'bg-gray-500';
    
    const criticalAlerts = device.unreadAlerts?.filter((a) => a.type === 'CRITICAL') || [];
    if (criticalAlerts.length > 0) return 'bg-red-600';
    
    const warningAlerts = device.unreadAlerts?.filter((a) => a.type === 'WARNING') || [];
    if (warningAlerts.length > 0) return 'bg-yellow-500';
    
    return 'bg-green-500';
  };

  const getVitalColor = (vital, value, alertType) => {
    if (alertType === 'CRITICAL') return 'text-red-600';
    if (alertType === 'WARNING') return 'text-yellow-600';
    return 'text-green-600';
  };

  const getAlertTypeForVital = (vital) => {
    const alerts = device.unreadAlerts || [];
    const criticalAlert = alerts.find((a) => a.type === 'CRITICAL');
    const warningAlert = alerts.find((a) => a.type === 'WARNING');
    
    if (criticalAlert) return 'CRITICAL';
    if (warningAlert) return 'WARNING';
    return 'NORMAL';
  };

  return (
    <Link to={`/bed/${device.device_id}`}>
      <div
        className={`
          border-2 rounded-lg p-4 transition-all hover:shadow-lg cursor-pointer
          ${getStatusColor()}
        `}
      >
        {/* Header with status dot */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-bold text-sm text-gray-900">
              Bed {device.bed} - Room {device.room}
            </h3>
            <p className="text-xs text-gray-600">
              {patient?.name ? `Patient: ${patient.name}` : 'No patient assigned'}
            </p>
          </div>
          <div
            className={`relative flex-shrink-0 w-3 h-3 rounded-full ${getStatusBadgeColor()} ${
              device.alertCount > 0 ? 'pulse-critical' : ''
            }`}
          />
        </div>

        {/* Vitals Display */}
        {vitals ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {/* Heart Rate */}
              <div className="bg-white bg-opacity-50 rounded p-2">
                <p className="text-xs text-gray-600">HR</p>
                <p className={`text-lg font-bold ${getVitalColor('hr', vitals.heart_rate, getAlertTypeForVital())}`}>
                  {vitals.heart_rate} bpm
                </p>
              </div>

              {/* SpO2 */}
              <div className="bg-white bg-opacity-50 rounded p-2">
                <p className="text-xs text-gray-600">SpO2</p>
                <p className={`text-lg font-bold ${getVitalColor('spo2', vitals.spo2, getAlertTypeForVital())}`}>
                  {vitals.spo2.toFixed(1)}%
                </p>
              </div>

              {/* Temperature */}
              <div className="bg-white bg-opacity-50 rounded p-2">
                <p className="text-xs text-gray-600">Temp</p>
                <p className={`text-lg font-bold ${getVitalColor('temp', vitals.temperature, getAlertTypeForVital())}`}>
                  {vitals.temperature.toFixed(1)}°C
                </p>
              </div>

              {/* BP */}
              <div className="bg-white bg-opacity-50 rounded p-2">
                <p className="text-xs text-gray-600">BP</p>
                <p className={`text-lg font-bold ${getVitalColor('bp', vitals.bp_sys, getAlertTypeForVital())}`}>
                  {vitals.bp_sys}/{vitals.bp_dia}
                </p>
              </div>
            </div>

            {/* Battery */}
            <div className="flex items-center justify-between text-xs text-gray-600 bg-white bg-opacity-50 rounded p-2">
              <span>Battery</span>
              <span className="font-semibold">{device.battery || 0}%</span>
            </div>

            {/* Last Update */}
            <p className="text-xs text-gray-500 text-center">
              {vitals.recorded_at
                ? `Updated ${new Date(vitals.recorded_at).toLocaleTimeString()}`
                : 'No data'}
            </p>

            {/* Alert Indicator */}
            {device.alertCount > 0 && (
              <div className="flex items-center gap-1 text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
                <AlertTriangle className="w-3 h-3" />
                <span>{device.alertCount} active alert{device.alertCount !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500 text-sm">
            {isOnline ? 'Awaiting data...' : 'Device offline'}
          </div>
        )}
      </div>
    </Link>
  );
}

export default BedTile;
