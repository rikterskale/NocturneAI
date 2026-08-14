export const riskClasses = ["R0", "R1", "R2", "R3", "R4", "R5"] as const;
export type RiskClass = (typeof riskClasses)[number];

export interface AuthorizationRecord {
  readonly id: string;
  readonly engagementId: string;
  readonly validFrom: string;
  readonly validUntil: string;
  readonly revokedAt?: string;
}

export interface ScopeRule {
  readonly allowHosts: readonly string[];
  readonly denyHosts: readonly string[];
  readonly riskCeiling: RiskClass;
}

export interface CapabilityManifest {
  readonly id: string;
  readonly title: string;
  readonly evidence: readonly ("CODE" | "DOC" | "DOC-COUNT" | "CLOUD" | "DESIGN")[];
  readonly riskClass: RiskClass;
  readonly apiOperation: string;
  readonly cliCommand: string;
  readonly guiRoute: string;
  readonly workerProfile: string;
  readonly approval: "role-authorized" | "approved-plan-required" | "per-invocation-required" | "disabled";
  readonly auditEvents: readonly string[];
}

export type PolicyDecision =
  | { readonly allowed: true; readonly normalizedTarget: string; readonly reason: string }
  | { readonly allowed: false; readonly normalizedTarget?: string; readonly reason: string };

export interface ExecutionGrantClaims {
  readonly version: 1;
  readonly id: string;
  readonly authorizationId: string;
  readonly target: string;
  readonly capabilityId: string;
  readonly argumentsHash: string;
  readonly riskClass: RiskClass;
  readonly issuedAt: string;
  readonly expiresAt: string;
}

export type GrantDecision =
  | { readonly allowed: true; readonly token: string; readonly claims: ExecutionGrantClaims }
  | { readonly allowed: false; readonly reason: string };

export type AuditEventType = "policy_allowed" | "policy_denied" | "grant_issued" | "grant_denied" | "grant_revalidated";

export const engagementStates = ["draft", "active", "stopped"] as const;
export type EngagementState = (typeof engagementStates)[number];

export interface RoEVersion {
  readonly version: string;
  readonly scope: ScopeRule;
  readonly effectiveFrom: string;
  readonly effectiveUntil: string;
}

export interface Engagement {
  readonly id: string;
  readonly name: string;
  readonly state: EngagementState;
  readonly roe: RoEVersion;
}

export interface Approval {
  readonly id: string;
  readonly engagementId: string;
  readonly capabilityId: string;
  readonly target: string;
  readonly argumentsHash: string;
  readonly expiresAt: string;
  readonly revokedAt?: string;
}

export interface AuditEvent {
  readonly sequence: number;
  readonly type: AuditEventType;
  readonly timestamp: string;
  readonly payload: Readonly<Record<string, string>>;
  readonly previousHash: string;
  readonly hash: string;
}

export type AuditVerification =
  | { readonly valid: true; readonly eventCount: number }
  | { readonly valid: false; readonly reason: string };
