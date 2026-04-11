// Load environment variables
require('dotenv').config({ path: '.env.local' });

const http = require('http');
const path = require('path');
const url = require('url');

// Mock express-like request/response decorator
const createMockReq = (nodeReq) => ({
  ...nodeReq,
  body: null,
  query: {},
  params: {},
  statusCode: 200,
});

const createMockRes = (nodeRes) => ({
  statusCode: 200,
  headers: {},
  status: function(code) { this.statusCode = code; return this; },
  setHeader: function(key, val) { this.headers[key] = val; return this; },
  json: function(data) {
    this.setHeader('Content-Type', 'application/json');
    nodeRes.writeHead(this.statusCode, this.headers);
    nodeRes.end(JSON.stringify(data));
  },
  end: function(data) {
    nodeRes.writeHead(this.statusCode, this.headers);
    nodeRes.end(data);
  },
  write: function(data) {
    nodeRes.write(data);
    return this;
  },
});

// Directory mapping for Vercel Functions
const apiHandlers = {
  '/api/patients': require('./api/patients'),
  '/api/devices': require('./api/devices'),
  '/api/buildings': require('./api/buildings'),
  '/api/alerts': require('./api/alerts'),
  '/api/alerts-stats': require('./api/alerts-stats'),
  '/api/stats': require('./api/stats'),
  '/api/data': require('./api/data'),
};

const server = http.createServer(async (nodeReq, nodeRes) => {
  const pathname = url.parse(nodeReq.url).pathname;
  
  // Set CORS headers
  nodeRes.setHeader('Access-Control-Allow-Origin', '*');
  nodeRes.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  nodeRes.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle CORS preflight
  if (nodeReq.method === 'OPTIONS') {
    nodeRes.writeHead(200);
    nodeRes.end();
    return;
  }

  // Find matching API handler
  let handler = null;
  let handlerPath = pathname;
  
  for (const [path, fn] of Object.entries(apiHandlers)) {
    if (pathname === path || pathname.startsWith(path + '/')) {
      handler = fn;
      handlerPath = path;
      break;
    }
  }

  if (!handler) {
    nodeRes.writeHead(404);
    nodeRes.end('Not Found');
    return;
  }

  // Create mock request with parsed body
  const req = createMockReq(nodeReq);
  const res = createMockRes(nodeRes);

  // Parse request body
  try {
    let body = '';
    for await (const chunk of nodeReq) {
      body += chunk.toString();
    }
    if (body) {
      try {
        req.body = JSON.parse(body);
      } catch (e) {
        req.body = body;
      }
    }
  } catch (e) {
    console.error('Error reading request body:', e.message);
  }

  // Call the handler
  try {
    await handler(req, res);
  } catch (error) {
    console.error(`Error in ${pathname}:`, error);
    if (!nodeRes.headersSent) {
      nodeRes.writeHead(500, { 'Content-Type': 'application/json' });
      nodeRes.end(JSON.stringify({
        error: error.message || 'Internal server error',
      }));
    }
  }
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Local API server running on http://localhost:${PORT}`);
  console.log('Ready to handle Vercel Functions');
});
