import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { Link, router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type SignupFormData = z.infer<typeof signupSchema>;

export default function SignupScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { signUp, isLoading } = useAuthStore();

  const { control, handleSubmit, formState: { errors } } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: SignupFormData) => {
    const { error } = await signUp(data.email, data.password, data.name);
    
    if (error) {
      Alert.alert('Signup Error', error.message);
    } else {
      Alert.alert(
        'Success!',
        'Account created successfully. Please sign in.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
      );
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-[#0f172a]"
    >
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 64 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="mb-8">
          <Text className="text-4xl font-bold text-white mb-2">Create Account</Text>
          <Text className="text-gray-400 text-lg">Start your fitness journey today</Text>
        </View>

        {/* Name Input */}
        <View className="mb-4">
          <Text className="text-white mb-2 font-medium">Full Name</Text>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="bg-dark-800 text-white px-4 py-4 rounded-lg text-base"
                placeholder="John Doe"
                placeholderTextColor="#6b7280"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                editable={!isLoading}
              />
            )}
          />
          {errors.name && (
            <Text className="text-red-500 mt-1 text-sm">{errors.name.message}</Text>
          )}
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

        {/* Confirm Password Input */}
        <View className="mb-6">
          <Text className="text-white mb-2 font-medium">Confirm Password</Text>
          <View className="relative">
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="bg-dark-800 text-white px-4 py-4 rounded-lg text-base pr-12"
                  placeholder="••••••••"
                  placeholderTextColor="#6b7280"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry={!showConfirmPassword}
                  editable={!isLoading}
                />
              )}
            />
            <Pressable
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-4"
            >
              {showConfirmPassword ? (
                <EyeOff color="#6b7280" size={20} />
              ) : (
                <Eye color="#6b7280" size={20} />
              )}
            </Pressable>
          </View>
          {errors.confirmPassword && (
            <Text className="text-red-500 mt-1 text-sm">{errors.confirmPassword.message}</Text>
          )}
        </View>

        {/* Create Account Button */}
        <TouchableOpacity 
          className="bg-primary-600 py-4 rounded-lg mb-6"
          onPress={handleSubmit(onSubmit)}
          disabled={isLoading}
        >
          <Text className="text-white text-center font-semibold text-lg">
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </Text>
        </TouchableOpacity>

        {/* Sign In Link */}
        <View className="flex-row justify-center">
          <Text className="text-gray-400">Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text className="text-primary-500 font-semibold">Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
