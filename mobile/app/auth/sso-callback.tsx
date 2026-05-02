import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useSSO } from "@clerk/clerk-expo";
import { Colors } from "@/constants/theme";

export default function SSOCallback() {
  const { handleSSOCallback } = useSSO();

  useEffect(() => {
    handleSSOCallback();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
});
