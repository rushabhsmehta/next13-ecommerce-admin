import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { ApiError } from "@/lib/api";
import { uploadOperationsImage } from "@/lib/operations-image";

interface Props {
  images: { url: string }[];
  onChange: (images: { url: string }[]) => void;
  getToken: () => Promise<string | null>;
  testID?: string;
}

/** Multi-image gallery picker for hotel create/edit (mirrors web `images: { url }[]`). */
export function OperationsImageGallery({ images, onChange, getToken, testID }: Props) {
  const [uploading, setUploading] = useState(false);
  const visibleImages = images
    .map((img, index) => ({ url: img.url.trim(), index }))
    .filter((img) => img.url);

  async function addImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo library access to upload images.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.72,
      allowsMultipleSelection: false,
      exif: false,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setUploading(true);
    try {
      const uploaded = await uploadOperationsImage(
        asset.uri,
        getToken,
        asset.fileName ?? undefined,
        asset.mimeType ?? undefined
      );
      onChange([...images, { url: uploaded.imageUrl }]);
    } catch (err) {
      Alert.alert(
        "Upload failed",
        err instanceof ApiError ? err.message : "Could not upload the image."
      );
    } finally {
      setUploading(false);
    }
  }

  function removeAt(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        testID={testID ? `${testID}-scroll` : undefined}
      >
        {visibleImages.map((img) => (
          <View key={`${img.url}-${img.index}`} style={styles.thumbWrap}>
            <Image
              source={{ uri: img.url }}
              style={styles.thumb}
              accessibilityIgnoresInvertColors
            />
            <Pressable
              testID={testID ? `${testID}-remove-${img.index}` : undefined}
              accessibilityRole="button"
              accessibilityLabel={`Remove image ${img.index + 1}`}
              style={styles.removeIcon}
              onPress={() => removeAt(img.index)}
            >
              <Ionicons name="close-circle" size={22} color={Colors.error} />
            </Pressable>
          </View>
        ))}
        <Pressable
          testID={testID ? `${testID}-add` : undefined}
          accessibilityRole="button"
          accessibilityLabel="Add hotel image"
          style={styles.addTile}
          onPress={addImage}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <>
              <Ionicons name="add" size={28} color={Colors.primary} />
              <Text style={styles.addText}>Add photo</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
      {visibleImages.length === 0 ? (
        <Text style={styles.hint}>At least one image is required *</Text>
      ) : (
        <Text style={styles.hint}>{visibleImages.length} image(s)</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: Spacing.sm, paddingVertical: 4 },
  thumbWrap: { position: "relative" },
  thumb: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceAlt,
  },
  removeIcon: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: Colors.surface,
    borderRadius: 12,
  },
  addTile: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: Colors.surface,
  },
  addText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: "700" },
  hint: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },
});
