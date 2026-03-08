---
name: react-native-delivery
description: Implement safe React Native/Expo changes with focused validation and stable app behavior.
argument-hint: feature-or-bug-scope
user-invocable: true
---

# React Native Delivery Skill

Use for work in `App.js` and `src/**`.

## Rules
- Keep business logic in hooks/services where possible.
- Preserve navigation/auth state behavior unless explicitly changing it.
- Reuse existing modules before adding new abstractions.
- Keep loading/error/empty states explicit for user-facing reliability.

## Procedure
1. Map impacted screens/components/services.
2. Implement smallest behavioral change.
3. Add or adjust tests if user-visible behavior changed.
4. Run focused test command(s) and record outcomes.
5. Re-check high-risk flows (scanner, parser, async state transitions).
6. Provide short risk notes for OCR/parsing edge cases.

## Deliverable
- Changed files
- Behavior delta summary
- Validation matrix
- Remaining UX/edge-case risks
