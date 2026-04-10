const { supabase, sendResponse, sendError, handleOptions } = require('./_supabase');

/**
 * GET /api/stats
 * Get dashboard KPIs: totalBeds, onlineDevices, criticalAlerts, warningAlerts
 */
module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (req.method !== 'GET') {
    return sendError(res, 405, { message: 'Method not allowed' });
  }

  try {
    // Get all devices
    const { data: devices, error: devicesError } = await supabase
      .from('devices')
      .select('device_id, last_seen');

    if (devicesError) {
      throw devicesError;
    }

    // Get all unacknowledged alerts
    const { data: alerts, error: alertsError } = await supabase
      .from('alerts')
      .select('type, acknowledged')
      .eq('acknowledged', false);

    if (alertsError) {
      throw alertsError;
    }

    // Calculate stats
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const totalBeds = devices?.length || 0;
    const onlineDevices = (devices || []).filter(
      (d) => d.last_seen && new Date(d.last_seen) > fiveMinutesAgo
    ).length;

    let criticalAlerts = 0;
    let warningAlerts = 0;

    for (const alert of alerts || []) {
      if (alert.type === 'CRITICAL') {
        criticalAlerts += 1;
      } else if (alert.type === 'WARNING') {
        warningAlerts += 1;
      }
    }

    return sendResponse(res, 200, {
      totalBeds,
      onlineDevices,
      criticalAlerts,
      warningAlerts,
      uptime: `${((onlineDevices / totalBeds) * 100).toFixed(1)}%`,
    });
  } catch (error) {
    console.error('Error in /api/stats:', error);
    return sendError(res, 500, error);
  }
};
