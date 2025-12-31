import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Trash2, HardDrive, RefreshCw } from 'lucide-react-native';
import { getCacheSize, clearImageCache } from '@/lib/images/cacheManager';
import { preloadThumbnails, preloadGifs } from '@/lib/images/preloadService';

export function CacheSettings() {
  const [cacheSize, setCacheSize] = useState<string>('Calculating...');
  const [isClearing, setIsClearing] = useState(false);
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState(0);

  useEffect(() => {
    loadCacheSize();
  }, []);

  const loadCacheSize = async () => {
    const { sizeFormatted } = await getCacheSize();
    setCacheSize(sizeFormatted);
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Image Cache',
      'This will remove all cached exercise images. They will be re-downloaded when needed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setIsClearing(true);
            await clearImageCache();
            await loadCacheSize();
            setIsClearing(false);
            Alert.alert('Cache Cleared', 'Image cache has been cleared.');
          },
        },
      ]
    );
  };

  const handlePreloadAll = async () => {
    setIsPreloading(true);
    setPreloadProgress(0);

    // Preload thumbnails
    await preloadThumbnails((p) => setPreloadProgress(p.percentage / 2));
    
    // Preload GIFs
    await preloadGifs((p) => setPreloadProgress(50 + p.percentage / 2));

    await loadCacheSize();
    setIsPreloading(false);
    Alert.alert('Preload Complete', 'All exercise images have been cached.');
  };

  return (
    <View className="bg-dark-800 rounded-xl p-4 mx-4 my-2">
      <Text className="text-white text-lg font-semibold mb-4">
        Image Cache
      </Text>

      {/* Cache Size */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center">
          <HardDrive size={20} color="#9ca3af" />
          <Text className="text-gray-400 ml-2">Cache Size</Text>
        </View>
        <Text className="text-white font-medium">{cacheSize}</Text>
      </View>

      {/* Preload Button */}
      <TouchableOpacity
        onPress={handlePreloadAll}
        disabled={isPreloading}
        className={`flex-row items-center justify-center py-3 rounded-lg mb-3 ${
          isPreloading ? 'bg-gray-700' : 'bg-blue-600'
        }`}
      >
        {isPreloading ? (
          <>
            <ActivityIndicator color="white" size="small" />
            <Text className="text-white ml-2">
              Preloading... {preloadProgress}%
            </Text>
          </>
        ) : (
          <>
            <RefreshCw size={18} color="white" />
            <Text className="text-white ml-2 font-medium">
              Preload All Images
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Clear Cache Button */}
      <TouchableOpacity
        onPress={handleClearCache}
        disabled={isClearing}
        className="flex-row items-center justify-center py-3 rounded-lg bg-red-600/20 border border-red-600/50"
      >
        {isClearing ? (
          <ActivityIndicator color="#ef4444" size="small" />
        ) : (
          <>
            <Trash2 size={18} color="#ef4444" />
            <Text className="text-red-500 ml-2 font-medium">
              Clear Cache
            </Text>
          </>
        )}
      </TouchableOpacity>

      <Text className="text-gray-500 text-xs mt-3 text-center">
        Preloading makes exercise images load instantly.
        Clear cache to free up storage space.
      </Text>
    </View>
  );
}

