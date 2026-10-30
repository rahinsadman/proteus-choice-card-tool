const http = require('http');
const handler = require('./api/index.js');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  // Simple body parser for POST requests
  if (req.method === 'POST') {
    let bodyStr = '';
    req.on('data', chunk => {
      bodyStr += chunk.toString();
    });
    req.on('end', () => {
      try {
        req.body = bodyStr ? JSON.parse(bodyStr) : {};
      } catch (e) {
        req.body = {};
      }
      // Attach Express/Vercel-like helper methods if not present
      if (!res.status) {
        res.status = (code) => {
          res.statusCode = code;
          return res;
        };
      }
      if (!res.json) {
        res.json = (data) => {
          res.setHeader('Content-Type', res.getHeader('Content-Type') || 'application/json');
          res.end(JSON.stringify(data));
        };
      }
      handler(req, res);
    });
  } else {
    if (!res.status) {
      res.status = (code) => {
        res.statusCode = code;
        return res;
      };
    }
    if (!res.json) {
      res.json = (data) => {
        res.setHeader('Content-Type', res.getHeader('Content-Type') || 'application/json');
        res.end(JSON.stringify(data));
      };
    }
    handler(req, res);
  }
});

server.listen(PORT, () => {
  console.log(`Proteus Choice Card Tool running at http://localhost:${PORT}`);
  console.log(`Discovery: http://localhost:${PORT}/discovery`);
  console.log(`Execute:   http://localhost:${PORT}/execute`);
});

module.exports = server;
