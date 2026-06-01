import { Text, TextInput, View } from "react-native";
import { Colors } from "@/constants/theme";
import { tourQueryFormStyles as styles } from "./form-styles";

export function FormField({
  label,
  value,
  onChange,
  multiline,
  keyboardType,
  flex,
  placeholder,
  testID,
}: {
  label: string;
  value: string;
  onChange: (t: string) => void;
  multiline?: boolean;
  keyboardType?: "default" | "number-pad" | "phone-pad";
  flex?: boolean;
  placeholder?: string;
  testID?: string;
}) {
  return (
    <View style={flex ? { flex: 1 } : undefined}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        testID={testID}
        accessibilityLabel={label}
        style={[styles.input, multiline ? styles.textarea : null]}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        keyboardType={keyboardType ?? "default"}
        placeholder={placeholder}
        placeholderTextColor={Colors.textTertiary}
      />
    </View>
  );
}
