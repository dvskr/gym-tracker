-- Check current PR celebration settings for the user
SELECT 
  email,
  pr_celebrations,
  -- Note: pr_sound and pr_confetti might not exist as columns in profiles table
  -- They are stored in the settings store (AsyncStorage) on the client
  theme,
  sound_enabled,
  haptic_enabled
FROM profiles 
WHERE email = 'dvskr.1234@gmail.com';

-- The pr_celebrations, pr_sound, and pr_confetti settings are stored in the
-- React Native app's AsyncStorage, not in the database.
-- The user needs to check their in-app settings!

