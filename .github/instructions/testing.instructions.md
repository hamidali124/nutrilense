---
name: Testing and Validation Guidance
description: How to validate changes across JS and Python tests
applyTo: "__tests__/**/*.js,server/python_service/tests/**/*.py"
---

# Testing Guidance

- Start with tests closest to changed code before broad test runs.
- Keep tests focused on behavior, not implementation details.
- When fixing bugs, add or update tests that fail before the fix and pass after.
- Prefer fixture-based deterministic inputs for OCR/parsing and nutrition scoring.
- Report commands run and whether they passed, failed, or were not run.

## Advanced Validation Matrix
- Unit/targeted first, integration second, broad suite third.
- Re-check critical contracts after test pass for high-risk changes.
- Include explicit pass/fail/blocked outcomes with brief reason.
- Document untested paths and residual confidence level.
