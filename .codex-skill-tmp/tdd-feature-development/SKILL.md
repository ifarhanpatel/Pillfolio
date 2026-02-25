---
name: tdd-feature-development
description: Test-driven feature development workflow for implementing or modifying application behavior using small red-green-refactor cycles. Use when Codex is asked to build a feature, fix behavior, or change logic with TDD/test-first expectations (for example: "use TDD", "write failing tests first", "red green refactor", "add tests while implementing"), or when a safer incremental feature workflow is needed in a codebase with automated tests.
---

# TDD Feature Development

Implement features in small behavior slices with explicit red-green-refactor loops. Keep the loop observable, fast, and reversible.

## Operating Rules

- Start from behavior, not implementation.
- Write or update one failing test before changing production code.
- Make the smallest code change that turns the test green.
- Refactor only while tests are green.
- Run the narrowest useful test command first; expand scope before finishing.
- Keep each commit-ready slice small enough to explain in 1-2 sentences.

## Workflow

## 1. Establish the Slice

Translate the request into the smallest externally visible behavior change.

- Identify the first acceptance slice (one scenario, one edge case, or one output change).
- State the expected behavior in concrete terms before writing code.
- Locate the most appropriate test layer:
  - Unit test for pure logic or isolated branching
  - Integration/service test for component interaction or persistence
  - UI/end-to-end test only when behavior cannot be trusted at lower layers
- Reuse existing test conventions, helpers, and naming patterns in the repo.

If the request is large, split it into sequential slices and implement only the first slice first.

## 2. Prove Red

Create a failing test that demonstrates the missing behavior.

- Prefer adding a new test over weakening an existing one.
- Name the test after behavior, not internal methods.
- Assert the observable outcome (return value, state change, API response, rendered UI, emitted event).
- Run the targeted test and confirm failure for the intended reason.

Do not continue until the test fails for a requirement-related reason (not syntax errors, broken fixtures, or unrelated setup failures).

## 3. Make Green

Implement the minimal production change to satisfy the failing test.

- Avoid speculative abstractions.
- Prefer direct, simple code over early generalization.
- Keep unrelated cleanup out of the green step.
- Re-run the same targeted test until it passes.

If additional missing behavior appears, defer it to the next red step unless it blocks the current test from passing.

## 4. Refactor Safely

Improve code structure only after the test is green.

- Remove duplication introduced during the green step.
- Improve naming and extract helpers only when it reduces complexity.
- Keep behavior unchanged; rely on tests as the safety net.
- Re-run targeted tests after refactoring.

If refactoring introduces risk, stop and keep the simpler passing version.

## 5. Expand Confidence

Repeat the loop for the next slice until the requested behavior is covered.

Before finishing:

- Run the relevant local test scope (file/package/feature area).
- Run broader checks that are standard for the repo if fast enough (for example lint/typecheck or module test suite).
- Summarize what behaviors are now covered by tests and what remains out of scope.

## Test Selection Heuristics

Choose the lowest layer that can fail for the right reason.

- Prefer unit tests for parsing, validation, mapping, calculations, and branching.
- Prefer integration tests for database writes, HTTP handlers, queue consumers, and multi-module flows.
- Prefer UI tests for interaction wiring, accessibility flows, and visual state transitions that lower layers cannot verify.
- Add regression tests at the layer where the bug originally escaped.

When multiple layers are valid, start lower for speed, then add one higher-level test only if it meaningfully reduces risk.

## Command Strategy

Discover and run the fastest credible commands available in the codebase.

- Inspect existing scripts (`package.json`, `Makefile`, `justfile`, CI config, project docs).
- Start with targeted commands (single test file, test name filter, package path).
- Run broader suites only after the slice is green.
- Capture the exact command used in the final summary when helpful for reproducibility.

If no test harness exists, create the smallest reasonable test scaffold only when it is proportionate to the request; otherwise explain the limitation and use a characterization-style validation approach.

## Change Discipline

Keep TDD work reviewable.

- Separate test changes and production changes conceptually, even if committed together.
- Avoid mixing formatting-only edits with behavior changes unless required.
- Preserve unrelated failing tests; do not "fix" them opportunistically without user direction.
- Do not rewrite tests to fit an incorrect implementation unless requirements changed.

## Communication Pattern

Make the loop visible while working.

- State the current slice before editing.
- Call out when entering red, green, and refactor steps.
- Mention the targeted test command and result.
- Note assumptions when requirements are ambiguous.

## Common Failure Modes

Correct course when TDD degrades into test-after coding.

- Writing too much production code before running the new test
- Adding multiple behaviors in one test and obscuring the failure reason
- Choosing an end-to-end test when a unit test would provide faster feedback
- Refactoring during red step and losing causal clarity
- Finishing without running a broader relevant test scope
