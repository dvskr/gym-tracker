/**
 * Supabase Admin Client for Scripts
 * 
 * This client uses the SERVICE_ROLE_KEY which bypasses RLS.
 * ONLY use this in server-side scripts, NEVER in client code.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!supabaseUrl) {
  console.error('❌ Missing EXPO_PUBLIC_SUPABASE_URL environment variable');
  console.error('   Make sure your .env file contains EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
  process.exit(1);
}

if (!supabaseServiceRoleKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  console.error('   Make sure your .env file contains SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  console.error('');
  console.error('   ⚠️  NOTE: Service role key should NOT have EXPO_PUBLIC_ prefix!');
  console.error('   The service role key bypasses RLS and should only be used server-side.');
  process.exit(1);
}

/**
 * Supabase admin client with service role key
 * This bypasses Row Level Security - use with caution!
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Get the Supabase URL
 */
export const getSupabaseUrl = () => supabaseUrl;

/**
 * Get storage public URL for a file
 */
export const getStoragePublicUrl = (bucket: string, path: string) => {
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
};

export default supabaseAdmin;

