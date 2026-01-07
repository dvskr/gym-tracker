import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
  LOG_LEVEL,
} from 'react-native-purchases';
import { logger } from '@/lib/utils/logger';

// Environment variables
const API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY!;
const ENTITLEMENT_ID = process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID || 'Gym-Tracker Pro';

/**
 * Initialize RevenueCat SDK
 * Call this once when app starts
 */
export const initializePurchases = async (userId?: string): Promise<void> => {
  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }

  await Purchases.configure({
    apiKey: API_KEY,
    appUserID: userId || undefined,
  });
};

/**
 * Check if user has active Pro subscription
 */
export const checkProStatus = async (): Promise<boolean> => {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  } catch (error) {
    logger.error('Error checking pro status:', error);
    return false;
  }
};

/**
 * Get customer info including subscription details
 */
export const getCustomerInfo = async (): Promise<CustomerInfo | null> => {
  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    logger.error('Error getting customer info:', error);
    return null;
  }
};

/**
 * Get available subscription offerings
 */
export const getOfferings = async (): Promise<PurchasesOffering | null> => {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (error) {
    logger.error('Error getting offerings:', error);
    return null;
  }
};

/**
 * Purchase a subscription package
 */
export const purchasePackage = async (
  pkg: PurchasesPackage
): Promise<{ success: boolean; customerInfo?: CustomerInfo; error?: string }> => {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    return { success: isPro, customerInfo };
  } catch (error: any) {
    if (error.userCancelled) {
      return { success: false, error: 'cancelled' };
    }
    logger.error('Error purchasing:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Restore previous purchases
 */
export const restorePurchases = async (): Promise<{
  success: boolean;
  customerInfo?: CustomerInfo;
  error?: string;
}> => {
  try {
    const customerInfo = await Purchases.restorePurchases();
    const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    return { success: isPro, customerInfo };
  } catch (error: any) {
    logger.error('Error restoring purchases:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get subscription management URL
 */
export const getManagementURL = async (): Promise<string | null> => {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.managementURL;
  } catch (error) {
    logger.error('Error getting management URL:', error);
    return null;
  }
};

/**
 * Identify user (call after login)
 */
export const identifyUser = async (userId: string): Promise<void> => {
  try {
    await Purchases.logIn(userId);
  } catch (error) {
    logger.error('Error identifying user:', error);
  }
};

/**
 * Logout user (call after logout)
 */
export const logoutUser = async (): Promise<void> => {
  try {
    await Purchases.logOut();
  } catch (error) {
    logger.error('Error logging out user:', error);
  }
};

/**
 * Get entitlement ID
 */
export const getEntitlementId = (): string => ENTITLEMENT_ID;

