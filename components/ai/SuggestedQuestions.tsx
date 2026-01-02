import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MessageSquare, TrendingUp, Calendar, AlertCircle, Dumbbell } from 'lucide-react-native';

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void;
  hasWorkouts: boolean;
  hasPlateaus: boolean;
  hasInjuries: boolean;
  isRestDay: boolean;
  lowEnergy: boolean;
}

const GENERAL_QUESTIONS = [
  { icon: Dumbbell, text: "What should I train today?" },
  { icon: TrendingUp, text: "Am I overtraining?" },
  { icon: Calendar, text: "Review my last workout" },
];

export function SuggestedQuestions({ 
  onSelect, 
  hasWorkouts,
  hasPlateaus,
  hasInjuries,
  isRestDay,
  lowEnergy
}: SuggestedQuestionsProps) {
  
  const contextualQuestions = [];
  
  if (hasPlateaus) {
    contextualQuestions.push({ icon: AlertCircle, text: "How do I break my plateau?" });
  }
  if (hasInjuries) {
    contextualQuestions.push({ icon: AlertCircle, text: "Safe exercises for my injury" });
  }
  if (isRestDay) {
    contextualQuestions.push({ icon: Calendar, text: "What can I do on rest days?" });
  }
  if (lowEnergy) {
    contextualQuestions.push({ icon: AlertCircle, text: "Should I train today? I'm tired" });
  }
  if (!hasWorkouts) {
    contextualQuestions.push({ icon: Dumbbell, text: "Create a beginner workout plan" });
  }

  const allQuestions = [...GENERAL_QUESTIONS, ...contextualQuestions];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        =K Hey! I'm your AI coach.
      </Text>
      <Text style={styles.subtitle}>
        Ask me anything about training, nutrition, or recovery.
      </Text>
      
      <View style={styles.questionsContainer}>
        {allQuestions.map((q, index) => {
          const Icon = q.icon;
          return (
            <Pressable
              key={index}
              onPress={() => onSelect(q.text)}
              style={styles.questionButton}
            >
              <Icon size={20} color="#60a5fa" />
              <Text style={styles.questionText}>{q.text}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  title: {
    color: '#f1f5f9',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  questionsContainer: {
    width: '100%',
    gap: 12,
  },
  questionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  questionText: {
    color: '#f1f5f9',
    fontSize: 15,
    flex: 1,
  },
});

