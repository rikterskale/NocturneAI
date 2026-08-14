import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const readiness = JSON.parse(readFileSync("release-readiness.json", "utf8"));
const requiredBlockers = 4;
if (!Array.isArray(readiness.releaseBlockers) || readiness.releaseBlockers.length !== requiredBlockers) {
  throw new Error("Release readiness must define all four non-waivable blockers.");
}

for (const path of readiness.requiredDocumentation) {
  if (!existsSync(path) || readFileSync(path, "utf8").trim().length === 0) {
    throw new Error(`Required documentation is missing or empty: ${path}`);
  }
}

const knownCapabilityIds = new Set();
for (const capability of readiness.capabilities) {
  for (const path of [capability.manifest, capability.test, capability.documentation, capability.recoveryExercise]) {
    if (!existsSync(path)) throw new Error(`Capability ${capability.id} is missing required evidence: ${path}`);
  }
  const manifest = JSON.parse(readFileSync(capability.manifest, "utf8"));
  if (manifest.id !== capability.id) throw new Error(`Capability manifest ID mismatch: ${capability.manifest}`);
  if (knownCapabilityIds.has(capability.id)) throw new Error(`Capability is declared twice: ${capability.id}`);
  knownCapabilityIds.add(capability.id);
}

const manifestPaths = findJsonFiles("manifests/capabilities");
if (manifestPaths.length !== knownCapabilityIds.size) {
  throw new Error("Every capability manifest must be registered in release-readiness.json.");
}
for (const path of manifestPaths) {
  const manifest = JSON.parse(readFileSync(path, "utf8"));
  if (!knownCapabilityIds.has(manifest.id)) throw new Error(`Unregistered capability manifest: ${path}`);
}

console.log(`Release readiness standard validated for ${knownCapabilityIds.size} declared capability/capabilities.`);

function findJsonFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return findJsonFiles(path);
    return entry.isFile() && entry.name.endsWith(".json") ? [path] : [];
  });
}
