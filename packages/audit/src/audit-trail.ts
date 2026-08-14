import { createHash } from "node:crypto";
import type { AuditEvent, AuditEventType, AuditVerification } from "../../contracts/src/domain.js";

const genesisHash = "GENESIS";

export class AuditTrail {
  readonly #events: AuditEvent[] = [];

  append(type: AuditEventType, payload: Readonly<Record<string, string>>, now = new Date()): AuditEvent {
    const sequence = this.#events.length + 1;
    const previousHash = this.#events.at(-1)?.hash ?? genesisHash;
    const unsigned = { sequence, type, timestamp: now.toISOString(), payload, previousHash };
    const event: AuditEvent = { ...unsigned, hash: hash(unsigned) };
    this.#events.push(event);
    return event;
  }

  events(): readonly AuditEvent[] {
    return this.#events.map((event) => ({ ...event, payload: { ...event.payload } }));
  }

  verify(events: readonly AuditEvent[] = this.#events): AuditVerification {
    for (const [index, event] of events.entries()) {
      const expectedPreviousHash = index === 0 ? genesisHash : events[index - 1]?.hash;
      if (event.sequence !== index + 1 || event.previousHash !== expectedPreviousHash) {
        return { valid: false, reason: `Audit chain order is invalid at sequence ${event.sequence}.` };
      }
      const { hash: ignoredHash, ...unsigned } = event;
      if (ignoredHash !== hash(unsigned)) return { valid: false, reason: `Audit event hash is invalid at sequence ${event.sequence}.` };
    }
    return { valid: true, eventCount: events.length };
  }
}

function hash(value: object): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
