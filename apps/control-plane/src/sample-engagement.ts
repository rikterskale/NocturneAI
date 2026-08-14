import type { AuthorizationRecord, ScopeRule } from "../../../packages/contracts/src/domain.js";

export const sampleAuthorization: AuthorizationRecord = {
  id: "auth_lab_001",
  engagementId: "eng_lab_001",
  validFrom: "2026-01-01T00:00:00.000Z",
  validUntil: "2026-12-31T23:59:59.999Z"
};

export const sampleScope: ScopeRule = {
  allowHosts: ["lab.example.test"],
  denyHosts: ["admin.lab.example.test"],
  riskCeiling: "R2"
};

