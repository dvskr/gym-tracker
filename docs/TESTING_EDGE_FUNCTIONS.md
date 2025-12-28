# Edge Function Testing Guide

## 🧪 **Testing Your Edge Functions**

Three ways to test your deployed Edge Functions:

---

## **Option 1: Test Screen Component** (Recommended)

### **Setup:**

1. Add test screen to your app:

```typescript
// In app/(tabs)/index.tsx or any screen
import TestEdgeFunctions from '@/components/test/TestEdgeFunctions';

export default function HomeScreen() {
  return (
    <ScrollView>
      {/* Your existing content */}
      
      {/* Add test component temporarily */}
      <TestEdgeFunctions />
    </ScrollView>
  );
}
```

2. **Open your app**
3. **Tap the test buttons**
4. **Check results on screen & console**
5. **Remove component after testing**

### **What it tests:**
- ✅ AI simple request
- ✅ AI detailed response (usage, limits)
- ✅ Rate limiting
- ✅ Exercise search
- ✅ Exercise filters (body part, equipment)
- ✅ Single exercise fetch

---

## **Option 2: Console Tests** (Quick)

Add test buttons to any screen:

```typescript
import { testAIService, testAIServiceDetailed } from '@/lib/ai/__tests__/aiService.test';
import { testExerciseService } from '@/lib/exercises/__tests__/exerciseApiService.test';

export default function TestScreen() {
  return (
    <View>
      <Button 
        title="Test AI" 
        onPress={async () => {
          await testAIService();
          // Check console for results
        }} 
      />
      
      <Button 
        title="Test Exercises" 
        onPress={async () => {
          await testExerciseService();
          // Check console for results
        }} 
      />
    </View>
  );
}
```

---

## **Option 3: Manual API Tests** (Advanced)

### **Test AI Complete:**

1. Get your JWT token:
```typescript
import { supabase } from '@/lib/supabase';

const { data } = await supabase.auth.getSession();
console.log('JWT:', data.session?.access_token);
```

2. Test with curl:
```bash
curl -X POST 'https://zhsmmqaworfqffsadjsm.supabase.co/functions/v1/ai-complete' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'apikey: YOUR_SUPABASE_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"Say hello"}]}'
```

### **Test Exercise Search:**

```bash
curl -X POST 'https://zhsmmqaworfqffsadjsm.supabase.co/functions/v1/exercise-search' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'apikey: YOUR_SUPABASE_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"action":"search","params":{"name":"bench"}}'
```

---

## **Expected Results**

### **✅ Success (AI):**
```json
{
  "content": "Hello there, friend!",
  "usage": {
    "promptTokens": 4,
    "completionTokens": 5,
    "totalTokens": 9
  },
  "limits": {
    "used": 1,
    "limit": 10,
    "remaining": 9
  }
}
```

### **✅ Success (Exercise):**
```json
{
  "data": [
    {
      "id": "0025",
      "name": "bench press",
      "bodyPart": "chest",
      "target": "pectorals",
      "equipment": "barbell",
      "gifUrl": "https://...",
      "secondaryMuscles": ["triceps", "shoulders"],
      "instructions": ["Lie on bench...", "Lower bar..."]
    }
  ]
}
```

### **❌ Error (Not Authenticated):**
```json
{
  "error": "Missing authorization"
}
```

### **❌ Error (Rate Limited):**
```json
{
  "error": "rate_limit_exceeded",
  "message": "Daily limit reached (10/10)",
  "used": 10,
  "limit": 10
}
```

---

## **Troubleshooting**

### **"Missing authorization"**
- **Cause:** Not logged in
- **Fix:** Login to your app first

### **"Invalid token"**
- **Cause:** Token expired or invalid
- **Fix:** Logout and login again

### **"rate_limit_exceeded"**
- **Cause:** Hit daily limit (10 requests)
- **Fix:** Wait 24 hours or reset counter in database:
```sql
UPDATE profiles 
SET ai_requests_today = 0 
WHERE id = 'YOUR_USER_ID'::uuid;
```

### **"AI service unavailable"**
- **Cause:** OpenAI API key issue or network error
- **Fix:** Check Supabase logs, verify API key

### **"Failed to search exercises"**
- **Cause:** RapidAPI key issue or network error
- **Fix:** Check Supabase logs, verify API key

---

## **Verify in Database**

After running tests, check your database:

```sql
-- Check AI usage
SELECT 
  ai_requests_today,
  ai_requests_today_date,
  subscription_tier
FROM profiles 
WHERE id = auth.uid();

-- Should show:
-- ai_requests_today: 3 (or however many tests you ran)
-- ai_requests_today_date: today's date
-- subscription_tier: 'free'
```

---

## **Production Checklist**

After testing, verify:

- ✅ Both Edge Functions return valid responses
- ✅ Authentication is required (401 without token)
- ✅ Rate limiting works (blocks after 10 requests)
- ✅ Usage counter increments in database
- ✅ Error messages are user-friendly
- ✅ Remove test components from app

---

## **Clean Up**

After testing, remove:

```typescript
// Remove this line:
import TestEdgeFunctions from '@/components/test/TestEdgeFunctions';

// Remove this component:
<TestEdgeFunctions />
```

Or keep it in a separate test/debug screen for future testing!

---

## **Next Steps**

1. ✅ Run tests to verify everything works
2. ✅ Check console logs for details
3. ✅ Verify database updates
4. ✅ Test on physical device
5. ✅ Remove test components
6. ✅ Deploy to production!

**Your Edge Functions are ready for production use!** 🚀

