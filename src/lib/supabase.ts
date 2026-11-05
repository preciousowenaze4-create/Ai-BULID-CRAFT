import { createClient } from '@supabase/supabase-js';

// Resolve Supabase credentials:
// Priority: Vite env vars -> fallback to configured project credentials
const rawUrl =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) ||
  'https://dnzepbphxzyxhpzsytbu.supabase.co';

// Clean trailing slashes or endpoint paths like /rest/v1
const supabaseUrl = rawUrl
  .replace(/\/rest\/v1\/?$/, '')
  .replace(/\/auth\/v1\/?$/, '')
  .replace(/\/$/, '');

const supabaseAnonKey =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) ||
  'sb_publishable_yI7kSJEuVGq_ZE8-JCAXHw_SLca40z1';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});
