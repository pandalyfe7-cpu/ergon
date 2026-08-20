import { readFileSync } from "node:fs";
import { join } from "node:path";

/** .env.local parsed once for the Playwright process (Next parses its own). */
export const env: Record<string, string> = Object.fromEntries(
  readFileSync(join(__dirname, "..", ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((line) => line.includes("=") && !line.startsWith("#"))
    .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1)]),
);

export const E2E_EMAIL = "ergos-e2e@example.com";
export const E2E_PASSWORD = "ergos-e2e-Passw0rd!";
