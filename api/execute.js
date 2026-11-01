const { normalizeOptions, getField } = require('../shared.js');

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
    const prompt = getField(body, 'prompt') || "Make a selection:";
    const rawOptions = getField(body, 'options');
    const options = normalizeOptions(rawOptions);
    const subtitle = getField(body, 'subtitle') || null;

    // Both top-level and content are populated for 100% path binding safety
    const responsePayload = {
      message: `The choice card has been presented to the user with ${options.length} options. Prompt the user in one short sentence to make their selection.`,
      prompt: prompt,
      options: options,
      subtitle: subtitle,
      content: {
        prompt: prompt,
        options: options,
        subtitle: subtitle
      },
      content_type: "application/json"
    };

    res.setHeader('Content-Type', 'application/vnd.optimizely.opal.tools+json');
    return res.status(200).json(responsePayload);
  });
};
