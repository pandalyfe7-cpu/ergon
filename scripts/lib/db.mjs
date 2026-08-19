import { readFileSync } from "node:fs";
import pg from "pg";

export function readEnvLocal() {
  return Object.fromEntries(
    readFileSync(".env.local", "utf8")
      .split(/\r?\n/)
      .filter((l) => l.includes("=") && !l.startsWith("#"))
      .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)])
  );
}

export async function connect() {
  const env = readEnvLocal();
  const url = env.SUPABASE_DB_POOLER_URL || env.SUPABASE_DB_URL;
  if (!url) throw new Error("No SUPABASE_DB_POOLER_URL or SUPABASE_DB_URL in .env.local");
  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  return client;
}
