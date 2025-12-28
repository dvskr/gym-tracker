# 🐛 AI Edge Function Debugging Guide

## Current Status

The app is calling the AI Edge Function, but it's returning a non-2xx status code. We've added enhanced logging to both the client and server to diagnose the issue.

---

## 🔍 Enhanced Logging Added

### Client Side (`lib/ai/aiService.ts`)

Now logs detailed error information:
```typescript
console.error('❌ Edge Function Error Details:', {
  message: error.message,
  status: error.status,
  statusText: error.statusText,
  name: error.name,
  context: error.context,
  fullError: error,
});
```

### Server Side (`supabase/functions/ai-complete/index.ts`)

Now logs:
1. When OpenAI API is called
2. OpenAI response status
3. Detailed error if OpenAI fails
4. Token usage on success

---

## 🧪 How to Debug

### Step 1: Check Your App's Console

Reload your app (`r` in Expo) and look for:

```
🤖 Calling AI service for workout suggestion...
❌ Edge Function Error Details: {
  message: "...",
  status: 503,  // <-- This is the key
  ...
}
```

**Common Status Codes:**
- `401` - Auth problem (user token invalid)
- `429` - Rate limit hit
- `503` - OpenAI API failed
- `500` - Internal server error

### Step 2: Check Supabase Edge Function Logs

1. Go to: https://supabase.com/dashboard/project/zhsmmqaworfqffsadjsm/functions
2. Click on `ai-complete` function
3. Check the **Logs** tab

Look for:
```
Calling OpenAI API with model: gpt-4o-mini
OpenAI response status: 401  // <-- Problem here!
OpenAI API error: { ... }
```

---

## 🔑 Most Likely Issues

### Issue 1: Invalid OpenAI API Key

**Symptoms:**
- Status 503 from Edge Function
- Supabase logs show `OpenAI response status: 401`

**Solution:**
```bash
# Check if key is set
npx supabase secrets list

# Re-set the key (get from https://platform.openai.com/api-keys)
npx supabase secrets set OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE

# Restart the function (happens automatically, or wait 30s)
```

**Verify your key works:**
```bash
curl https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hi"}]
  }'
```

### Issue 2: OpenAI Account Has No Credits

**Symptoms:**
- Status 503 from Edge Function
- Supabase logs show `OpenAI response status: 429` or `insufficient_quota`

**Solution:**
1. Go to https://platform.openai.com/account/billing
2. Add a payment method
3. Buy credits ($5 minimum)

**Cost estimate for this app:**
- ~500 tokens per workout suggestion
- gpt-4o-mini: $0.00015 per 1k input tokens
- **~$0.00008 per suggestion** (super cheap!)
- 10 requests/day = **~$0.024/month**

### Issue 3: Network/Timeout

**Symptoms:**
- Intermittent failures
- Takes long time then fails

**Solution:**
- Usually temporary, just retry
- Check https://status.openai.com/

### Issue 4: Invalid Request Format

**Symptoms:**
- Status 400 from OpenAI
- Supabase logs show message format error

**Solution:**
- This shouldn't happen with our code
- Check Supabase logs for details
- May need to update Edge Function

---

## 🛠️ Quick Fixes

### Fix 1: Verify Secrets

```powershell
cd "C:\Users\daggu\OneDrive\Desktop\Gym Workout Tracking App\gym-tracker"
npx supabase secrets list
```

Should show:
```
NAME                  DIGEST
OPENAI_API_KEY       abc123...
RAPID_API_KEY        def456...
```

### Fix 2: Test Edge Function Directly

Create a test file `test-ai-edge.ts`:
```typescript
import { supabase } from '@/lib/supabase';

async function testAI() {
  const { data, error } = await supabase.functions.invoke('ai-complete', {
    body: {
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say "Hello test!" in exactly 2 words.' }
      ],
      options: { maxTokens: 50 }
    }
  });

  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('✅ Success:', data);
  }
}

testAI();
```

Run in your app as a test button.

### Fix 3: Check OpenAI Key Format

Your key should:
- Start with `sk-proj-` (new format) or `sk-` (old format)
- Be ~100-200 characters long
- Have NO spaces or line breaks
- Be the **Secret Key**, not the **API Key ID**

### Fix 4: Regenerate OpenAI Key

If key is old or invalid:
1. Go to https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy the FULL key
4. Update in Supabase:
```bash
npx supabase secrets set OPENAI_API_KEY=sk-proj-NEW_KEY_HERE
```

---

## 📊 Current Deployment Status

```
✅ Edge Function deployed: ai-complete (v7)
✅ Enhanced logging active
✅ Client-side error details active
```

---

## 🔄 Next Steps

1. **Reload your app** (`r` in Expo Metro)
2. **Trigger the AI** (go to home screen, it auto-loads workout suggestion)
3. **Check console** for detailed error message
4. **Check Supabase logs** at dashboard link above
5. **Apply fix** based on the error code

---

## 📞 Common Error Messages Decoded

| Error Message | Meaning | Fix |
|---|---|---|
| `Invalid API key` | Wrong/expired OpenAI key | Regenerate key |
| `insufficient_quota` | No OpenAI credits | Add payment method |
| `rate_limit_exceeded` | OpenAI rate limit | Wait or upgrade plan |
| `Invalid token` | Supabase auth failed | Re-login to app |
| `Missing authorization` | No auth header | Check app login state |
| `Daily limit reached` | App's 10/day limit | Wait or show upgrade modal |

---

## ✅ Success Indicators

When working correctly, you'll see:

**App Console:**
```
🤖 Calling AI service for workout suggestion...
✅ Edge Function Response: {
  hasContent: true,
  hasUsage: true,
  hasLimits: true
}
✅ AI service responded successfully
```

**Supabase Logs:**
```
Calling OpenAI API with model: gpt-4o-mini
OpenAI response status: 200
OpenAI response received, tokens: 245
```

---

**🎯 Start with Step 1 and work through the debugging steps above!**

