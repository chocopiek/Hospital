const { supabase, sendResponse, sendError, handleOptions } = require('./_supabase');

/**
 * POST /api/alerts/:id/acknowledge
 * Mark an alert as acknowledged (read)
 */
module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (req.method !== 'POST') {
    return sendError(res, 405, { message: 'Method not allowed' });
  }

  try {
    // Extract alert id from URL path
    const pathParts = req.url.split('/').filter(Boolean);
    let alert_id;
    
    // Handle both /api/alerts/:id/acknowledge and /api/alert-acknowledge?id=xxx
    const queryUrl = new URL(req.url, `http://${req.headers.host}`);
    alert_id = queryUrl.searchParams.get('id');
    
    if (!alert_id && pathParts.includes('acknowledge')) {
      // Try extracting from path
      const acknowledgeIndex = pathParts.indexOf('acknowledge');
      if (acknowledgeIndex > 0) {
        alert_id = pathParts[acknowledgeIndex - 1];
      }
    }

    if (!alert_id) {
      return sendError(res, 400, { message: 'alert id is required' });
    }

    // Check if alert exists
    const { data: alert, error: getError } = await supabase
      .from('alerts')
      .select('*')
      .eq('id', alert_id)
      .single();

    if (getError || !alert) {
      return sendError(res, 404, { message: 'Alert not found' });
    }

    // Update alert to acknowledged
    const { data: updatedAlert, error: updateError } = await supabase
      .from('alerts')
      .update({
        acknowledged: true,
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', alert_id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return sendResponse(res, 200, {
      message: 'Alert acknowledged',
      alert: updatedAlert,
    });
  } catch (error) {
    console.error('Error in /api/alerts/:id/acknowledge:', error);
    return sendError(res, 500, error);
  }
};
