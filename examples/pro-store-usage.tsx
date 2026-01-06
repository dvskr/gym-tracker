/**
 * Pro Store Usage Examples
 * 
 * The Pro Store manages subscription state across the app
 */

import React from 'react';
import { View, Text, Button, ActivityIndicator } from 'react-native';
import { useProStore } from '@/stores/proStore';
import { presentPaywall, presentPaywallIfNeeded } from '@/lib/services/revenuecat';

/**
 * Example 1: Display Pro Status
 * Shows user's current subscription state
 */
export function ProStatusDisplay() {
  const { isPro, isLoading, expirationDate } = useProStore();

  if (isLoading) {
    return <ActivityIndicator />;
  }

  return (
    <View>
      <Text>{isPro ? 'Pro Member ✨' : 'Free Tier'}</Text>
      {isPro && expirationDate && (
        <Text>Expires: {new Date(expirationDate).toLocaleDateString()}</Text>
      )}
    </View>
  );
}

/**
 * Example 2: Check Status on App Load
 * Call this in your root layout or app initialization
 */
export function AppInitialization() {
  const checkStatus = useProStore((state) => state.checkStatus);

  React.useEffect(() => {
    // Check Pro status when app loads
    checkStatus();
  }, []);

  return null;
}

/**
 * Example 3: Conditional Feature Access
 * Show different UI based on Pro status
 */
export function PremiumFeatureGate() {
  const { isPro, isLoading } = useProStore();

  if (isLoading) {
    return <ActivityIndicator />;
  }

  if (!isPro) {
    return (
      <View>
        <Text>This feature requires Pro</Text>
        <Button title="Upgrade" onPress={presentPaywall} />
      </View>
    );
  }

  return (
    <View>
      <Text>Premium Feature Content</Text>
    </View>
  );
}

/**
 * Example 4: AI Coach with Limit
 * Free: 10 messages/day, Pro: Unlimited
 */
export function AICoachWithLimits() {
  const { isPro } = useProStore();
  const [messagesUsed, setMessagesUsed] = React.useState(0);

  const sendMessage = async (message: string) => {
    // Free tier: 10 messages/day limit
    if (!isPro && messagesUsed >= 10) {
      const upgraded = await presentPaywallIfNeeded();
      
      if (!upgraded) {
        alert('Daily limit reached! Upgrade to Pro for unlimited messages.');
        return;
      }
    }

    // Send message
    console.log('Sending:', message);
    setMessagesUsed(messagesUsed + 1);
  };

  return (
    <View>
      {!isPro && (
        <Text>Messages used today: {messagesUsed}/10</Text>
      )}
      <Button title="Send Message" onPress={() => sendMessage('Hello!')} />
    </View>
  );
}

/**
 * Example 5: Profile Header with Pro Badge
 */
export function ProfileHeader() {
  const { isPro } = useProStore();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Text style={{ fontSize: 24 }}>John Doe</Text>
      {isPro && (
        <View style={{ 
          backgroundColor: '#3b82f6', 
          paddingHorizontal: 8, 
          paddingVertical: 4, 
          borderRadius: 4,
          marginLeft: 8,
        }}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}>PRO ✨</Text>
        </View>
      )}
    </View>
  );
}

/**
 * Example 6: Settings Screen
 * Show upgrade or manage subscription
 */
export function SubscriptionSettings() {
  const { isPro, expirationDate, checkStatus } = useProStore();

  if (!isPro) {
    return (
      <View>
        <Text style={{ fontSize: 18, marginBottom: 10 }}>Upgrade to Pro</Text>
        <Text>• Unlimited AI coaching</Text>
        <Text>• Advanced analytics</Text>
        <Text>• Cloud backup</Text>
        <Text>• Priority support</Text>
        <Button title="Upgrade Now" onPress={presentPaywall} />
      </View>
    );
  }

  return (
    <View>
      <Text style={{ fontSize: 18, marginBottom: 10 }}>Pro Subscription</Text>
      {expirationDate && (
        <Text>Renews: {new Date(expirationDate).toLocaleDateString()}</Text>
      )}
      <Button title="Manage Subscription" onPress={() => {
        // Open subscription management
      }} />
      <Button title="Refresh Status" onPress={checkStatus} />
    </View>
  );
}

/**
 * Example 7: Update Pro Status After Purchase
 * Call this after successful purchase
 */
export function HandlePurchaseSuccess() {
  const setCustomerInfo = useProStore((state) => state.setCustomerInfo);

  const handlePurchase = async () => {
    const success = await presentPaywall();
    
    if (success) {
      // Get updated customer info
      const { getCustomerInfo } = await import('@/lib/services/revenuecat');
      const info = await getCustomerInfo();
      
      // Update store
      setCustomerInfo(info);
      
      alert('Welcome to Pro! 🎉');
    }
  };

  return <Button title="Buy Pro" onPress={handlePurchase} />;
}

/**
 * Example 8: Reset on Logout
 * Clear Pro status when user logs out
 */
export function LogoutButton() {
  const reset = useProStore((state) => state.reset);

  const handleLogout = async () => {
    // Logout from RevenueCat
    const { logoutUser } = await import('@/lib/services/revenuecat');
    await logoutUser();
    
    // Reset Pro store
    reset();
    
    // Logout from auth
    // ... your auth logout logic
  };

  return <Button title="Logout" onPress={handleLogout} />;
}

/**
 * Example 9: Optimistic UI Updates
 * Update UI immediately while checking status in background
 */
export function OptimisticProCheck() {
  const { isPro, checkStatus } = useProStore();

  React.useEffect(() => {
    // Check status in background
    checkStatus();
  }, []);

  // UI renders immediately with cached value
  // Updates when checkStatus completes
  return (
    <Text>{isPro ? 'Pro Features Enabled' : 'Free Tier'}</Text>
  );
}

/**
 * Example 10: Custom Hook for Feature Gating
 */
export function useRequirePro() {
  const { isPro, checkStatus } = useProStore();

  const requirePro = async (): Promise<boolean> => {
    // Refresh status
    const isProNow = await checkStatus();
    
    if (!isProNow) {
      // Show paywall
      const upgraded = await presentPaywallIfNeeded();
      return upgraded;
    }
    
    return true;
  };

  return { isPro, requirePro };
}

// Usage of custom hook:
export function PremiumFeatureWithHook() {
  const { isPro, requirePro } = useRequirePro();

  const handleAction = async () => {
    const hasAccess = await requirePro();
    
    if (hasAccess) {
      // Do premium action
      console.log('Premium action executed');
    }
  };

  return (
    <Button 
      title={isPro ? 'Use Feature' : 'Upgrade to Use'} 
      onPress={handleAction} 
    />
  );
}

/**
 * INTEGRATION CHECKLIST
 * 
 * 1. Initialize in Root Layout:
 *    const checkStatus = useProStore((state) => state.checkStatus);
 *    useEffect(() => { checkStatus(); }, []);
 * 
 * 2. Update on Purchase:
 *    After successful purchase, call setCustomerInfo()
 * 
 * 3. Reset on Logout:
 *    Call reset() when user logs out
 * 
 * 4. Check Status Periodically:
 *    Call checkStatus() when app comes to foreground
 * 
 * 5. Use Selectors for Performance:
 *    const isPro = useProStore((state) => state.isPro);
 *    Instead of: const { isPro } = useProStore();
 */

