import { View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function ProgressScreen() {
  return (
    <View className="flex-1 bg-dark-950 items-center justify-center">
      <StatusBar style="light" />
      <Text className="text-white text-2xl font-bold">Progress</Text>
      <Text className="text-gray-400 mt-2">Track your fitness journey</Text>
    </View>
  );
}

