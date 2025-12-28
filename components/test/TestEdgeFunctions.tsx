/**
 * Test Screen for Edge Functions
 * 
 * Add this to your app temporarily to test the Edge Functions
 * 
 * Usage:
 * 1. Import in your app: import TestEdgeFunctions from '@/components/test/TestEdgeFunctions'
 * 2. Add to a screen: <TestEdgeFunctions />
 * 3. Tap the test buttons
 * 4. Check console logs for results
 * 5. Remove after testing
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { testAIService, testAIServiceDetailed, testRateLimit } from '@/lib/ai/__tests__/aiService.test';
import { testExerciseService, testExerciseServiceDetailed, testSingleExercise } from '@/lib/exercises/__tests__/exerciseApiService.test';

export default function TestEdgeFunctions() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const runTest = async (testFn: () => Promise<boolean>, testName: string) => {
    setLoading(true);
    setResults(prev => [...prev, `🧪 Running: ${testName}...`]);
    
    try {
      const success = await testFn();
      setResults(prev => [...prev, success ? `✅ ${testName}: PASSED` : `❌ ${testName}: FAILED`]);
    } catch (error) {
      setResults(prev => [...prev, `❌ ${testName}: ERROR - ${error}`]);
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => setResults([]);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Edge Function Tests</Text>
      <Text style={styles.subtitle}>Test your Supabase Edge Functions</Text>

      {/* AI Tests */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🤖 AI Service Tests</Text>
        
        <TestButton
          title="Test AI (Simple)"
          onPress={() => runTest(testAIService, 'AI Simple')}
          disabled={loading}
        />
        
        <TestButton
          title="Test AI (Detailed)"
          onPress={() => runTest(testAIServiceDetailed, 'AI Detailed')}
          disabled={loading}
        />
        
        <TestButton
          title="Test Rate Limiting"
          onPress={() => runTest(testRateLimit, 'Rate Limit')}
          disabled={loading}
        />
      </View>

      {/* Exercise Tests */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏋️ Exercise Service Tests</Text>
        
        <TestButton
          title="Test Exercise Search"
          onPress={() => runTest(testExerciseService, 'Exercise Search')}
          disabled={loading}
        />
        
        <TestButton
          title="Test Exercise (Detailed)"
          onPress={() => runTest(testExerciseServiceDetailed, 'Exercise Detailed')}
          disabled={loading}
        />
        
        <TestButton
          title="Test Single Exercise"
          onPress={() => runTest(testSingleExercise, 'Single Exercise')}
          disabled={loading}
        />
      </View>

      {/* Results */}
      <View style={styles.resultsSection}>
        <View style={styles.resultsHeader}>
          <Text style={styles.sectionTitle}>📊 Results</Text>
          <Pressable onPress={clearResults}>
            <Text style={styles.clearButton}>Clear</Text>
          </Pressable>
        </View>
        
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#3b82f6" />
            <Text style={styles.loadingText}>Running test...</Text>
          </View>
        )}
        
        {results.length === 0 && !loading && (
          <Text style={styles.emptyText}>No tests run yet. Tap a button above to test.</Text>
        )}
        
        {results.map((result, index) => (
          <View key={index} style={styles.resultItem}>
            <Text style={styles.resultText}>{result}</Text>
          </View>
        ))}
      </View>

      <View style={styles.note}>
        <Text style={styles.noteTitle}>ℹ️ Note:</Text>
        <Text style={styles.noteText}>
          • Check the console for detailed logs{'\n'}
          • Make sure you're logged in{'\n'}
          • Tests require internet connection{'\n'}
          • Remove this component after testing
        </Text>
      </View>
    </ScrollView>
  );
}

function TestButton({ title, onPress, disabled }: { title: string; onPress: () => void; disabled: boolean }) {
  return (
    <Pressable
      style={[styles.button, disabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  resultsSection: {
    marginTop: 8,
    marginBottom: 24,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  clearButton: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    marginBottom: 8,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 14,
    marginLeft: 12,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
    padding: 24,
    backgroundColor: '#1e293b',
    borderRadius: 8,
  },
  resultItem: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    marginBottom: 6,
  },
  resultText: {
    color: '#e2e8f0',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  note: {
    backgroundColor: '#422006',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  noteTitle: {
    color: '#fbbf24',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  noteText: {
    color: '#fcd34d',
    fontSize: 13,
    lineHeight: 20,
  },
});

