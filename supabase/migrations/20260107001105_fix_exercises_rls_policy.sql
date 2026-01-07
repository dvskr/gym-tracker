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

