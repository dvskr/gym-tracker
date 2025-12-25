import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Link, router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { StatusBar } from 'expo-status-bar';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const { signUp, loading } = useAuthStore();

  const handleSignup = async () => {
    if (!email || !password || !fullName) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const { error } = await signUp(email, password, fullName);
    
    if (error) {
      Alert.alert('Signup Error', error.message);
    } else {
      Alert.alert('Success', 'Account created! Please sign in.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') }
      ]);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-dark-950"
    >
      <StatusBar style="light" />
      <View className="flex-1 justify-center px-6">
        <Text className="text-4xl font-bold text-white mb-2">Create Account</Text>
        <Text className="text-gray-400 mb-8">Start tracking your workouts today</Text>

        <View className="space-y-4">
          <View>
            <Text className="text-white mb-2 font-medium">Full Name</Text>
            <TextInput
              className="bg-dark-800 text-white px-4 py-3 rounded-lg"
              placeholder="John Doe"
              placeholderTextColor="#6b7280"
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

          <View>
            <Text className="text-white mb-2 font-medium">Email</Text>
            <TextInput
              className="bg-dark-800 text-white px-4 py-3 rounded-lg"
              placeholder="your@email.com"
              placeholderTextColor="#6b7280"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View>
            <Text className="text-white mb-2 font-medium">Password</Text>
            <TextInput
              className="bg-dark-800 text-white px-4 py-3 rounded-lg"
              placeholder="••••••••"
              placeholderTextColor="#6b7280"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity 
            className="bg-primary-600 py-4 rounded-lg mt-6"
            onPress={handleSignup}
            disabled={loading}
          >
            <Text className="text-white text-center font-semibold text-lg">
              {loading ? 'Creating account...' : 'Sign Up'}
            </Text>
          </TouchableOpacity>

          <View className="flex-row justify-center mt-4">
            <Text className="text-gray-400">Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text className="text-primary-500 font-semibold">Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

