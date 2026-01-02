import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/utils/logger';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Switch,
  StyleSheet,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import {
  Sparkles,
  Dumbbell,
  Lightbulb,
  TrendingUp,
  BarChart,
  ArrowLeft,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettingsStore } from '@/stores/settingsStore';
import { Button } from '@/components/ui';

interface AIUsage {
  requests: number;
  tokens: number;
  lastReset: string;
}

interface SettingsRowProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

function SettingsRow({ icon, title, subtitle, value, onValueChange, disabled }: SettingsRowProps) {
  return (
    <View style={[styles.settingsRow, disabled && styles.settingsRowDisabled]}>
      <View style={styles.settingsRowLeft}>
        <View style={styles.iconContainer}>{icon}</View>
        <View style={styles.textContainer}>
          <Text style={styles.rowTitle}>{title}</Text>
          <Text style={styles.rowSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#334155', true: '#3b82f6' }}
        thumbColor={value ? '#ffffff' : '#cbd5e1'}
        disabled={disabled}
      />
    </View>
  );
}

function AIUsageStats() {
  const [stats, setStats] = useState<AIUsage>({
    requests: 0,
    tokens: 0,
    lastReset: new Date().toISOString(),
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await AsyncStorage.getItem('@gym/ai_usage');
      if (data) {
        setStats(JSON.parse(data));
      }
    } catch (error) {
      logger.error('Failed to load AI usage stats:', error);
    }
  };

  const resetStats = async () => {
    const newStats: AIUsage = {
      requests: 0,
      tokens: 0,
      lastReset: new Date().toISOString(),
    };
    try {
      await AsyncStorage.setItem('@gym/ai_usage', JSON.stringify(newStats));
      setStats(newStats);
      Alert.alert('Reset', 'Usage statistics have been reset');
    } catch (error) {
      logger.error('Failed to reset stats:', error);
    }
  };

  const estimatedCost = (stats.tokens * 0.00015) / 1000; // gpt-4o-mini pricing

  return (
    <View style={styles.usageContainer}>
      <View style={styles.usageGrid}>
        <View style={styles.usageStat}>
          <Text style={styles.usageValue}>{stats.requests}</Text>
          <Text style={styles.usageLabel}>requests</Text>
        </View>
        <View style={styles.usageStat}>
          <Text style={styles.usageValue}>{(stats.tokens / 1000).toFixed(1)}k</Text>
          <Text style={styles.usageLabel}>tokens</Text>
        </View>
        <View style={styles.usageStat}>
          <Text style={styles.usageValue}>${estimatedCost.toFixed(2)}</Text>
          <Text style={styles.usageLabel}>est. cost</Text>
        </View>
      </View>
      <Pressable style={styles.resetButton} onPress={resetStats}>
        <Text style={styles.resetButtonText}>Reset Stats</Text>
      </Pressable>
    </View>
  );
}

export default function AISettingsScreen() {
  const settings = useSettingsStore();
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(settings.aiApiKey || '');
  const [showApiKey, setShowApiKey] = useState(false);

  const saveApiKey = () => {
    if (!tempApiKey.startsWith('sk-')) {
      Alert.alert('Invalid Key', 'OpenAI API keys start with "sk-"');
      return;
    }

    settings.updateSettings({ aiApiKey: tempApiKey });
    setShowApiKeyInput(false);
    Alert.alert('Saved', 'API key has been saved securely');
  };

  const removeApiKey = () => {
    Alert.alert(
      'Remove API Key',
      'Are you sure? AI features will be disabled.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            settings.updateSettings({ aiApiKey: null, aiEnabled: false });
            setTempApiKey('');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#f1f5f9" />
        </Pressable>
        <Text style={styles.headerTitle}>AI Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Master Toggle */}
        <View style={styles.section}>
          <View style={styles.masterToggle}>
            <View style={styles.masterToggleLeft}>
              <Sparkles size={24} color="#f59e0b" />
              <View style={styles.masterToggleText}>
                <Text style={styles.masterToggleTitle}>AI Features</Text>
                <Text style={styles.masterToggleSubtitle}>
                  {settings.aiEnabled ? 'Enabled' : 'Disabled'}
                </Text>
              </View>
            </View>
            <Switch
              value={settings.aiEnabled}
              onValueChange={(v) => settings.updateSettings({ aiEnabled: v })}
              trackColor={{ false: '#334155', true: '#3b82f6' }}
              thumbColor={settings.aiEnabled ? '#ffffff' : '#cbd5e1'}
              disabled={!settings.aiApiKey}
            />
          </View>
          {!settings.aiApiKey && (
            <View style={styles.warningBanner}>
              <AlertCircle size={16} color="#f59e0b" />
              <Text style={styles.warningText}>API key required to enable AI features</Text>
            </View>
          )}
        </View>

        {/* API Key */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>API CONFIGURATION</Text>

          {settings.aiApiKey ? (
            <View style={styles.apiKeyCard}>
              <View style={styles.apiKeyRow}>
                <Text style={styles.apiKeyLabel}>OpenAI API Key</Text>
                <Pressable onPress={() => setShowApiKey(!showApiKey)}>
                  {showApiKey ? (
                    <EyeOff size={16} color="#94a3b8" />
                  ) : (
                    <Eye size={16} color="#94a3b8" />
                  )}
                </Pressable>
              </View>
              <Text style={styles.apiKeyValue}>
                {showApiKey ? settings.aiApiKey : `â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢${settings.aiApiKey.slice(-4)}`}
              </Text>
              <View style={styles.apiKeyActions}>
                <Pressable
                  style={styles.apiKeyActionButton}
                  onPress={() => {
                    setTempApiKey(settings.aiApiKey || '');
                    setShowApiKeyInput(true);
                  }}
                >
                  <Text style={styles.apiKeyActionText}>Change</Text>
                </Pressable>
                <Pressable style={styles.apiKeyActionButton} onPress={removeApiKey}>
                  <Text style={[styles.apiKeyActionText, styles.apiKeyActionTextDanger]}>
                    Remove
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.noKeyContainer}>
              <Sparkles size={32} color="#f59e0b" />
              <Text style={styles.noKeyTitle}>No API Key</Text>
              <Text style={styles.noKeyText}>
                AI features require an OpenAI API key. Your key is stored locally on your device
                and never shared.
              </Text>
              <Button title="Add API Key" onPress={() => setShowApiKeyInput(true)} fullWidth />
            </View>
          )}

          <View style={styles.helpCard}>
            <Text style={styles.helpTitle}>How to get an API key:</Text>
            <Text style={styles.helpText}>
              1. Visit platform.openai.com{'\n'}
              2. Sign up or log in{'\n'}
              3. Go to API keys section{'\n'}
              4. Create a new key{'\n'}
              5. Copy and paste it here
            </Text>
            <Text style={styles.helpNote}>
              ðŸ’¡ Keys start with "sk-" and are about 50 characters long
            </Text>
          </View>
        </View>

        {/* Feature Toggles */}
        {settings.aiEnabled && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>FEATURES</Text>

            <View style={styles.featuresCard}>
              <SettingsRow
                icon={<Dumbbell size={20} color="#3b82f6" />}
                title="Workout Suggestions"
                subtitle="AI recommends what to train"
                value={settings.showWorkoutSuggestions}
                onValueChange={(v) => settings.updateSettings({ showWorkoutSuggestions: v })}
              />

              <SettingsRow
                icon={<Lightbulb size={20} color="#f59e0b" />}
                title="Exercise Form Tips"
                subtitle="Show form cues during workout"
                value={settings.showFormTips}
                onValueChange={(v) => settings.updateSettings({ showFormTips: v })}
              />

              <SettingsRow
                icon={<TrendingUp size={20} color="#22c55e" />}
                title="Progressive Overload"
                subtitle="Weight/rep recommendations"
                value={settings.showProgressiveOverload}
                onValueChange={(v) => settings.updateSettings({ showProgressiveOverload: v })}
              />

              <SettingsRow
                icon={<BarChart size={20} color="#8b5cf6" />}
                title="Workout Analysis"
                subtitle="Post-workout AI feedback"
                value={settings.showWorkoutAnalysis}
                onValueChange={(v) => settings.updateSettings({ showWorkoutAnalysis: v })}
              />
            </View>
          </View>
        )}

        {/* Usage Stats */}
        {settings.aiEnabled && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>USAGE THIS MONTH</Text>
            <AIUsageStats />
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* API Key Modal */}
      <Modal visible={showApiKeyInput} transparent animationType="fade" onRequestClose={() => setShowApiKeyInput(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>OpenAI API Key</Text>
            <Text style={styles.modalSubtitle}>
              Enter your API key from platform.openai.com
            </Text>

            <TextInput
              style={styles.apiKeyInput}
              value={tempApiKey}
              onChangeText={setTempApiKey}
              placeholder="sk-..."
              placeholderTextColor="#6b7280"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={!showApiKey}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <Pressable
                style={styles.modalButton}
                onPress={() => {
                  setShowApiKeyInput(false);
                  setTempApiKey(settings.aiApiKey || '');
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={saveApiKey}
                disabled={!tempApiKey.startsWith('sk-')}
              >
                <Text style={styles.modalButtonTextPrimary}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  masterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
  },
  masterToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  masterToggleText: {
    flex: 1,
  },
  masterToggleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  masterToggleSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 2,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f59e0b20',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#f59e0b40',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#f59e0b',
    fontWeight: '600',
  },
  apiKeyCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  apiKeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  apiKeyLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
  },
  apiKeyValue: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#cbd5e1',
  },
  apiKeyActions: {
    flexDirection: 'row',
    gap: 12,
  },
  apiKeyActionButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#0f172a',
  },
  apiKeyActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  apiKeyActionTextDanger: {
    color: '#ef4444',
  },
  noKeyContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  noKeyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  noKeyText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },
  helpCard: {
    marginTop: 12,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  helpText: {
    fontSize: 13,
    color: '#cbd5e1',
    lineHeight: 20,
  },
  helpNote: {
    fontSize: 12,
    color: '#f59e0b',
    marginTop: 4,
  },
  featuresCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  settingsRowDisabled: {
    opacity: 0.5,
  },
  settingsRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  rowSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  usageContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  usageGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  usageStat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
  },
  usageValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  usageLabel: {
    fontSize: 11,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  resetButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  bottomSpacer: {
    height: 40,
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
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 20,
  },
  apiKeyInput: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#f1f5f9',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#334155',
  },
  modalButtonPrimary: {
    backgroundColor: '#3b82f6',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  modalButtonTextPrimary: {
    color: '#ffffff',
  },
});

