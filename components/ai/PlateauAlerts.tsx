import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { AlertTriangle, X, TrendingDown, Lightbulb, ChevronRight } from 'lucide-react-native';
import { plateauDetectionService, PlateauAlert } from '@/lib/ai/plateauDetection';
import { getCachedData, setCacheData } from '@/lib/ai/prefetch';
import { useAuthStore } from '@/stores/authStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DISMISSED_KEY = '@gym/dismissed_plateaus';

export function PlateauAlerts() {
  const { user } = useAuthStore();
  
  // Try to get cached data immediately
  const [plateaus, setPlateaus] = useState<PlateauAlert[]>(() => {
    if (!user) return [];
    return getCachedData<PlateauAlert[]>(user.id, 'plateaus') || [];
  });
  
  const [isLoading, setIsLoading] = useState(plateaus.length === 0);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [selectedPlateau, setSelectedPlateau] = useState<PlateauAlert | null>(null);

  useEffect(() => {
    loadDismissed();
  }, []);

  useEffect(() => {
    // Only fetch if we don't have cached data
    if (user && plateaus.length === 0) {
      checkPlateaus();
    }
  }, [user, plateaus.length]);

  const loadDismissed = async () => {
    try {
      const data = await AsyncStorage.getItem(DISMISSED_KEY);
      if (data) {
        setDismissed(new Set(JSON.parse(data)));
      }
    } catch (error) {
      console.error('Failed to load dismissed plateaus:', error);
    }
  };

  const saveDismissed = async (newDismissed: Set<string>) => {
    try {
      await AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify(Array.from(newDismissed)));
    } catch (error) {
      console.error('Failed to save dismissed plateaus:', error);
    }
  };

  const checkPlateaus = async () => {
    // KEY FIX: Don't fetch if no user (guest mode)
    if (!user) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      const results = await plateauDetectionService.detectPlateaus(user.id);
      setPlateaus(results);
      
      // Cache the result
      setCacheData(user.id, 'plateaus', results);
    } catch (error) {
      console.error('Failed to check plateaus:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = (exerciseId: string) => {
    const newDismissed = new Set([...dismissed, exerciseId]);
    setDismissed(newDismissed);
    saveDismissed(newDismissed);
  };

  const handleDismissAll = () => {
    const allIds = plateaus.map(p => p.exerciseId);
    const newDismissed = new Set([...dismissed, ...allIds]);
    setDismissed(newDismissed);
    saveDismissed(newDismissed);
  };

  const getSeverityColor = (severity: PlateauAlert['severity']) => {
    switch (severity) {
      case 'significant':
        return '#ef4444';
      case 'moderate':
        return '#f59e0b';
      default:
        return '#94a3b8';
    }
  };

  const getSeverityLabel = (severity: PlateauAlert['severity']) => {
    switch (severity) {
      case 'significant':
        return 'High Priority';
      case 'moderate':
        return 'Moderate';
      default:
        return 'Minor';
    }
  };

  const visiblePlateaus = plateaus.filter(p => !dismissed.has(p.exerciseId));

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#f59e0b" />
      </View>
    );
  }

  if (visiblePlateaus.length === 0) return null;

  return (
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <AlertTriangle size={18} color="#f59e0b" />
            <Text style={styles.title}>Progress Alerts</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{visiblePlateaus.length}</Text>
            </View>
          </View>
          {visiblePlateaus.length > 1 && (
            <Pressable onPress={handleDismissAll}>
              <Text style={styles.dismissAllText}>Dismiss All</Text>
            </Pressable>
          )}
        </View>

        {visiblePlateaus.slice(0, 3).map((plateau) => (
          <Pressable
            key={plateau.exerciseId}
            style={[
              styles.alertCard,
              { borderLeftColor: getSeverityColor(plateau.severity) },
            ]}
            onPress={() => setSelectedPlateau(plateau)}
          >
            <View style={styles.alertHeader}>
              <View style={styles.alertTitleRow}>
                <TrendingDown size={16} color={getSeverityColor(plateau.severity)} />
                <Text style={styles.exerciseName} numberOfLines={1}>
                  {plateau.exerciseName}
                </Text>
              </View>
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  handleDismiss(plateau.exerciseId);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={16} color="#64748b" />
              </Pressable>
            </View>

            <View style={styles.severityBadge}>
              <Text
                style={[
                  styles.severityText,
                  { color: getSeverityColor(plateau.severity) },
                ]}
              >
                {getSeverityLabel(plateau.severity)}
              </Text>
            </View>

            <Text style={styles.alertText}>
              No progress for {plateau.weeksStalled} week{plateau.weeksStalled > 1 ? 's' : ''} at{' '}
              {plateau.lastWeight}lbs × {plateau.lastReps} reps
            </Text>

            <View style={styles.quickTip}>
              <Lightbulb size={14} color="#3b82f6" />
              <Text style={styles.quickTipText} numberOfLines={2}>
                {plateau.suggestions[0]}
              </Text>
            </View>

            <View style={styles.footer}>
              <Text style={styles.moreText}>Tap for all suggestions</Text>
              <ChevronRight size={14} color="#64748b" />
            </View>
          </Pressable>
        ))}

        {visiblePlateaus.length > 3 && (
          <Text style={styles.moreAlerts}>
            +{visiblePlateaus.length - 3} more alert{visiblePlateaus.length - 3 > 1 ? 's' : ''}
          </Text>
        )}
      </View>

      {/* Details Modal */}
      <Modal
        visible={selectedPlateau !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedPlateau(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedPlateau(null)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {selectedPlateau && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleRow}>
                    <TrendingDown size={20} color={getSeverityColor(selectedPlateau.severity)} />
                    <Text style={styles.modalTitle}>{selectedPlateau.exerciseName}</Text>
                  </View>
                  <Pressable onPress={() => setSelectedPlateau(null)}>
                    <X size={20} color="#94a3b8" />
                  </Pressable>
                </View>

                <View style={styles.modalStats}>
                  <View style={styles.modalStat}>
                    <Text style={styles.modalStatLabel}>Weeks Stalled</Text>
                    <Text style={styles.modalStatValue}>{selectedPlateau.weeksStalled}</Text>
                  </View>
                  <View style={styles.modalStat}>
                    <Text style={styles.modalStatLabel}>Current Max</Text>
                    <Text style={styles.modalStatValue}>
                      {selectedPlateau.lastWeight}lbs × {selectedPlateau.lastReps}
                    </Text>
                  </View>
                </View>

                <Text style={styles.modalDescription}>
                  {selectedPlateau.severity === 'significant'
                    ? 'This is a significant plateau. Your body has adapted to this stimulus. Time for a change!'
                    : selectedPlateau.severity === 'moderate'
                    ? 'Progress has slowed. Try some of these strategies to break through.'
                    : 'Small plateau detected. These tips can help you continue progressing.'}
                </Text>

                <ScrollView style={styles.suggestionsList} showsVerticalScrollIndicator={false}>
                  <Text style={styles.suggestionsTitle}>Break Through Strategies:</Text>
                  {selectedPlateau.suggestions.map((suggestion, index) => (
                    <View key={index} style={styles.suggestionItem}>
                      <View style={styles.suggestionNumber}>
                        <Text style={styles.suggestionNumberText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.suggestionText}>{suggestion}</Text>
                    </View>
                  ))}
                </ScrollView>

                <Pressable
                  style={styles.dismissButton}
                  onPress={() => {
                    handleDismiss(selectedPlateau.exerciseId);
                    setSelectedPlateau(null);
                  }}
                >
                  <Text style={styles.dismissButtonText}>Got it, dismiss this alert</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  container: {
    marginHorizontal: 8,
    marginBottom: 32,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f59e0b',
  },
  countBadge: {
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
  },
  dismissAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  alertCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    gap: 10,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  alertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f1f5f9',
    flex: 1,
  },
  severityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#0f172a',
    borderRadius: 6,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  alertText: {
    fontSize: 14,
    color: '#cbd5e1',
    lineHeight: 20,
  },
  quickTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 10,
  },
  quickTipText: {
    flex: 1,
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  moreText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  moreAlerts: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
    paddingVertical: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
    flex: 1,
  },
  modalStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  modalStat: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  modalStatLabel: {
    fontSize: 11,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  modalStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  modalDescription: {
    fontSize: 14,
    color: '#cbd5e1',
    lineHeight: 20,
    marginBottom: 16,
  },
  suggestionsList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f59e0b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  suggestionItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  suggestionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    color: '#e2e8f0',
    lineHeight: 20,
  },
  dismissButton: {
    backgroundColor: '#334155',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  dismissButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#cbd5e1',
  },
});

