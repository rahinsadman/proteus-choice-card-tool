/**
 * Proteus Choice Card Custom Tool for Optimizely Opal & Mark.
 * Unified root handler for Vercel Serverless Functions.
 */

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

  bodyComponents.push({
    $type: "Text",
    fontSize: "md",
    fontWeight: "bold",
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

module.exports = (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = (req.url || '').toLowerCase();

  // POST /execute -> Run tool & return Proteus UI Document
  if (req.method === 'POST' || url.includes('/execute')) {
    const body = req.body || {};
    const prompt = body.prompt || "Make a selection:";
    const options = normalizeOptions(body.options);
    const subtitle = body.subtitle || null;

    const proteusDocument = buildProteusCard(prompt, options, subtitle);

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

  // GET /discovery or GET / -> Return discovery schema for Opal Registry
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json({
    functions: [toolDefinition],
    tools: [toolDefinition]
  });
};
