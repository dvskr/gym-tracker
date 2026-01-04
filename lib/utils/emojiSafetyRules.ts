/**
 * ESLint Configuration for Emoji Safety
 * 
 * Add this to your .eslintrc.js to prevent direct emoji usage:
 * 
 * ```js
 * module.exports = {
 *   // ... other config
 *   rules: {
 *     // ... other rules
 *     'no-restricted-syntax': [
 *       'error',
 *       {
 *         selector: 'Literal[value=/[\u{1F300}-\u{1F9FF}]/u]',
 *         message: 'Do not use emoji literals directly. Import from @/lib/constants/emojis or use SafeEmoji component.'
 *       }
 *     ]
 *   }
 * }
 * ```
 * 
 * This will show an error in your IDE whenever you try to use an emoji directly in code.
 */

// Type definitions for emoji safety

/**
 * NEVER use this type - it's here to show what NOT to do
 * @deprecated Use EMOJIS constant or SafeEmoji component instead
 */
export type RawEmojiString = never;

/**
 * Type-safe emoji reference
 * Always use this instead of string literals
 */
export type SafeEmojiReference = {
  /** Import from @/lib/constants/emojis */
  from: '@/lib/constants/emojis';
  /** Use EMOJIS.key */
  key: string;
};

/**
 * Runtime validation for development
 * Call this in development mode to check for emoji usage
 */
export function validateNoDirectEmojis(code: string): { valid: boolean; violations: string[] } {
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  const violations: string[] = [];
  
  let match;
  while ((match = emojiRegex.exec(code)) !== null) {
    violations.push(`Found direct emoji at position ${match.index}: ${match[0]}`);
  }
  
  return {
    valid: violations.length === 0,
    violations,
  };
}

