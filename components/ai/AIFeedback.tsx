import React, { useState } from 'react';
import { logger } from '@/lib/utils/logger';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { ThumbsUp, ThumbsDown } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { lightHaptic } from '@/lib/utils/haptics';

interface AIFeedbackProps {
  feature: 'workout_suggestion' | 'form_tips' | 'recovery' | 'analysis' | 'chat' | 'weight_suggestion';
  aiUsageId?: string;
  context?: Record<string, any>;
}

export function AIFeedback({ feature, aiUsageId, context }: AIFeedbackProps) {
  const [submitted, setSubmitted] = useState<'positive' | 'negative' | null>(null);

  const submitFeedback = async (rating: 'positive' | 'negative') => {
    if (submitted) return;
    
    lightHaptic();
    setSubmitted(rating);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('ai_feedback').insert({
        user_id: user.id,
        ai_usage_id: aiUsageId || null,
        feature,
        rating,
        context: context || null,
      });
    } catch (error) {
      logger.error('Failed to submit AI feedback:', error);
      // Reset on error so user can try again
      setSubmitted(null);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => submitFeedback('positive')}
        style={[
          styles.button,
          submitted === 'positive' && styles.buttonPositiveActive,
        ]}
        disabled={!!submitted}
        activeOpacity={0.7}
      >
        <ThumbsUp 
          size={14} 
          color={submitted === 'positive' ? '#22c55e' : '#94a3b8'} 
          fill={submitted === 'positive' ? '#22c55e' : 'none'}
        />
      </TouchableOpacity>
      
      <TouchableOpacity
        onPress={() => submitFeedback('negative')}
        style={[
          styles.button,
          submitted === 'negative' && styles.buttonNegativeActive,
        ]}
        disabled={!!submitted}
        activeOpacity={0.7}
      >
        <ThumbsDown 
          size={14} 
          color={submitted === 'negative' ? '#ef4444' : '#94a3b8'}
          fill={submitted === 'negative' ? '#ef4444' : 'none'}
        />
      </TouchableOpacity>

      {submitted && (
        <Text style={styles.thankYouText}>Thanks!</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  button: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  buttonPositiveActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  buttonNegativeActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  thankYouText: {
    fontSize: 11,
    color: '#64748b',
    fontStyle: 'italic',
    marginLeft: 4,
  },
});

