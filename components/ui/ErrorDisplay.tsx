import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AlertCircle, RefreshCw, WifiOff, Lock, ShieldAlert } from 'lucide-react-native';
import { AppError, ErrorType } from '@/lib/utils/errorHandling';

interface ErrorDisplayProps {
  error: AppError;
  onRetry?: () => void;
  compact?: boolean;
}

/**
 * Display error with appropriate icon and retry button
 */
export function ErrorDisplay({ error, onRetry, compact = false }: ErrorDisplayProps) {
  const Icon = getErrorIcon(error.type);
  const iconColor = getIconColor(error.type);

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <Icon size={16} color={iconColor} />
        <Text style={styles.compactMessage}>{error.userMessage}</Text>
        {error.retryable && onRetry && (
          <TouchableOpacity onPress={onRetry} style={styles.compactRetry}>
            <RefreshCw size={14} color="#3b82f6" />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: getIconBgColor(error.type) }]}>
        <Icon size={32} color={iconColor} />
      </View>
      
      <Text style={styles.title}>{getErrorTitle(error.type)}</Text>
      <Text style={styles.message}>{error.userMessage}</Text>
      
      {error.retryable && onRetry && (
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={onRetry}
          activeOpacity={0.7}
        >
          <RefreshCw size={18} color="#ffffff" />
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      )}
      
      {__DEV__ && error.message !== error.userMessage && (
        <Text style={styles.debugMessage}>{error.message}</Text>
      )}
    </View>
  );
}

/**
 * Inline error message (for forms, etc.)
 */
export function InlineError({ message }: { message: string }) {
  return (
    <View style={styles.inlineContainer}>
      <AlertCircle size={14} color="#ef4444" />
      <Text style={styles.inlineMessage}>{message}</Text>
    </View>
  );
}

/**
 * Error banner at top of screen
 */
export function ErrorBanner({ 
  error, 
  onDismiss,
  onRetry,
}: { 
  error: AppError; 
  onDismiss?: () => void;
  onRetry?: () => void;
}) {
  return (
    <View style={[styles.bannerContainer, { backgroundColor: getBannerColor(error.type) }]}>
      <View style={styles.bannerContent}>
        {getErrorIcon(error.type)({ size: 18, color: '#ffffff' })}
        <Text style={styles.bannerMessage}>{error.userMessage}</Text>
      </View>
      
      <View style={styles.bannerActions}>
        {error.retryable && onRetry && (
          <TouchableOpacity onPress={onRetry} style={styles.bannerAction}>
            <Text style={styles.bannerActionText}>Retry</Text>
          </TouchableOpacity>
        )}
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.bannerAction}>
            <Text style={styles.bannerActionText}>Dismiss</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// Helper functions
function getErrorIcon(type: ErrorType) {
  switch (type) {
    case ErrorType.NETWORK:
      return WifiOff;
    case ErrorType.AUTH:
      return Lock;
    case ErrorType.PERMISSION:
      return ShieldAlert;
    default:
      return AlertCircle;
  }
}

function getIconColor(type: ErrorType): string {
  switch (type) {
    case ErrorType.NETWORK:
      return '#f59e0b';
    case ErrorType.AUTH:
    case ErrorType.PERMISSION:
      return '#ef4444';
    case ErrorType.VALIDATION:
      return '#f97316';
    default:
      return '#ef4444';
  }
}

function getIconBgColor(type: ErrorType): string {
  switch (type) {
    case ErrorType.NETWORK:
      return 'rgba(245, 158, 11, 0.1)';
    case ErrorType.AUTH:
    case ErrorType.PERMISSION:
      return 'rgba(239, 68, 68, 0.1)';
    default:
      return 'rgba(239, 68, 68, 0.1)';
  }
}

function getBannerColor(type: ErrorType): string {
  switch (type) {
    case ErrorType.NETWORK:
      return '#d97706';
    case ErrorType.AUTH:
    case ErrorType.PERMISSION:
      return '#dc2626';
    case ErrorType.VALIDATION:
      return '#ea580c';
    default:
      return '#dc2626';
  }
}

function getErrorTitle(type: ErrorType): string {
  switch (type) {
    case ErrorType.NETWORK:
      return 'Connection Error';
    case ErrorType.AUTH:
      return 'Authentication Required';
    case ErrorType.PERMISSION:
      return 'Access Denied';
    case ErrorType.VALIDATION:
      return 'Invalid Input';
    case ErrorType.NOT_FOUND:
      return 'Not Found';
    case ErrorType.RATE_LIMIT:
      return 'Too Many Requests';
    case ErrorType.SERVER:
      return 'Server Error';
    default:
      return 'Error';
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
    maxWidth: 280,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  debugMessage: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 16,
    fontFamily: 'monospace',
    textAlign: 'center',
    maxWidth: 280,
  },
  
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  compactMessage: {
    flex: 1,
    fontSize: 13,
    color: '#ef4444',
  },
  compactRetry: {
    padding: 4,
  },
  
  // Inline styles
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  inlineMessage: {
    fontSize: 12,
    color: '#ef4444',
  },
  
  // Banner styles
  bannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bannerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bannerMessage: {
    flex: 1,
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
  },
  bannerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  bannerAction: {
    padding: 4,
  },
  bannerActionText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
});

