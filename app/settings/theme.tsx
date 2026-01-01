import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Check, Sun, Moon, Smartphone } from 'lucide-react-native';
import { useSettingsStore, Theme } from '../../stores/settingsStore';
import { themes } from '../../lib/theme/colors';

interface ThemeOptionProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  value: Theme;
  selected: boolean;
  onSelect: (value: Theme) => void;
}

const ThemeOption: React.FC<ThemeOptionProps> = ({
  icon,
  label,
  description,
  value,
  selected,
  onSelect,
}) => {
  return (
    <TouchableOpacity
      style={[styles.themeOption, selected && styles.themeOptionSelected]}
      onPress={() => onSelect(value)}
      activeOpacity={0.7}
    >
      <View style={styles.themeOptionLeft}>
        <View style={styles.iconContainer}>{icon}</View>
        <View style={styles.themeTextContainer}>
          <Text style={styles.themeLabel}>{label}</Text>
          <Text style={styles.themeDescription}>{description}</Text>
        </View>
      </View>
      {selected && (
        <View style={styles.checkContainer}>
          <Check size={24} color="#3b82f6" />
        </View>
      )}
    </TouchableOpacity>
  );
};

interface ThemePreviewProps {
  label: string;
  isDark: boolean;
}

const ThemePreview: React.FC<ThemePreviewProps> = ({ label, isDark }) => {
  const colors = isDark ? themes.dark : themes.light;

  return (
    <View style={styles.previewContainer}>
      <Text style={styles.previewLabel}>{label}</Text>
      <View style={[styles.previewCard, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.previewHeader, { backgroundColor: colors.surface }]}>
          <View style={styles.previewHeaderContent}>
            <View
              style={[styles.previewAvatar, { backgroundColor: colors.primary }]}
            />
            <View style={styles.previewHeaderText}>
              <View
                style={[
                  styles.previewTextLine,
                  { backgroundColor: colors.text, width: 80 },
                ]}
              />
              <View
                style={[
                  styles.previewTextLine,
                  { backgroundColor: colors.textSecondary, width: 60, marginTop: 4 },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Content */}
        <View style={styles.previewContent}>
          <View style={[styles.previewButton, { backgroundColor: colors.primary }]}>
            <View
              style={[
                styles.previewButtonText,
                { backgroundColor: '#ffffff', opacity: 0.9 },
              ]}
            />
          </View>
          <View style={[styles.previewListItem, { backgroundColor: colors.surface }]}>
            <View
              style={[styles.previewTextLine, { backgroundColor: colors.text, width: 100 }]}
            />
          </View>
          <View style={[styles.previewListItem, { backgroundColor: colors.surface }]}>
            <View
              style={[styles.previewTextLine, { backgroundColor: colors.text, width: 120 }]}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

export default function ThemeSettingsScreen() {
  const router = useRouter();
  const { theme, setTheme } = useSettingsStore();
  const [tempTheme, setTempTheme] = useState<Theme>(theme);
  
  // Update temp state when store changes
  useEffect(() => {
    setTempTheme(theme);
  }, [theme]);

  const handleSave = () => {
    if (tempTheme !== theme) {
      setTheme(tempTheme);
      Alert.alert('Settings Saved', 'Theme settings have been updated.');
    }
    router.back();
  };

  const handleSelectTheme = (newTheme: Theme) => {
    setTempTheme(newTheme);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          title: 'Theme',
          headerShown: true,
          headerStyle: { backgroundColor: '#1e293b' },
          headerTintColor: '#f1f5f9',
          headerTitleStyle: { fontWeight: '600' },
          headerRight: () => (
            <TouchableOpacity onPress={handleSave} style={{ marginRight: 16 }}>
              <Text style={{ color: '#3b82f6', fontSize: 16, fontWeight: '600' }}>Save</Text>
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Theme Options */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>APPEARANCE</Text>
        </View>

        <View style={styles.section}>
          <ThemeOption
            icon={<Moon size={24} color="#3b82f6" />}
            label="Dark"
            description="Dark colors for low light"
            value="dark"
            selected={tempTheme === 'dark'}
            onSelect={handleSelectTheme}
          />
          <View style={styles.divider} />
          <ThemeOption
            icon={<Sun size={24} color="#f59e0b" />}
            label="Light"
            description="Bright colors for daylight"
            value="light"
            selected={tempTheme === 'light'}
            onSelect={handleSelectTheme}
          />
          <View style={styles.divider} />
          <ThemeOption
            icon={<Smartphone size={24} color="#64748b" />}
            label="Auto"
            description="Matches your device theme"
            value="system"
            selected={tempTheme === 'system'}
            onSelect={handleSelectTheme}
          />
        </View>

        {/* Preview Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>PREVIEW</Text>
        </View>

        <View style={styles.previewSection}>
          <ThemePreview label="Dark Theme" isDark={true} />
          <ThemePreview label="Light Theme" isDark={false} />
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            Theme changes will apply immediately throughout the app.
          </Text>
          <Text style={styles.infoText}>
            Auto mode will automatically switch between dark and light based on your device
            settings.
          </Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollView: {
    flex: 1,
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
    marginRight: 16,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    minHeight: 72,
  },
  themeOptionSelected: {
    backgroundColor: '#1e3a5f',
  },
  themeOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  themeTextContainer: {
    flex: 1,
  },
  themeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 4,
  },
  themeDescription: {
    fontSize: 14,
    color: '#94a3b8',
  },
  checkContainer: {
    marginLeft: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginLeft: 68,
  },
  previewSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  previewContainer: {
    flex: 1,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 8,
    textAlign: 'center',
  },
  previewCard: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
  },
  previewHeader: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  previewHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  previewHeaderText: {
    flex: 1,
  },
  previewTextLine: {
    height: 8,
    borderRadius: 4,
  },
  previewContent: {
    padding: 12,
    gap: 8,
  },
  previewButton: {
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewButtonText: {
    width: 60,
    height: 6,
    borderRadius: 3,
  },
  previewListItem: {
    padding: 10,
    borderRadius: 6,
  },
  infoCard: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
  },
  bottomSpacer: {
    height: 32,
  },
});

