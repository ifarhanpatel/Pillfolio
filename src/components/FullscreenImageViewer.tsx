import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

import { ThemedText } from '@/components/themed-text';

type FullscreenImageViewerProps = {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
};

export function FullscreenImageViewer({
  visible,
  imageUri,
  onClose,
}: FullscreenImageViewerProps) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
      testID="prescription-image-fullscreen">
      <View style={styles.overlay} testID="prescription-image-fullscreen">
        <Pressable onPress={onClose} style={styles.closeButton} testID="prescription-image-close">
          <ThemedText type="defaultSemiBold" darkColor="#FFFFFF" lightColor="#FFFFFF">
            Close
          </ThemedText>
        </Pressable>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContainer}
          minimumZoomScale={1}
          maximumZoomScale={4}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          bouncesZoom={false}>
          <Image source={{ uri: imageUri }} style={styles.image} contentFit="contain" />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
  },
  closeButton: {
    alignSelf: 'flex-end',
    marginTop: 56,
    marginRight: 20,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  image: {
    width: '100%',
    height: '80%',
  },
});
