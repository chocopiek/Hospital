const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key (for backend only)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️  SUPABASE_URL or SUPABASE_SERVICE_KEY not set');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

// Helper: Send CORS-enabled response
function sendResponse(res, statusCode = 200, data = {}) {
  res.status(statusCode);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  res.json(data);
}

// Helper: Send error response
function sendError(res, statusCode = 500, error = {}) {
  res.status(statusCode);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  res.json({
    error: error.message || 'Internal server error',
    details: error.details || null,
  });
}

// Helper: Handle OPTIONS requests (preflight)
function handleOptions(res) {
  res.status(200);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  res.end();
}

module.exports = {
  supabase,
  corsHeaders,
  sendResponse,
  sendError,
  handleOptions,
};
