import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** Expose for TUS upload headers (non-protected access) */
export const supabaseBaseUrl = supabaseUrl
export const supabasePublicKey = supabaseAnonKey

function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true
  return /your-project|your-anon-key|placeholder|example/i.test(value)
}

const isTestMode = import.meta.env.VITE_TEST_MODE === 'true'
const isConfigured = !isTestMode && !isPlaceholder(supabaseUrl) && !isPlaceholder(supabaseAnonKey)

export const supabase: SupabaseClient<Database> | null = isConfigured
  ? createClient<Database>(supabaseUrl!, supabaseAnonKey!)
  : null

if (!isConfigured && import.meta.env.DEV) {
  console.info('[Lovcore] Supabase not configured — running in local-only mode. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable cloud sync.')
}

/** Returns the Supabase client or null (for conditional checks). */
export function getSupabase(): SupabaseClient<Database> | null {
  return supabase
}
