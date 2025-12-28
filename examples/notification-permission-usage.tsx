/**
 * NOTIFICATION PERMISSION EXAMPLES
 * 
 * This file shows how to use the notification permission components
 * in different parts of your app.
 */

// ===========================================
// Example 1: Show prompt after first workout
// ===========================================

import { NotificationPermissionPrompt } from '@/components/notifications';
import { useNotificationPermissions } from '@/hooks/useNotificationPermissions';

function WorkoutCompleteScreen() {
  const { isGranted } = useNotificationPermissions();
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);

  useEffect(() => {
    // Show permission prompt if not already granted
    if (!isGranted) {
      setShowPermissionPrompt(true);
    }
  }, [isGranted]);

  return (
    <View>
      {/* ... workout completion UI ... */}
      
      {showPermissionPrompt && (
        <NotificationPermissionPrompt
          onComplete={() => {
            console.log('Notifications enabled!');
            setShowPermissionPrompt(false);
          }}
          onDismiss={() => {
            console.log('User dismissed prompt');
            setShowPermissionPrompt(false);
          }}
        />
      )}
    </View>
  );
}

// ===========================================
// Example 2: Show banner on home screen
// ===========================================

import { NotificationPermissionPrompt } from '@/components/notifications';
import { useNotificationPermissions } from '@/hooks/useNotificationPermissions';
import AsyncStorage from '@react-native-async-storage/async-storage';

function HomeScreen() {
  const { isGranted } = useNotificationPermissions();
  const [hasCompletedWorkout, setHasCompletedWorkout] = useState(false);
  const [promptDismissed, setPromptDismissed] = useState(false);

  useEffect(() => {
    // Check if user has completed at least one workout
    checkWorkoutCount();
    checkPromptDismissed();
  }, []);

  async function checkWorkoutCount() {
    // Your logic to check workout count
    const count = await getCompletedWorkoutCount();
    setHasCompletedWorkout(count > 0);
  }

  async function checkPromptDismissed() {
    const dismissed = await AsyncStorage.getItem('notification_prompt_dismissed');
    setPromptDismissed(dismissed === 'true');
  }

  const handleDismiss = async () => {
    await AsyncStorage.setItem('notification_prompt_dismissed', 'true');
    setPromptDismissed(true);
  };

  return (
    <ScrollView>
      {/* Show prompt only after first workout AND if not granted AND not dismissed */}
      {hasCompletedWorkout && !isGranted && !promptDismissed && (
        <NotificationPermissionPrompt
          onComplete={() => console.log('Enabled!')}
          onDismiss={handleDismiss}
        />
      )}

      {/* ... rest of home screen ... */}
    </ScrollView>
  );
}

// ===========================================
// Example 3: Check permission status
// ===========================================

import { useNotificationPermissions } from '@/hooks/useNotificationPermissions';

function SomeComponent() {
  const { 
    status,      // 'undetermined' | 'granted' | 'denied'
    isLoading,   // boolean
    isGranted,   // boolean
    isDenied,    // boolean
    isUndetermined, // boolean
    requestPermissions, // async () => Promise<boolean>
    checkPermissions,   // async () => Promise<void>
    openSettings,       // () => void
  } = useNotificationPermissions();

  const handleEnableNotifications = async () => {
    if (isDenied) {
      // Permission was denied, need to open settings
      Alert.alert(
        'Enable Notifications',
        'Please enable notifications in your device settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: openSettings },
        ]
      );
    } else {
      // Request permissions
      const granted = await requestPermissions();
      if (granted) {
        console.log('Notifications enabled!');
      }
    }
  };

  return (
    <Button 
      title="Enable Notifications" 
      onPress={handleEnableNotifications} 
    />
  );
}

// ===========================================
// Example 4: Custom permission UI
// ===========================================

import { useNotificationPermissions } from '@/hooks/useNotificationPermissions';

function CustomPermissionCard() {
  const { isGranted, isDenied, requestPermissions, openSettings } = useNotificationPermissions();

  if (isGranted) {
    return (
      <View style={styles.card}>
        <Text>✅ Notifications Enabled</Text>
      </View>
    );
  }

  const handlePress = async () => {
    if (isDenied) {
      openSettings();
    } else {
      await requestPermissions();
    }
  };

  return (
    <Pressable style={styles.card} onPress={handlePress}>
      <BellOff size={24} color="#f59e0b" />
      <Text style={styles.title}>Enable Notifications</Text>
      <Text style={styles.subtitle}>
        {isDenied 
          ? 'Open Settings to enable'
          : 'Get workout reminders and alerts'}
      </Text>
      <ChevronRight size={20} color="#64748b" />
    </Pressable>
  );
}

// ===========================================
// Example 5: Show in onboarding flow
// ===========================================

function OnboardingScreen() {
  const [step, setStep] = useState(1);

  // Step 1: Welcome
  // Step 2: Set goals
  // Step 3: Notification permissions
  // Step 4: Complete

  const renderStep = () => {
    switch (step) {
      case 3:
        return (
          <NotificationPermissionPrompt
            onComplete={() => setStep(4)}
            onDismiss={() => setStep(4)} // Allow skipping
          />
        );
      // ... other steps
    }
  };

  return <View>{renderStep()}</View>;
}

// ===========================================
// Example 6: Conditional rendering
// ===========================================

function ProfileScreen() {
  const { isGranted } = useNotificationPermissions();

  return (
    <ScrollView>
      {/* Show notification settings only if granted */}
      {isGranted ? (
        <NotificationSettingsSection />
      ) : (
        <View style={styles.disabledSection}>
          <Text>Enable notifications to configure settings</Text>
          <NotificationPermissionPrompt />
        </View>
      )}
    </ScrollView>
  );
}

