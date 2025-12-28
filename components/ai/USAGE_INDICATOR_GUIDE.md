# AI Usage Indicator & Limit Handling

UI components and hooks for displaying AI usage and handling rate limits.

## 📦 Components

### **AIUsageIndicator**
Displays user's AI usage with progress bar and upgrade CTA.

### **AILimitModal**
Modal shown when user hits daily AI limit.

### **useAIRequest Hook**
React hook for making AI requests with automatic error handling.

---

## 🎯 Usage Examples

### **1. Show Usage Indicator on Home Screen**

```typescript
import { AIUsageIndicator } from '@/components/ai';

export default function HomeScreen() {
  return (
    <ScrollView>
      {/* Compact version in header */}
      <View style={styles.header}>
        <Text style={styles.title}>Home</Text>
        <AIUsageIndicator compact />
      </View>

      {/* Full version in content */}
      <AIUsageIndicator />

      {/* Rest of content */}
    </ScrollView>
  );
}
```

### **2. Use AI Request Hook**

```typescript
import { useAIRequest } from '@/hooks/useAIRequest';
import { AILimitModal } from '@/components/ai';
import { FITNESS_COACH_SYSTEM_PROMPT } from '@/lib/ai';

export default function WorkoutSuggestionsScreen() {
  const { makeRequest, isLoading, error, showLimitModal, closeLimitModal, limits } = useAIRequest();
  const [suggestion, setSuggestion] = useState<string>('');

  async function getSuggestion() {
    const response = await makeRequest(
      [
        { role: 'system', content: FITNESS_COACH_SYSTEM_PROMPT },
        { role: 'user', content: 'What should I train today?' }
      ],
      {
        requestType: 'workout_suggestion',
        maxTokens: 200
      }
    );

    if (response) {
      setSuggestion(response.content);
    }
  }

  return (
    <View>
      <Button 
        title="Get AI Suggestion" 
        onPress={getSuggestion}
        loading={isLoading}
      />

      {error && <Text style={styles.error}>{error}</Text>}
      {suggestion && <Text>{suggestion}</Text>}

      {/* Limit modal automatically shown when limit reached */}
      {limits && (
        <AILimitModal
          visible={showLimitModal}
          onClose={closeLimitModal}
          limits={limits}
        />
      )}
    </View>
  );
}
```

### **3. Manual Limit Checking**

```typescript
import { aiService } from '@/lib/ai';
import { useAIStore } from '@/stores/aiStore';

export default function AIFeatureScreen() {
  const { limits, setLimits } = useAIStore();
  const [canUseAI, setCanUseAI] = useState(false);

  useEffect(() => {
    checkLimits();
  }, []);

  async function checkLimits() {
    const limitsData = await aiService.checkLimits();
    setLimits(limitsData);
    setCanUseAI(limitsData.allowed);
  }

  if (!canUseAI) {
    return (
      <View style={styles.limitReached}>
        <Text>Daily AI limit reached</Text>
        <Text>{limits?.used} / {limits?.limit} used</Text>
        <Button title="Upgrade to Premium" />
      </View>
    );
  }

  return (
    <View>
      {/* AI feature content */}
    </View>
  );
}
```

### **4. Show Usage in Settings**

```typescript
import { AIUsageIndicator } from '@/components/ai';
import { aiService } from '@/lib/ai';

export default function AISettingsScreen() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    const data = await aiService.getUsageStats();
    setStats(data);
  }

  return (
    <ScrollView>
      <Text style={styles.title}>AI Assistant Settings</Text>

      {/* Usage indicator */}
      <AIUsageIndicator />

      {/* Detailed stats */}
      {stats && (
        <View style={styles.stats}>
          <Text style={styles.sectionTitle}>Usage Statistics</Text>
          
          <StatCard
            title="Today"
            requests={stats.today.requests}
            tokens={stats.today.tokens}
            cost={stats.today.cost_cents / 100}
          />
          
          <StatCard
            title="This Month"
            requests={stats.month.requests}
            tokens={stats.month.tokens}
            cost={stats.month.cost_cents / 100}
          />
          
          <StatCard
            title="All Time"
            requests={stats.all_time.requests}
            tokens={stats.all_time.tokens}
            cost={stats.all_time.cost_cents / 100}
          />
        </View>
      )}
    </ScrollView>
  );
}
```

### **5. Inline Limit Warning**

```typescript
import { useAIStore } from '@/stores/aiStore';
import { AlertTriangle } from 'lucide-react-native';

export function AIFeatureButton() {
  const { limits } = useAIStore();

  const isLow = limits && limits.remaining <= 3;
  const isEmpty = limits && limits.remaining === 0;

  return (
    <View>
      <Button
        title="Use AI Feature"
        disabled={isEmpty}
        icon={<Sparkles size={16} />}
      />

      {isLow && !isEmpty && (
        <View style={styles.warning}>
          <AlertTriangle size={14} color="#f59e0b" />
          <Text style={styles.warningText}>
            {limits.remaining} AI requests remaining today
          </Text>
        </View>
      )}

      {isEmpty && (
        <View style={styles.error}>
          <Text style={styles.errorText}>
            Daily limit reached. Resets at midnight.
          </Text>
        </View>
      )}
    </View>
  );
}
```

---

## 🎨 UI States

### **Normal State (>3 remaining)**
```
┌─────────────────────────────────┐
│ ⚡ AI Usage            [Free]   │
│ ▰▰▰▰▰▰▱▱▱▱ 60%                 │
│ 6 / 10 requests  4 remaining   │
│ ─────────────────────────────── │
│ Upgrade for 100 requests/day → │
└─────────────────────────────────┘
```

### **Low State (1-3 remaining)**
```
┌─────────────────────────────────┐
│ ⚡ AI Usage            [Free]   │
│ ▰▰▰▰▰▰▰▰▱▱ 80%                 │
│ 8 / 10 requests  2 remaining   │
│ ─────────────────────────────── │
│ Upgrade for 100 requests/day → │
│                                 │
│ ⚠️ Running low on AI requests  │
└─────────────────────────────────┘
```

### **Empty State (0 remaining)**
```
┌─────────────────────────────────┐
│ ⚡ AI Usage            [Free]   │
│ ▰▰▰▰▰▰▰▰▰▰ 100%                │
│ 10 / 10 requests  0 remaining  │
│ ─────────────────────────────── │
│ Upgrade for 100 requests/day → │
└─────────────────────────────────┘
```

### **Compact State**
```
┌──────────┐
│ ⚡ 4/10  │  (normal)
└──────────┘

┌──────────┐
│ ⚠️ 2/10  │  (low - orange)
└──────────┘

┌──────────┐
│ 🔴 0/10  │  (empty - red)
└──────────┘
```

---

## 🔔 Limit Modal

### **Free Tier Modal**
```
┌─────────────────────────────────┐
│                     ✕           │
│          ⚡                      │
│                                 │
│   Daily AI Limit Reached        │
│                                 │
│ You've used all 10 AI requests  │
│ for today. Upgrade to Premium   │
│ for 10x more!                   │
│                                 │
│ ┌─────────────────────────────┐ │
│ │  10 / 10 requests used      │ │
│ │  Resets at midnight         │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ ⚡ Upgrade to Premium       │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ Maybe Later                 │ │
│ └─────────────────────────────┘ │
│                                 │
│ Premium includes:               │
│ ✓ 100 AI requests per day       │
│ ✓ Advanced workout analysis     │
│ ✓ AI Chat Coach                 │
│ ✓ Priority support              │
└─────────────────────────────────┘
```

### **Premium Tier Modal**
```
┌─────────────────────────────────┐
│                     ✕           │
│          ⚡                      │
│                                 │
│   Daily AI Limit Reached        │
│                                 │
│ You've used all 100 AI requests │
│ for today.                      │
│                                 │
│ ┌─────────────────────────────┐ │
│ │  100 / 100 requests used    │ │
│ │  Resets at midnight         │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Got It                      │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

---

## 🎯 Hook API

### **useAIRequest()**

Returns:
```typescript
{
  makeRequest: (messages, options) => Promise<AIResponse | null>,
  isLoading: boolean,
  error: string | null,
  showLimitModal: boolean,
  closeLimitModal: () => void,
  limits: AILimitStatus | null
}
```

### **Automatic Behaviors**
- ✅ Shows limit modal when limit reached
- ✅ Updates AI store with new limits
- ✅ Handles `AILimitError` automatically
- ✅ Sets loading and error states
- ✅ Returns null on error (safe to check)

---

## 💡 Best Practices

### **1. Always use useAIRequest hook**
```typescript
// ✅ Good
const { makeRequest } = useAIRequest();
await makeRequest(messages, options);

// ❌ Bad (no automatic error handling)
await aiService.complete(messages, options);
```

### **2. Show usage indicator prominently**
```typescript
// ✅ Good - visible to user
<AIUsageIndicator />

// ⚠️ OK - compact in header
<AIUsageIndicator compact />
```

### **3. Pre-check limits for expensive operations**
```typescript
// ✅ Good
const limits = await aiService.checkLimits();
if (!limits.allowed) {
  showUpgradeModal();
  return;
}
```

### **4. Provide fallback content**
```typescript
// ✅ Good
const response = await makeRequest(messages);
if (!response) {
  // Show rule-based fallback
  return getRuleBasedSuggestion();
}
```

---

## ✅ Integration Checklist

- ✅ Import `useAIRequest` in AI feature components
- ✅ Add `AIUsageIndicator` to home/settings screens
- ✅ Include `AILimitModal` in AI feature screens
- ✅ Use `AILimitError` for error handling
- ✅ Update UI based on `limits.remaining`
- ✅ Show upgrade CTA for free users
- ✅ Test limit modal appearance
- ✅ Test compact indicator in headers

---

## 🎊 Complete!

Your app now has:
- ✅ Visual usage indicators
- ✅ Automatic limit handling
- ✅ Upgrade prompts for free users
- ✅ Smooth UX with loading states
- ✅ Error handling with fallbacks

**Users will always know their AI usage status!** 📊✨

