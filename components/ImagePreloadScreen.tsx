import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useImagePreload } from '@/hooks/useImagePreload';

interface Props {
  onComplete: () => void;
  children: React.ReactNode;
}

export function ImagePreloadScreen({ onComplete, children }: Props) {
  const { isLoading, progress, phase } = useImagePreload({
    thumbnailsOnly: true, // Only thumbnails for fast startup
  });

  useEffect(() => {
    if (!isLoading && progress === 100) {
      onComplete();
    }
  }, [isLoading, progress, onComplete]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-dark-900">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-white mt-4 text-lg">
          Loading exercises...
        </Text>
        <Text className="text-gray-400 mt-2">
          {progress}% ({phase})
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}



