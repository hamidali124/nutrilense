---
name: backend-api-change
description: Safely update Express API behavior while preserving contracts with app and Python service.
argument-hint: route-or-contract-area
user-invocable: true
---

# Backend API Change Skill

Use for changes in `server/routes`, `server/models`, and `server/server.js`.

## Rules
- Keep JSON response contracts consistent unless explicitly changing them.
- Validate input handling and error responses.
- Coordinate payload changes with Python service and mobile consumer.
- Protect auth and authorization checks from accidental regressions.

## Procedure
1. Identify route contract: inputs, outputs, status codes, errors.
2. Implement minimal route/model update.
3. Verify auth and validation paths.
4. Re-check backend ↔ python compatibility where relevant.
5. If contract changed, document migration/compatibility notes.
6. Run backend startup check and relevant tests.

## Deliverable
- Contract comparison (before/after)
- Validation outcomes
- Compatibility/risk notes
