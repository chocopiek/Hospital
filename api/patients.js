const { supabase, sendResponse, sendError, handleOptions } = require('./_supabase');

/**
 * GET /api/patients - Get all patients
 * POST /api/patients - Create or update patient
 * DELETE /api/patients/:device_id - Delete patient
 */
module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  try {
    // GET - Retrieve all patients
    if (req.method === 'GET') {
      const { data: patients, error } = await supabase
        .from('patients')
        .select('*')
        .order('name');

      if (error) {
        throw error;
      }

      return sendResponse(res, 200, patients || []);
    }

    // POST - Create or update patient
    if (req.method === 'POST') {
      try {
        const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const { device_id, name, age, gender, room_number, notes } = payload;

        if (!device_id || !name) {
          return sendError(res, 400, { message: 'device_id and name are required' });
        }

        // Check if patient already exists
        const { data: existing } = await supabase
          .from('patients')
          .select('id')
          .eq('device_id', device_id)
          .single();

        let result;
        if (existing) {
          // Update existing patient
          const { data, error } = await supabase
            .from('patients')
            .update({
              name,
              age: age || null,
              gender: gender || null,
              room_number: room_number || null,
              notes: notes || null,
              updated_at: new Date().toISOString(),
            })
            .eq('device_id', device_id)
            .select()
            .single();

          if (error) throw error;
          result = data;
        } else {
          // Create new patient
          const { data, error } = await supabase
            .from('patients')
            .insert({
              device_id,
              name,
              age: age || null,
              gender: gender || null,
              room_number: room_number || null,
              notes: notes || null,
            })
            .select()
            .single();

          if (error) throw error;
          result = data;
        }

        return sendResponse(res, 201, {
          message: existing ? 'Patient updated' : 'Patient created',
          patient: result,
        });
      } catch (error) {
        console.error('Error in POST /api/patients:', error);
        return sendError(res, 500, error);
      }
    }

    // DELETE - Remove patient
    if (req.method === 'DELETE') {
      // Extract device_id from URL path
      const pathParts = req.url.split('/').filter(Boolean);
      const device_id = pathParts[pathParts.length - 1];

      if (!device_id) {
        return sendError(res, 400, { message: 'device_id is required' });
      }

      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('device_id', device_id);

      if (error) {
        throw error;
      }

      return sendResponse(res, 200, {
        message: 'Patient deleted',
      });
    }

    // Method not allowed
    return sendError(res, 405, { message: 'Method not allowed' });
  } catch (error) {
    console.error('Error in /api/patients:', error);
    return sendError(res, 500, error);
  }
};
