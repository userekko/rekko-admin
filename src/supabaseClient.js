import { createClient } from '@supabase/supabase-js'

// Anon/publishable key — safe to embed client-side by design. All real
// authorization happens server-side (Postgres function + Edge Function
// both independently check the caller's JWT against the admin account).
const SUPABASE_URL = 'https://bvsxuhyotpwhcapgnwyp.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_g0f1yP_Ti7jzSbFkii5Zag_k7q5qIJA'

export const ADMIN_EMAIL = 'developer@userekko.com'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
