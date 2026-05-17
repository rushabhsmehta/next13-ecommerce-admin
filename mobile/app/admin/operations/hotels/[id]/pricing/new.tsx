import { useLocalSearchParams } from "expo-router";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { HotelPricingForm } from "@/components/operations/HotelPricingForm";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { Text, View, StyleSheet } from "react-native";

export default function NewHotelPricingScreen() {
  const { id: hotelId } = useLocalSearchParams<{ id: string }>();

  if (!hotelId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Hotel missing</Text>
      </View>
    );
  }

  return (
    <PermissionGate permission="operations.write">
      <HotelPricingForm hotelId={hotelId} mode="create" />
    </PermissionGate>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
  },
  title: { fontSize: FontSize.lg, fontWeight: "800", color: Colors.text },
});
