import { useEffect, useState } from "react";
import {
  Image,
  type ImageProps,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";
import { resolveImageUrl } from "@/lib/resolve-image-url";

type Props = Omit<ImageProps, "source"> & {
  uri?: string | null;
  fallbackIcon?: keyof typeof Ionicons.glyphMap;
  containerStyle?: StyleProp<ViewStyle>;
};

/** RN-safe remote image with Cloudinary format fixes and a visible fallback. */
export function RemoteImage({
  uri,
  fallbackIcon = "image-outline",
  style,
  containerStyle,
  onError,
  ...rest
}: Props) {
  const resolved = resolveImageUrl(uri);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [resolved]);

  if (!resolved || failed) {
    return (
      <View style={[style, styles.fallback, containerStyle]}>
        <Ionicons name={fallbackIcon} size={22} color={Colors.textTertiary} />
      </View>
    );
  }

  return (
    <Image
      {...rest}
      source={{ uri: resolved }}
      style={style}
      onError={(event) => {
        setFailed(true);
        onError?.(event);
      }}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surfaceAlt,
  },
});
