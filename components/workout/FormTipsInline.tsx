// components/workout/FormTipsInline.tsx
// Compact inline version - shows an info button that expands to a modal/bottom sheet

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import {
  Info,
  X,
  CheckCircle2,
  XCircle,
  Wind,
  Shield,
  Lightbulb,
} from 'lucide-react-native';
import { useFormTips } from '@/hooks/useFormTips';

interface FormTipsInlineProps {
  exerciseId: string;
  exerciseName: string;
}

export function FormTipsInline({ exerciseId, exerciseName }: FormTipsInlineProps) {
  const [isVisible, setIsVisible] = useState(false);
  const { tips, isLoading } = useFormTips(exerciseId);

  // Don't show button if no tips available
  if (!tips && !isLoading) {
    return null;
  }

  return (
    <>
      {/* Info Button */}
      <Pressable
        style={({ pressed }) => [
          styles.infoButton,
          pressed && styles.infoButtonPressed,
        ]}
        onPress={() => setIsVisible(true)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#60a5fa" />
        ) : (
          <Info size={18} color="#60a5fa" />
        )}
      </Pressable>

      {/* Modal */}
      <Modal
        visible={isVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Lightbulb size={20} color="#fbbf24" />
                <Text style={styles.modalTitle}>Form Tips</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsVisible(false)}
                style={styles.closeButton}
              >
                <X size={24} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            {/* Exercise Name */}
            <Text style={styles.exerciseName}>{exerciseName}</Text>

            {/* Tips Content */}
            <ScrollView 
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
            >
              {tips && (
                <View style={styles.tipsContent}>
                  {/* Key Cues */}
                  {tips.key_cues?.length > 0 && (
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <CheckCircle2 size={18} color="#22c55e" />
                        <Text style={styles.sectionTitle}>Key Cues</Text>
                      </View>
                      {tips.key_cues.map((cue, index) => (
                        <View key={index} style={styles.listItem}>
                          <View style={[styles.bullet, styles.greenBullet]} />
                          <Text style={styles.listText}>{cue}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Common Mistakes */}
                  {tips.common_mistakes?.length > 0 && (
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <XCircle size={18} color="#ef4444" />
                        <Text style={styles.sectionTitle}>Avoid</Text>
                      </View>
                      {tips.common_mistakes.map((mistake, index) => (
                        <View key={index} style={styles.listItem}>
                          <View style={[styles.bullet, styles.redBullet]} />
                          <Text style={[styles.listText, styles.redText]}>
                            {mistake}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Breathing */}
                  {tips.breathing && (
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <Wind size={18} color="#60a5fa" />
                        <Text style={styles.sectionTitle}>Breathing</Text>
                      </View>
                      <View style={styles.breathingBox}>
                        <Text style={styles.breathingText}>{tips.breathing}</Text>
                      </View>
                    </View>
                  )}

                  {/* Safety */}
                  {tips.safety_tips?.length > 0 && (
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <Shield size={18} color="#f59e0b" />
                        <Text style={styles.sectionTitle}>Safety Tips</Text>
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
              )}
            </ScrollView>

            {/* Dismiss Button */}
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={() => setIsVisible(false)}
            >
              <Text style={styles.dismissText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Info Button
  infoButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(96, 165, 250, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoButtonPressed: {
    backgroundColor: 'rgba(96, 165, 250, 0.3)',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 34, // Safe area
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  closeButton: {
    padding: 4,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#94a3b8',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },

  // Scroll Content
  scrollView: {
    maxHeight: 400,
  },
  tipsContent: {
    paddingHorizontal: 20,
    gap: 24,
    paddingBottom: 20,
  },

  // Sections
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // List Items
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingLeft: 28,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  greenBullet: {
    backgroundColor: '#22c55e',
  },
  redBullet: {
    backgroundColor: '#ef4444',
  },
  listText: {
    flex: 1,
    fontSize: 15,
    color: '#e2e8f0',
    lineHeight: 22,
  },
  redText: {
    color: '#fca5a5',
  },

  // Breathing Box
  breathingBox: {
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginLeft: 28,
    borderLeftWidth: 4,
    borderLeftColor: '#60a5fa',
  },
  breathingText: {
    fontSize: 15,
    color: '#93c5fd',
    lineHeight: 22,
    fontStyle: 'italic',
  },

  // Safety Box
  safetyBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginLeft: 28,
    gap: 6,
  },
  safetyText: {
    fontSize: 14,
    color: '#fcd34d',
    lineHeight: 20,
  },

  // Dismiss Button
  dismissButton: {
    backgroundColor: '#3b82f6',
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  dismissText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default FormTipsInline;



