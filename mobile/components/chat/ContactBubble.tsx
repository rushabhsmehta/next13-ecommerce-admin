import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";

interface Props {
  contactName?: string | null;
  contactPhone?: string | null;
  isMine: boolean;
}

export function ContactBubble({ contactName, contactPhone, isMine }: Props) {
  const phone = contactPhone?.trim() || "";
  return (
    <View style={styles.wrap}>
      <View style={[styles.icon, isMine ? styles.iconMine : styles.iconOther]}>
        <Ionicons name="person-outline" size={18} color="#fff" />
      </View>
      <View style={styles.text}>
        <Text style={[styles.name, isMine && styles.nameMine]} numberOfLines={1}>
          {contactName || "Contact"}
        </Text>
        {phone ? (
          <Text style={[styles.phone, isMine && styles.phoneMine]} numberOfLines={1}>
            {phone}
          </Text>
        ) : null}
      </View>
      {phone ? (
        <TouchableOpacity
          style={styles.call}
          onPress={() => Linking.openURL(`tel:${phone.replace(/[^0-9+]/g, "")}`).catch(() => {})}
          accessibilityRole="button"
          accessibilityLabel={`Call ${contactName || "contact"}`}
        >
          <Ionicons name="call-outline" size={17} color={Colors.primary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minWidth: 210,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  iconMine: { backgroundColor: "rgba(255,255,255,0.25)" },
  iconOther: { backgroundColor: Colors.primary },
  text: { flex: 1, gap: 2 },
  name: { fontSize: 14, fontWeight: "800", color: Colors.text },
  nameMine: { color: "#fff" },
  phone: { fontSize: 12, color: Colors.textSecondary },
  phoneMine: { color: "rgba(255,255,255,0.78)" },
  call: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
});
