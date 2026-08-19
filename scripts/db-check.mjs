import { readFileSync } from "node:fs";
import pg from "pg";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)])
);

const client = new pg.Client({
  connectionString: env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();
const { rows } = await client.query(
  `select table_name from information_schema.tables where table_schema = 'public' order by table_name`
);
console.log("TABLES:", rows.map((r) => r.table_name).join(", ") || "(none)");
const ver = await client.query(`select version()`);
console.log("SERVER:", ver.rows[0].version.slice(0, 40));
await client.end();
