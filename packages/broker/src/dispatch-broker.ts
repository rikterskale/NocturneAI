import type { AuditEventType, AuthorizationRecord, GrantDecision, ScopeRule } from "../../contracts/src/domain.js";
import { verifyExecutionGrant } from "../../grants/src/execution-grant.js";
import { SigningKeyRing } from "../../grants/src/signing-keys.js";

export interface ConstrainedWorkerAdapter {
  readonly profile: string;
  readonly capabilityIds: readonly string[];
  dispatch(input: Readonly<{ grantId: string; target: string; capabilityId: string; argumentsHash: string }>): Promise<void>;
}

export interface DispatchInput {
  readonly token: string;
  readonly authorization: AuthorizationRecord;
  readonly scope: ScopeRule;
  readonly target: string;
  readonly capabilityId: string;
  readonly argumentsHash: string;
  readonly adapter: ConstrainedWorkerAdapter;
  readonly now?: Date;
}

export type DispatchDecision = GrantDecision & { readonly dispatched?: true; readonly auditEvent?: AuditEventType };

/** The sole worker boundary: every request is bound to its grant and revalidated immediately before dispatch. */
export class DispatchBroker {
  constructor(private readonly keyRing: SigningKeyRing) {}

  async dispatch(input: DispatchInput): Promise<DispatchDecision> {
    const verified = verifyExecutionGrant({ token: input.token, authorization: input.authorization, scope: input.scope, signingKey: "", keyRing: this.keyRing, now: input.now ?? new Date() });
    if (!verified.allowed) return { ...verified, auditEvent: "dispatch_denied" };
    const { claims } = verified;
    if (claims.target !== input.target || claims.capabilityId !== input.capabilityId || claims.argumentsHash !== input.argumentsHash || !input.adapter.capabilityIds.includes(claims.capabilityId)) {
      return { allowed: false, reason: "Execution grant does not match the constrained dispatch request.", auditEvent: "dispatch_denied" };
    }
    await input.adapter.dispatch({ grantId: claims.id, target: claims.target, capabilityId: claims.capabilityId, argumentsHash: claims.argumentsHash });
    return { ...verified, dispatched: true, auditEvent: "dispatch_completed" };
  }
}
