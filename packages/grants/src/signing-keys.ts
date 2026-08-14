export interface SigningKey {
  readonly id: string;
  readonly secret: string;
  readonly status: "active" | "verify-only" | "retired";
}

/** Holds injected key material; secrets are never persisted by the control plane. */
export class SigningKeyRing {
  readonly #keys: ReadonlyMap<string, SigningKey>;

  constructor(keys: readonly SigningKey[]) {
    const active = keys.filter((key) => key.status === "active");
    if (active.length !== 1 || keys.some((key) => !key.id || !key.secret) || new Set(keys.map((key) => key.id)).size !== keys.length) {
      throw new Error("A key ring requires unique non-empty keys and exactly one active key.");
    }
    this.#keys = new Map(keys.map((key) => [key.id, { ...key }]));
  }

  active(): SigningKey { return [...this.#keys.values()].find((key) => key.status === "active")!; }
  forVerification(id: string): SigningKey | undefined {
    const key = this.#keys.get(id);
    return key?.status === "retired" ? undefined : key;
  }
}
