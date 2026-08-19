import { readFileSync, appendFileSync } from "node:fs";
import pg from "pg";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)])
);

const raw = env.SUPABASE_DB_URL;
// Parse manually to preserve the raw password exactly as written.
const m = raw.match(/^postgres(?:ql)?:\/\/([^:]+):(.+)@([^@]+?):(\d+)\/(.+)$/);
if (!m) { console.error("Could not parse SUPABASE_DB_URL"); process.exit(1); }
const [, user, rawPassword, host] = m;
const ref = host.split(".")[1];

let decoded = null;
try { decoded = decodeURIComponent(rawPassword); } catch { /* not URL-encoded */ }
const candidates = [...new Set([rawPassword, decoded].filter(Boolean))];
console.log(`user=${user} ref=${ref} pwLen(raw)=${rawPassword.length} variants=${candidates.length}`);

for (const prefix of ["aws-0", "aws-1"]) {
  for (const password of candidates) {
    const poolerHost = `${prefix}-ca-central-1.pooler.supabase.com`;
    const client = new pg.Client({
      host: poolerHost,
      port: 5432,
      user: `postgres.${ref}`,
      password,
      database: "postgres",
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000,
    });
    try {
      await client.connect();
      const { rows } = await client.query(
        `select table_name from information_schema.tables where table_schema='public' order by table_name`
      );
      console.log("FOUND:", poolerHost, password === rawPassword ? "(raw pw)" : "(decoded pw)");
      console.log("TABLES:", rows.map((r) => r.table_name).join(", ") || "(none)");
      await client.end();
      const pooled = `postgresql://postgres.${ref}:${encodeURIComponent(password)}@${poolerHost}:5432/postgres`;
      appendFileSync(".env.local", `\n# Session pooler (IPv4) discovered by scripts/find-pooler.mjs\nSUPABASE_DB_POOLER_URL=${pooled}\n`);
      console.log("WROTE SUPABASE_DB_POOLER_URL to .env.local");
      process.exit(0);
    } catch (e) {
      console.log(`${prefix} ${password === rawPassword ? "raw" : "decoded"}: ${String(e.message || e)}`);
      try { await client.end(); } catch {}
    }
  }
}
console.error("No variant worked.");
process.exit(1);
