---
name: Frontend React Native Standards
description: Rules for React Native app code in App.js and src/
applyTo: "App.js,index.js,src/**/*.js"
---

# Frontend Standards

- Keep component behavior predictable and avoid broad refactors.
- Reuse existing service and parser modules in `src/services` before creating new ones.
- Keep navigation behavior consistent with current screen switching patterns in `App.js`.
- Preserve existing constants/theme usage from `src/constants`.
- For OCR/scanning features, prefer changes in hooks/services over UI-layer business logic.
- For user-facing errors, surface clear messages and avoid silent failures.

## Advanced Workflow
- Before editing, identify impacted screens/components/services and expected behavior deltas.
- Prefer minimal UI diffs and explicit loading/error/empty states.
- When changing data flow, validate caller and callee service contracts.
- Run focused tests nearest to changed modules before broader test runs.
- Return a concise behavior summary: what changed for users, what stayed compatible.
