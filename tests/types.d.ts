/// <reference types="vitest" />
/// <reference types="@testing-library/react-native" />

// Extend expect with custom matchers if needed
declare global {
  namespace Vi {
    interface Assertion {
      // Add custom matchers here if needed
    }
  }
}

export {};

