import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useProStore } from '@/stores/proStore';
import { 
  getManagementURL, 
  restorePurchases,
  getOfferings,
  purchasePackage,
} from '@/lib/services/revenuecat';
import { Crown, ExternalLink, RefreshCw } from 'lucide-react-native';
import type { PurchasesPackage } from 'react-native-purchases';

export default function SubscriptionScreen() {
  const { isPro, expirationDate, checkStatus, setCustomerInfo } = useProStore();
  const [loading, setLoading] = useState(false);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loadingOfferings, setLoadingOfferings] = useState(true);

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    try {
      const offering = await getOfferings();
      if (offering?.availablePackages) {
        setPackages(offering.availablePackages);
      }
    } catch (error) {
      console.error('Failed to load offerings:', error);
    } finally {
      setLoadingOfferings(false);
    }
  };

  const handlePurchase = async (pkg: PurchasesPackage) => {
    setLoading(true);
    try {
      const result = await purchasePackage(pkg);
      if (result.success && result.customerInfo) {
        setCustomerInfo(result.customerInfo);
        Alert.alert('Welcome to Pro! 🎉', 'You now have access to all premium features.');
      } else if (result.error === 'cancelled') {
        // User cancelled, do nothing
      } else {
        Alert.alert('Purchase Failed', result.error || 'Something went wrong. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to complete purchase.');
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    const url = await getManagementURL();
    if (url) {
      Linking.openURL(url);
    } else {
      Alert.alert(
        'Manage Subscription',
        'Go to Settings > Your Name > Subscriptions to manage your subscription.'
      );
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      const result = await restorePurchases();
      if (result.success) {
        await checkStatus();
        Alert.alert('Restored!', 'Your subscription has been restored.');
      } else {
        Alert.alert('No Purchases', 'No purchases found to restore.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to restore purchases.');
    }
    setLoading(false);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <View style={styles.container}>
      {/* Status Card */}
      <View style={styles.statusCard}>
        <Crown size={32} color={isPro ? '#fbbf24' : '#64748b'} />
        <Text style={styles.statusTitle}>
          {isPro ? 'Pro Member' : 'Free Plan'}
        </Text>
        {isPro && expirationDate && (
          <Text style={styles.statusSubtitle}>
            Renews on {formatDate(expirationDate)}
          </Text>
        )}
      </View>

      {/* Features List */}
      <View style={styles.featuresCard}>
        <Text style={styles.featuresTitle}>Pro Features</Text>
        <FeatureRow title="AI Coach" free="5/day" pro="100/day" isPro={isPro} />
        <FeatureRow title="Templates" free="10" pro="Unlimited" isPro={isPro} />
        <FeatureRow title="Achievements" free="10" pro="All 28" isPro={isPro} />
        <FeatureRow title="Health Sync" free="❌" pro="✅" isPro={isPro} />
        <FeatureRow title="Data Export" free="❌" pro="✅" isPro={isPro} />
      </View>

      {/* Actions */}
      {isPro ? (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleManageSubscription}
        >
          <ExternalLink size={20} color="#3b82f6" />
          <Text style={styles.actionButtonText}>Manage Subscription</Text>
        </TouchableOpacity>
      ) : loadingOfferings ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#3b82f6" />
          <Text style={styles.loadingText}>Loading plans...</Text>
        </View>
      ) : packages.length > 0 ? (
        <View>
          <Text style={styles.plansTitle}>Choose Your Plan</Text>
          {packages.map((pkg) => (
            <TouchableOpacity
              key={pkg.identifier}
              style={styles.planButton}
              onPress={() => handlePurchase(pkg)}
              disabled={loading}
            >
              <View style={styles.planInfo}>
                <Text style={styles.planTitle}>{pkg.product.title}</Text>
                <Text style={styles.planPrice}>{pkg.product.priceString}</Text>
              </View>
              <Crown size={20} color="#fbbf24" />
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <TouchableOpacity
          style={styles.upgradeButton}
          onPress={() => Alert.alert('No Plans Available', 'Please check your internet connection and try again.')}
        >
          <Crown size={20} color="#fff" />
          <Text style={styles.upgradeButtonText}>No Plans Available</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.actionButton}
        onPress={handleRestore}
        disabled={loading}
      >
        <RefreshCw size={20} color="#3b82f6" />
        <Text style={styles.actionButtonText}>
          {loading ? 'Restoring...' : 'Restore Purchases'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function FeatureRow({ title, free, pro, isPro }: { 
  title: string; 
  free: string; 
  pro: string; 
  isPro: boolean;
}) {
  return (
    <View style={styles.featureRow}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={[styles.featureValue, isPro && styles.featureValuePro]}>
        {isPro ? pro : free}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 16,
  },
  statusCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  featuresCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  featureTitle: {
    fontSize: 16,
    color: '#f1f5f9',
  },
  featureValue: {
    fontSize: 16,
    color: '#94a3b8',
  },
  featureValuePro: {
    color: '#22c55e',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  actionButtonText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  plansTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  planButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#334155',
  },
  planInfo: {
    flex: 1,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
});

