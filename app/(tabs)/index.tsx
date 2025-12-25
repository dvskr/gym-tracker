import { View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function HomeScreen() {
  return (
    <View className="flex-1 bg-dark-950 items-center justify-center">
      <StatusBar style="light" />
      <Text className="text-white text-3xl font-bold">Home</Text>
    </View>
  );
}
