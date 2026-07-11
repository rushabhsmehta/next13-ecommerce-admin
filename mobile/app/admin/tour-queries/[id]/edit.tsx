import { useEffect, useState } from "react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { PermissionGate } from "@/components/auth/PermissionGate";
import {
  AdminBottomActionBar,
  AdminErrorState,
  AdminLoadingState,
  AdminPickerSheet,
  AdminScreen,
  AdminTopBar,
} from "@/components/admin";
import { parseTourQueryTab } from "@/components/tour-queries/tab-config";
import { firstRouteParam } from "@/lib/route-params";
import { TourQueryBasicTab } from "@/components/tour-queries/TourQueryBasicTab";
import { TourQueryGuestsTab } from "@/components/tour-queries/TourQueryGuestsTab";
import { TourQueryItineraryTab } from "@/components/tour-queries/TourQueryItineraryTab";
import { TourQueryPoliciesTab } from "@/components/tour-queries/TourQueryPoliciesTab";
import { TourQueryPricingTab } from "@/components/tour-queries/TourQueryPricingTab";
import { TourQueryTabShell } from "@/components/tour-queries/TourQueryTabShell";
import { TourQueryTripTab } from "@/components/tour-queries/TourQueryTripTab";
import { TourQueryVariantsTab } from "@/components/tour-queries/TourQueryVariantsTab";
import { useTourQueryEditForm } from "@/components/tour-queries/useTourQueryEditForm";
import type { TourQueryTabId } from "@/components/tour-queries/types";

export default function EditTourQueryScreen() {
  return (
    <PermissionGate permission="salesTrips.write">
      <EditTourQueryScreenInner />
    </PermissionGate>
  );
}

function EditTourQueryScreenInner() {
  const router = useRouter();
  const { id: rawId, tab } = useLocalSearchParams<{ id?: string | string[]; tab?: string }>();
  const id = firstRouteParam(rawId);
  const [activeTab, setActiveTab] = useState<TourQueryTabId>(() => parseTourQueryTab(tab));

  useEffect(() => {
    if (tab) setActiveTab(parseTourQueryTab(tab));
  }, [tab]);

  const form = useTourQueryEditForm(id ?? "");

  useEffect(() => {
    if (form.saveErrorTab) {
      setActiveTab(form.saveErrorTab);
      form.setSaveErrorTab(null);
    }
  }, [form.saveErrorTab, form.setSaveErrorTab]);

  if (!id) {
    return (
      <AdminScreen testID="tq-edit-missing-id">
        <Stack.Screen options={{ title: "Edit Tour Package Query", headerShown: false }} />
        <AdminErrorState message="Missing query id" testID="tq-edit-error-state" />
      </AdminScreen>
    );
  }

  if (form.loading) {
    return (
      <AdminScreen testID="tq-edit-loading-screen">
        <Stack.Screen options={{ title: "Edit Tour Package Query", headerShown: false }} />
        <AdminLoadingState label="Loading tour package query…" testID="tq-edit-loading" />
      </AdminScreen>
    );
  }

  if (form.error) {
    return (
      <AdminScreen testID="tq-edit-error">
        <Stack.Screen options={{ title: "Edit Tour Package Query", headerShown: false }} />
        <AdminErrorState message={form.error} testID="tq-edit-error-state" />
      </AdminScreen>
    );
  }

  const showMainSave = activeTab !== "pricing" && activeTab !== "variants";

  return (
    <>
      <AdminScreen
        keyboardAvoiding
        testID="tq-edit-screen"
        footer={
          showMainSave ? (
            <AdminBottomActionBar
              primaryLabel="Save changes"
              primaryIcon="save-outline"
              primaryTestID="tq-edit-save"
              primaryDisabled={form.saveBlocked}
              primaryHint={
                form.datesOrderWarning
                  ? "Fix date order before saving."
                  : !form.dirty
                    ? "Enable after you change a field."
                    : "Writes updates to this query."
              }
              disabledReason={form.saveDisabledReason}
              onPrimaryPress={form.save}
            />
          ) : undefined
        }
      >
        <Stack.Screen options={{ title: "Edit Tour Package Query", headerShown: false }} />
        <AdminTopBar
          title="Edit Tour Package Query"
          subtitle={form.dirty ? "Unsaved changes" : "All changes saved"}
          onBackPress={() => router.back()}
          testID="tq-edit-header"
        />

        <TourQueryTabShell
          activeTab={activeTab}
          onTabChange={setActiveTab}
          badges={form.tabBadges}
          testIDPrefix="tq-tab"
        >
          {activeTab === "basic" ? <TourQueryBasicTab {...form} /> : null}
          {activeTab === "guests" ? <TourQueryGuestsTab {...form} /> : null}
          {activeTab === "trip" ? <TourQueryTripTab {...form} /> : null}
          {activeTab === "itinerary" ? <TourQueryItineraryTab {...form} /> : null}
          {activeTab === "pricing" ? (
            <TourQueryPricingTab queryId={id} embedded />
          ) : null}
          {activeTab === "variants" ? (
            <TourQueryVariantsTab queryId={id} embedded />
          ) : null}
          {activeTab === "policies" ? (
            <TourQueryPoliciesTab policies={form.policies} setPolicies={form.setPolicies} />
          ) : null}
        </TourQueryTabShell>
      </AdminScreen>

      {form.activePicker ? (
        <AdminPickerSheet
          visible
          title={form.pickerTitle}
          options={form.pickerOptions}
          selectedId={form.pickerSelectedId}
          onSelect={form.handlePickerSelect}
          onClose={() => form.setActivePicker(null)}
        />
      ) : null}
    </>
  );
}
