---
name: Python ML Service Standards
description: Rules for Flask nutriscore/ML service and tests
applyTo: "server/python_service/**/*.py"
---

# Python Service Standards

- Keep endpoint responses explicit and stable for Node backend integration.
- Preserve model loading and feature-order handling unless migration is intentional.
- Prefer deterministic preprocessing and avoid hidden side effects.
- Add/adjust pytest coverage for changes in scoring or prediction logic.
- Keep numerical transformations documented when changing thresholds or formulas.
- Update quick-start or model docs when filenames or run steps change.

## Advanced Workflow
- Confirm endpoint contract expectations from backend callers before editing.
- Guard against feature-order mismatch, missing field handling, and numerical edge cases.
- Validate touched logic with focused pytest first, then broader checks.
- When thresholds/formulas change, include rationale and regression-risk notes.
- Report deterministic behavior assumptions and drift-related risks.
