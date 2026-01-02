// Track which tab initiated navigation to non-tab routes
// This allows proper back navigation with Slot-based tabs

let currentTab: string = '/';

export function setCurrentTab(tabPath: string) {
  currentTab = tabPath;
  console.log('[NAV_STATE] Current tab set to:', tabPath);
}

export function getCurrentTab(): string {
  return currentTab;
}

export function getTabForPath(pathname: string): string {
  // Map routes to their logical parent tabs
  if (pathname === '/' || pathname.startsWith('/(tabs)') && pathname.endsWith('/index')) {
    return '/(tabs)';
  }
  if (pathname.includes('/workout') || pathname.includes('/template') || pathname.includes('/exercise')) {
    return '/(tabs)/workout';
  }
  if (pathname.includes('/history')) {
    return '/(tabs)/history';
  }
  if (pathname.includes('/progress') || pathname.includes('/body/')) {
    return '/(tabs)/progress';
  }
  if (pathname.includes('/profile') || pathname.includes('/settings')) {
    return '/(tabs)/profile';
  }
  // Default to home
  return '/(tabs)';
}

