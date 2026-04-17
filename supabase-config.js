import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SUPABASE_URL = 'https://znubeuseqkwopvgvycii.supabase.co'

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpudWJldXNlcWt3b3B2Z3Z5Y2lpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0ODYwMjQsImV4cCI6MjA5MDA2MjAyNH0.9eOdayXx7Sl8XYBRH1ACq_uQxjh4rNMqHSJKbKkg8bA'

const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpudWJldXNlcWt3b3B2Z3Z5Y2lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4NjAyNCwiZXhwIjoyMDkwMDYyMDI0fQ.zWxG87Qcg_w6dFIGEgqV_ORV9Pd1GASI5yJMlJRoVQ8'

// Cliente normal para operaciones del usuario
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Cliente admin para crear usuarios (solo ministro)
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export const SUPABASE_URL_EXPORT = SUPABASE_URL
export const SUPABASE_SERVICE_KEY_EXPORT = SUPABASE_SERVICE_KEY