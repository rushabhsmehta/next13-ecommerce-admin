import { View } from "react-native";
import { AdminFormSection } from "@/components/admin";
import { FormField } from "./FormField";
import { tourQueryFormStyles as styles } from "./form-styles";
import type { TourQueryEditFormState } from "./useTourQueryEditForm";

type Props = Pick<
  TourQueryEditFormState,
  | "customerName"
  | "setCustomerName"
  | "customerNumber"
  | "setCustomerNumber"
  | "numAdults"
  | "setNumAdults"
  | "numChild512"
  | "setNumChild512"
  | "numChild05"
  | "setNumChild05"
>;

export function TourQueryGuestsTab(props: Props) {
  const {
    customerName,
    setCustomerName,
    customerNumber,
    setCustomerNumber,
    numAdults,
    setNumAdults,
    numChild512,
    setNumChild512,
    numChild05,
    setNumChild05,
  } = props;

  return (
    <AdminFormSection title="Guests" testID="tq-edit-section-guests">
      <FormField label="Customer name" value={customerName} onChange={setCustomerName} />
      <FormField
        label="Customer number"
        value={customerNumber}
        onChange={setCustomerNumber}
        keyboardType="phone-pad"
      />
      <View style={styles.row3}>
        <FormField
          label="Adults"
          value={numAdults}
          onChange={setNumAdults}
          keyboardType="number-pad"
          flex
        />
        <FormField
          label="Child 5-12"
          value={numChild512}
          onChange={setNumChild512}
          keyboardType="number-pad"
          flex
        />
        <FormField
          label="Child 0-5"
          value={numChild05}
          onChange={setNumChild05}
          keyboardType="number-pad"
          flex
        />
      </View>
    </AdminFormSection>
  );
}
