import { Slot } from 'expo-router';
import { View, StyleSheet } from 'react-native';

export default function PhotosLayout() {
  return (
    <View style={styles.container}>
      <Slot />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
});


