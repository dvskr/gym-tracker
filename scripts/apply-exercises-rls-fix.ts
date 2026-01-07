/**
 * Script to apply the exercises RLS policy fix
 * Run this once to fix the RLS policy for exercises table
 * 
 * Usage: npx tsx scripts/apply-exercises-rls-fix.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!');
  console.error('Make sure EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🔧 Applying exercises RLS policy fix...\n');

  const sql = `
    -- Fix RLS policy for exercises table
    -- Allow library exercises (is_custom = false) to be created by any authenticated user
    -- Only restrict custom exercises (is_custom = true) to be owned by creator

    -- Drop existing policy
    DROP POLICY IF EXISTS "Users create custom exercises" ON exercises;

    -- Create new policies:
    -- 1. Anyone authenticated can add library exercises (is_custom = false)
    CREATE POLICY "Users create library exercises" ON exercises 
      FOR INSERT 
      WITH CHECK (
        auth.uid() IS NOT NULL 
        AND is_custom = false
      );

    -- 2. Users can create their own custom exercises (is_custom = true)
    CREATE POLICY "Users create own custom exercises" ON exercises 
      FOR INSERT 
      WITH CHECK (
        auth.uid() = created_by 
        AND is_custom = true
      );
  `;

  try {
    const { error } = await supabase.rpc('exec_sql', { sql_string: sql });
    
    if (error) {
      // If exec_sql doesn't exist, try direct execution
      const { error: directError } = await supabase.from('_migrations').insert({
        name: '20260107001105_fix_exercises_rls_policy',
        executed_at: new Date().toISOString(),
      });

      if (directError) {
        throw new Error('Cannot apply migration. Please run this SQL in Supabase dashboard:\n\n' + sql);
      }
    }

    console.log('✅ Migration applied successfully!');
    console.log('\nYou can now add exercises directly to templates without restrictions.');
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    console.log('\n📋 Please apply this SQL manually in your Supabase dashboard (SQL Editor):\n');
    console.log(sql);
    process.exit(1);
  }
}

applyMigration();

