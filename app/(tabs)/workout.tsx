import { View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function WorkoutScreen() {
  return (
    <View className="flex-1 bg-dark-950 items-center justify-center">
      <StatusBar style="light" />
      <Text className="text-white text-2xl font-bold">Start Workout</Text>
      <Text className="text-gray-400 mt-2">Choose a template or create custom workout</Text>
    </View>
  );
}

