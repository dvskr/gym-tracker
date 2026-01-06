import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Plus } from 'lucide-react-native';
import { EmptyStateProps } from './types';

export const EmptyState: React.FC<EmptyStateProps> = ({ onCreatePress }) => (
  <View style={styles.emptyContainer}>
    <Text style={styles.emptyIcon}>📝</Text>
    <Text style={styles.emptyTitle}>No Templates Yet</Text>
    <Text style={styles.emptyDescription}>
      Create a template to quickly start your favorite workouts.
    </Text>

    <TouchableOpacity
      style={styles.emptyButton}
      onPress={onCreatePress}
      activeOpacity={0.8}
      accessible={true}
      accessibilityLabel="Create your first template"
      accessibilityRole="button"
    >
      <Plus size={20} color="#ffffff" />
      <Text style={styles.emptyButtonText}>Create Template</Text>
    </TouchableOpacity>

    <Text style={styles.emptyHint}>
      Or complete a workout and save it as a template!
    </Text>
  </View>
);

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 100,
  },

  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },

  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f1f5f9',
    marginBottom: 8,
    textAlign: 'center',
  },

  emptyDescription: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },

  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },

  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },

  emptyHint: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
  },
});

export default EmptyState;



