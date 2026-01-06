/**
 * RevenueCat Usage Examples
 * 
 * This file shows how to use the RevenueCat service in your app
 */

import React from 'react';
import { View, Button, Alert } from 'react-native';
import {
  checkProStatus,
  presentPaywall,
  presentPaywallIfNeeded,
  restorePurchases,
  getManagementURL,
} from '@/lib/services/revenuecat';

/**
 * Example 1: Check if user has Pro subscription
 */
export function ProStatusExample() {
  const checkStatus = async () => {
    const isPro = await checkProStatus();
    Alert.alert(isPro ? 'Pro User ✨' : 'Free User', 
      isPro ? 'You have full access!' : 'Upgrade to unlock more features');
  };

  return <Button title="Check Pro Status" onPress={checkStatus} />;
}

/**
 * Example 2: Show paywall unconditionally
 * Use this for:
 * - Upgrade buttons
 * - Settings → Subscription page
 * - Premium features screen
 */
export function ShowPaywallExample() {
  const handleUpgrade = async () => {
    const success = await presentPaywall();
    
    if (success) {
      Alert.alert('Welcome to Pro! 🎉', 'You now have full access to all features.');
    } else {
      // User cancelled or error occurred
      console.log('Paywall dismissed without purchase');
    }
  };

  return <Button title="Upgrade to Pro" onPress={handleUpgrade} />;
}

/**
 * Example 3: Show paywall only if user doesn't have Pro
 * Use this for:
 * - Gating premium features
 * - AI Coach limit reached
 * - Premium-only screens
 */
export function ConditionalPaywallExample() {
  const handlePremiumFeature = async () => {
    // This will:
    // - Show paywall if user is free
    // - Return true immediately if user already has Pro
    const hasAccess = await presentPaywallIfNeeded();
    
    if (hasAccess) {
      // User either already had Pro or just purchased
      // Proceed with premium feature
      Alert.alert('Access Granted!', 'Enjoy your premium feature');
    } else {
      // User cancelled purchase
      Alert.alert('Upgrade Required', 'This feature is only available to Pro users');
    }
  };

  return <Button title="Use Premium Feature" onPress={handlePremiumFeature} />;
}

/**
 * Example 4: Restore purchases (important for iOS!)
 * Apple requires apps to have a "Restore Purchases" button
 */
export function RestorePurchasesExample() {
  const handleRestore = async () => {
    const result = await restorePurchases();
    
    if (result.success) {
      Alert.alert('Restored! ✅', 'Your purchases have been restored.');
    } else {
      Alert.alert('No Purchases Found', 'We could not find any previous purchases.');
    }
  };

  return <Button title="Restore Purchases" onPress={handleRestore} />;
}

/**
 * Example 5: Manage subscription
 * Opens App Store / Play Store subscription management
 */
export function ManageSubscriptionExample() {
  const handleManage = async () => {
    const url = await getManagementURL();
    
    if (url) {
      // Opens in App Store or Play Store
      Alert.alert('Manage Subscription', 'Opening subscription management...', [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Open',
          onPress: () => {
            // In a real app, use Linking.openURL(url)
            console.log('Opening:', url);
          },
        },
      ]);
    } else {
      Alert.alert('No Subscription', 'You don\'t have an active subscription.');
    }
  };

  return <Button title="Manage Subscription" onPress={handleManage} />;
}

/**
 * Example 6: Complete integration in a feature
 */
export function AICoachWithPaywall() {
  const sendMessage = async (message: string) => {
    // Check if user has Pro
    const isPro = await checkProStatus();
    
    if (!isPro) {
      // Show paywall if needed
      const upgraded = await presentPaywallIfNeeded();
      
      if (!upgraded) {
        Alert.alert('Pro Required', 'AI Coach requires a Pro subscription');
        return;
      }
    }
    
    // User has Pro, proceed with AI request
    console.log('Sending message to AI:', message);
    // ... AI logic here
  };

  return (
    <View>
      <Button title="Ask AI Coach" onPress={() => sendMessage('What should I eat?')} />
    </View>
  );
}

/**
 * Example 7: Show different UI for Free vs Pro users
 */
export function ProBadgeExample() {
  const [isPro, setIsPro] = React.useState(false);

  React.useEffect(() => {
    checkProStatus().then(setIsPro);
  }, []);

  return (
    <View>
      {isPro ? (
        <View style={{ backgroundColor: '#3b82f6', padding: 8, borderRadius: 4 }}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}>PRO ✨</Text>
        </View>
      ) : (
        <Button title="Upgrade to Pro" onPress={presentPaywall} />
      )}
    </View>
  );
}

/**
 * RECOMMENDED USAGE PATTERNS
 * 
 * 1. AI Coach Chat Limit:
 *    - Free: 10 messages/day
 *    - When limit reached, call: presentPaywallIfNeeded()
 * 
 * 2. Settings Screen:
 *    - Show "Upgrade to Pro" button → presentPaywall()
 *    - Show "Manage Subscription" (if Pro) → getManagementURL()
 *    - Show "Restore Purchases" → restorePurchases()
 * 
 * 3. Premium Features:
 *    - Check isPro = await checkProStatus()
 *    - If !isPro, call presentPaywallIfNeeded()
 * 
 * 4. Profile Screen:
 *    - Show Pro badge if checkProStatus() is true
 *    - Show upgrade prompt if false
 * 
 * 5. App Launch:
 *    - Don't show paywall automatically
 *    - Only show when user hits a limit or tries premium feature
 */

