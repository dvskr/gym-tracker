# Back Gesture Navigation Research

## Current Architecture

### Navigation Setup
- **Custom Tab Navigation**: Using `Slot` component with custom tab bar (not `Tabs` component)
- **No Stack Navigator**: Cannot use `Stack` from expo-router (crashes on Android with `java.lang.String cannot be cast` error)
- **Manual Navigation**: Using `router.push()` and manual `getCurrentTab()` tracking

### Why We Can't Use Stack Navigator
From `lessons.md`:
> The `Tabs` and `Stack` navigation components from expo-router cause the "java.lang.String cannot be cast to java.lang.Boolean" crash on certain Android devices/Expo Go versions.

This is a **critical constraint** - we cannot use the built-in Stack navigator that would normally provide gesture support.

---

## Research Findings

### 1. Native Gesture Support (iOS & Android)

#### iOS
- **Default Behavior**: Stack navigators automatically support swipe-from-left-edge gestures
- **Requirement**: Must use `Stack` navigator from expo-router or react-navigation
- **Option**: `gestureEnabled: true` (default) in Stack.Screen options

#### Android
- **Hardware Back Button**: Handled via `BackHandler` API
- **Gesture Navigation**: Android 10+ supports edge swipe gestures (treated like hardware back)
- **Requirement**: Must use `Stack` navigator OR implement custom gesture handling

### 2. Why Gestures Don't Work Currently

**Problem**: We're using `Slot` + custom tabs, not `Stack` navigator
- `Slot` is a **pass-through component** - it just renders the matched route
- `Slot` has **no navigation state** or gesture detection
- `Slot` doesn't maintain a **navigation stack** for gestures to work with

**Result**: 
- ✅ Custom back buttons work (we control them)
- ❌ Swipe gestures don't work (no Stack navigator to handle them)
- ❌ Android hardware back button doesn't work properly

---

## Potential Solutions

### Option 1: Per-Route Stack Navigators (⚠️ High Risk)
**Approach**: Add `_layout.tsx` with Stack navigator for each section
- `/body/_layout.tsx` → Stack for body routes
- `/settings/_layout.tsx` → Stack for settings routes
- `/workout/_layout.tsx` → Stack for workout routes

**Status**: ❌ **ALREADY TRIED AND FAILED**
- Created `/settings/_layout.tsx` with Stack → Android crash
- Reverted to custom headers with manual navigation

**Why It Failed**:
The Android crash is **not specific to the tabs layout** - it affects **all Stack navigators** in this Expo Go environment.

### Option 2: Implement BackHandler for Android (✅ Feasible)
**Approach**: Use React Native's `BackHandler` API
```typescript
import { BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

useFocusEffect(
  React.useCallback(() => {
    const onBackPress = () => {
      const currentTab = getCurrentTab();
      router.push(currentTab || '/(tabs)');
      return true; // Prevent default behavior
    };

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress
    );

    return () => subscription.remove();
  }, [])
);
```

**Pros**:
- ✅ Doesn't require Stack navigator
- ✅ Works with Slot-based navigation
- ✅ Handles Android hardware + gesture back

**Cons**:
- ❌ Only works on Android (iOS swipe gestures still won't work)
- ⚠️ Need to add to EVERY screen (24 screens)
- ⚠️ Must manage focus state carefully

### Option 3: Custom Gesture Handler (⚠️ Complex)
**Approach**: Use `react-native-gesture-handler` to detect edge swipes
```typescript
import { PanGestureHandler } from 'react-native-gesture-handler';

// Detect left-edge swipe
const onGestureEvent = (event) => {
  if (event.nativeEvent.translationX > 100 && event.nativeEvent.x < 50) {
    // User swiped from left edge
    router.push(getCurrentTab());
  }
};
```

**Pros**:
- ✅ Works on both iOS and Android
- ✅ Doesn't require Stack navigator
- ✅ Can be added to root layout

**Cons**:
- ❌ Very complex to implement correctly
- ❌ Need to handle gesture conflicts (scrolling, swipeable items)
- ❌ Must manually track navigation stack
- ❌ No animation transitions (Stack provides these)

### Option 4: Hybrid Approach (🎯 Recommended)
**Approach**: Combine BackHandler + Manual Tracking
1. Add `BackHandler` to common navigation wrapper/hook
2. Keep manual `getCurrentTab()` tracking
3. Accept that iOS swipe gestures won't work (user education)

**Implementation**:
```typescript
// lib/hooks/useBackNavigation.ts
export function useBackNavigation() {
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        const currentTab = getCurrentTab();
        if (currentTab) {
          router.push(currentTab);
          return true;
        }
        return false; // Let app exit if on main tab
      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress
      );

      return () => subscription.remove();
    }, [])
  );
}
```

Then add to each nested screen:
```typescript
import { useBackNavigation } from '@/lib/hooks/useBackNavigation';

export default function MyScreen() {
  useBackNavigation(); // ✅ Handles Android back
  // ... rest of component
}
```

**Pros**:
- ✅ Handles Android hardware + gesture back
- ✅ Works with current Slot architecture
- ✅ Reusable hook (DRY principle)
- ✅ No Stack navigator needed

**Cons**:
- ⚠️ Still need to add hook to 24 screens
- ❌ iOS swipe gestures still won't work

---

## Constraints Summary

| Feature | Current Status | Possible? | Notes |
|---------|---------------|-----------|-------|
| Custom back buttons | ✅ Working | ✅ Yes | Already implemented |
| Android hardware back | ❌ Not working | ✅ Yes | Use BackHandler API |
| Android gesture back | ❌ Not working | ✅ Yes | BackHandler handles this too |
| iOS swipe gestures | ❌ Not working | ❌ **No** | Requires Stack navigator (crashes) |
| Animated transitions | ❌ Not working | ❌ **No** | Requires Stack navigator (crashes) |

---

## Recommendation

### Immediate Action: Implement Option 4 (Hybrid Approach)
1. ✅ Create `useBackNavigation` hook with BackHandler
2. ✅ Add hook to all 24 nested screens
3. ✅ Keep existing custom back buttons
4. ✅ Document iOS limitation for users

### Long-term Solution: Wait for Expo Router Fix
- Monitor expo-router GitHub issues for Android Stack crash fix
- When fixed, migrate to proper Stack navigators
- This will enable:
  - iOS swipe gestures
  - Animated transitions
  - Better navigation UX

### User Communication
Since iOS swipe gestures won't work:
- Ensure back buttons are prominent and discoverable
- Consider adding "Tap arrow to go back" hints for first-time users
- Accept this as a temporary limitation until Stack navigator is stable

---

## Implementation Checklist

If we proceed with Option 4:

- [ ] Create `lib/hooks/useBackNavigation.ts`
- [ ] Test BackHandler on Android device
- [ ] Add hook to 24 screens:
  - [ ] Coach (1)
  - [ ] Workout screens (7)
  - [ ] History screens (1)
  - [ ] Progress screens (7)
  - [ ] Settings screens (15)
- [ ] Test on both Android and iOS
- [ ] Document limitation in README
- [ ] Consider adding loading state/animation for back navigation

---

## Conclusion

**The core issue is architectural**: We cannot use Stack navigators due to the Android crash, which means we lose all built-in gesture support.

**Best available solution**: Implement BackHandler for Android, accept iOS limitation, and wait for expo-router to fix the Stack crash on Android.

**User impact**: 
- ✅ Android users get hardware + gesture back
- ❌ iOS users must use back buttons (no edge swipe)
- ✅ All users can still navigate normally

