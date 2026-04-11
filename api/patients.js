const { supabase, sendResponse, sendError, handleOptions } = require('./_supabase');

/**
 * Helper to parse request body
 */
const parseBody = async (req) => {
  return new Promise((resolve, reject) => {
    // If body is already parsed (Vercel with built-in parsing)
    if (req.body !== undefined) {
      try {
        const parsed = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        resolve(parsed);
      } catch (e) {
        reject(new Error(`Invalid JSON in req.body: ${e.message}`));
      }
      return;
    }
    
    // Collect chunks from stream
    const chunks = [];
    
    req.on('data', (chunk) => {
      chunks.push(chunk);
    });
    
    req.on('end', () => {
      try {
        const body = chunks.length > 0 ? Buffer.concat(chunks).toString('utf-8') : '';
        const parsed = body.trim() ? JSON.parse(body) : {};
        resolve(parsed);
      } catch (e) {
        reject(new Error(`Failed to parse request body: ${e.message}`));
      }
    });
    
    req.on('error', (err) => {
      reject(new Error(`Request stream error: ${err.message}`));
    });
  });
};

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
        const payload = await parseBody(req);
        console.log('POST /api/patients - Received payload:', payload);
        
        const { device_id, name, age, diagnosis, notes } = payload;

        if (!device_id || !name) {
          console.warn('POST /api/patients - Missing required fields');
          return sendError(res, 400, { message: 'device_id and name are required' });
        }

        // Check if patient already exists
        const { data: existing, error: checkError } = await supabase
          .from('patients')
          .select('id')
          .eq('device_id', device_id)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          // PGRST116 = no rows found, which is expected if patient doesn't exist
          throw checkError;
        }

        let result;
        if (existing) {
          console.log('POST /api/patients - Updating existing patient:', device_id);
          // Update existing patient
          const { data, error } = await supabase
            .from('patients')
            .update({
              name,
              age: age || null,
              diagnosis: diagnosis || notes || null,
              updated_at: new Date().toISOString(),
            })
            .eq('device_id', device_id)
            .select()
            .single();

          if (error) throw error;
          result = data;
        } else {
          console.log('POST /api/patients - Creating new patient:', device_id);
          // Create new patient
          const { data, error } = await supabase
            .from('patients')
            .insert({
              device_id,
              name,
              age: age || null,
              diagnosis: diagnosis || notes || null,
            })
            .select()
            .single();

          if (error) throw error;
          result = data;
        }

        const responseData = {
          message: existing ? 'Patient updated' : 'Patient created',
          patient: result,
        };
        console.log('POST /api/patients - Sending response:', responseData);
        return sendResponse(res, 201, responseData);
      } catch (error) {
        console.error('Error in POST /api/patients:', error.message, error.stack);
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
