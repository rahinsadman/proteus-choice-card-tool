/**
 * Proteus UI Choice Card Custom Tool for Optimizely Opal & Mark.
 * Renders an inline Proteus action card with interactive choice buttons.
 * Supports Vercel Serverless Functions and standalone Node.js environments.
 */

// Tool manifest compliant with Opal Registry discovery requirements
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

/**
 * Normalizes options input whether passed as an Array or JSON-encoded string.
 */
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
      // Fallback: comma-delimited string
      return options.split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  return [];
}

/**
 * Builds the Proteus Document Specification JSON.
 * Follows Optiaxiom Proteus UI standards with inline appearance and primary-opal / subtle buttons.
 */
function buildProteusCard(promptText, optionsList, subtitleText) {
  const bodyComponents = [];

  // Prompt heading / text
  bodyComponents.push({
    $type: "Text",
    fontSize: "md",
    fontWeight: "bold",
    color: "fg.default",
    children: promptText || "Choose an option:"
  });

  // Optional subtitle
  if (subtitleText && subtitleText.trim()) {
    bodyComponents.push({
      $type: "Text",
      fontSize: "sm",
      color: "fg.secondary",
      children: subtitleText.trim()
    });
  }

  // Action buttons
  const buttons = optionsList.map((opt) => {
    // Style affirmative options in primary-opal, and secondary/skip in subtle
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

  // Wrap buttons in horizontal flex group
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

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = req.url || '';

  // 1. Discovery Endpoint
  if (req.method === 'GET' || url.includes('/discovery')) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({
      functions: [toolDefinition],
      tools: [toolDefinition]
    });
  }

  // 2. Execution Endpoint
  if (req.method === 'POST') {
    const body = req.body || {};
    const prompt = body.prompt || "Make a selection:";
    const options = normalizeOptions(body.options);
    const subtitle = body.subtitle || null;

    const proteusDocument = buildProteusCard(prompt, options, subtitle);

    // Opal v2 Composable Tool Response format
    res.setHeader('Content-Type', 'application/vnd.optimizely.opal.tools+json');
    return res.status(200).json({
      message: `Choice card presented with ${options.length} options. Waiting for selection.`,
      content: {
        status: "displayed",
        prompt: prompt,
        options: options
      },
      ui: proteusDocument
    });
  }

  return res.status(404).json({ error: "Endpoint not found" });
};
