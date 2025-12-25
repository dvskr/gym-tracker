import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '@/stores/authStore';
import { Dumbbell, Plus } from 'lucide-react-native';

export default function HomeScreen() {
  const profile = useAuthStore((state) => state.profile);

  return (
    <View className="flex-1 bg-dark-950">
      <StatusBar style="light" />
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="px-6 pt-16 pb-8">
          <Text className="text-gray-400 text-lg">Welcome back,</Text>
          <Text className="text-white text-3xl font-bold mt-1">
            {profile?.full_name || 'User'}
          </Text>
        </View>

        {/* Quick Actions */}
        <View className="px-6 mb-8">
          <Text className="text-white text-xl font-semibold mb-4">Quick Actions</Text>
          
          <TouchableOpacity 
            className="bg-primary-600 p-6 rounded-2xl flex-row items-center justify-between mb-4"
            onPress={() => router.push('/workout/active')}
          >
            <View className="flex-row items-center">
              <View className="bg-white/20 p-3 rounded-full mr-4">
                <Dumbbell color="white" size={24} />
              </View>
              <View>
                <Text className="text-white text-xl font-bold">Start Workout</Text>
                <Text className="text-blue-100">Begin your training session</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            className="bg-dark-800 p-6 rounded-2xl flex-row items-center justify-between"
            onPress={() => router.push('/template')}
          >
            <View className="flex-row items-center">
              <View className="bg-primary-600/20 p-3 rounded-full mr-4">
                <Plus color="#3b82f6" size={24} />
              </View>
              <View>
                <Text className="text-white text-xl font-bold">Browse Templates</Text>
                <Text className="text-gray-400">Use pre-made workout plans</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Recent Workouts */}
        <View className="px-6 mb-8">
          <Text className="text-white text-xl font-semibold mb-4">Recent Workouts</Text>
          <View className="bg-dark-800 p-6 rounded-2xl">
            <Text className="text-gray-400 text-center">No recent workouts yet</Text>
            <Text className="text-gray-500 text-center mt-2">Start your first workout above!</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

