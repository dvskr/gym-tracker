-- Fix RLS policies for workout_templates to allow INSERT operations
-- The issue: FOR ALL with only USING clause doesn't allow INSERT
-- Solution: Split into separate policies for each operation

DROP POLICY IF EXISTS "Users own templates" ON workout_templates;

-- SELECT policy
CREATE POLICY "Users can view their templates" ON workout_templates
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT policy (this is what was missing!)
CREATE POLICY "Users can create templates" ON workout_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE policy
CREATE POLICY "Users can update their templates" ON workout_templates
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE policy
CREATE POLICY "Users can delete their templates" ON workout_templates
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

