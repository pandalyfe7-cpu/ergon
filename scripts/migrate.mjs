// Applies pending SQL files from supabase/migrations/ in filename order.
// Tracking table: public._ergos_migrations. Each file runs in one transaction.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { connect } from "./lib/db.mjs";

const dir = "supabase/migrations";
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

const client = await connect();
await client.query(`
  create table if not exists public._ergos_migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  )
`);
const { rows } = await client.query(`select name from public._ergos_migrations`);
const applied = new Set(rows.map((r) => r.name));

let ran = 0;
for (const file of files) {
  if (applied.has(file)) {
    console.log(`skip   ${file} (already applied)`);
    continue;
  }
  const sql = readFileSync(join(dir, file), "utf8");
  try {
    await client.query("begin");
    await client.query(sql);
    await client.query(`insert into public._ergos_migrations (name) values ($1)`, [file]);
    await client.query("commit");
    console.log(`apply  ${file}`);
    ran++;
  } catch (e) {
    await client.query("rollback");
    console.error(`FAILED ${file}: ${e.message}`);
    await client.end();
    process.exit(1);
  }
}
console.log(ran === 0 ? "Nothing to apply." : `Applied ${ran} migration(s).`);
await client.end();
