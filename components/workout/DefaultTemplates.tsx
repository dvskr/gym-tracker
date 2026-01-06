import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Dumbbell, Play } from 'lucide-react-native';
import { useDefaultTemplates } from '@/hooks/useDefaultTemplates';
import { DefaultTemplate } from '@/lib/templates/defaultTemplates';

interface DefaultTemplateCardProps {
  template: DefaultTemplate;
  onStart: () => void;
}

const DefaultTemplateCard: React.FC<DefaultTemplateCardProps> = ({ template, onStart }) => {
  const exerciseCount = template.exercises.length;

  return (
    <TouchableOpacity
      style={[styles.quickStartCard, { borderColor: template.color }]}
      onPress={onStart}
      activeOpacity={0.7}
    >
      <View style={[styles.quickStartIcon, { backgroundColor: template.color + '20' }]}>
        <Dumbbell size={20} color={template.color} />
      </View>
      <Text style={styles.quickStartName} numberOfLines={2}>
        {template.name}
      </Text>
      <Text style={styles.quickStartMeta}>
        {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}
      </Text>
      <View style={[styles.quickStartPlayButton, { backgroundColor: template.color }]}>
        <Play size={14} color="#ffffff" fill="#ffffff" />
      </View>
    </TouchableOpacity>
  );
};

interface DefaultTemplatesProps {
  onStartWorkout: (template: DefaultTemplate) => void;
  maxItems?: number;
}

export function DefaultTemplates({ onStartWorkout, maxItems = 3 }: DefaultTemplatesProps) {
  const { templates, isLoading, error } = useDefaultTemplates();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading templates...</Text>
      </View>
    );
  }

  if (error || templates.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Unable to load templates</Text>
      </View>
    );
  }

  const displayTemplates = templates.slice(0, maxItems);

  return (
    <ScrollView
      horizontal={true}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.quickStartRow}
    >
      {displayTemplates.map((template) => (
        <DefaultTemplateCard
          key={template.id}
          template={template}
          onStart={() => onStartWorkout(template)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  quickStartRow: {
    gap: 12,
    paddingRight: 16,
  },

  quickStartCard: {
    width: 110,
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
  },

  quickStartIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  quickStartName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 4,
    height: 34,
  },

  quickStartMeta: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 10,
  },

  quickStartPlayButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },

  loadingText: {
    color: '#94a3b8',
    fontSize: 14,
  },

  errorContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },

  errorText: {
    color: '#ef4444',
    fontSize: 14,
  },
});



