# AI System - Production Ready

Complete AI-powered fitness coaching system with authentication, rate limiting, usage tracking, and cost protection.

## 🏗️ Architecture

```
Mobile App
    ↓
AI Service (Client)
    ↓
Supabase Edge Function
    ↓ (checks limits, tracks usage)
Database
    ↓
OpenAI API
```

## 📦 Core Files

### **Types & Interfaces**
- `lib/ai/types.ts` - TypeScript types and interfaces
- `stores/aiStore.ts` - Zustand store for AI state management

### **Core Service**
- `lib/ai/aiService.ts` - Main AI service (production-ready)
  - ✅ Authentication required
  - ✅ Rate limiting with caching
  - ✅ Usage tracking
  - ✅ Error handling with fallbacks
  - ✅ Edge Function integration

### **Configuration**
- `lib/ai/prompts.ts` - System prompts and templates
- `lib/ai/contextBuilder.ts` - User/workout context builders

### **Feature Services**
- `lib/ai/workoutSuggestions.ts` - Daily workout recommendations
- `lib/ai/formTips.ts` - Exercise form guidance
- `lib/ai/progressiveOverload.ts` - Weight/rep recommendations
- `lib/ai/workoutAnalysis.ts` - Post-workout feedback
- `lib/ai/plateauDetection.ts` - Progress stall detection
- `lib/ai/recoveryService.ts` - Recovery recommendations

## 🔑 Usage Examples

### **Basic AI Request**

```typescript
import { aiService } from '@/lib/ai';

// Simple question
const response = await aiService.ask('How many sets should I do?');

// With system prompt
const advice = await aiService.askWithContext(
  FITNESS_COACH_SYSTEM_PROMPT,
  'Give me a workout tip'
);

// Full control
const result = await aiService.complete(
  [
    { role: 'system', content: 'You are a fitness coach' },
    { role: 'user', content: 'What should I train today?' }
  ],
  {
    temperature: 0.7,
    maxTokens: 200,
    requestType: 'workout_suggestion'
  }
);
```

### **Check Usage Limits**

```typescript
import { aiService } from '@/lib/ai';

// Check if user can make request
const limits = await aiService.checkLimits();
console.log(limits);
// {
//   allowed: true,
//   used: 5,
//   limit: 10,
//   remaining: 5,
//   tier: 'free',
//   is_premium: false
// }

// Get usage statistics
const stats = await aiService.getUsageStats();
console.log(stats);
// {
//   today: { requests: 5, tokens: 1234, cost_cents: 18.5 },
//   month: { requests: 47, tokens: 12340, cost_cents: 185.0 },
//   all_time: { requests: 523, tokens: 134500, cost_cents: 2017.5 }
// }
```

### **Handle Rate Limits**

```typescript
import { aiService, AILimitError } from '@/lib/ai';

try {
  const response = await aiService.ask('Give me workout tips');
  console.log(response);
} catch (error) {
  if (error instanceof AILimitError) {
    // User hit daily limit
    console.log(`Limit reached: ${error.limits.used}/${error.limits.limit}`);
    console.log(`Tier: ${error.limits.tier}`);
    
    // Show upgrade prompt if free tier
    if (error.limits.tier === 'free') {
      showUpgradeModal();
    }
  } else {
    // Other error
    console.error('AI request failed:', error);
  }
}
```

### **Using Feature Services**

```typescript
import { 
  workoutSuggestionService,
  formTipsService,
  progressiveOverloadService,
  workoutAnalysisService,
  plateauDetectionService,
  recoveryService
} from '@/lib/ai';

// Get daily workout suggestion
const suggestion = await workoutSuggestionService.getSuggestion(userId);

// Get exercise form tips
const tips = await formTipsService.getTips('Bench Press');

// Get progressive overload recommendation
const recommendation = await progressiveOverloadService.getRecommendation(
  userId,
  exerciseId,
  setNumber
);

// Analyze completed workout
const analysis = await workoutAnalysisService.analyzeWorkout(workoutId);

// Check for plateaus
const plateaus = await plateauDetectionService.checkForPlateaus(userId);

// Get recovery status
const recovery = await recoveryService.getRecoveryStatus(userId);
```

## 🔒 Security Features

### **Authentication**
- ✅ All requests require valid JWT token
- ✅ User automatically authenticated via `useAuthStore`
- ✅ No anonymous AI requests

### **Rate Limiting**
- ✅ Free tier: 10 requests/day
- ✅ Premium tier: 100 requests/day
- ✅ Enforced at Edge Function level
- ✅ Cached limits (30-second TTL)

### **Cost Protection**
- ✅ Token limits capped at 1000/request
- ✅ All usage logged to database
- ✅ Real-time cost tracking
- ✅ Monthly summaries for analytics

## 📊 Database Functions

### **Check Limits**
```sql
SELECT can_use_ai('user-uuid-here'::uuid);
-- Returns: { allowed, used, limit, remaining, tier, is_premium }
```

### **Log Usage**
```sql
SELECT log_ai_usage(
  'user-uuid-here'::uuid,
  'workout_suggestion',
  234,     -- tokens
  0.035,   -- cost in cents
  'gpt-4o-mini',
  true,
  NULL
);
```

### **Get Stats**
```sql
SELECT get_ai_usage_stats('user-uuid-here'::uuid);
-- Returns: { today, month, all_time }
```

## 💰 Pricing & Limits

### **Free Tier**
- **Daily Limit**: 10 requests
- **Max Cost/Day**: ~$0.30
- **Max Cost/Month**: ~$9.00 per user

### **Premium Tier**
- **Daily Limit**: 100 requests
- **Max Cost/Day**: ~$3.00
- **Max Cost/Month**: ~$90.00 per user

### **Token Pricing (gpt-4o-mini)**
- **Input**: $0.00015 per 1K tokens
- **Output**: $0.0006 per 1K tokens
- **Average request**: ~200 tokens = $0.03

## 🎯 Response Format

```typescript
interface AIResponse {
  content: string;              // AI response text
  usage: {
    promptTokens: number;       // Input tokens used
    completionTokens: number;   // Output tokens used
    totalTokens: number;        // Total tokens
    costCents: number;          // Cost in cents
  };
  limits: {
    used: number;               // Requests used today
    limit: number;              // Daily limit
    remaining: number;          // Requests remaining
    tier: string;               // 'free' or 'premium'
  };
  isFallback?: boolean;         // True if fallback response
}
```

## 🔄 Fallback System

When AI is unavailable, the service returns appropriate fallback responses:

```typescript
// Automatic fallback responses by request type
const fallbacks = {
  workout_suggestion: 'Based on your recent training, consider doing a Push workout...',
  form_tips: 'Focus on controlled movement, maintain proper posture...',
  analysis: 'Great workout! You completed all your sets...',
  general: 'AI is temporarily unavailable. Please try again...'
};
```

## 📈 Monitoring

### **In Supabase Dashboard**
1. **Edge Function Logs**: See all AI requests in real-time
2. **Database Queries**: View `ai_usage`, `ai_usage_daily`, `ai_usage_monthly`
3. **Metrics**: Request count, error rate, response time

### **In App**
```typescript
import { useAIStore } from '@/stores/aiStore';

function MyComponent() {
  const { limits, usageStats } = useAIStore();
  
  return (
    <View>
      <Text>Used: {limits?.used}/{limits?.limit}</Text>
      <Text>Cost Today: ${usageStats?.today.cost_cents / 100}</Text>
    </View>
  );
}
```

## 🚀 Deployment Checklist

- ✅ Database schema applied (`20251228000016_ai_usage_tracking.sql`)
- ✅ Edge Function deployed (`ai-complete`)
- ✅ Secrets configured (`OPENAI_API_KEY`, etc.)
- ✅ Client service integrated (`aiService.ts`)
- ✅ AI store created (`aiStore.ts`)
- ✅ All feature services use new `aiService`
- ✅ Error handling with `AILimitError`
- ✅ Fallback responses configured

## 🔧 Configuration

### **Adjust Rate Limits**

Edit in Supabase SQL Editor:

```sql
-- In can_use_ai function
v_daily_limit := CASE 
  WHEN v_is_premium THEN 200  -- Increase premium limit
  ELSE 20                      -- Increase free limit
END;
```

### **Change Token Limits**

Edit in `supabase/functions/ai-complete/index.ts`:

```typescript
const maxTokens = Math.min(options.maxTokens || 500, 2000) // Increase cap
```

### **Update Pricing**

Edit in `supabase/functions/ai-complete/index.ts`:

```typescript
const PRICING = {
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4o': { input: 0.005, output: 0.015 },
}
```

## 🆘 Troubleshooting

### **"Daily AI limit reached"**
- User has hit their daily limit
- Check: `SELECT can_use_ai('user-id'::uuid);`
- Solution: Wait 24 hours or upgrade to premium

### **"Invalid or expired token"**
- User not authenticated
- Check: `useAuthStore.getState().user`
- Solution: Ensure user is logged in

### **AI requests not being logged**
- Edge Function may have failed
- Check: Supabase Dashboard → Functions → Logs
- Solution: Verify secrets are set, check OpenAI API key

### **Unexpected costs**
- Check: `SELECT * FROM ai_usage_monthly WHERE month = DATE_TRUNC('month', CURRENT_DATE);`
- Monitor: Token usage and request types
- Solution: Lower token limits, reduce model usage

## 📚 Additional Resources

- **OpenAI API Docs**: https://platform.openai.com/docs
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions
- **Token Counting**: https://platform.openai.com/tokenizer

## ✅ Production Ready

This AI system is:
- ✅ **Secure** - Authentication required, API keys hidden
- ✅ **Scalable** - Edge Functions, database-backed
- ✅ **Cost-protected** - Rate limits, usage tracking
- ✅ **Resilient** - Fallback responses, error handling
- ✅ **Observable** - Logging, metrics, analytics
- ✅ **Maintainable** - TypeScript, clear architecture
