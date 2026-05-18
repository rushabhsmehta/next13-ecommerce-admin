import { useState } from "react";
import {
  View,
  Image,
  Modal,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";

interface Props {
  fileUrl: string | null | undefined;
  uploading?: boolean;
}

const PLACEHOLDER_BG = "#E5E7EB";
const THUMB_SIZE = 220;

export function ImageBubble({ fileUrl, uploading }: Props) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const imageUrl = fileUrl?.trim();

  if (!imageUrl) {
    return (
      <View style={[styles.thumb, styles.thumbPlaceholder]}>
        <Ionicons name="image-outline" size={32} color={Colors.textTertiary} />
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.85}
        accessibilityRole="imagebutton"
        accessibilityLabel="Open photo"
      >
        <View style={styles.thumb}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            onLoad={() => setLoaded(true)}
            resizeMode="cover"
          />
          {!loaded && (
            <View style={styles.spinnerWrap}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          )}
          {uploading && (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator color="#fff" />
            </View>
          )}
        </View>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.lightboxBackdrop} onPress={() => setOpen(false)}>
          <Image source={{ uri: imageUrl }} style={styles.lightboxImage} resizeMode="contain" />
          <View style={styles.lightboxClose}>
            <Ionicons name="close" size={28} color="#fff" />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 12,
    backgroundColor: PLACEHOLDER_BG,
    overflow: "hidden",
  },
  thumbPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  image: { width: "100%", height: "100%" },
  spinnerWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  lightboxImage: { width: "100%", height: "85%" },
  lightboxClose: {
    position: "absolute",
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
});
