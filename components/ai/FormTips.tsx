import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/utils/logger';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Lightbulb, ChevronDown, Check, X, AlertCircle } from 'lucide-react-native';
import { formTipsService, FormTip as FormTipType } from '@/lib/ai/formTips';
import { AIFeedback } from './AIFeedback';

interface FormTipsProps {
  exerciseName: string;
  initiallyExpanded?: boolean;
}

export function FormTips({ exerciseName, initiallyExpanded = false }: FormTipsProps) {
  const [tips, setTips] = useState<FormTipType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [rotateAnim] = useState(new Animated.Value(initiallyExpanded ? 1 : 0));

  useEffect(() => {
    async function fetchTips() {
      setIsLoading(true);
      try {
        const result = await formTipsService.getFormTips(exerciseName);
        setTips(result);
      } catch (error) {
 logger.error('Failed to fetch form tips:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchTips();
  }, [exerciseName]);

  const toggleExpanded = () => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    
    Animated.timing(rotateAnim, {
      toValue: newExpanded ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#f59e0b" />
          <Text style={styles.loadingText}>Loading form tips...</Text>
        </View>
      </View>
    );
  }

  if (!tips) return null;

  return (
    <View style={styles.container}>
      <Pressable 
        style={styles.header}
        onPress={toggleExpanded}
        android_ripple={{ color: '#334155' }}
      >
        <View style={styles.headerLeft}>
          <Lightbulb size={16} color="#f59e0b" />
          <Text style={styles.title}>Form Tips</Text>
          {tips.cachedAt === 'static' && (
            <View style={styles.verifiedBadge}>
              <Check size={10} color="#22c55e" />
            </View>
          )}
        </View>
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <ChevronDown size={16} color="#94a3b8" />
        </Animated.View>
      </Pressable>

      {expanded && (
        <View style={styles.content}>
          {/* Key Cues */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Key Cues</Text>
            {tips.cues.map((cue, i) => (
              <View key={i} style={styles.itemRow}>
                <View style={styles.iconCircle}>
                  <Check size={12} color="#22c55e" />
                </View>
                <Text style={styles.itemText}>{cue}</Text>
              </View>
            ))}
          </View>

          {/* Common Mistakes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Common Mistakes</Text>
            {tips.commonMistakes.map((mistake, i) => (
              <View key={i} style={styles.itemRow}>
                <View style={[styles.iconCircle, styles.iconCircleError]}>
                  <X size={12} color="#ef4444" />
                </View>
                <Text style={styles.itemText}>{mistake}</Text>
              </View>
            ))}
          </View>

          {/* Breathing Pattern */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Breathing</Text>
            <View style={styles.breathingCard}>
              <Text style={styles.breathingText}>{tips.breathingPattern}</Text>
            </View>
          </View>

          {/* Safety Tips (if available) */}
          {tips.safetyTips && tips.safetyTips.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Safety</Text>
              {tips.safetyTips.map((tip, i) => (
                <View key={i} style={styles.itemRow}>
                  <View style={[styles.iconCircle, styles.iconCircleWarning]}>
                    <AlertCircle size={12} color="#f59e0b" />
                  </View>
                  <Text style={styles.itemText}>{tip}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Source indicator and feedback */}
          <View style={styles.footer}>
            <Text style={styles.sourceText}>
              {tips.cachedAt === 'static' 
                ? 'Expert-verified tips' 
                : tips.cachedAt === 'generic'
                ? 'General guidance'
                : 'AI-generated tips'}
            </Text>
            <AIFeedback 
              feature="form_tips" 
              context={{ exercise: exerciseName }}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginVertical: 8,
    overflow: 'hidden',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    paddingHorizontal: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f59e0b',
  },
  verifiedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#22c55e20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 16,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  iconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#22c55e20',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  iconCircleError: {
    backgroundColor: '#ef444420',
  },
  iconCircleWarning: {
    backgroundColor: '#f59e0b20',
  },
  itemText: {
    flex: 1,
    fontSize: 14,
    color: '#cbd5e1',
    lineHeight: 20,
  },
  breathingCard: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  breathingText: {
    fontSize: 14,
    color: '#e2e8f0',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  sourceText: {
    fontSize: 11,
    color: '#64748b',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
});
