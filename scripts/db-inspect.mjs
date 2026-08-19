import { readFileSync } from "node:fs";
import pg from "pg";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)])
);

const client = new pg.Client({
  connectionString: env.SUPABASE_DB_POOLER_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();
for (const t of ["paths", "path_events", "entries", "state_transitions", "coach_dismissals"]) {
  const { rows } = await client.query(`select count(*)::int as n from public.${t}`);
  console.log(`${t}: ${rows[0].n} rows`);
}
const users = await client.query(
  `select count(*)::int as n, min(created_at)::date as first from auth.users`
);
console.log(`auth.users: ${users.rows[0].n} (first: ${users.rows[0].first})`);
await client.end();
