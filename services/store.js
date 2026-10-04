import { supabaseClient } from '../config/supabase.js'

/**
 * Shared helper for the storage services.
 *
 * Every storage function follows the same contract:
 *   1. Supabase not configured -> run the file-store fallback directly
 *   2. Supabase call throws    -> log, then run the file-store fallback
 *
 * Wrapping it once keeps the services readable and, more importantly, stops the
 * old silent `catch {}` pattern: a genuine schema problem (a missing column, say)
 * used to look identical to "database not configured". Now the reason is logged.
 */
export async function withStore(label, primary, fallback) {
  if (!supabaseClient) return fallback()

  try {
    return await primary()
  } catch (err) {
    console.error(`[store] ${label} failed, falling back to file store: ${err.message}`)
    if (err.code === 'PGRST204' || err.code === '42703') {
      console.error(
        '[store] ^ looks like a column/schema mismatch. ' +
        'Re-run supabase-migration.sql to bring the tables up to date.'
      )
    }
    return fallback()
  }
}
