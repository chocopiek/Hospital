const { supabase, sendResponse, sendError, handleOptions } = require('./_supabase');

/**
 * GET /api/alerts/stats
 * Get alert statistics: total, unread, critical, warning, info
 */
module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (req.method !== 'GET') {
    return sendError(res, 405, { message: 'Method not allowed' });
  }

  try {
    // Get all alerts
    const { data: alerts, error: alertsError } = await supabase
      .from('alerts')
      .select('acknowledged, type');

    if (alertsError) {
      throw alertsError;
    }

    const stats = {
      total: alerts?.length || 0,
      unread: 0,
      critical: 0,
      warning: 0,
      info: 0,
      unreadByCritical: 0,
      unreadByWarning: 0,
      unreadByInfo: 0,
    };

    for (const alert of alerts || []) {
      if (!alert.acknowledged) {
        stats.unread += 1;
      }

      if (alert.type === 'CRITICAL') {
        stats.critical += 1;
        if (!alert.acknowledged) {
          stats.unreadByCritical += 1;
        }
      } else if (alert.type === 'WARNING') {
        stats.warning += 1;
        if (!alert.acknowledged) {
          stats.unreadByWarning += 1;
        }
      } else if (alert.type === 'INFO') {
        stats.info += 1;
        if (!alert.acknowledged) {
          stats.unreadByInfo += 1;
        }
      }
    }

    return sendResponse(res, 200, stats);
  } catch (error) {
    console.error('Error in /api/alerts/stats:', error);
    return sendError(res, 500, error);
  }
};
