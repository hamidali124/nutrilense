---
name: Backend Express Standards
description: Rules for Node/Express backend APIs
applyTo: "server/**/*.js"
---

# Backend Standards

- Keep route contracts backward compatible unless task explicitly requires changes.
- Use existing route separation under `server/routes` and model definitions under `server/models`.
- Validate request input before processing and return consistent JSON payloads.
- Preserve authentication flows in `server/routes/auth.js` and do not weaken JWT checks.
- Prefer explicit error responses over generic failures.
- If backend behavior depends on Python service availability, document fallback or expected failure behavior.

## Advanced Workflow
- For each touched endpoint, document input/output/status/error contract before editing.
- Validate auth and validation middleware paths explicitly.
- Re-check app consumer compatibility when changing response shape or defaults.
- Coordinate backend ↔ python payload updates as one compatibility unit.
- Report command outcomes and unresolved risk clearly.
