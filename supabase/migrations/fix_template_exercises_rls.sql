-- ============================================================================
-- FIX: RLS Policies for template_exercises Table
-- ============================================================================
-- Issue: Error 42501 when adding exercises to custom templates
-- Solution: Add proper RLS policies that check template ownership
-- ============================================================================

-- Step 1: Check existing policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename = 'template_exercises';

-- Step 2: Drop existing policies if they exist (to recreate cleanly)
DROP POLICY IF EXISTS "Users can insert template exercises" ON template_exercises;
DROP POLICY IF EXISTS "Users can view template exercises" ON template_exercises;
DROP POLICY IF EXISTS "Users can update template exercises" ON template_exercises;
DROP POLICY IF EXISTS "Users can delete template exercises" ON template_exercises;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON template_exercises;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON template_exercises;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON template_exercises;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON template_exercises;

-- Step 3: Create correct RLS policies

-- Policy 1: INSERT - Users can add exercises to their own templates
CREATE POLICY "Users can insert template exercises"
ON template_exercises FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM templates
    WHERE templates.id = template_exercises.template_id
    AND templates.user_id = auth.uid()
  )
);

-- Policy 2: SELECT - Users can view exercises in their own templates
CREATE POLICY "Users can view template exercises"
ON template_exercises FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM templates
    WHERE templates.id = template_exercises.template_id
    AND templates.user_id = auth.uid()
  )
);

-- Policy 3: UPDATE - Users can update exercises in their own templates
CREATE POLICY "Users can update template exercises"
ON template_exercises FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM templates
    WHERE templates.id = template_exercises.template_id
    AND templates.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM templates
    WHERE templates.id = template_exercises.template_id
    AND templates.user_id = auth.uid()
  )
);

-- Policy 4: DELETE - Users can delete exercises from their own templates
CREATE POLICY "Users can delete template exercises"
ON template_exercises FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM templates
    WHERE templates.id = template_exercises.template_id
    AND templates.user_id = auth.uid()
  )
);

-- Step 4: Verify RLS is enabled
ALTER TABLE template_exercises ENABLE ROW LEVEL SECURITY;

-- Step 5: Also ensure templates table has correct policies
DROP POLICY IF EXISTS "Users can create templates" ON templates;
DROP POLICY IF EXISTS "Users can view their templates" ON templates;
DROP POLICY IF EXISTS "Users can update their templates" ON templates;
DROP POLICY IF EXISTS "Users can delete their templates" ON templates;

CREATE POLICY "Users can create templates"
ON templates FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their templates"
ON templates FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update their templates"
ON templates FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their templates"
ON templates FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Step 6: Verify policies were created
SELECT 
  tablename, 
  policyname, 
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN 'USING clause exists'
    ELSE 'No USING clause'
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN 'WITH CHECK clause exists'
    ELSE 'No WITH CHECK clause'
  END as with_check_clause
FROM pg_policies 
WHERE tablename IN ('template_exercises', 'templates')
ORDER BY tablename, cmd;

-- ============================================================================
-- SUCCESS! RLS policies are now configured correctly.
-- Users can now add/edit/delete exercises in their own templates.
-- ============================================================================

