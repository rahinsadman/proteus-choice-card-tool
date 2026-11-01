// Shared Proteus Document Template and Tool Definition
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
          children: [
            {
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
          ]
        }
      ]
    }
  ]
};

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

function getField(obj, fieldName) {
  if (!obj || typeof obj !== 'object') return undefined;
  if (obj[fieldName] !== undefined) return obj[fieldName];
  if (obj.parameters && obj.parameters[fieldName] !== undefined) return obj.parameters[fieldName];
  if (obj.params && obj.params[fieldName] !== undefined) return obj.params[fieldName];
  return undefined;
}

module.exports = {
  RESOURCE_URI,
  toolDefinition,
  templateDocument,
  normalizeOptions,
  getField
};
