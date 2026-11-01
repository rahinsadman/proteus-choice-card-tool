/**
 * Proteus Choice Card Custom Tool - Universal Entrypoint
 * Handles direct serverless invocations and standalone Node servers.
 */

const http = require('http');
const discoveryHandler = require('./api/discovery.js');
const resourcesHandler = require('./api/resources.js');
const executeHandler = require('./api/execute.js');

function parseBody(req, callback) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'object') return callback(req.body);
    if (typeof req.body === 'string') {
      try { return callback(JSON.parse(req.body)); } catch (e) { return callback({}); }
    }
  }

  let bodyStr = '';
  req.on('data', chunk => { bodyStr += chunk.toString(); });
  req.on('end', () => {
    let parsed = {};
    if (bodyStr) {
      try { parsed = JSON.parse(bodyStr); } catch (e) {}
    }
    return callback(parsed);
  });
}

function handler(req, res) {
  // CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  const url = (req.url || '').toLowerCase();
  const matchedPath = (req.headers['x-matched-path'] || req.headers['x-forwarded-uri'] || '').toLowerCase();

  // Helper method injection for native http.Server
  if (!res.json) {
    res.json = (data) => {
      res.end(JSON.stringify(data));
    };
  }
  if (!res.status) {
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
  }

  // DISPATCH LOGIC
  // 1. Check if this is a resource read (via URL OR via body.uri in POST)
  if (url.includes('resources') || matchedPath.includes('resources')) {
    return resourcesHandler(req, res);
  }

  // 2. Check if this is discovery
  if (url.includes('discovery') || matchedPath.includes('discovery')) {
    return discoveryHandler(req, res);
  }

  // 3. For any other POST request: inspect body to see if it's a resource read or tool execute
  if (req.method === 'POST') {
    return parseBody(req, (body) => {
      req.body = body;
      // If the body contains "uri", it is definitely a resource request (TMS calling /resources/read)
      if (body && body.uri) {
        return resourcesHandler(req, res);
      }
      // Otherwise, it is an execute request
      return executeHandler(req, res);
    });
  }

  // Default GET fallback -> discovery
  return discoveryHandler(req, res);
}

module.exports = handler;

// Self-host if run directly or as a Node server
if (require.main === module || process.env.PORT) {
  const port = process.env.PORT || 3000;
  const server = http.createServer(handler);
  server.listen(port, () => {
    console.log(`Proteus choice card tool running on port ${port}`);
  });
}
