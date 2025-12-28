-- OPTIONAL: Enforce strict photo_type values as per specification
-- Only run this if you want to enforce the exact photo types from the spec
-- Current: 'front', 'side', 'back', 'flexed' (generic)
-- Spec: 'front', 'side_left', 'side_right', 'back', 'flexed_front', 'flexed_back' (specific)

-- WARNING: This will fail if you have existing data with different photo_type values
-- You'll need to migrate existing data first if you have any

-- Add CHECK constraint to enforce valid photo types
ALTER TABLE progress_photos 
  DROP CONSTRAINT IF EXISTS progress_photos_photo_type_check;

ALTER TABLE progress_photos 
  ADD CONSTRAINT progress_photos_photo_type_check 
  CHECK (photo_type IN ('front', 'side_left', 'side_right', 'back', 'flexed_front', 'flexed_back'));

COMMENT ON CONSTRAINT progress_photos_photo_type_check ON progress_photos 
  IS 'Enforces specific photo types: front, side_left, side_right, back, flexed_front, flexed_back';

-- If you need to migrate existing data first, run this before adding the constraint:
-- UPDATE progress_photos SET photo_type = 'side_left' WHERE photo_type = 'side';
-- UPDATE progress_photos SET photo_type = 'flexed_front' WHERE photo_type = 'flexed';

