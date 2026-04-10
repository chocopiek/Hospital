const { supabase, sendResponse, sendError, handleOptions } = require('./_supabase');

/**
 * GET /api/buildings
 * Get full hierarchy: building > floor > room > bed with latest vitals
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
      .select('*')
      .order('building')
      .order('floor')
      .order('room')
      .order('bed');

    if (devicesError) {
      throw devicesError;
    }

    // Build hierarchy
    const hierarchy = {};

    for (const device of devices) {
      // Get latest vital
      const { data: latestVital } = await supabase
        .from('vitals')
        .select('*')
        .eq('device_id', device.device_id)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();

      // Get patient
      const { data: patient } = await supabase
        .from('patients')
        .select('*')
        .eq('device_id', device.device_id)
        .single();

      // Get unread alerts
      const { data: unreadAlerts } = await supabase
        .from('alerts')
        .select('*')
        .eq('device_id', device.device_id)
        .eq('acknowledged', false)
        .order('created_at', { ascending: false });

      const enrichedDevice = {
        ...device,
        latestVital: latestVital || null,
        patient: patient || null,
        unreadAlerts: unreadAlerts || [],
        alertCount: (unreadAlerts || []).length,
      };

      // Build nested structure
      if (!hierarchy[device.building]) {
        hierarchy[device.building] = {};
      }
      if (!hierarchy[device.building][device.floor]) {
        hierarchy[device.building][device.floor] = {};
      }
      if (!hierarchy[device.building][device.floor][device.room]) {
        hierarchy[device.building][device.floor][device.room] = [];
      }

      hierarchy[device.building][device.floor][device.room].push(enrichedDevice);
    }

    return sendResponse(res, 200, hierarchy);
  } catch (error) {
    console.error('Error in /api/buildings:', error);
    return sendError(res, 500, error);
  }
};
