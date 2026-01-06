import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

// Photo types
export type PhotoType = 
  | 'front'
  | 'side_left'
  | 'side_right'
  | 'back'
  | 'flexed_front'
  | 'flexed_back';

export const PHOTO_TYPE_LABELS: Record<PhotoType, string> = {
  front: 'Front',
  side_left: 'Left Side',
  side_right: 'Right Side',
  back: 'Back',
  flexed_front: 'Flexed (Front)',
  flexed_back: 'Flexed (Back)',
};

export interface PhotoResult {
  uri: string;
  width: number;
  height: number;
}

// Directory for storing progress photos
const PHOTO_DIRECTORY = `${FileSystem.documentDirectory}progress-photos/`;

/**
 * Ensure the photo directory exists
 */
async function ensurePhotoDirectory(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(PHOTO_DIRECTORY);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(PHOTO_DIRECTORY, { intermediates: true });
  }
}

/**
 * Request camera permissions
 */
export async function requestCameraPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  return status === 'granted';
}

/**
 * Request media library permissions
 */
export async function requestMediaLibraryPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === 'granted';
}

/**
 * Take a photo using the device camera
 */
export async function takePhoto(): Promise<PhotoResult | null> {
  const hasPermission = await requestCameraPermission();
  
  if (!hasPermission) {
    throw new Error('Camera permission not granted');
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [4, 5], // Portrait aspect ratio
    quality: 0.8,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
  };
}

/**
 * Pick a photo from the device gallery
 */
export async function pickFromGallery(): Promise<PhotoResult | null> {
  const hasPermission = await requestMediaLibraryPermission();
  
  if (!hasPermission) {
    throw new Error('Media library permission not granted');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [4, 5], // Portrait aspect ratio
    quality: 0.8,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
  };
}

/**
 * Generate a unique filename for a progress photo
 */
function generatePhotoFilename(type: PhotoType, date: string): string {
  const timestamp = Date.now();
  const safeDate = date.replace(/-/g, '');
  return `${type}_${safeDate}_${timestamp}.jpg`;
}

/**
 * Save a photo to local storage
 * @param sourceUri The temporary URI of the captured/picked photo
 * @param type The type of progress photo
 * @param date The date for the photo (YYYY-MM-DD)
 * @returns The local file URI
 */
export async function savePhotoLocally(
  sourceUri: string,
  type: PhotoType,
  date: string
): Promise<string> {
  await ensurePhotoDirectory();

  const filename = generatePhotoFilename(type, date);
  const destinationUri = `${PHOTO_DIRECTORY}${filename}`;

  // Copy the file to our app directory
  await FileSystem.copyAsync({
    from: sourceUri,
    to: destinationUri,
  });

  return destinationUri;
}

/**
 * Get the local file path for a photo ID
 */
export function getPhotoPath(filename: string): string {
  return `${PHOTO_DIRECTORY}${filename}`;
}

/**
 * Delete a photo from local storage
 */
export async function deletePhotoLocally(localUri: string): Promise<void> {
  const fileInfo = await FileSystem.getInfoAsync(localUri);
  if (fileInfo.exists) {
    await FileSystem.deleteAsync(localUri);
  }
}

/**
 * Get all locally stored photos
 */
export async function getLocalPhotos(): Promise<string[]> {
  await ensurePhotoDirectory();
  
  const files = await FileSystem.readDirectoryAsync(PHOTO_DIRECTORY);
  return files.map(file => `${PHOTO_DIRECTORY}${file}`);
}

/**
 * Get file size of a photo
 */
export async function getPhotoFileSize(uri: string): Promise<number> {
  const fileInfo = await FileSystem.getInfoAsync(uri, { size: true });
  return fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0;
}

/**
 * Photo type display information with icons
 */
export const PHOTO_TYPES: { type: PhotoType; label: string; icon: string }[] = [
  { type: 'front', label: PHOTO_TYPE_LABELS.front, icon: '>' },
  { type: 'side_left', label: PHOTO_TYPE_LABELS.side_left, icon: '=H' },
  { type: 'side_right', label: PHOTO_TYPE_LABELS.side_right, icon: '=I' },
  { type: 'back', label: PHOTO_TYPE_LABELS.back, icon: '=' },
  { type: 'flexed_front', label: PHOTO_TYPE_LABELS.flexed_front, icon: '=' },
  { type: 'flexed_back', label: PHOTO_TYPE_LABELS.flexed_back, icon: '>' },
];

/**
 * Get photo type label
 */
export function getPhotoTypeLabel(type: PhotoType): string {
  return PHOTO_TYPE_LABELS[type] || type;
}

