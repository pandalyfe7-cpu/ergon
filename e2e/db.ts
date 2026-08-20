import pg from "pg";

import { env } from "./env";

async function connect(): Promise<pg.Client> {
  const url = env.SUPABASE_DB_POOLER_URL || env.SUPABASE_DB_URL;
  const client = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  return client;
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  values: unknown[] = [],
): Promise<T[]> {
  const client = await connect();
  try {
    const result = await client.query<T>(text, values);
    return result.rows;
  } finally {
    await client.end();
  }
}

/**
 * Ensures the E2E auth user exists with a confirmed email and a working
 * password, regardless of the project's email-confirmation setting. Returns
 * the user id.
 */
export async function ensureAuthUser(email: string, password: string): Promise<string> {
  const existing = await query<{ id: string }>(
    `select id from auth.users where email = $1`,
    [email],
  );

  let id: string;
  if (existing.length > 0) {
    id = existing[0].id;
    await query(
      `update auth.users
         set email_confirmed_at = coalesce(email_confirmed_at, now()),
             encrypted_password = extensions.crypt($2, extensions.gen_salt('bf')),
             updated_at = now()
       where id = $1`,
      [id, password],
    );
  } else {
    const created = await query<{ id: string }>(
      `insert into auth.users
         (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
          raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
       values
         ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated',
          'authenticated', $1, extensions.crypt($2, extensions.gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}', '{}', now(), now())
       returning id`,
      [email, password],
    );
    id = created[0].id;
  }

  // GoTrue scans these as non-null strings; SQL-created rows leave them NULL,
  // which breaks sign-in with an opaque 500. Normalize to empty strings.
  await query(
    `update auth.users
       set confirmation_token = coalesce(confirmation_token, ''),
           recovery_token = coalesce(recovery_token, ''),
           email_change = coalesce(email_change, ''),
           email_change_token_new = coalesce(email_change_token_new, ''),
           email_change_token_current = coalesce(email_change_token_current, ''),
           phone_change = coalesce(phone_change, ''),
           phone_change_token = coalesce(phone_change_token, ''),
           reauthentication_token = coalesce(reauthentication_token, '')
     where id = $1`,
    [id],
  );

  await query(
    `insert into auth.identities
       (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
     values
       (gen_random_uuid(), $1::uuid, $2::text,
        jsonb_build_object('sub', $2::text, 'email', $3::text, 'email_verified', true),
        'email', now(), now(), now())
     on conflict (provider_id, provider) do nothing`,
    [id, id, email],
  );

  return id;
}

/**
 * Clears today's recommendation rows for the user so accept/dismiss/snooze
 * tests always start from a regenerated, actionable list.
 */
export async function resetTodaysRecommendations(userId: string): Promise<void> {
  await query(`delete from public.recommendations where user_id = $1`, [userId]);
}

export async function testUserId(): Promise<string> {
  const rows = await query<{ id: string }>(
    `select id from auth.users where email = $1`,
    ["ergos-e2e@example.com"],
  );
  if (rows.length === 0) throw new Error("E2E user missing; run the setup project first.");
  return rows[0].id;
}
