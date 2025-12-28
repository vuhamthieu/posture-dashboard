import 'server-only'
import { createClient } from '@supabase/supabase-js'

let supabase = null

export function getSupabaseService() {
  if (supabase) return supabase

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing SUPABASE env variables')
  }

  supabase = createClient(url, key)
  return supabase
}
