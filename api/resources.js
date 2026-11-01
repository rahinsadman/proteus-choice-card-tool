const { RESOURCE_URI, templateDocument } = require('../shared.js');

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

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  parseBody(req, (body) => {
    // Read URI from body or query params
    const query = req.query || {};
    const uri = body.uri || query.uri || RESOURCE_URI;

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({
      uri: uri,
      mimeType: "application/vnd.opal.proteus+json",
      text: JSON.stringify(templateDocument)
    });
  });
};
