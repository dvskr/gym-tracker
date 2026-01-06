// components/workout/FormTips.tsx
// Collapsible form tips component with database-backed data

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
  ActivityIndicator,
} from 'react-native';
import {
  Lightbulb,
  CheckCircle2,
  XCircle,
  Wind,
  Shield,
} from 'lucide-react-native';
import { useFormTips } from '@/hooks/useFormTips';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface FormTipsProps {
  exerciseId: string;
}

interface FormTipsContentProps {
  exerciseId: string;
}

// Content-only component for inline dropdown
export function FormTipsContent({ exerciseId }: FormTipsContentProps) {
  const { tips, isLoading, error } = useFormTips(exerciseId);

  // Don't render if no tips available
  if (!tips && !isLoading && !error) {
    return null;
  }

  if (isLoading) {
    return (
      <View style={styles.expandedContainer}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#60a5fa" />
          <Text style={styles.loadingText}>Loading form tips...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.expandedContainer}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  if (!tips) {
    return null;
  }

  return (
    <View style={styles.expandedContainer}>
      <View style={styles.content}>
        {/* Key Cues */}
        {tips.key_cues?.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <CheckCircle2 size={16} color="#22c55e" />
              <Text style={styles.sectionTitle}>Key Cues</Text>
            </View>
            <View style={styles.sectionContent}>
              {tips.key_cues.map((cue, index) => (
                <View key={index} style={styles.bulletItem}>
                  <View style={[styles.bullet, styles.greenBullet]} />
                  <Text style={styles.bulletText}>{cue}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Common Mistakes */}
        {tips.common_mistakes?.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <XCircle size={16} color="#ef4444" />
              <Text style={styles.sectionTitle}>Avoid</Text>
            </View>
            <View style={styles.sectionContent}>
              {tips.common_mistakes.map((mistake, index) => (
                <View key={index} style={styles.bulletItem}>
                  <View style={[styles.bullet, styles.redBullet]} />
                  <Text style={[styles.bulletText, styles.redText]}>
                    {mistake}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Breathing */}
        {tips.breathing && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Wind size={16} color="#60a5fa" />
              <Text style={styles.sectionTitle}>Breathing</Text>
            </View>
            <View style={styles.breathingBox}>
              <Text style={styles.breathingText}>{tips.breathing}</Text>
            </View>
          </View>
        )}

        {/* Safety Tips */}
        {tips.safety_tips?.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Shield size={16} color="#f59e0b" />
              <Text style={styles.sectionTitle}>Safety</Text>
            </View>
            <View style={styles.safetyBox}>
              {tips.safety_tips.map((tip, index) => (
                <Text key={index} style={styles.safetyText}>
                  • {tip}
                </Text>
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

// Button component with self-contained expand/collapse (for modal use)
export function FormTips({ exerciseId }: FormTipsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { tips, isLoading, error } = useFormTips(exerciseId);

  // Don't render if no tips available
  if (!tips && !isLoading) {
    return null;
  }

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  return (
    <>
      {/* Lightbulb Button */}
      <TouchableOpacity
        style={styles.lightbulbButton}
        onPress={toggleExpand}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#F59E0B" />
        ) : (
          <Lightbulb 
            size={20} 
            color="#F59E0B"
            fill={isExpanded ? '#F59E0B' : 'transparent'}
          />
        )}
      </TouchableOpacity>

      {/* Expanded Content */}
      {isExpanded && tips && (
        <View style={styles.expandedContainer}>
          <View style={styles.content}>
          {/* Key Cues */}
          {tips.key_cues?.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <CheckCircle2 size={16} color="#22c55e" />
                <Text style={styles.sectionTitle}>Key Cues</Text>
              </View>
              <View style={styles.sectionContent}>
                {tips.key_cues.map((cue, index) => (
                  <View key={index} style={styles.bulletItem}>
                    <View style={[styles.bullet, styles.greenBullet]} />
                    <Text style={styles.bulletText}>{cue}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Common Mistakes */}
          {tips.common_mistakes?.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <XCircle size={16} color="#ef4444" />
                <Text style={styles.sectionTitle}>Avoid</Text>
              </View>
              <View style={styles.sectionContent}>
                {tips.common_mistakes.map((mistake, index) => (
                  <View key={index} style={styles.bulletItem}>
                    <View style={[styles.bullet, styles.redBullet]} />
                    <Text style={[styles.bulletText, styles.redText]}>
                      {mistake}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Breathing */}
          {tips.breathing && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Wind size={16} color="#60a5fa" />
                <Text style={styles.sectionTitle}>Breathing</Text>
              </View>
              <View style={styles.breathingBox}>
                <Text style={styles.breathingText}>{tips.breathing}</Text>
              </View>
            </View>
          )}

          {/* Safety Tips */}
          {tips.safety_tips?.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Shield size={16} color="#f59e0b" />
                <Text style={styles.sectionTitle}>Safety</Text>
              </View>
              <View style={styles.safetyBox}>
                {tips.safety_tips.map((tip, index) => (
                  <Text key={index} style={styles.safetyText}>
                    • {tip}
                  </Text>
                ))}
              </View>
            </View>
          )}
        </View>
        </View>
      )}

      {/* Error State */}
      {isExpanded && error && (
        <View style={styles.expandedContainer}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  // Lightbulb Button
  lightbulbButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Expanded Container
  expandedContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginTop: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16,
  },

  // Sections
  section: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#cbd5e1',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    gap: 6,
    paddingLeft: 24,
  },

  // Bullet Items
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  greenBullet: {
    backgroundColor: '#22c55e',
  },
  redBullet: {
    backgroundColor: '#ef4444',
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: '#e2e8f0',
    lineHeight: 20,
  },
  redText: {
    color: '#fca5a5',
  },

  // Breathing Box
  breathingBox: {
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginLeft: 24,
    borderLeftWidth: 3,
    borderLeftColor: '#60a5fa',
  },
  breathingText: {
    fontSize: 14,
    color: '#93c5fd',
    lineHeight: 20,
    fontStyle: 'italic',
  },

  // Safety Box
  safetyBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginLeft: 24,
    gap: 4,
  },
  safetyText: {
    fontSize: 13,
    color: '#fcd34d',
    lineHeight: 18,
  },

  // Error State
  errorContainer: {
    padding: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  errorText: {
    fontSize: 13,
    color: '#fca5a5',
    textAlign: 'center',
  },

  // Loading State
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#94a3b8',
  },
});

export default FormTips;



