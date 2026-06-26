import { View, StyleSheet } from "react-native";
import { AdminSegmentedControl } from "@/components/admin";
import { Spacing } from "@/constants/theme";
import { TOUR_QUERY_TABS, type TourQueryTabOption } from "./tab-config";
import type { TabBadgeState, TourQueryTabId } from "./types";

export interface TourQueryTabBarProps {
  activeTab: TourQueryTabId;
  onTabChange: (tab: TourQueryTabId) => void;
  badges?: TabBadgeState;
  testIDPrefix?: string;
  hiddenTabs?: TourQueryTabId[];
}

function tabLabel(opt: TourQueryTabOption, badges?: TabBadgeState): string {
  if (opt.id === "itinerary" && badges?.itinerary && badges.itinerary > 0) {
    return `${opt.label} (${badges.itinerary})`;
  }
  if (opt.id === "hotels" && badges?.hotels && badges.hotels > 0) {
    return `${opt.label} (${badges.hotels})`;
  }
  if (opt.id === "trip" && badges?.trip) return `${opt.label} •`;
  if (opt.id === "pricing" && badges?.pricing) return `${opt.label} •`;
  if (opt.id === "variants" && badges?.variants) return `${opt.label} •`;
  return opt.label;
}

/** Horizontal tab strip — use alone when summary/actions sit between bar and panel. */
export function TourQueryTabBar({
  activeTab,
  onTabChange,
  badges,
  testIDPrefix = "tq-tab",
  hiddenTabs,
}: TourQueryTabBarProps) {
  const hidden = new Set(hiddenTabs ?? []);
  const options = TOUR_QUERY_TABS.filter((t) => !hidden.has(t.id)).map((t) => ({
    id: t.id,
    label: tabLabel(t, badges),
  }));

  return (
    <View style={styles.tabBar} testID={`${testIDPrefix}-bar`}>
      <AdminSegmentedControl
        options={options}
        value={activeTab}
        onChange={onTabChange}
        testIDPrefix={testIDPrefix}
        scrollable
      />
    </View>
  );
}

export interface TourQueryTabPanelProps {
  activeTab: TourQueryTabId;
  testIDPrefix?: string;
  children: React.ReactNode;
}

export function TourQueryTabPanel({
  activeTab,
  testIDPrefix = "tq-tab",
  children,
}: TourQueryTabPanelProps) {
  return (
    <View style={styles.panel} testID={`${testIDPrefix}-panel-${activeTab}`}>
      {children}
    </View>
  );
}

export interface TourQueryTabShellProps extends TourQueryTabBarProps {
  children: React.ReactNode;
}

/** Tab bar + panel stacked — default for edit and simple layouts. */
export function TourQueryTabShell({
  activeTab,
  onTabChange,
  badges,
  testIDPrefix = "tq-tab",
  hiddenTabs,
  children,
}: TourQueryTabShellProps) {
  return (
    <View style={styles.wrap}>
      <TourQueryTabBar
        activeTab={activeTab}
        onTabChange={onTabChange}
        badges={badges}
        testIDPrefix={testIDPrefix}
        hiddenTabs={hiddenTabs}
      />
      <TourQueryTabPanel activeTab={activeTab} testIDPrefix={testIDPrefix}>
        {children}
      </TourQueryTabPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  tabBar: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  panel: {
    flex: 1,
  },
});
