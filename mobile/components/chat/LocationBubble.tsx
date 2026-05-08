import { Linking, Platform, TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";

interface Props {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  isMine?: boolean;
}

function buildMapUrl(lat: number, lng: number): string {
  if (Platform.OS === "ios") {
    return `http://maps.apple.com/?ll=${lat},${lng}&q=${lat},${lng}`;
  }
  return `geo:${lat},${lng}?q=${lat},${lng}(Shared%20location)`;
}

function buildFallbackUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export function LocationBubble({ latitude, longitude, isMine }: Props) {
  const lat = typeof latitude === "number" ? latitude : null;
  const lng = typeof longitude === "number" ? longitude : null;

  const onOpen = async () => {
    if (lat == null || lng == null) return;
    const native = buildMapUrl(lat, lng);
    try {
      const supported = await Linking.canOpenURL(native);
      await Linking.openURL(supported ? native : buildFallbackUrl(lat, lng));
    } catch {
      Linking.openURL(buildFallbackUrl(lat, lng)).catch(() => {});
    }
  };

  return (
    <TouchableOpacity
      onPress={onOpen}
      activeOpacity={0.7}
      style={styles.row}
      accessibilityRole="button"
      accessibilityLabel="Open location in Maps"
    >
      <View style={styles.pin}>
        <Ionicons name="location" size={22} color="#fff" />
      </View>
      <View style={styles.text}>
        <Text style={[styles.title, isMine ? styles.titleMine : styles.titleOther]}>
          Shared location
        </Text>
        <Text style={[styles.coords, isMine ? styles.coordsMine : styles.coordsOther]}>
          {lat != null && lng != null
            ? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
            : "Coordinates unavailable"}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: 200,
    paddingVertical: 4,
  },
  pin: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  text: { flex: 1 },
  title: { fontSize: 14, fontWeight: "600" },
  titleMine: { color: "#fff" },
  titleOther: { color: Colors.text },
  coords: { fontSize: 11, marginTop: 2 },
  coordsMine: { color: "rgba(255,255,255,0.7)" },
  coordsOther: { color: Colors.textTertiary },
});
