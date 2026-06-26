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
import { TourQueryBasicTab } from "@/components/tour-queries/TourQueryBasicTab";
import { TourQueryGuestsTab } from "@/components/tour-queries/TourQueryGuestsTab";
import { TourQueryItineraryTab } from "@/components/tour-queries/TourQueryItineraryTab";
import { TourQueryPoliciesTab } from "@/components/tour-queries/TourQueryPoliciesTab";
import { TourQueryTabShell } from "@/components/tour-queries/TourQueryTabShell";
import { TourQueryTripTab } from "@/components/tour-queries/TourQueryTripTab";
import { useTourQueryCreateForm } from "@/components/tour-queries/useTourQueryCreateForm";
import type { TourQueryTabId } from "@/components/tour-queries/types";

export default function NewTourQueryScreen() {
  return (
    <PermissionGate permission="salesTrips.write">
      <NewTourQueryScreenInner />
    </PermissionGate>
  );
}

function NewTourQueryScreenInner() {
  const router = useRouter();
  const { locationId, tab } = useLocalSearchParams<{ locationId?: string; tab?: string }>();
  const resolvedLocationId = typeof locationId === "string" ? locationId : undefined;
  const [activeTab, setActiveTab] = useState<TourQueryTabId>(() => parseTourQueryTab(tab));

  useEffect(() => {
    if (tab) setActiveTab(parseTourQueryTab(tab));
  }, [tab]);

  const form = useTourQueryCreateForm(resolvedLocationId);

  useEffect(() => {
    if (form.saveErrorTab) {
      setActiveTab(form.saveErrorTab);
      form.setSaveErrorTab(null);
    }
  }, [form.saveErrorTab, form.setSaveErrorTab]);

  if (form.loading) {
    return <AdminLoadingState label="Preparing new tour package query…" testID="tq-new-loading" />;
  }

  if (form.error) {
    return (
      <AdminScreen testID="tq-new-error">
        <Stack.Screen options={{ title: "New Tour Package Query", headerShown: false }} />
        <AdminErrorState message={form.error} testID="tq-new-error-state" />
      </AdminScreen>
    );
  }

  return (
    <>
      <AdminScreen
        keyboardAvoiding
        testID="tq-new-screen"
        footer={
          <AdminBottomActionBar
            primaryLabel="Create query"
            primaryIcon="add-circle-outline"
            primaryTestID="tq-new-save"
            primaryDisabled={form.saveBlocked}
            primaryHint={
              form.datesOrderWarning
                ? "Fix date order before saving."
                : "Creates this tour package query."
            }
            disabledReason={form.saveDisabledReason}
            onPrimaryPress={form.save}
          />
        }
      >
        <Stack.Screen options={{ title: "New Tour Package Query", headerShown: false }} />
        <AdminTopBar
          title="New Tour Package Query"
          subtitle="Review AI draft or enter details"
          onBackPress={() => router.back()}
          testID="tq-new-header"
        />

        <TourQueryTabShell
          activeTab={activeTab}
          onTabChange={setActiveTab}
          badges={form.tabBadges}
          testIDPrefix="tq-new-tab"
          hiddenTabs={["hotels", "pricing", "variants"]}
        >
          {activeTab === "basic" ? <TourQueryBasicTab {...form} /> : null}
          {activeTab === "guests" ? <TourQueryGuestsTab {...form} /> : null}
          {activeTab === "trip" ? <TourQueryTripTab {...form} /> : null}
          {activeTab === "itinerary" ? <TourQueryItineraryTab {...form} /> : null}
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
