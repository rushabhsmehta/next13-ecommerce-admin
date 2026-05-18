import { StyleSheet, Text, View } from "react-native";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";

export interface AdminWorkflowStep {
  id: string;
  label: string;
  done?: boolean;
  active?: boolean;
}

export interface AdminWorkflowRailProps {
  steps: AdminWorkflowStep[];
  testID?: string;
}

export function AdminWorkflowRail({
  steps,
  testID = "admin-workflow-rail",
}: AdminWorkflowRailProps) {
  return (
    <View style={styles.wrap} testID={testID} accessibilityRole="text">
      {steps.map((step, index) => {
        const emphasized = step.done || step.active;
        return (
          <View key={step.id} style={styles.step}>
            <View
              style={[
                styles.dot,
                step.done ? styles.dotDone : step.active ? styles.dotActive : null,
              ]}
            >
              <Text
                style={[
                  styles.number,
                  step.done ? styles.numberDone : step.active ? styles.numberActive : null,
                ]}
                allowFontScaling={false}
              >
                {index + 1}
              </Text>
            </View>
            <Text
              style={[styles.label, emphasized ? styles.labelActive : null]}
              allowFontScaling={false}
              numberOfLines={1}
            >
              {step.label}
            </Text>
            {index < steps.length - 1 ? <View style={styles.line} /> : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
  },
  step: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    minWidth: 0,
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
  },
  dotActive: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primaryLight,
  },
  dotDone: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  number: {
    fontSize: FontSize.xs,
    fontWeight: "900",
    color: Colors.textTertiary,
  },
  numberActive: {
    color: Colors.primary,
  },
  numberDone: {
    color: Colors.textInverse,
  },
  label: {
    flexShrink: 1,
    fontSize: FontSize.xs,
    fontWeight: "800",
    color: Colors.textTertiary,
  },
  labelActive: {
    color: Colors.text,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.borderSubtle,
    marginHorizontal: Spacing.xs,
  },
});
