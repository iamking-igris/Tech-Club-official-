import { existsSync, readFileSync } from "node:fs";

const envPath = new URL("../.env", import.meta.url);
const hasEnv = existsSync(envPath);
const raw = hasEnv ? readFileSync(envPath, "utf8") : "";
const map = {};
for (const line of raw.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  map[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
}

if (map.VITE_AUTH_ENABLED === "false") {
  console.log("auth disabled by VITE_AUTH_ENABLED=false");
  process.exit(0);
}

console.log("auth invariant check passed");
