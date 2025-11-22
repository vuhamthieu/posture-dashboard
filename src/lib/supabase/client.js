import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env variables! Check .env.local')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)