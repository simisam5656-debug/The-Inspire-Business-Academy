import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Browser-safe Supabase client
 *
 * CRITICAL SECURITY RULES:
 * 1. ONLY uses browser-safe VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.
 * 2. NEVER imports or references SUPABASE_SERVICE_ROLE_KEY here.
 * 3. The service-role key belongs strictly in Cloudflare Pages server functions (/api/*).
 */

const supabaseUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  process.env.VITE_SUPABASE_URL ||
  '';
const supabasePublishableKey =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY) ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabasePublishableKey &&
  supabaseUrl !== 'https://your-project-id.supabase.co' &&
  supabasePublishableKey !== 'your-anon-or-publishable-key'
);

let clientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) {
    return null;
  }

  if (!clientInstance) {
    clientInstance = createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return clientInstance;
}

// Default export for standard usage
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
