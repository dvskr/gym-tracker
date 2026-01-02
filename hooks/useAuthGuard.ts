import { useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';

export function useAuthGuard() {
  const { session, isGuest } = useAuthStore();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMessage, setAuthMessage] = useState<string>();

  const isAuthenticated = !!session && !isGuest;

  const requireAuth = useCallback((action: () => void, message?: string) => {
    if (isAuthenticated) {
      action();
    } else {
      setAuthMessage(message);
      setShowAuthModal(true);
    }
  }, [isAuthenticated]);

  const closeAuthModal = useCallback(() => {
    setShowAuthModal(false);
    setAuthMessage(undefined);
  }, []);

  return {
    isAuthenticated,
    showAuthModal,
    authMessage,
    requireAuth,
    closeAuthModal,
  };
}
