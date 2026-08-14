import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { AuthorizationRecord, ExecutionGrantClaims, GrantDecision, RiskClass, ScopeRule } from "../../contracts/src/domain.js";
import { evaluatePolicy } from "../../policy/src/evaluate.js";

interface GrantInput {
  readonly authorization: AuthorizationRecord;
  readonly scope: ScopeRule;
  readonly target: string;
  readonly capabilityId: string;
  readonly argumentsHash: string;
  readonly riskClass: RiskClass;
  readonly signingKey: string;
  readonly ttlMs: number;
  readonly now?: Date;
}

interface VerificationInput {
  readonly token: string;
  readonly authorization: AuthorizationRecord;
  readonly scope: ScopeRule;
  readonly signingKey: string;
  readonly now?: Date;
}

export function issueExecutionGrant(input: GrantInput): GrantDecision {
  const now = input.now ?? new Date();
  const policy = evaluatePolicy({
    authorization: input.authorization,
    scope: input.scope,
    target: input.target,
    requestedRisk: input.riskClass,
    now
  });
  if (!policy.allowed) return { allowed: false, reason: policy.reason };
  if (input.ttlMs <= 0) return { allowed: false, reason: "Grant lifetime must be positive." };

  const claims: ExecutionGrantClaims = {
    version: 1,
    id: randomUUID(),
    authorizationId: input.authorization.id,
    target: policy.normalizedTarget,
    capabilityId: input.capabilityId,
    argumentsHash: input.argumentsHash,
    riskClass: input.riskClass,
    issuedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + input.ttlMs).toISOString()
  };
  const encodedClaims = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return { allowed: true, claims, token: `${encodedClaims}.${signature(encodedClaims, input.signingKey)}` };
}

export function verifyExecutionGrant(input: VerificationInput): GrantDecision {
  const [encodedClaims, receivedSignature, ...extraParts] = input.token.split(".");
  if (!encodedClaims || !receivedSignature || extraParts.length > 0 || !isSignatureValid(encodedClaims, receivedSignature, input.signingKey)) {
    return { allowed: false, reason: "Execution grant signature is invalid." };
  }
  const claims = parseClaims(encodedClaims);
  if (!claims) return { allowed: false, reason: "Execution grant payload is invalid." };
  const now = input.now ?? new Date();
  if (new Date(claims.expiresAt) <= now) return { allowed: false, reason: "Execution grant has expired." };
  if (claims.authorizationId !== input.authorization.id) return { allowed: false, reason: "Execution grant authorization does not match the active authorization." };

  const policy = evaluatePolicy({ authorization: input.authorization, scope: input.scope, target: claims.target, requestedRisk: claims.riskClass, now });
  if (!policy.allowed) return { allowed: false, reason: `Execution grant revalidation failed: ${policy.reason}` };
  return { allowed: true, token: input.token, claims };
}

function signature(value: string, signingKey: string): string {
  return createHmac("sha256", signingKey).update(value).digest("base64url");
}

function isSignatureValid(value: string, received: string, signingKey: string): boolean {
  const expected = Buffer.from(signature(value, signingKey));
  const actual = Buffer.from(received);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function parseClaims(encodedClaims: string): ExecutionGrantClaims | undefined {
  try {
    const claims = JSON.parse(Buffer.from(encodedClaims, "base64url").toString("utf8")) as ExecutionGrantClaims;
    if (claims.version !== 1 || !claims.id || !claims.authorizationId || !claims.target || !claims.capabilityId || !claims.argumentsHash || !claims.riskClass || !claims.issuedAt || !claims.expiresAt) return undefined;
    return claims;
  } catch {
    return undefined;
  }
}
