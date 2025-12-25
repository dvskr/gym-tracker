import { View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function HistoryScreen() {
  return (
    <View className="flex-1 bg-dark-950 items-center justify-center">
      <StatusBar style="light" />
      <Text className="text-white text-2xl font-bold">Workout History</Text>
      <Text className="text-gray-400 mt-2">View your past workouts</Text>
    </View>
  );
}

