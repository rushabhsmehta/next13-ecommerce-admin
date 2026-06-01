import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { AdminFormSection, AdminSegmentedControl } from "@/components/admin";
import { Colors } from "@/constants/theme";
import { tourQueryFormStyles as styles } from "./form-styles";
import { POLICY_FIELDS, type PolicySegmentId } from "./types";
import type { TourQueryEditFormState } from "./useTourQueryEditForm";

const POLICY_SEGMENTS: { id: PolicySegmentId; label: string }[] = [
  { id: "inclusions", label: "Inclusions" },
  { id: "notes", label: "Notes" },
  { id: "cancellation", label: "Cancel" },
  { id: "terms", label: "Terms" },
];

type Props = Pick<TourQueryEditFormState, "policies" | "setPolicies">;

export function TourQueryPoliciesTab({ policies, setPolicies }: Props) {
  const [segment, setSegment] = useState<PolicySegmentId>("inclusions");
  const fields = POLICY_FIELDS.filter((f) => f.segment === segment);

  return (
    <AdminFormSection title="Policies" testID="tq-edit-section-policies">
      <AdminSegmentedControl
        options={POLICY_SEGMENTS}
        value={segment}
        onChange={setSegment}
        testIDPrefix="tq-policy-segment"
        scrollable
      />
      <View style={styles.policyWrap}>
        {fields.map((f) => (
          <View key={f.key as string} style={styles.policyCard}>
            <Text style={styles.policyTapTitle}>{f.label}</Text>
            <Text style={styles.help}>One item per line</Text>
            <TextInput
              testID={`tq-edit-policy-${String(f.key)}`}
              accessibilityLabel={f.label}
              style={[styles.input, styles.policyTextarea]}
              value={policies[f.key as string] ?? ""}
              onChangeText={(t) => setPolicies((p) => ({ ...p, [f.key as string]: t }))}
              multiline
              placeholderTextColor={Colors.textTertiary}
            />
          </View>
        ))}
      </View>
    </AdminFormSection>
  );
}
