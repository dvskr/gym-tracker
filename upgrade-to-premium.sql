-- Upgrade user to premium tier
UPDATE profiles 
SET 
  subscription_tier = 'premium',
  ai_requests_today = 0,
  subscription_started_at = NOW()
WHERE id = 'd8af6980-0265-4fb9-a9d7-ba24fdf01895';

-- Verify the update
SELECT 
  id,
  subscription_tier,
  ai_requests_today,
  subscription_started_at
FROM profiles 
WHERE id = 'd8af6980-0265-4fb9-a9d7-ba24fdf01895';

