const { supabase, sendResponse, sendError, handleOptions } = require('./_supabase');

/**
 * POST /api/data
 * Receive sensor data from ESP32
 */
module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (req.method !== 'POST') {
    return sendError(res, 405, { message: 'Method not allowed' });
  }

  try {
    const {
      device_id,
      building,
      floor,
      room,
      bed,
      vitals,
      alerts,
      battery,
    } = req.body;

    // Validate required fields
    if (!device_id || !building || floor === undefined || !room || bed === undefined || !vitals) {
      return sendError(res, 400, { message: 'Missing required fields' });
    }

    // Upsert device
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .upsert(
        {
          device_id,
          building,
          floor,
          room,
          bed,
          battery: battery || 0,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'device_id' }
      )
      .select()
      .single();

    if (deviceError) {
      throw deviceError;
    }

    // Insert vitals
    const { error: vitalsError } = await supabase
      .from('vitals')
      .insert({
        device_id,
        heart_rate: vitals.heart_rate,
        spo2: vitals.spo2,
        temperature: vitals.temperature,
        bp_sys: vitals.blood_pressure_sys,
        bp_dia: vitals.blood_pressure_dia,
        recorded_at: new Date().toISOString(),
      });

    if (vitalsError) {
      console.error('Error inserting vitals:', vitalsError);
    }

    // Insert alerts if any
    if (Array.isArray(alerts) && alerts.length > 0) {
      const alertsToInsert = alerts.map((alert) => ({
        device_id,
        type: alert.type || 'INFO',
        message: alert.message,
        acknowledged: false,
        created_at: new Date().toISOString(),
      }));

      const { error: alertsError } = await supabase
        .from('alerts')
        .insert(alertsToInsert);

      if (alertsError) {
        console.error('Error inserting alerts:', alertsError);
      }
    }

    return sendResponse(res, 200, {
      success: true,
      device_id,
      message: 'Data received and processed',
    });
  } catch (error) {
    console.error('Error in /api/data:', error);
    return sendError(res, 500, error);
  }
};
