import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AlertCircle, RefreshCw } from 'lucide-react-native';

interface Props {
  children: ReactNode;
  screenName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Lightweight error boundary for individual screens.
 * Shows a simpler error UI and allows retry without full app reload.
 * 
 * Usage:
 * ```tsx
 * <ScreenErrorBoundary screenName="Profile">
 *   <ProfileScreen />
 * </ScreenErrorBoundary>
 * ```
 */
export class ScreenErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error(`Error in ${this.props.screenName || 'screen'}:`, error);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <AlertCircle size={48} color="#f59e0b" />
          <Text style={styles.title}>Couldn't load this screen</Text>
          <Text style={styles.message}>
            {this.state.error?.message || 'Something went wrong'}
          </Text>
          {__DEV__ && this.state.error?.stack && (
            <Text style={styles.debugText} numberOfLines={3}>
              {this.state.error.stack.split('\n').slice(0, 3).join('\n')}
            </Text>
          )}
          <TouchableOpacity style={styles.button} onPress={this.resetError}>
            <RefreshCw size={16} color="#ffffff" />
            <Text style={styles.buttonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f1f5f9',
    marginTop: 12,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 16,
  },
  debugText: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'monospace',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  buttonText: {
    fontSize: 14,
    color: '#ffffff',
  },
});

