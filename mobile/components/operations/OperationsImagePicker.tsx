import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
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
  value: string;
  onChange: (url: string) => void;
  getToken: () => Promise<string | null>;
  required?: boolean;
  testID?: string;
  accessibilityLabel?: string;
}

/** Pick an image from the library and upload to R2 for operations master data. */
export function OperationsImagePicker({
  value,
  onChange,
  getToken,
  required,
  testID,
  accessibilityLabel,
}: Props) {
  const [uploading, setUploading] = useState(false);

  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo library access to upload an image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
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
      onChange(uploaded.imageUrl);
    } catch (err) {
      Alert.alert(
        "Upload failed",
        err instanceof ApiError ? err.message : "Could not upload the image."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <View>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? "Choose image"}
        style={styles.box}
        onPress={pickImage}
        disabled={uploading}
      >
        {value ? (
          <Image source={{ uri: value }} style={styles.preview} accessibilityIgnoresInvertColors />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="image-outline" size={32} color={Colors.textTertiary} />
            <Text style={styles.placeholderText}>
              {required ? "Tap to add image *" : "Tap to add image (optional)"}
            </Text>
          </View>
        )}
        {uploading ? (
          <View style={styles.overlay}>
            <ActivityIndicator color="#fff" />
          </View>
        ) : null}
      </Pressable>
      {value ? (
        <Pressable
          testID={testID ? `${testID}-remove` : undefined}
          accessibilityRole="button"
          accessibilityLabel="Remove image"
          style={styles.removeBtn}
          onPress={() => onChange("")}
        >
          <Ionicons name="trash-outline" size={16} color={Colors.error} />
          <Text style={styles.removeText}>Remove image</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
    backgroundColor: Colors.surface,
    minHeight: 160,
  },
  preview: { width: "100%", height: 200 },
  placeholder: {
    minHeight: 160,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
  placeholderText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    textAlign: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  removeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: Spacing.sm,
    alignSelf: "flex-start",
  },
  removeText: { fontSize: FontSize.sm, color: Colors.error, fontWeight: "700" },
});
