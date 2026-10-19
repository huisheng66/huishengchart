# Global ER Conceptual Style Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the high-speed ticketing Chen ER readability improvements to all SQL schemas, with an optional DeepSeek schema-analysis adapter.

**Architecture:** Keep the current ticketing-specific style as the highest-priority path. Add a generic conceptual style builder for all other schemas, then route `toChenFlow` through a shared conceptual-style entrypoint. Add an isolated DeepSeek adapter that can be wired later without putting API keys into the rendering path.

**Tech Stack:** TypeScript, React Flow graph adapters, Vitest, DeepSeek OpenAI-compatible Chat API.

---

## File Map

| File | Change |
| --- | --- |
| `src/diagram/generic-conceptual-style.ts` | New generic table labels, attribute selection, relation naming, relation priority, semantic positions |
| `src/diagram/conceptual-style.ts` | New router: ticketing style first, generic fallback second |
| `src/diagram/chen-adapter.ts` | Use shared conceptual style entrypoint |
| `src/diagram/adapters.test.ts` | Add non-ticketing global conceptual style tests |
| `src/ai/deepseek-schema-analysis.ts` | New optional DeepSeek request/response adapter |
| `src/ai/deepseek-schema-analysis.test.ts` | Test DeepSeek request shape and validation |
| `src/diagram/chen-geometry.ts`, `src/diagram/layout.ts`, `src/diagram/adapters.test.ts` | Remove existing unused imports so lint is clean |

## Tasks

### Task 1: Generic Conceptual Style Tests

- [ ] Add a non-ticketing sales/order schema test in `src/diagram/adapters.test.ts`.
- [ ] Verify the test fails because the current generic Chen path still exposes physical names and grid-style placement.

### Task 2: Generic Conceptual Style Implementation

- [ ] Create `src/diagram/generic-conceptual-style.ts`.
- [ ] Create `src/diagram/conceptual-style.ts`.
- [ ] Update `src/diagram/chen-adapter.ts` to use the router.
- [ ] Run the targeted adapter tests.

### Task 3: DeepSeek Adapter

- [ ] Add `src/ai/deepseek-schema-analysis.test.ts` with a mocked `fetch`.
- [ ] Verify the test fails because the adapter does not exist.
- [ ] Add `src/ai/deepseek-schema-analysis.ts`.
- [ ] Run the targeted AI adapter tests.

### Task 4: Lint Cleanup and Verification

- [ ] Remove unused imports reported by ESLint.
- [ ] Run `npm test`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
