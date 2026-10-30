/**
 * Execution endpoint for show_choice_card tool.
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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

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
};
