import { createClient } from '@supabase/supabase-js'

const rawUrl = import.meta.env.VITE_SUPABASE_URL
// Automatically fix the URL if the user accidentally copied the /rest/v1 API URL
const supabaseUrl = rawUrl ? rawUrl.replace(/\/rest\/v1\/?$/, '') : ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
