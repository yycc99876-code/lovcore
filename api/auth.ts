import { createClient } from '@supabase/supabase-js';

// Initialize a Supabase client just for verifying tokens
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Verifies the Supabase JWT token in the Authorization header.
 * Works with both standard Node Requests and Vercel Requests.
 */
export async function verifyAuth(req: any): Promise<boolean> {
  // If Supabase is not configured:
  //   - In production (Vercel): deny all requests (env vars must be set)
  //   - In local development: allow (mock mode for DX)
  if (!supabase) {
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      console.error('[auth] Supabase not configured in production — denying all requests');
      return false;
    }
    return true;
  }

  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (!authHeader || typeof authHeader !== 'string') {
    return false;
  }

  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return false;

  // Verify the JWT by fetching the user
  const { data, error } = await supabase.auth.getUser(token);
  
  if (error || !data.user) {
    console.error('[auth] Invalid token:', error?.message);
    return false;
  }

  return true;
}
