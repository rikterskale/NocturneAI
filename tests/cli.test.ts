import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const cli = "dist/apps/control-plane/src/cli.js";

function runCli(...args: string[]) {
  return spawnSync(process.execPath, [cli, ...args], { encoding: "utf8" });
}

test("CLI returns a successful JSON policy result", () => {
  const result = runCli("policy-check", "https://lab.example.test", "R2");
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).allowed, true);
});

test("CLI returns a failing JSON policy result for an out-of-scope target", () => {
  const result = runCli("policy-check", "https://outside.example.test", "R0");
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stdout).reason, "Target is outside the approved scope.");
});

test("CLI issues a grant only for a permitted operation", () => {
  const allowed = runCli("grant-check", "https://lab.example.test", "R2", "engagement.execution-grant.issue", "a".repeat(64));
  const denied = runCli("grant-check", "https://outside.example.test", "R0", "engagement.execution-grant.issue", "a".repeat(64));
  assert.equal(allowed.status, 0);
  assert.equal(JSON.parse(allowed.stdout).allowed, true);
  assert.equal(denied.status, 1);
  assert.equal(JSON.parse(denied.stdout).allowed, false);
});

test("CLI records and verifies the policy decision in its audit output", () => {
  const result = runCli("audit-check", "https://lab.example.test", "R2");
  assert.equal(result.status, 0);
  const output = JSON.parse(result.stdout);
  assert.equal(output.decision.allowed, true);
  assert.deepEqual(output.verification, { valid: true, eventCount: 1 });
  assert.equal(output.audit[0].type, "policy_allowed");
});

test("CLI audits denied policy decisions and exits fail-closed", () => {
  const result = runCli("audit-check", "https://outside.example.test", "R0");
  assert.equal(result.status, 1);
  const output = JSON.parse(result.stdout);
  assert.equal(output.decision.allowed, false);
  assert.equal(output.audit[0].type, "policy_denied");
  assert.deepEqual(output.verification, { valid: true, eventCount: 1 });
});

test("CLI preserves an unnormalized malformed target in denied audit evidence", () => {
  const result = runCli("audit-check", "not-a-url", "R0");
  assert.equal(result.status, 1);
  const output = JSON.parse(result.stdout);
  assert.equal(output.audit[0].payload.target, "not-a-url");
});

test("CLI rejects every incomplete or unknown command shape", () => {
  for (const args of [[], ["unknown", "https://lab.example.test", "R0"], ["policy-check"], ["policy-check", "https://lab.example.test"], ["grant-check"], ["grant-check", "https://lab.example.test", "R0"], ["grant-check", "https://lab.example.test", "R0", "capability"], ["audit-check"], ["audit-check", "https://lab.example.test"]]) {
    const result = runCli(...args);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Usage:/);
  }
});
