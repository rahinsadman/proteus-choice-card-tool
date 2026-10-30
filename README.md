# Proteus Choice Card Custom Tool for Optimizely Opal & Mark

A lightweight, serverless custom tool that renders native **Proteus UI interactive action cards** inside Optimizely Mark chat threads.

This tool replaces `ask_user_question`, preventing question cards from being hoisted to the top of the message bubble or suppressing streaming text.

---

## Features

- **Native Proteus UI Document**: Returns `ui: { $type: "Document", appearance: "inline", ... }`.
- **Interactive Buttons**: Clicking a choice automatically triggers `{ onClick: { message: "<choice>" } }`, sending the selection into Mark chat as the user's turn.
- **Brand Colors**: Primary action choices use `primary-opal` (Optimizely Lime `#BEFD66` fill / dark text), while secondary actions (Skip, Later, Change) use `subtle`.
- **Dual Compatibility**: Runs on **Vercel** as a serverless function or as a standalone **Node.js** HTTP server (e.g. for local testing, Docker, or Cloudflare/AWS).
- **Opal Registry Compliant**: Implements the dual `"functions"` / `"tools"` discovery envelope to pass Opal tool registry validation without schema parsing errors.

---

## Endpoints

- `GET /discovery` — Tool manifest for Opal registry.
- `POST /execute` — Execution handler receiving `{ prompt, options, subtitle }` and returning the Proteus Document.

---

## Tool Parameter Schema

| Parameter | Type | Required | Description |
|---|---|---|---|
| `prompt` | string | Yes | The question or heading displayed on the card (e.g., `"Have you finished installing your agents from the Directory?"`). |
| `options` | array (strings) | Yes | List of clickable buttons (e.g., `["Done installing", "Skip for now"]`). |
| `subtitle` | string | No | Optional secondary explanatory text. |

---

## Local Testing

1. Run unit tests:
   ```bash
   node test.js
   ```
2. Run local server:
   ```bash
   node server.js
   ```
3. Test Discovery via curl:
   ```bash
   curl http://localhost:3000/discovery
   ```
4. Test Execution via curl:
   ```bash
   curl -X POST http://localhost:3000/execute \
     -H "Content-Type: application/json" \
     -d '{
       "prompt": "Which area would you like to add?",
       "options": ["Key metrics", "Conversion funnel", "Upload a document", "Done / Finalize"]
     }'
   ```

---

## Deploy to Vercel

1. Create a new GitHub repository and push this directory's files.
2. In [Vercel](https://vercel.com/new), import the repository and deploy.
3. In Optimizely Mark, go to **Connectors > Registries > Add tool registry**:
   - **Name**: `Proteus Choice Cards`
   - **Discovery URL**: `https://<your-vercel-app>.vercel.app/discovery`
4. Enable `show_choice_card` in your Mark agent (e.g. `mark_onboarding`).
