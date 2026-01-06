/**
 * Common reusable styles for the app
 * Import these to avoid creating inline style objects
 */

import { StyleSheet } from 'react-native';

/**
 * Common layout styles
 */
export const layout = StyleSheet.create({
  // Flex
  flex1: { flex: 1 },
  flex2: { flex: 2 },
  flexGrow: { flexGrow: 1 },
  flexShrink: { flexShrink: 1 },

  // Flex direction
  row: { flexDirection: 'row' },
  rowReverse: { flexDirection: 'row-reverse' },
  column: { flexDirection: 'column' },

  // Flex wrap
  wrap: { flexWrap: 'wrap' },
  nowrap: { flexWrap: 'nowrap' },

  // Justify content
  justifyStart: { justifyContent: 'flex-start' },
  justifyEnd: { justifyContent: 'flex-end' },
  justifyCenter: { justifyContent: 'center' },
  justifyBetween: { justifyContent: 'space-between' },
  justifyAround: { justifyContent: 'space-around' },
  justifyEvenly: { justifyContent: 'space-evenly' },

  // Align items
  alignStart: { alignItems: 'flex-start' },
  alignEnd: { alignItems: 'flex-end' },
  alignCenter: { alignItems: 'center' },
  alignStretch: { alignItems: 'stretch' },

  // Combined
  center: { justifyContent: 'center', alignItems: 'center' },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  columnCenter: { flexDirection: 'column', alignItems: 'center' },

  // Position
  absolute: { position: 'absolute' },
  relative: { position: 'relative' },
  absoluteFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
});

/**
 * Spacing styles (padding/margin)
 */
export const spacing = StyleSheet.create({
  // Padding
  p0: { padding: 0 },
  p4: { padding: 4 },
  p8: { padding: 8 },
  p12: { padding: 12 },
  p16: { padding: 16 },
  p20: { padding: 20 },
  p24: { padding: 24 },

  // Padding horizontal
  px4: { paddingHorizontal: 4 },
  px8: { paddingHorizontal: 8 },
  px12: { paddingHorizontal: 12 },
  px16: { paddingHorizontal: 16 },
  px20: { paddingHorizontal: 20 },
  px24: { paddingHorizontal: 24 },

  // Padding vertical
  py4: { paddingVertical: 4 },
  py8: { paddingVertical: 8 },
  py12: { paddingVertical: 12 },
  py16: { paddingVertical: 16 },
  py20: { paddingVertical: 20 },
  py24: { paddingVertical: 24 },

  // Margin
  m0: { margin: 0 },
  m4: { margin: 4 },
  m8: { margin: 8 },
  m12: { margin: 12 },
  m16: { margin: 16 },

  // Margin horizontal
  mx4: { marginHorizontal: 4 },
  mx8: { marginHorizontal: 8 },
  mx12: { marginHorizontal: 12 },
  mx16: { marginHorizontal: 16 },

  // Margin vertical
  my4: { marginVertical: 4 },
  my8: { marginVertical: 8 },
  my12: { marginVertical: 12 },
  my16: { marginVertical: 16 },

  // Margin top
  mt0: { marginTop: 0 },
  mt4: { marginTop: 4 },
  mt8: { marginTop: 8 },
  mt12: { marginTop: 12 },
  mt16: { marginTop: 16 },
  mt20: { marginTop: 20 },
  mt24: { marginTop: 24 },

  // Margin bottom
  mb0: { marginBottom: 0 },
  mb4: { marginBottom: 4 },
  mb8: { marginBottom: 8 },
  mb12: { marginBottom: 12 },
  mb16: { marginBottom: 16 },
  mb20: { marginBottom: 20 },
  mb24: { marginBottom: 24 },

  // Margin left
  ml4: { marginLeft: 4 },
  ml8: { marginLeft: 8 },
  ml12: { marginLeft: 12 },
  ml16: { marginLeft: 16 },

  // Margin right
  mr4: { marginRight: 4 },
  mr8: { marginRight: 8 },
  mr12: { marginRight: 12 },
  mr16: { marginRight: 16 },

  // Gap (for flex containers)
  gap4: { gap: 4 },
  gap8: { gap: 8 },
  gap12: { gap: 12 },
  gap16: { gap: 16 },
});

/**
 * Size styles
 */
export const size = StyleSheet.create({
  w100: { width: '100%' },
  h100: { height: '100%' },
  full: { width: '100%', height: '100%' },
  w50: { width: '50%' },
  h50: { height: '50%' },
});

/**
 * Border radius styles
 */
export const radius = StyleSheet.create({
  none: { borderRadius: 0 },
  sm: { borderRadius: 4 },
  md: { borderRadius: 8 },
  lg: { borderRadius: 12 },
  xl: { borderRadius: 16 },
  '2xl': { borderRadius: 20 },
  full: { borderRadius: 9999 },
});

/**
 * Typography styles
 */
export const text = StyleSheet.create({
  // Alignment
  left: { textAlign: 'left' },
  center: { textAlign: 'center' },
  right: { textAlign: 'right' },

  // Weight
  normal: { fontWeight: 'normal' },
  medium: { fontWeight: '500' },
  semibold: { fontWeight: '600' },
  bold: { fontWeight: 'bold' },

  // Size
  xs: { fontSize: 10 },
  sm: { fontSize: 12 },
  base: { fontSize: 14 },
  md: { fontSize: 16 },
  lg: { fontSize: 18 },
  xl: { fontSize: 20 },
  '2xl': { fontSize: 24 },
  '3xl': { fontSize: 30 },

  // Combined common patterns
  titleLg: { fontSize: 24, fontWeight: 'bold' },
  titleMd: { fontSize: 20, fontWeight: 'bold' },
  titleSm: { fontSize: 18, fontWeight: '600' },
  label: { fontSize: 14, fontWeight: '600' },
  caption: { fontSize: 12, color: '#64748b' },
});

/**
 * App-specific color styles
 */
export const colors = StyleSheet.create({
  // Background colors
  bgPrimary: { backgroundColor: '#020617' },  // slate-950
  bgSecondary: { backgroundColor: '#0f172a' }, // slate-900
  bgCard: { backgroundColor: '#1e293b' },      // slate-800
  bgAccent: { backgroundColor: '#334155' },    // slate-700
  bgBlue: { backgroundColor: '#3b82f6' },
  bgGreen: { backgroundColor: '#22c55e' },
  bgRed: { backgroundColor: '#ef4444' },
  bgYellow: { backgroundColor: '#fbbf24' },
  bgTransparent: { backgroundColor: 'transparent' },

  // Text colors
  textPrimary: { color: '#ffffff' },
  textSecondary: { color: '#f1f5f9' },
  textMuted: { color: '#94a3b8' },
  textSubtle: { color: '#64748b' },
  textBlue: { color: '#3b82f6' },
  textGreen: { color: '#22c55e' },
  textRed: { color: '#ef4444' },
  textYellow: { color: '#fbbf24' },

  // Border colors
  borderDefault: { borderColor: '#334155' },
  borderSubtle: { borderColor: '#1e293b' },
  borderBlue: { borderColor: '#3b82f6' },
});

/**
 * Combined common patterns
 */
export const common = StyleSheet.create({
  // Screen container
  screen: {
    flex: 1,
    backgroundColor: '#020617',
  },

  // Card
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
  },

  // Button base
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },

  // Primary button
  buttonPrimary: {
    backgroundColor: '#3b82f6',
  },

  // Secondary button
  buttonSecondary: {
    backgroundColor: '#334155',
  },

  // Danger button
  buttonDanger: {
    backgroundColor: '#ef4444',
  },

  // Input
  input: {
    backgroundColor: '#334155',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#ffffff',
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: '#334155',
  },

  // Badge
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },

  // Icon button
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
  },

  // Overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },

  // Shadow (iOS)
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5, // Android
  },
});

/**
 * Convenience export of all styles
 */
export const styles = {
  ...layout,
  ...spacing,
  ...size,
  ...radius,
  ...text,
  ...colors,
  ...common,
};

export default styles;


