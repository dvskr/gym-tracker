import '../lib/supabase-admin.js'; // This will validate env vars
import { supabaseAdmin } from '../lib/supabase-admin.js';

async function runMigration() {
  console.log('🔧 Applying RLS policy fix for workout_templates...\n');

  // Split into individual statements
  const statements = [
    `DROP POLICY IF EXISTS "Users own templates" ON workout_templates`,
    
    `CREATE POLICY "Users can view their templates" ON workout_templates
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id)`,
    
    `CREATE POLICY "Users can create templates" ON workout_templates
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id)`,
    
    `CREATE POLICY "Users can update their templates" ON workout_templates
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id)`,
    
    `CREATE POLICY "Users can delete their templates" ON workout_templates
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id)`
  ];

  for (let i = 0; i < statements.length; i++) {
    const sql = statements[i];
    console.log(`\n[${i + 1}/${statements.length}] Executing:`, sql.substring(0, 50) + '...');
    
    const { error } = await supabaseAdmin.rpc('exec_sql', { sql_string: sql }) as any;
    
    if (error) {
      console.error(`❌ Error:`, error);
      console.log('\n📋 Please run this SQL manually in Supabase dashboard:\n');
      console.log(statements.join(';\n\n') + ';');
      process.exit(1);
    }
    
    console.log('   ✓ Success');
  }

  console.log('\n✅ All RLS policies applied successfully!');
  console.log('Users can now create templates without RLS violations.\n');
}

runMigration().catch(console.error);

