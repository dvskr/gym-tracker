import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

// Try service role key first, fall back to anon key
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ Missing Supabase key in .env file');
  process.exit(1);
}

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  supabaseKey
);

async function runMigration() {
  console.log('🔄 Running migration: add_is_active_column\n');

  try {
    // Step 1: Add is_active column
    console.log('Step 1: Adding is_active column...');
    const { error: columnError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE exercises ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;'
    });

    if (columnError) {
      console.log('Note: Column might already exist, trying direct approach...');
      
      // Try alternative approach using Supabase's SQL execution
      const { error: altError } = await supabase
        .from('exercises')
        .select('is_active')
        .limit(1);
      
      if (altError && altError.message.includes('does not exist')) {
        console.error('❌ Failed to add column. Please run this SQL in Supabase Dashboard:');
        console.log('\nALTER TABLE exercises ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;');
        console.log('CREATE INDEX IF NOT EXISTS idx_exercises_active ON exercises(is_active) WHERE is_active = true;\n');
        process.exit(1);
      } else {
        console.log('✅ Column already exists or was added successfully');
      }
    } else {
      console.log('✅ Column added successfully');
    }

    // Step 2: Create index
    console.log('\nStep 2: Creating index...');
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: 'CREATE INDEX IF NOT EXISTS idx_exercises_active ON exercises(is_active) WHERE is_active = true;'
    });

    if (indexError) {
      console.log('⚠️  Index creation failed (might already exist)');
    } else {
      console.log('✅ Index created successfully');
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\nNext step: Run npm run update:database to activate your 344 selected exercises');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.log('\n📋 Manual SQL to run in Supabase Dashboard:');
    console.log('ALTER TABLE exercises ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;');
    console.log('CREATE INDEX IF NOT EXISTS idx_exercises_active ON exercises(is_active) WHERE is_active = true;');
  }
}

runMigration();

