import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <View style={styles.container}>
      <AlertTriangle size={64} color="#ef4444" />
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>
        {error.message || 'An unexpected error occurred'}
      </Text>
      
      {__DEV__ && (
        <View style={styles.debugContainer}>
          <Text style={styles.debugTitle}>Debug Info:</Text>
          <ScrollView style={styles.debugScroll}>
            <Text style={styles.debugText}>{error.stack}</Text>
          </ScrollView>
        </View>
      )}
      
      <TouchableOpacity style={styles.button} onPress={resetError}>
        <RefreshCw size={20} color="#ffffff" />
        <Text style={styles.buttonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f1f5f9',
    marginTop: 16,
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
  },
  debugContainer: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    maxHeight: 200,
    width: '100%',
  },
  debugScroll: {
    maxHeight: 160,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f59e0b',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#94a3b8',
    fontFamily: 'monospace',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});



