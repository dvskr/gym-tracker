import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/utils/logger';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Download, FileText, Table, Check, AlertTriangle } from 'lucide-react-native';
import { useAuthStore } from '../../stores/authStore';
import {
  generateExport,
  shareExport,
  getExportSizeEstimate,
  ExportOptions,
  ExportProgress,
} from '../../lib/services/dataExport';

interface CheckboxItemProps {
  label: string;
  sublabel?: string;
  checked: boolean;
  onToggle: () => void;
  warning?: boolean;
}

const CheckboxItem: React.FC<CheckboxItemProps> = ({
  label,
  sublabel,
  checked,
  onToggle,
  warning,
}) => {
  return (
    <TouchableOpacity
      style={styles.checkboxItem}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Check size={16} color="#ffffff" />}
      </View>
      <View style={styles.checkboxTextContainer}>
        <View style={styles.checkboxLabelRow}>
          <Text style={styles.checkboxLabel}>{label}</Text>
          {warning && <AlertTriangle size={16} color="#f59e0b" />}
        </View>
        {sublabel && <Text style={styles.checkboxSublabel}>{sublabel}</Text>}
      </View>
    </TouchableOpacity>
  );
};

export default function ExportDataScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [format, setFormat] = useState<'json' | 'csv'>('json');
  const [options, setOptions] = useState<ExportOptions>({
    format: 'json',
    includeWorkouts: true,
    includeTemplates: true,
    includeMeasurements: true,
    includeWeightLog: true,
    includePRs: true,
    includeProfile: true,
    includePhotos: false,
  });

  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [exportPath, setExportPath] = useState<string | null>(null);
  const [estimatedSize, setEstimatedSize] = useState<number>(0);

  useEffect(() => {
    loadSizeEstimate();
  }, []);

  const loadSizeEstimate = async () => {
    if (!user?.id) return;
    const size = await getExportSizeEstimate(user.id);
    setEstimatedSize(size);
  };

  const handleToggleOption = (key: keyof ExportOptions) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleFormatChange = (newFormat: 'json' | 'csv') => {
    setFormat(newFormat);
    setOptions((prev) => ({ ...prev, format: newFormat }));
  };

  const handleGenerateExport = async () => {
    if (!user?.id) return;

    // Check if at least one option is selected
    const hasSelection =
      options.includeWorkouts ||
      options.includeTemplates ||
      options.includeMeasurements ||
      options.includeWeightLog ||
      options.includePRs ||
      options.includeProfile;

    if (!hasSelection) {
      Alert.alert('No Data Selected', 'Please select at least one data category to export.');
      return;
    }

    try {
      setExporting(true);
      setExportPath(null);
      setProgress(null);

      const filePath = await generateExport(user.id, options, (prog) => {
        setProgress(prog);
      });

      setExportPath(filePath);
      setProgress(null);
    } catch (error) {
      Alert.alert('Export Failed', 'An error occurred while generating your export.');
 logger.error('Export error:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleShare = async () => {
    if (!exportPath) return;

    try {
      await shareExport(exportPath);
    } catch (error) {
      Alert.alert('Error', 'Failed to share export file.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          title: 'Export Data',
          headerShown: true,
          headerStyle: { backgroundColor: '#1e293b' },
          headerTintColor: '#f1f5f9',
          headerTitleStyle: { fontWeight: '600' },
        }}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Description */}
        <View style={styles.descriptionCard}>
          <Text style={styles.descriptionTitle}>Download Your Data</Text>
          <Text style={styles.descriptionText}>
            Export all your workout data in a portable format. This includes workouts, templates,
            measurements, and settings.
          </Text>
          <Text style={styles.descriptionText}>
            Your data will remain private and is only saved to your device.
          </Text>
        </View>

        {/* Format Selection */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>EXPORT FORMAT</Text>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.formatOption, format === 'json' && styles.formatOptionSelected]}
            onPress={() => handleFormatChange('json')}
          >
            <View style={styles.formatOptionLeft}>
              <FileText size={24} color="#3b82f6" />
              <View style={styles.formatTextContainer}>
                <Text style={styles.formatLabel}>JSON</Text>
                <Text style={styles.formatDescription}>
                  Complete data export, technical format
                </Text>
              </View>
            </View>
            {format === 'json' && (
              <View style={styles.selectedIndicator}>
                <Check size={20} color="#3b82f6" />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={[styles.formatOption, format === 'csv' && styles.formatOptionSelected]}
            onPress={() => handleFormatChange('csv')}
          >
            <View style={styles.formatOptionLeft}>
              <Table size={24} color="#3b82f6" />
              <View style={styles.formatTextContainer}>
                <Text style={styles.formatLabel}>CSV</Text>
                <Text style={styles.formatDescription}>
                  Spreadsheet-friendly, summary format
                </Text>
              </View>
            </View>
            {format === 'csv' && (
              <View style={styles.selectedIndicator}>
                <Check size={20} color="#3b82f6" />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Data Selection */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>SELECT DATA TO EXPORT</Text>
        </View>

        <View style={styles.section}>
          <CheckboxItem
            label="Workout History"
            sublabel="All completed workouts with exercises and sets"
            checked={options.includeWorkouts}
            onToggle={() => handleToggleOption('includeWorkouts')}
          />
          <View style={styles.divider} />
          <CheckboxItem
            label="Templates"
            sublabel="Saved workout templates"
            checked={options.includeTemplates}
            onToggle={() => handleToggleOption('includeTemplates')}
          />
          <View style={styles.divider} />
          <CheckboxItem
            label="Body Measurements"
            sublabel="All body measurement entries"
            checked={options.includeMeasurements}
            onToggle={() => handleToggleOption('includeMeasurements')}
          />
          <View style={styles.divider} />
          <CheckboxItem
            label="Weight Log"
            sublabel="Body weight tracking history"
            checked={options.includeWeightLog}
            onToggle={() => handleToggleOption('includeWeightLog')}
          />
          <View style={styles.divider} />
          <CheckboxItem
            label="Personal Records"
            sublabel="All your PRs and achievements"
            checked={options.includePRs}
            onToggle={() => handleToggleOption('includePRs')}
          />
          <View style={styles.divider} />
          <CheckboxItem
            label="Profile & Settings"
            sublabel="Your profile information and preferences"
            checked={options.includeProfile}
            onToggle={() => handleToggleOption('includeProfile')}
          />
          <View style={styles.divider} />
          <CheckboxItem
            label="Progress Photos"
            sublabel="May result in large file size"
            checked={options.includePhotos}
            onToggle={() => handleToggleOption('includePhotos')}
            warning
          />
        </View>

        {/* Size Estimate */}
        <View style={styles.estimateCard}>
          <Text style={styles.estimateText}>
            Estimated size: ~{estimatedSize.toFixed(1)} MB
          </Text>
        </View>

        {/* Progress */}
        {exporting && progress && (
          <View style={styles.progressCard}>
            <Text style={styles.progressStep}>{progress.step}</Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${(progress.current / progress.total) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              Step {progress.current} of {progress.total}
            </Text>
          </View>
        )}

        {/* Export Button */}
        {!exportPath ? (
          <TouchableOpacity
            style={[styles.exportButton, exporting && styles.exportButtonDisabled]}
            onPress={handleGenerateExport}
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Download size={20} color="#ffffff" />
                <Text style={styles.exportButtonText}>Generate Export</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.successCard}>
            <Text style={styles.successTitle}>S& Export Ready!</Text>
            <Text style={styles.successText}>
              Your data has been exported successfully.
            </Text>
            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Download size={20} color="#ffffff" />
              <Text style={styles.shareButtonText}>Share / Download</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.newExportButton}
              onPress={() => setExportPath(null)}
            >
              <Text style={styles.newExportButtonText}>Generate New Export</Text>
            </TouchableOpacity>
          </View>
        )}

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
  descriptionCard: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
    marginBottom: 8,
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
  formatOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  formatOptionSelected: {
    backgroundColor: '#1e3a5f',
  },
  formatOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  formatTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  formatLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 4,
  },
  formatDescription: {
    fontSize: 13,
    color: '#94a3b8',
  },
  selectedIndicator: {
    marginLeft: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginLeft: 52,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#64748b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  checkboxTextContainer: {
    flex: 1,
  },
  checkboxLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkboxLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#f1f5f9',
  },
  checkboxSublabel: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  estimateCard: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  estimateText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  progressCard: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 12,
  },
  progressStep: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 12,
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
  },
  progressText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    marginHorizontal: 16,
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  exportButtonDisabled: {
    opacity: 0.5,
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  successCard: {
    backgroundColor: '#065f46',
    marginHorizontal: 16,
    marginTop: 24,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#10b981',
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#d1fae5',
    marginBottom: 8,
  },
  successText: {
    fontSize: 14,
    color: '#a7f3d0',
    marginBottom: 20,
    textAlign: 'center',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    gap: 12,
    marginBottom: 12,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  newExportButton: {
    padding: 12,
  },
  newExportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a7f3d0',
  },
  bottomSpacer: {
    height: 32,
  },
});
