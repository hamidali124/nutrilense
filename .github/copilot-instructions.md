# NutriLens Copilot Instructions

## Repository Overview
- NutriLens is a React Native (Expo) mobile app with a Node/Express backend and a Python Flask ML service.
- Mobile app entry point: `App.js`.
- Backend entry point: `server/server.js`.
- Python service entry point: `server/python_service/nutriscore_api.py`.

## High-Value Paths
- App UI and flows: `src/components`, `src/screens`, `src/hooks`, `src/contexts`.
- App services/parsers: `src/services`.
- Backend API routes: `server/routes`.
- Backend data model: `server/models`.
- Python models and feature definitions: `server/python_service/models`.
- JS tests: `__tests__`.
- Python tests: `server/python_service/tests`.

## Advanced Execution Protocol (Mandatory)
1. Scope precisely
	- Extract requirements, constraints, and non-goals.
	- Build an impact map across mobile/backend/python/tests/docs.
2. Plan before broad edits
	- Propose dependency-aware steps and verification gates.
	- Prefer smallest implementation that satisfies requirements.
3. Preserve contracts
	- Treat app ↔ backend and backend ↔ python payloads as compatibility boundaries.
4. Validate in layers
	- Focused checks first, broad checks second.
	- Capture pass/fail/blocked evidence for commands run.
5. Multi-pass review
	- Static review: inspect diffs for regressions and unrelated edits.
	- Behavioral review: validate user-visible/API-visible outcomes.
	- Risk review: list unresolved edge cases and assumptions.
6. Completion gate
	- Do not finish without changed-file summary, validation matrix, and residual risks.

## Working Rules
- Prefer minimal, targeted edits.
- Keep existing architecture and naming intact unless explicitly requested.
- Do not add new dependencies unless required.
- Update docs when behavior or setup changes.
- When changing parsing, nutrition, or scoring logic, validate with focused tests first.

## Validation Workflow
- Frontend/app tests: `npm test` (repo root).
- Backend run check: `cd server && npm start`.
- Python service run check: `cd server/python_service && python nutriscore_api.py`.
- Python tests: `cd server/python_service && pytest`.

## API/Service Coordination
- Node backend expects Python service to be running for prediction flows.
- Prefer changes that keep API contracts stable between `server/routes/nutrition.js` and Python endpoints.

## High-Risk Contract Hotspots
- `src/services/nutriscoreService.js` and parser/extractor services under `src/services`.
- `server/routes/nutrition.js` request/response handling and error paths.
- `server/python_service/nutriscore_api.py` endpoint payload and numerical transformation logic.

## Known Caveat
- `server/python_service/QUICK_START.md` references old model filenames. Current model files are `rf_hypertension.pkl`, `rf_diabetes.pkl`, `model_features_hypertension.json`, and `model_features_diabetes.json`.

## Agent Behavior
- Trust these instructions first; search only when details are missing or stale.
- Use prompts and skills from `.github/prompts` and `.github/skills` when they match the task.
- Summarize verification steps and outcomes after code changes.
