import { Text, View, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { HotelSpecialDatePricingForm } from "@/components/operations/HotelSpecialDatePricingForm";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";

export default function NewHotelSpecialDatePricingScreen() {
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
      <HotelSpecialDatePricingForm hotelId={hotelId} mode="create" />
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
