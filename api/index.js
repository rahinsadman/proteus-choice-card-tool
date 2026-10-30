const discoveryHandler = require('./discovery.js');
const executeHandler = require('./execute.js');

module.exports = (req, res) => {
  const url = req.url || '';
  if (req.method === 'POST' || url.includes('/execute')) {
    return executeHandler(req, res);
  }
  return discoveryHandler(req, res);
};
