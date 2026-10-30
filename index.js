/**
 * Proteus Choice Card Custom Tool for Optimizely Opal & Mark.
 * Universal handler: runs as Vercel Serverless Function or Node.js HTTP Server.
 */

const http = require('http');

const toolDefinition = {
  name: "show_choice_card",
  display_name: "Show Choice Card",
  description: "Renders an inline Proteus action card with interactive choice buttons in chat for guided onboarding and user selections.",
  endpoint: "/execute",
  http_method: "POST",
  parameters: [
    {
      name: "prompt",
      type: "string",
      description: "Short heading or question displayed on the choice card (e.g. 'Have you finished installing your agents from the Directory?').",
      required: true
    },
    {
      name: "options",
      type: "array",
      description: "List of button choice labels (e.g. ['Done installing', 'Skip for now']).",
      required: true
    },
    {
      name: "subtitle",
      type: "string",
      description: "Optional secondary explanatory text displayed below the prompt.",
      required: false
    }
  ]
};

function getField(obj, fieldName) {
  if (!obj || typeof obj !== 'object') return undefined;
  if (obj[fieldName] !== undefined) return obj[fieldName];
  if (obj.parameters && obj.parameters[fieldName] !== undefined) return obj.parameters[fieldName];
  if (obj.params && obj.params[fieldName] !== undefined) return obj.params[fieldName];
  return undefined;
}

function normalizeOptions(options) {
  if (Array.isArray(options)) {
    return options.map(opt => typeof opt === 'string' ? opt.trim() : String(opt));
  }
  if (typeof options === 'string') {
    try {
      const parsed = JSON.parse(options);
      if (Array.isArray(parsed)) {
        return parsed.map(opt => typeof opt === 'string' ? opt.trim() : String(opt));
      }
    } catch (e) {
      return options.split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  return [];
}

function buildProteusCard(promptText, optionsList, subtitleText) {
  const bodyComponents = [];

  // Heading text (Proteus schema requires numeric fontWeight e.g. "600", not "bold")
  bodyComponents.push({
    $type: "Text",
    fontSize: "md",
    fontWeight: "600",
    color: "fg.default",
    children: promptText || "Choose an option:"
  });

  if (subtitleText && subtitleText.trim()) {
    bodyComponents.push({
      $type: "Text",
      fontSize: "sm",
      color: "fg.secondary",
      children: subtitleText.trim()
    });
  }

  const buttons = optionsList.map(opt => {
    const isSecondary = /skip|later|change|fix/i.test(opt);
    const appearance = isSecondary ? "subtle" : "primary-opal";

    return {
      $type: "Button",
      appearance: appearance,
      children: opt,
      onClick: {
        message: opt
      }
    };
  });

  bodyComponents.push({
    $type: "Group",
    flexDirection: "row",
    gap: "8",
    flexWrap: "wrap",
    children: buttons
  });

  return {
    $type: "Document",
    appName: "Mark Onboarding",
    title: promptText || "Make a selection",
    appearance: "inline",
    body: [
      {
        $type: "Group",
        flexDirection: "column",
        gap: "10",
        p: "4",
        children: bodyComponents
      }
    ]
  };
}

function parseBody(req, callback) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'object') {
      return callback(req.body);
    }
    if (typeof req.body === 'string') {
      try {
        return callback(JSON.parse(req.body));
      } catch (e) {
        return callback({});
      }
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
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  const url = (req.url || '').toLowerCase();

  const sendJson = (statusCode, data, contentType) => {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', contentType);
    if (typeof res.json === 'function') {
      return res.json(data);
    }
    return res.end(JSON.stringify(data));
  };

  // POST /execute -> Execute and return Proteus UI Document
  if (req.method === 'POST' || url.includes('/execute')) {
    parseBody(req, (body) => {
      const prompt = getField(body, 'prompt') || "Make a selection:";
      const rawOptions = getField(body, 'options');
      const options = normalizeOptions(rawOptions);
      const subtitle = getField(body, 'subtitle') || null;

      const proteusDocument = buildProteusCard(prompt, options, subtitle);

      return sendJson(200, {
        message: `The choice card has been presented to the user with ${options.length} options. Prompt the user in one short sentence to make their selection.`,
        content: {
          status: "displayed",
          prompt: prompt,
          options: options
        },
        ui: proteusDocument
      }, 'application/vnd.optimizely.opal.tools+json');
    });
    return;
  }

  // GET /discovery -> Returns discovery schema with v2 discovery MIME type
  return sendJson(200, {
    functions: [toolDefinition],
    tools: [toolDefinition]
  }, 'application/vnd.optimizely.opal.tools.discovery+json');
}

// 1. Export for Vercel Serverless Function
module.exports = handler;

// 2. Start HTTP server if run directly or by Vercel Node.js Server Builder
if (require.main === module || process.env.PORT) {
  const port = process.env.PORT || 3000;
  const server = http.createServer(handler);
  server.listen(port, () => {
    console.log(`Choice card tool running on port ${port}`);
  });
}
