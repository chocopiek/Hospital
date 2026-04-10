const { supabase, sendResponse, sendError, handleOptions } = require('./_supabase');

/**
 * GET /api/bed/:device_id/vitals?limit=50
 * Get vital history for a specific device
 */
module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (req.method !== 'GET') {
    return sendError(res, 405, { message: 'Method not allowed' });
  }

  try {
    // Extract device_id from URL path
    const device_id = req.url.split('/').find((_, i, arr) => arr[i - 1] === 'bed');
    if (!device_id) {
      return sendError(res, 400, { message: 'device_id is required' });
    }

    // Parse query params
    const url = new URL(req.url, `http://${req.headers.host}`);
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    if (limit < 1 || limit > 1000) {
      return sendError(res, 400, { message: 'limit must be between 1 and 1000' });
    }

    // Get device
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('*')
      .eq('device_id', device_id)
      .single();

    if (deviceError) {
      return sendError(res, 404, { message: 'Device not found' });
    }

    // Get patient
    const { data: patient } = await supabase
      .from('patients')
      .select('*')
      .eq('device_id', device_id)
      .single();

    // Get vitals ordered by recorded_at DESC, then reverse for chronological order
    const { data: vitals, error: vitalsError } = await supabase
      .from('vitals')
      .select('*')
      .eq('device_id', device_id)
      .order('recorded_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (vitalsError) {
      throw vitalsError;
    }

    // Reverse to get chronological order (oldest first)
    const chronologicalVitals = vitals ? vitals.reverse() : [];

    return sendResponse(res, 200, {
      device,
      patient: patient || null,
      vitals: chronologicalVitals,
      limit,
      offset,
      count: chronologicalVitals.length,
    });
  } catch (error) {
    console.error('Error in /api/bed/:device_id/vitals:', error);
    return sendError(res, 500, error);
  }
};
