# Apply Exercises RLS Policy Fix

## Problem
The current RLS policy for the `exercises` table prevents adding library exercises to templates.

## Solution
Apply this SQL migration to your Supabase database.

## Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Paste the following SQL:

```sql
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
```

5. Click **Run** or press `Ctrl/Cmd + Enter`
6. You should see "Success. No rows returned"

## Option 2: Using Migration File

The migration file has been created at:
`supabase/migrations/20260107001105_fix_exercises_rls_policy.sql`

If you have Supabase CLI set up correctly, run:
```bash
npx supabase db push
```

## Verification

After applying the migration, test by:
1. Go to Templates in the app
2. Open any template
3. Try to add a new exercise that hasn't been used before
4. It should now add successfully without RLS errors

## What This Fixes

**Before**: 
- RLS policy required ALL inserts to have `created_by = auth.uid()`
- Library exercises couldn't be added because they're not "owned" by anyone

**After**:
- Library exercises (is_custom = false) can be added by any authenticated user
- Custom exercises (is_custom = true) still require proper ownership
- Both types follow the principle of least privilege

