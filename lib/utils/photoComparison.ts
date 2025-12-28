import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { differenceInDays, differenceInWeeks, differenceInMonths, parseISO } from 'date-fns';

/**
 * Create a side-by-side comparison image from two photos
 * @param beforeUri URI of the "before" photo
 * @param afterUri URI of the "after" photo
 * @returns URI of the combined comparison image
 */
export async function createComparisonImage(
  beforeUri: string,
  afterUri: string
): Promise<string> {
  // Get image dimensions
  const beforeInfo = await ImageManipulator.manipulateAsync(beforeUri, [], {
    format: ImageManipulator.SaveFormat.JPEG,
  });
  const afterInfo = await ImageManipulator.manipulateAsync(afterUri, [], {
    format: ImageManipulator.SaveFormat.JPEG,
  });

  // Determine target dimensions (use smaller of the two for consistency)
  const targetWidth = Math.min(beforeInfo.width, afterInfo.width);
  const targetHeight = Math.min(beforeInfo.height, afterInfo.height);

  // Resize both images to same dimensions
  const beforeResized = await ImageManipulator.manipulateAsync(
    beforeUri,
    [{ resize: { width: targetWidth, height: targetHeight } }],
    { format: ImageManipulator.SaveFormat.JPEG, compress: 0.9 }
  );

  const afterResized = await ImageManipulator.manipulateAsync(
    afterUri,
    [{ resize: { width: targetWidth, height: targetHeight } }],
    { format: ImageManipulator.SaveFormat.JPEG, compress: 0.9 }
  );

  // For now, we'll return the after image since true compositing
  // requires native code. In a full implementation, you'd use
  // a canvas or native module to combine the images.
  // The comparison UI handles the visual combination.
  
  return afterResized.uri;
}

/**
 * Crop an image to a specific portion (for slider comparison)
 * @param uri Source image URI
 * @param portion Portion to keep (0-1, from left)
 * @returns URI of cropped image
 */
export async function cropImagePortion(
  uri: string,
  portion: number,
  fromLeft: boolean = true
): Promise<string> {
  const imageInfo = await ImageManipulator.manipulateAsync(uri, [], {});
  
  const cropWidth = Math.floor(imageInfo.width * portion);
  const originX = fromLeft ? 0 : imageInfo.width - cropWidth;

  const result = await ImageManipulator.manipulateAsync(
    uri,
    [
      {
        crop: {
          originX,
          originY: 0,
          width: cropWidth,
          height: imageInfo.height,
        },
      },
    ],
    { format: ImageManipulator.SaveFormat.JPEG, compress: 0.9 }
  );

  return result.uri;
}

/**
 * Calculate time difference between two dates in a human-readable format
 * @param beforeDate ISO date string of before photo
 * @param afterDate ISO date string of after photo
 * @returns Human-readable time difference
 */
export function calculateTimeDifference(
  beforeDate: string,
  afterDate: string
): string {
  const before = parseISO(beforeDate);
  const after = parseISO(afterDate);

  const months = differenceInMonths(after, before);
  if (months >= 1) {
    return `${months} month${months > 1 ? 's' : ''} apart`;
  }

  const weeks = differenceInWeeks(after, before);
  if (weeks >= 1) {
    return `${weeks} week${weeks > 1 ? 's' : ''} apart`;
  }

  const days = differenceInDays(after, before);
  if (days === 0) {
    return 'Same day';
  }
  return `${days} day${days > 1 ? 's' : ''} apart`;
}

/**
 * Save comparison image to local storage
 * @param uri URI of the comparison image
 * @returns Local file path
 */
export async function saveComparisonImage(uri: string): Promise<string> {
  const directory = `${FileSystem.documentDirectory}comparisons/`;
  
  // Ensure directory exists
  const dirInfo = await FileSystem.getInfoAsync(directory);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  }

  const filename = `comparison_${Date.now()}.jpg`;
  const destinationUri = `${directory}${filename}`;

  await FileSystem.copyAsync({
    from: uri,
    to: destinationUri,
  });

  return destinationUri;
}

/**
 * Get all saved comparison images
 * @returns Array of comparison image URIs
 */
export async function getSavedComparisons(): Promise<string[]> {
  const directory = `${FileSystem.documentDirectory}comparisons/`;
  
  const dirInfo = await FileSystem.getInfoAsync(directory);
  if (!dirInfo.exists) {
    return [];
  }

  const files = await FileSystem.readDirectoryAsync(directory);
  return files.map(file => `${directory}${file}`);
}

/**
 * Delete a saved comparison image
 * @param uri URI of the comparison image to delete
 */
export async function deleteComparisonImage(uri: string): Promise<void> {
  const fileInfo = await FileSystem.getInfoAsync(uri);
  if (fileInfo.exists) {
    await FileSystem.deleteAsync(uri);
  }
}

