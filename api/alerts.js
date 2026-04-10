const { supabase, sendResponse, sendError, handleOptions } = require('./_supabase');

/**
 * GET /api/alerts?unread=true&type=CRITICAL&limit=50&offset=0
 * Get alerts with optional filtering by status and type
 */
module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (req.method !== 'GET') {
    return sendError(res, 405, { message: 'Method not allowed' });
  }

  try {
    // Parse query params
    const url = new URL(req.url, `http://${req.headers.host}`);
    const unread = url.searchParams.get('unread')?.toLowerCase() === 'true';
    const type = url.searchParams.get('type')?.toUpperCase();
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 1000);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    // Valid alert types
    const validTypes = ['CRITICAL', 'WARNING', 'INFO'];
    if (type && !validTypes.includes(type)) {
      return sendError(res, 400, { message: `type must be one of: ${validTypes.join(', ')}` });
    }

    // Build query
    let query = supabase.from('alerts').select('*');

    if (unread) {
      query = query.eq('acknowledged', false);
    }

    if (type) {
      query = query.eq('type', type);
    }

    const { data: alerts, error: alertsError } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (alertsError) {
      throw alertsError;
    }

    // Enrich each alert with device info
    const enrichedAlerts = [];
    for (const alert of alerts || []) {
      const { data: device } = await supabase
        .from('devices')
        .select('building, floor, room, bed, device_id')
        .eq('device_id', alert.device_id)
        .single();

      enrichedAlerts.push({
        ...alert,
        device: device || null,
      });
    }

    return sendResponse(res, 200, {
      alerts: enrichedAlerts,
      limit,
      offset,
      count: enrichedAlerts.length,
    });
  } catch (error) {
    console.error('Error in /api/alerts:', error);
    return sendError(res, 500, error);
  }
};
