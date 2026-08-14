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

