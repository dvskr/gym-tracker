import { View, Text, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '@/stores/authStore';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const { profile, signOut } = useAuthStore();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  return (
    <View className="flex-1 bg-dark-950">
      <StatusBar style="light" />
      <View className="px-6 pt-16">
        <Text className="text-white text-3xl font-bold mb-8">Profile</Text>
        
        <View className="bg-dark-800 p-6 rounded-2xl mb-4">
          <Text className="text-gray-400 mb-2">Name</Text>
          <Text className="text-white text-xl font-semibold">{profile?.full_name || 'User'}</Text>
        </View>

        <View className="bg-dark-800 p-6 rounded-2xl mb-4">
          <Text className="text-gray-400 mb-2">Email</Text>
          <Text className="text-white text-xl font-semibold">{profile?.email}</Text>
        </View>

        <TouchableOpacity 
          className="bg-red-600 py-4 rounded-lg mt-8"
          onPress={handleSignOut}
        >
          <Text className="text-white text-center font-semibold text-lg">Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

