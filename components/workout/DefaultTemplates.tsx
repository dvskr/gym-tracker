import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Dumbbell, Play } from 'lucide-react-native';

// Pre-built template definitions
export const DEFAULT_TEMPLATES = [
  {
    id: 'default-push',
    name: 'Push Day',
    description: 'Chest, Shoulders, Triceps',
    color: '#3b82f6',
    exercises: [
      { name: 'Barbell Bench Press', external_id: 'barbell-bench-press', sets: 4, reps: '8-10' },
      { name: 'Incline Dumbbell Press', external_id: 'incline-dumbbell-press', sets: 3, reps: '10-12' },
      { name: 'Overhead Press', external_id: 'overhead-press', sets: 3, reps: '8-10' },
      { name: 'Lateral Raise', external_id: 'lateral-raise', sets: 3, reps: '12-15' },
      { name: 'Tricep Pushdown', external_id: 'tricep-pushdown', sets: 3, reps: '12-15' },
    ],
  },
  {
    id: 'default-pull',
    name: 'Pull Day',
    description: 'Back, Biceps, Rear Delts',
    color: '#10b981',
    exercises: [
      { name: 'Barbell Row', external_id: 'barbell-row', sets: 4, reps: '8-10' },
      { name: 'Pull Up', external_id: 'pull-up', sets: 3, reps: '8-12' },
      { name: 'Lat Pulldown', external_id: 'lat-pulldown', sets: 3, reps: '10-12' },
      { name: 'Face Pull', external_id: 'face-pull', sets: 3, reps: '15-20' },
      { name: 'Barbell Curl', external_id: 'barbell-curl', sets: 3, reps: '10-12' },
    ],
  },
  {
    id: 'default-legs',
    name: 'Leg Day',
    description: 'Quads, Hamstrings, Glutes',
    color: '#f59e0b',
    exercises: [
      { name: 'Barbell Squat', external_id: 'barbell-squat', sets: 4, reps: '6-8' },
      { name: 'Romanian Deadlift', external_id: 'romanian-deadlift', sets: 3, reps: '10-12' },
      { name: 'Leg Press', external_id: 'leg-press', sets: 3, reps: '10-12' },
      { name: 'Leg Curl', external_id: 'leg-curl', sets: 3, reps: '12-15' },
      { name: 'Calf Raise', external_id: 'calf-raise', sets: 4, reps: '15-20' },
    ],
  },
];

interface DefaultTemplateCardProps {
  template: typeof DEFAULT_TEMPLATES[0];
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
  onStartWorkout: (template: typeof DEFAULT_TEMPLATES[0]) => void;
}

export function DefaultTemplates({ onStartWorkout }: DefaultTemplatesProps) {
  return (
    <ScrollView
      horizontal={true}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.quickStartRow}
    >
      {DEFAULT_TEMPLATES.map((template) => (
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
});

