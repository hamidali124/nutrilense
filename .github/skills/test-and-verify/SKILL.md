---
name: test-and-verify
description: Run targeted verification first, then broaden checks with a clear confidence summary.
argument-hint: changed-files-or-feature
user-invocable: true
---

# Test and Verify Skill

Use before declaring any coding task complete.

## Validation strategy
- Start narrow and deterministic.
- Escalate to broader checks only when necessary.
- Report command outcomes explicitly.

## Procedure
1. Identify changed modules and nearest test targets.
2. Run focused JS or Python tests first.
3. Run broader command only if focused checks are insufficient.
4. Re-check contract-sensitive behavior after test pass for high-risk changes.
5. Record pass/fail/blocked state with reason.
6. Summarize residual risk and untested paths.

## Output contract
- Validation matrix: command, result, brief evidence
- Untested paths
- Confidence level: high/medium/low

## Command examples
- JS tests: `npm test`
- Python tests: `cd server/python_service && pytest`
