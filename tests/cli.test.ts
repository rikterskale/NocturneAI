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

test("CLI rejects every incomplete or unknown command shape", () => {
  for (const args of [[], ["unknown", "https://lab.example.test", "R0"], ["policy-check"], ["policy-check", "https://lab.example.test"], ["grant-check"], ["grant-check", "https://lab.example.test", "R0"], ["grant-check", "https://lab.example.test", "R0", "capability"]]) {
    const result = runCli(...args);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Usage:/);
  }
});
