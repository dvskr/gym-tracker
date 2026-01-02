import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { Sparkles, X, Zap } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { AILimitStatus } from '@/lib/ai/types';

interface AILimitModalProps {
  visible: boolean;
  onClose: () => void;
  limits: AILimitStatus;
}

export function AILimitModal({ visible, onClose, limits }: AILimitModalProps) {
  const router = useRouter();

  const handleUpgrade = () => {
    onClose();
    router.push('/settings/premium');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Close button */}
          <Pressable style={styles.closeButton} onPress={onClose}>
            <X size={20} color="#6b7280" />
          </Pressable>

          {/* Icon */}
          <View style={styles.iconContainer}>
            <Sparkles size={32} color="#f59e0b" />
          </View>

          {/* Title */}
          <Text style={styles.title}>Daily AI Limit Reached</Text>

          {/* Message */}
          <Text style={styles.message}>
            You've used all {limits.limit} AI requests for today.
            {limits.tier === 'free' && ' Upgrade to Premium for 10x more!'}
          </Text>

          {/* Usage indicator */}
          <View style={styles.usageBox}>
            <Text style={styles.usageText}>
              {limits.used} / {limits.limit} requests used
            </Text>
            <Text style={styles.resetText}>
              Resets at midnight
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            {limits.tier === 'free' && (
              <Button
                title="Upgrade to Premium"
                onPress={handleUpgrade}
                icon={<Zap size={16} color="#fff" />}
                style={styles.upgradeButton}
              />
            )}
            <Button
              title={limits.tier === 'free' ? 'Maybe Later' : 'Got It'}
              variant="secondary"
              onPress={onClose}
            />
          </View>

          {/* Premium benefits */}
          {limits.tier === 'free' && (
            <View style={styles.benefits}>
              <Text style={styles.benefitsTitle}>Premium includes:</Text>
              <Text style={styles.benefitItem}>✓ 100 AI requests per day</Text>
              <Text style={styles.benefitItem}>✓ Advanced workout analysis</Text>
              <Text style={styles.benefitItem}>✓ AI Chat Coach</Text>
              <Text style={styles.benefitItem}>✓ Priority support</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#422006',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#f1f5f9',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  usageBox: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  usageText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  resetText: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 4,
  },
  actions: {
    width: '100%',
    gap: 8,
  },
  upgradeButton: {
    backgroundColor: '#f59e0b',
  },
  benefits: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    width: '100%',
  },
  benefitsTitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 8,
  },
  benefitItem: {
    color: '#d1d5db',
    fontSize: 13,
    marginBottom: 4,
  },
});
