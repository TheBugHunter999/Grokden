/**
 * Stress tests for Parallel Agents grid helpers.
 * Run: node scripts/stress-agent-grid.mjs
 */

import {
  MAX_AGENTS,
  clampAgentCount,
  computeAgentGridLayout,
  createEmptyAgents,
  createEmptyGoal,
  getAssignedGoalIds,
  getUnassignedGoals,
  groupGoalsByCategory,
  pickGoalsForNewAgents,
} from "../src/lib/agent-grid.ts";

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed++;
  } else {
    failed++;
    console.error("FAIL:", msg);
  }
}

function eq(a, b, msg) {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  assert(ok, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

console.log("=== agent-grid stress tests ===\n");

// clampAgentCount edge cases
eq(clampAgentCount(0), 1, "count 0 → 1");
eq(clampAgentCount(-3), 1, "negative → 1");
eq(clampAgentCount(99), MAX_AGENTS, "over max → MAX_AGENTS");
eq(clampAgentCount(2.6), 3, "rounds 2.6 → 3");
eq(clampAgentCount(NaN), 1, "NaN → 1");
eq(clampAgentCount(Infinity), 1, "Infinity → 1");

// grid layout 1–4 agents
eq(computeAgentGridLayout(1), { cols: 1, rows: 1 }, "1 agent: 1×1");
eq(computeAgentGridLayout(2), { cols: 2, rows: 1 }, "2 agents: 2×1");
eq(computeAgentGridLayout(3), { cols: 2, rows: 2 }, "3 agents: 2×2");
eq(computeAgentGridLayout(4), { cols: 2, rows: 2 }, "4 agents: 2×2");
eq(computeAgentGridLayout(0), { cols: 1, rows: 1 }, "0 count preview: 1×1");
eq(computeAgentGridLayout(NaN), { cols: 1, rows: 1 }, "NaN count preview: 1×1");

// launch without goals (empty prompts)
const noGoals = createEmptyAgents(3, []);
eq(noGoals.length, 3, "launch 3 agents with no goals");
assert(noGoals.every((a) => a.goalId === null), "no goal links when goals empty");
assert(noGoals.every((a) => /^Agent \d+$/.test(a.label)), "default labels when no goals");

// goal CRUD grouping
const g1 = createEmptyGoal({ title: "A", category: "Alpha" });
const g2 = createEmptyGoal({ title: "B", category: "Beta" });
const g3 = createEmptyGoal({ title: "C", category: "  " });
const grouped = groupGoalsByCategory([g1, g2, g3]);
assert(grouped.get("Alpha")?.length === 1, "category Alpha has 1 goal");
assert(grouped.get("Beta")?.length === 1, "category Beta has 1 goal");
assert(grouped.get("Goals")?.length === 1, "blank category → Goals");

// slot assignment — no duplicate goal IDs
const goals = [g1, g2, g3];
const slotAgents = createEmptyAgents(1, [g2]);
const taken = getAssignedGoalIds(slotAgents);
assert(taken.has(g2.id), "assigned goal tracked");
const unassigned = getUnassignedGoals(goals, slotAgents);
assert(unassigned.length === 2, "two unassigned after one slot");
assert(!unassigned.some((g) => g.id === g2.id), "assigned goal excluded");

// resize: pickGoalsForNewAgents must not re-assign taken goals
const picked = pickGoalsForNewAgents(goals, slotAgents, 2);
eq(
  picked.map((g) => g.id),
  [g1.id, g3.id],
  "new slots get unassigned goals only",
);

const extra = createEmptyAgents(2, picked);
assert(
  extra.every((a) => a.goalId !== g2.id),
  "resize extras never duplicate an already-assigned goal",
);

// MAX_AGENTS cap
const four = createEmptyAgents(MAX_AGENTS + 10, goals);
eq(four.length, MAX_AGENTS, "createEmptyAgents respects MAX_AGENTS");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);