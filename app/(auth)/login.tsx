import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { Link, router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, isLoading } = useAuthStore();

  const { control, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    const { error } = await signIn(data.email, data.password);
    
    if (error) {
      Alert.alert('Login Error', error.message);
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-[#0f172a]"
    >
      <View className="flex-1 justify-center px-6">
        {/* App Name */}
        <View className="mb-12">
          <Text className="text-5xl font-bold text-white mb-2">Gym Tracker</Text>
          <Text className="text-gray-400 text-lg">Welcome back! Sign in to continue</Text>
        </View>

        {/* Email Input */}
        <View className="mb-4">
          <Text className="text-white mb-2 font-medium">Email</Text>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="bg-dark-800 text-white px-4 py-4 rounded-lg text-base"
                placeholder="your@email.com"
                placeholderTextColor="#6b7280"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!isLoading}
              />
            )}
          />
          {errors.email && (
            <Text className="text-red-500 mt-1 text-sm">{errors.email.message}</Text>
          )}
        </View>

        {/* Password Input */}
        <View className="mb-4">
          <Text className="text-white mb-2 font-medium">Password</Text>
          <View className="relative">
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="bg-dark-800 text-white px-4 py-4 rounded-lg text-base pr-12"
                  placeholder="••••••••"
                  placeholderTextColor="#6b7280"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry={!showPassword}
                  editable={!isLoading}
                />
              )}
            />
            <Pressable
              onPress={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-4"
            >
              {showPassword ? (
                <EyeOff color="#6b7280" size={20} />
              ) : (
                <Eye color="#6b7280" size={20} />
              )}
            </Pressable>
          </View>
          {errors.password && (
            <Text className="text-red-500 mt-1 text-sm">{errors.password.message}</Text>
          )}
        </View>

        {/* Forgot Password Link */}
        <View className="items-end mb-6">
          <Link href="/(auth)/forgot-password" asChild>
            <TouchableOpacity>
              <Text className="text-primary-500 font-medium">Forgot Password?</Text>
            </TouchableOpacity>
          </Link>
        </View>

        {/* Sign In Button */}
        <TouchableOpacity 
          className="bg-primary-600 py-4 rounded-lg mb-6"
          onPress={handleSubmit(onSubmit)}
          disabled={isLoading}
        >
          <Text className="text-white text-center font-semibold text-lg">
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Text>
        </TouchableOpacity>

        {/* Sign Up Link */}
        <View className="flex-row justify-center">
          <Text className="text-gray-400">Don't have an account? </Text>
          <Link href="/(auth)/signup" asChild>
            <TouchableOpacity>
              <Text className="text-primary-500 font-semibold">Sign Up</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
