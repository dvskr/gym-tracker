import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkProStatus, getCustomerInfo } from '@/lib/services/revenuecat';
import { CustomerInfo } from 'react-native-purchases';

interface ProState {
  // State
  isPro: boolean;
  isLoading: boolean;
  customerInfo: CustomerInfo | null;
  expirationDate: string | null;

  // Actions
  checkStatus: () => Promise<boolean>;
  setIsPro: (value: boolean) => void;
  setCustomerInfo: (info: CustomerInfo | null) => void;
  reset: () => void;
}

const ENTITLEMENT_ID = process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID || 'Gym-Tracker Pro';

export const useProStore = create<ProState>()(
  persist(
    (set, get) => ({
      // Initial state
      isPro: false,
      isLoading: true,
      customerInfo: null,
      expirationDate: null,

      // Check subscription status
      checkStatus: async () => {
        set({ isLoading: true });
        try {
          const isPro = await checkProStatus();
          const customerInfo = await getCustomerInfo();
          
          let expirationDate = null;
          if (customerInfo?.entitlements.active[ENTITLEMENT_ID]) {
            expirationDate = customerInfo.entitlements.active[ENTITLEMENT_ID].expirationDate;
          }

          set({ 
            isPro, 
            customerInfo, 
            expirationDate,
            isLoading: false 
          });
          return isPro;
        } catch (error) {
          set({ isLoading: false });
          return false;
        }
      },

      // Set pro status
      setIsPro: (value) => set({ isPro: value }),

      // Set customer info
      setCustomerInfo: (info) => {
        const isPro = info?.entitlements.active[ENTITLEMENT_ID] !== undefined;
        let expirationDate = null;
        if (info?.entitlements.active[ENTITLEMENT_ID]) {
          expirationDate = info.entitlements.active[ENTITLEMENT_ID].expirationDate;
        }
        set({ customerInfo: info, isPro, expirationDate });
      },

      // Reset state
      reset: () => set({
        isPro: false,
        isLoading: false,
        customerInfo: null,
        expirationDate: null,
      }),
    }),
    {
      name: 'pro-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ isPro: state.isPro }),
    }
  )
);

