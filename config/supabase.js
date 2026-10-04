import { createClient } from '@supabase/supabase-js'

/**
 * Supabase client for server-side use.
 *
 * IMPORTANT — which key to use:
 * This server authenticates users itself (self-signed JWT in middleware/auth.js),
 * it does NOT go through Supabase Auth. Therefore `auth.uid()` is always null in
 * the database, and any RLS policy written against `auth.uid()` will silently
 * reject every read and write. Use the SERVICE ROLE key here so the server
 * bypasses RLS, and let Supabase deny direct client access by default.
 * See supabase-migration.sql for the matching table setup.
 *
 * The client is deliberately nullable: when the project is not configured we
 * expose `null` and the services fall back to the file store instead of throwing
 * at import time (which previously crashed the process on a missing env var).
 */

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY

// Treat the shipped placeholders as "not configured".
const configured =
  Boolean(supabaseUrl && supabaseKey) &&
  !supabaseUrl.includes('your-project') &&
  !supabaseKey.startsWith('your_')

export const supabaseEnabled = configured

export const supabaseClient = configured ? createClient(supabaseUrl, supabaseKey) : null

if (!configured) {
  console.warn(
    '[supabase] not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing or placeholder) — ' +
    'using the file store in services/localStore.js'
  )
}
