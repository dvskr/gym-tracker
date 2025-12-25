import { View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function ActiveWorkoutScreen() {
  return (
    <View className="flex-1 bg-dark-950 items-center justify-center">
      <StatusBar style="light" />
      <Text className="text-white text-2xl font-bold">Active Workout</Text>
      <Text className="text-gray-400 mt-2">Track your exercises in real-time</Text>
    </View>
  );
}

