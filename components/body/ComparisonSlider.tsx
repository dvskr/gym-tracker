import React, { useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  PanResponder,
  Text,
} from 'react-native';
import { MoveHorizontal } from 'lucide-react-native';

// ============================================
// Types
// ============================================

interface ComparisonSliderProps {
  beforeUri: string;
  afterUri: string;
  height?: number;
}

// ============================================
// Constants
// ============================================

const screenWidth = Dimensions.get('window').width;
const HANDLE_SIZE = 44;
const DIVIDER_WIDTH = 4;

// ============================================
// Divider Component
// ============================================

interface DividerProps {
  position: number; // 0 to 1
  height: number;
  onDrag: (position: number) => void;
  containerWidth: number;
}

const Divider: React.FC<DividerProps> = ({ position, height, onDrag, containerWidth }) => {
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {},
    onPanResponderMove: (_, gestureState) => {
      // Calculate new position based on drag
      const newPosition = gestureState.moveX / containerWidth;
      // Clamp between 0.05 and 0.95 to keep some visibility on both sides
      const clampedPosition = Math.max(0.05, Math.min(0.95, newPosition));
      onDrag(clampedPosition);
    },
  });

  const leftPosition = position * containerWidth;

  return (
    <View
      style={[styles.dividerContainer, { left: leftPosition - HANDLE_SIZE / 2 }]}
      {...panResponder.panHandlers}
    >
      {/* Vertical Line */}
      <View style={[styles.dividerLine, { height }]} />
      
      {/* Draggable Handle */}
      <View style={styles.handle}>
        <MoveHorizontal size={20} color="#ffffff" />
      </View>
    </View>
  );
};

// ============================================
// Main Component
// ============================================

export const ComparisonSlider: React.FC<ComparisonSliderProps> = ({
  beforeUri,
  afterUri,
  height = 400,
}) => {
  const [sliderPosition, setSliderPosition] = useState(0.5); // 0 to 1
  const containerWidth = screenWidth - 32; // Account for padding

  // Width of the "before" side (clipped from right)
  const beforeWidth = containerWidth * sliderPosition;
  // Width of the "after" side (clipped from left)  
  const afterWidth = containerWidth * (1 - sliderPosition);

  return (
    <View style={[styles.container, { height, width: containerWidth }]}>
      {/* After Image (right side, clipped from left) */}
      <View style={[styles.imageWrapper, styles.afterWrapper, { width: afterWidth, height }]}>
        <Image
          source={{ uri: afterUri }}
          style={[styles.image, { width: containerWidth, height }]}
          resizeMode="cover"
        />
      </View>

      {/* Before Image (left side, clipped from right) */}
      <View style={[styles.imageWrapper, styles.beforeWrapper, { width: beforeWidth, height }]}>
        <Image
          source={{ uri: beforeUri }}
          style={[styles.image, { width: containerWidth, height }]}
          resizeMode="cover"
        />
      </View>

      {/* Labels */}
      <View style={styles.labelsContainer}>
        <View style={[styles.label, styles.labelBefore]}>
          <Text style={styles.labelText}>Before</Text>
        </View>
        <View style={[styles.label, styles.labelAfter]}>
          <Text style={styles.labelText}>After</Text>
        </View>
      </View>

      {/* Divider */}
      <Divider
        position={sliderPosition}
        height={height}
        onDrag={setSliderPosition}
        containerWidth={containerWidth}
      />
    </View>
  );
};

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1e293b',
  },

  imageWrapper: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
  },

  beforeWrapper: {
    left: 0,
  },

  afterWrapper: {
    right: 0,
  },

  image: {
    position: 'absolute',
    top: 0,
  },

  labelsContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    pointerEvents: 'none',
  },

  label: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },

  labelBefore: {
    backgroundColor: 'rgba(245, 158, 11, 0.9)',
  },

  labelAfter: {
    backgroundColor: 'rgba(34, 197, 94, 0.9)',
  },

  labelText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  dividerContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: HANDLE_SIZE,
    alignItems: 'center',
    zIndex: 10,
  },

  dividerLine: {
    position: 'absolute',
    top: 0,
    width: DIVIDER_WIDTH,
    backgroundColor: '#ffffff',
    left: (HANDLE_SIZE - DIVIDER_WIDTH) / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },

  handle: {
    position: 'absolute',
    top: '50%',
    marginTop: -HANDLE_SIZE / 2,
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    backgroundColor: 'rgba(59, 130, 246, 0.95)',
    borderWidth: 3,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});

export default ComparisonSlider;
