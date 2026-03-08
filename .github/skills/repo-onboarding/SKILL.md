---
name: repo-onboarding
description: Quickly map NutriLens architecture, run commands, and validation flow before coding.
argument-hint: optional-task-scope
user-invocable: true
---

# Repo Onboarding Skill

Use this skill at the start of a coding task in this repository.

## Objectives
- Understand where the change belongs (mobile, backend, python service, or cross-layer).
- Confirm local validation commands before editing.
- Identify external dependencies and integration prerequisites.
- Establish compatibility boundaries before making edits.

## Procedure
1. Read `.github/copilot-instructions.md` and relevant `.github/instructions/*.instructions.md` files.
2. Identify entry points and impacted folders.
3. Identify contract boundaries (app ↔ backend, backend ↔ python).
4. Choose the smallest validation command set for the task.
5. Note whether MongoDB and Python service are required for verification.
6. Continue with implementation only after scope and acceptance criteria are clear.

## Deliverable
- Impact map by layer
- Validation plan with command order
- Assumptions and known risks

## Quick Commands
- Frontend tests: `npm test`
- Backend run: `cd server && npm start`
- Python tests: `cd server/python_service && pytest`
