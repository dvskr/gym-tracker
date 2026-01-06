import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { CheckCircle, XCircle, Info } from 'lucide-react-native';
import { healthService } from '@/lib/health/healthService';

interface Props {
  showAll?: boolean; // Show all measurements or only syncable ones
}

export function MeasurementSyncStatus({ showAll = false }: Props) {
  const measurements = healthService.getSupportedMeasurements();
  const filteredMeasurements = showAll
    ? measurements
    : measurements.filter((m) => m.canSync || m.note?.includes('react-native-health'));

  const platformName = Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Sync to {platformName}
      </Text>

      <View style={styles.list}>
        {filteredMeasurements.map((measurement) => (
          <View key={measurement.type} style={styles.item}>
            {measurement.canSync ? (
              <CheckCircle size={16} color="#22c55e" />
            ) : (
              <XCircle size={16} color="#64748b" />
            )}

            <View style={styles.itemContent}>
              <Text style={[styles.itemText, !measurement.canSync && styles.itemTextDisabled]}>
                {measurement.displayName}
              </Text>
              {measurement.note && (
                <Text style={styles.itemNote}>{measurement.note}</Text>
              )}
            </View>
          </View>
        ))}
      </View>

      {!showAll && (
        <View style={styles.infoBox}>
          <Info size={16} color="#64748b" />
          <Text style={styles.infoText}>
            Other measurements (chest, arms, legs, etc.) are stored in the app only.
          </Text>
        </View>
      )}
    </View>
  );
}

export function MeasurementSyncInfo() {
  const syncable = healthService.getSyncableMeasurements();
  const appOnly = healthService.getAppOnlyMeasurements();
  const platformName = Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect';

  return (
    <View style={styles.infoContainer}>
      {/* Syncable measurements */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <CheckCircle size={20} color="#22c55e" />
          <Text style={styles.sectionTitle}>Syncs to {platformName}</Text>
        </View>
        <View style={styles.sectionContent}>
          {syncable.map((measurement, index) => (
            <Text key={measurement} style={styles.bullet}>
              • {measurement}
            </Text>
          ))}
        </View>
      </View>

      {/* App-only measurements */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Info size={20} color="#64748b" />
          <Text style={styles.sectionTitle}>Stored in App Only</Text>
        </View>
        <View style={styles.sectionContent}>
          {appOnly.map((measurement, index) => (
            <Text key={measurement} style={styles.bullet}>
              • {measurement}
            </Text>
          ))}
          <Text style={styles.note}>
            These measurements are not supported by health platforms.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  list: {
    gap: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  itemContent: {
    flex: 1,
  },
  itemText: {
    fontSize: 14,
    color: '#f1f5f9',
  },
  itemTextDisabled: {
    color: '#64748b',
  },
  itemNote: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  infoContainer: {
    gap: 16,
  },
  section: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  sectionContent: {
    gap: 6,
  },
  bullet: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
  },
  note: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
    fontStyle: 'italic',
  },
});



