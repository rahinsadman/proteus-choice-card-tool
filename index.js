/**
 * Proteus Choice Card Tool - Top-Level Binding Variant
 * - Advertises "ui_resource": "ui://choice-card/template" in /discovery
 * - Serves MCP Resource at POST /resources/read with mimeType "application/vnd.opal.proteus+json"
 * - Returns execution result with prompt, options, subtitle at the root dictionary level
 */

const http = require('http');

const RESOURCE_URI = "ui://choice-card/template";

const toolDefinition = {
  name: "show_choice_card",
  display_name: "Show Choice Card",
  description: "Renders an inline Proteus action card with interactive choice buttons in chat for guided onboarding and user selections.",
  endpoint: "/execute",
  http_method: "POST",
  ui_resource: RESOURCE_URI,
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

// Proteus Document Template with dynamic Value and Map expressions
const templateDocument = {
  $type: "Document",
  appName: "Mark Onboarding",
  title: { $type: "Value", path: "/prompt" },
  appearance: "inline",
  body: [
    {
      $type: "Group",
      flexDirection: "column",
      gap: "10",
      p: "4",
      children: [
        {
          $type: "Text",
          fontSize: "md",
          fontWeight: "600",
          color: "fg.default",
          children: { $type: "Value", path: "/prompt" }
        },
        {
          $type: "Show",
          when: { "!!": { $type: "Value", path: "/subtitle" } },
          children: {
            $type: "Text",
            fontSize: "sm",
            color: "fg.secondary",
            children: { $type: "Value", path: "/subtitle" }
          }
        },
        {
          $type: "Group",
          flexDirection: "row",
          gap: "8",
          flexWrap: "wrap",
          children: {
            $type: "Map",
            path: "/options",
            children: {
              $type: "Button",
              appearance: { $type: "Value", path: "appearance" },
              children: { $type: "Value", path: "label" },
              onClick: {
                message: { $type: "Value", path: "value" }
              }
            }
          }
        }
      ]
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
  let list = [];
  if (Array.isArray(options)) {
    list = options;
  } else if (typeof options === 'string') {
    try {
      const parsed = JSON.parse(options);
      if (Array.isArray(parsed)) list = parsed;
      else list = options.split(',').map(s => s.trim()).filter(Boolean);
    } catch (e) {
      list = options.split(',').map(s => s.trim()).filter(Boolean);
    }
  }

  return list.map(opt => {
    const label = typeof opt === 'string' ? opt.trim() : (opt.label || String(opt));
    const value = typeof opt === 'object' && opt.value ? opt.value : label;
    const isSecondary = /skip|later|change|fix/i.test(label);
    const appearance = isSecondary ? "subtle" : "primary-opal";
    return { label, value, appearance };
  });
}

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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  const url = (req.url || '').toLowerCase();

  const sendJson = (statusCode, data, contentType = 'application/json') => {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', contentType);
    if (typeof res.json === 'function') {
      return res.json(data);
    }
    return res.end(JSON.stringify(data));
  };

  // 1. MCP Resource Reader endpoint: POST /resources/read
  if (url.includes('/resources/read')) {
    parseBody(req, (body) => {
      const uri = body.uri || RESOURCE_URI;
      return sendJson(200, {
        uri: uri,
        mimeType: "application/vnd.opal.proteus+json",
        text: JSON.stringify(templateDocument)
      });
    });
    return;
  }

  // 2. Tool Execution endpoint: POST /execute
  if (req.method === 'POST' || url.includes('/execute')) {
    parseBody(req, (body) => {
      const prompt = getField(body, 'prompt') || "Make a selection:";
      const rawOptions = getField(body, 'options');
      const options = normalizeOptions(rawOptions);
      const subtitle = getField(body, 'subtitle') || null;

      // PATH B: Raw top-level dictionary payload
      // Returns prompt, options, subtitle directly at top level for /path bindings
      return sendJson(200, {
        message: `The choice card has been presented to the user with ${options.length} options. Prompt the user in one short sentence to make their selection.`,
        prompt: prompt,
        options: options,
        subtitle: subtitle
      }, 'application/json');
    });
    return;
  }

  // 3. Discovery endpoint: GET /discovery
  return sendJson(200, {
    functions: [toolDefinition],
    tools: [toolDefinition]
  }, 'application/vnd.optimizely.opal.tools.discovery+json');
}

module.exports = handler;

if (require.main === module || process.env.PORT) {
  const port = process.env.PORT || 3000;
  const server = http.createServer(handler);
  server.listen(port, () => {
    console.log(`Choice card tool (top-level binding) running on port ${port}`);
  });
}
