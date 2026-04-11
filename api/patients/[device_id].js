const { supabase, sendResponse, sendError, handleOptions } = require('../_supabase');

/**
 * DELETE /api/patients/[device_id] - Delete a patient by device_id
 */
module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  try {
    // DELETE - Remove patient by device_id
    if (req.method === 'DELETE') {
      const { device_id } = req.query;

      if (!device_id) {
        return sendError(res, 400, { message: 'device_id is required' });
      }

      console.log('DELETE /api/patients/:device_id - Deleting patient:', device_id);

      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('device_id', device_id);

      if (error) {
        console.error('DELETE /api/patients/:device_id - Error:', error);
        throw error;
      }

      return sendResponse(res, 200, {
        message: 'Patient deleted',
      });
    }

    // Method not allowed
    return sendError(res, 405, { message: 'Method not allowed' });
  } catch (error) {
    console.error('Error in DELETE /api/patients/[device_id]:', error);
    return sendError(res, 500, error);
  }
};
