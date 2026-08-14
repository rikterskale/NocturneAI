import { randomUUID } from "node:crypto";
import type { Approval, Engagement, RoEVersion } from "../../contracts/src/domain.js";
import { AuditTrail } from "../../audit/src/audit-trail.js";

export class EngagementLifecycle {
  readonly #engagements = new Map<string, Engagement>();
  readonly #approvals = new Map<string, Approval>();
  readonly audit = new AuditTrail();

  create(id: string, name: string, roe: RoEVersion): Engagement {
    if (!id || !name || this.#engagements.has(id)) throw new Error("Engagement ID and name must be unique and non-empty.");
    const engagement: Engagement = { id, name, state: "draft", roe };
    this.#engagements.set(id, engagement);
    this.audit.append("policy_allowed", { engagementId: id, action: "created" });
    return engagement;
  }

  activate(id: string): Engagement { return this.transition(id, "draft", "active"); }
  stop(id: string): Engagement { return this.transition(id, "active", "stopped"); }
  list(): readonly Engagement[] { return [...this.#engagements.values()]; }

  approve(input: Omit<Approval, "id" | "revokedAt">, now = new Date()): Approval {
    const engagement = this.require(input.engagementId);
    if (engagement.state !== "active") throw new Error("Approvals require an active engagement.");
    if (new Date(input.expiresAt) <= now) throw new Error("Approval expiry must be in the future.");
    const approval: Approval = { ...input, id: randomUUID() };
    this.#approvals.set(approval.id, approval);
    this.audit.append("grant_issued", { approvalId: approval.id, engagementId: approval.engagementId });
    return approval;
  }

  revokeApproval(id: string): Approval {
    const approval = this.#approvals.get(id);
    if (!approval || approval.revokedAt) throw new Error("Approval is not active.");
    const revoked = { ...approval, revokedAt: new Date().toISOString() };
    this.#approvals.set(id, revoked);
    this.audit.append("grant_denied", { approvalId: id, action: "revoked" });
    return revoked;
  }

  private transition(id: string, expected: Engagement["state"], next: Engagement["state"]): Engagement {
    const engagement = this.require(id);
    if (engagement.state !== expected) throw new Error(`Engagement transition requires ${expected} state.`);
    const updated = { ...engagement, state: next } as Engagement;
    this.#engagements.set(id, updated);
    this.audit.append("policy_allowed", { engagementId: id, action: next });
    return updated;
  }

  private require(id: string): Engagement {
    const engagement = this.#engagements.get(id);
    if (!engagement) throw new Error("Engagement does not exist.");
    return engagement;
  }
}
