import { View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function TemplateListScreen() {
  return (
    <View className="flex-1 bg-dark-950 items-center justify-center">
      <StatusBar style="light" />
      <Text className="text-white text-2xl font-bold">Workout Templates</Text>
      <Text className="text-gray-400 mt-2">Choose a pre-made workout plan</Text>
    </View>
  );
}

