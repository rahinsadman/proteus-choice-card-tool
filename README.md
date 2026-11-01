# Proteus Choice Card Tool (v3 - Universal ui_resource & Dual Binding)

Production-ready Proteus action card custom tool for Optimizely Opal & Mark.

## What's New in This Version

1. **Explicit MCP `ui_resource`**:
   - Advertises `ui_resource: "ui://choice-card/template"` in `/discovery`.
   - Uses `application/vnd.optimizely.opal.tools.discovery+json`.
2. **Dedicated Resource Reader (`POST /resources/read`)**:
   - Exposes the Proteus Document specification via Model Context Protocol (`application/vnd.opal.proteus+json`).
   - Dynamically resolves `{ uri: "ui://choice-card/template" }` regardless of whether Vercel rewrites the request path or dispatches directly.
3. **Dual Data Binding**:
   - `POST /execute` returns `prompt`, `subtitle`, and `options` at **both** the top-level dictionary and inside the `content` envelope.
   - Guaranteed to bind whether the host client resolves expressions against the root or `content`.
4. **Button Actions**:
   - Options are mapped to interactive Axiom buttons with `{ onClick: { message: "<value>" } }`.
   - Clicking an option immediately dispatches that option as a chat message on the user's behalf.
