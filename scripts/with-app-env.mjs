import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadDotEnv(cwd) {
  const file = resolve(cwd, ".env");
  if (!existsSync(file)) return {};

  const content = readFileSync(file, "utf8");
  const env = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    env[key] = value.replace(/^['"]|['"]$/g, "");
  }

  return env;
}

const cwd = process.cwd();
const env = { ...process.env, ...loadDotEnv(cwd) };
const args = process.argv.slice(2);
const child = spawn(args[0], args.slice(1), {
  cwd,
  env,
  stdio: "inherit",
  shell: false,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error("[with-app-env]", error);
  process.exit(1);
});
