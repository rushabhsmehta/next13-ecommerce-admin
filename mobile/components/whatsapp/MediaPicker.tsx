import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { whatsappApi } from "@/lib/whatsapp-api";

export interface PickedMedia {
  url: string;
  type: "image" | "video" | "audio" | "document";
  mimeType: string;
  filename: string;
}

export async function pickAndUploadImage(): Promise<PickedMedia | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    Alert.alert("Permission Required", "Allow access to your photo library to send images.");
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.85,
    allowsEditing: false,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  const filename = asset.fileName || `image_${Date.now()}.jpg`;
  const mimeType = asset.mimeType || "image/jpeg";

  try {
    const uploaded = await whatsappApi.uploadMedia(asset.uri, filename, mimeType);
    return {
      url: uploaded.url,
      type: "image",
      mimeType,
      filename,
    };
  } catch (err: any) {
    Alert.alert("Upload Failed", err.message || "Could not upload image.");
    return null;
  }
}

export async function pickAndUploadVideo(): Promise<PickedMedia | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    Alert.alert("Permission Required", "Allow access to your photo library to send videos.");
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["videos"],
    quality: 0.8,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  const filename = asset.fileName || `video_${Date.now()}.mp4`;
  const mimeType = asset.mimeType || "video/mp4";

  try {
    const uploaded = await whatsappApi.uploadMedia(asset.uri, filename, mimeType);
    return {
      url: uploaded.url,
      type: "video",
      mimeType,
      filename,
    };
  } catch (err: any) {
    Alert.alert("Upload Failed", err.message || "Could not upload video.");
    return null;
  }
}

export async function pickAndUploadDocument(): Promise<PickedMedia | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/pdf", "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  const filename = asset.name || `document_${Date.now()}.pdf`;
  const mimeType = asset.mimeType || "application/pdf";

  try {
    const uploaded = await whatsappApi.uploadMedia(asset.uri, filename, mimeType);
    return {
      url: uploaded.url,
      type: "document",
      mimeType,
      filename,
    };
  } catch (err: any) {
    Alert.alert("Upload Failed", err.message || "Could not upload document.");
    return null;
  }
}
