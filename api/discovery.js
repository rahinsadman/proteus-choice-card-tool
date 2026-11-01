const { toolDefinition } = require('../shared.js');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  res.setHeader('Content-Type', 'application/vnd.optimizely.opal.tools.discovery+json');
  return res.status(200).json({
    functions: [toolDefinition],
    tools: [toolDefinition]
  });
};
