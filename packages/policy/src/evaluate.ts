import { riskClasses, type AuthorizationRecord, type PolicyDecision, type RiskClass, type ScopeRule } from "../../contracts/src/domain.js";

const riskRank: Record<RiskClass, number> = { R0: 0, R1: 1, R2: 2, R3: 3, R4: 4, R5: 5 };

export function evaluatePolicy(input: {
  authorization: AuthorizationRecord;
  scope: ScopeRule;
  target: string;
  requestedRisk: RiskClass;
  now?: Date;
}): PolicyDecision {
  const now = input.now ?? new Date();
  const target = normalizeTarget(input.target);
  if (!target) return { allowed: false, reason: "Target must be an absolute HTTP(S) URL." };
  if (!riskClasses.includes(input.requestedRisk)) return { allowed: false, normalizedTarget: target, reason: "Requested risk class is invalid." };
  if (input.authorization.revokedAt) return { allowed: false, normalizedTarget: target, reason: "Authorization is revoked." };
  if (now < new Date(input.authorization.validFrom) || now > new Date(input.authorization.validUntil)) {
    return { allowed: false, normalizedTarget: target, reason: "Authorization is not currently valid." };
  }
  const host = new URL(target).hostname.toLowerCase();
  if (matches(host, input.scope.denyHosts)) return { allowed: false, normalizedTarget: target, reason: "Target is explicitly denied by scope." };
  if (!matches(host, input.scope.allowHosts)) return { allowed: false, normalizedTarget: target, reason: "Target is outside the approved scope." };
  if (riskRank[input.requestedRisk] > riskRank[input.scope.riskCeiling]) {
    return { allowed: false, normalizedTarget: target, reason: `Requested risk ${input.requestedRisk} exceeds scope ceiling ${input.scope.riskCeiling}.` };
  }
  return { allowed: true, normalizedTarget: target, reason: "Authorization, scope, and risk ceiling permit policy evaluation." };
}

function normalizeTarget(value: string): string | undefined {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    url.hash = "";
    return url.toString();
  } catch {
    return undefined;
  }
}

function matches(host: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => host === pattern || host.endsWith(`.${pattern}`));
}
