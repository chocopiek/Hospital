const { supabase, sendResponse, sendError, handleOptions } = require('./_supabase');

/**
 * GET /api/devices
 * Get all devices with latest vital and patient info
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

    // Enrich with latest vitals, patients, and alerts
    const enrichedDevices = await Promise.all(
      devices.map(async (device) => {
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

        return {
          ...device,
          latestVital: latestVital || null,
          patient: patient || null,
          unreadAlerts: unreadAlerts || [],
          alertCount: (unreadAlerts || []).length,
        };
      })
    );

    return sendResponse(res, 200, enrichedDevices);
  } catch (error) {
    console.error('Error in /api/devices:', error);
    return sendError(res, 500, error);
  }
};
