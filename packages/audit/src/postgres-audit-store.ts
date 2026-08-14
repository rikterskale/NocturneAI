import type { AuditEvent, AuditEventType, AuditVerification } from "../../contracts/src/domain.js";
import { AuditTrail } from "./audit-trail.js";

export interface SqlClient {
  query(sql: string, values?: readonly unknown[]): Promise<{ readonly rows: readonly Record<string, unknown>[] }>;
}

/** PostgreSQL-backed append-only audit repository. Callers provide a transaction-capable pg client or pool client. */
export class PostgresAuditStore {
  constructor(private readonly client: SqlClient) {}

  async append(engagementId: string, type: AuditEventType, payload: Readonly<Record<string, string>>, now = new Date()): Promise<AuditEvent> {
    await this.client.query("BEGIN");
    try {
      const result = await this.client.query("SELECT sequence, event_type, occurred_at, payload, previous_hash, event_hash FROM audit_event WHERE engagement_id = $1 ORDER BY sequence FOR UPDATE", [engagementId]);
      const events = result.rows.map(rowToEvent);
      const trail = new AuditTrail();
      if (!trail.verify(events).valid) throw new Error("Persisted audit chain is invalid.");
      const event = events.reduce((current, existing) => { current.append(existing.type, existing.payload, new Date(existing.timestamp)); return current; }, new AuditTrail()).append(type, payload, now);
      await this.client.query("INSERT INTO audit_event (engagement_id, sequence, event_type, occurred_at, payload, previous_hash, event_hash) VALUES ($1, $2, $3, $4, $5, $6, $7)", [engagementId, event.sequence, event.type, event.timestamp, event.payload, event.previousHash, event.hash]);
      await this.client.query("COMMIT");
      return event;
    } catch (error) {
      await this.client.query("ROLLBACK");
      throw error;
    }
  }

  async verify(engagementId: string): Promise<AuditVerification> {
    const result = await this.client.query("SELECT sequence, event_type, occurred_at, payload, previous_hash, event_hash FROM audit_event WHERE engagement_id = $1 ORDER BY sequence", [engagementId]);
    return new AuditTrail().verify(result.rows.map(rowToEvent));
  }
}

function rowToEvent(row: Record<string, unknown>): AuditEvent {
  return { sequence: Number(row.sequence), type: row.event_type as AuditEventType, timestamp: new Date(String(row.occurred_at)).toISOString(), payload: row.payload as Readonly<Record<string, string>>, previousHash: String(row.previous_hash), hash: String(row.event_hash) };
}
