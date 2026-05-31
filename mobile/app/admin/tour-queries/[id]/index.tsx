import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { ApiError, withAuth } from "@/lib/api";
import { API_BASE_URL } from "@/constants/api";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { PermissionGate } from "@/components/auth/PermissionGate";
import {
  AdminErrorState,
  AdminLoadingState,
  AdminScreen,
  AdminTopBar,
  AdminTopBarIconButton,
} from "@/components/admin";
import {
  TripActionMenu,
  buildDetailReadinessItems,
  TripMiniMetric,
  TripReadinessBar,
  TripStatusPill,
  type TripActionMenuSection,
  type TripMoreActionRow,
} from "@/components/admin/trips";
import {
  absoluteAdminUrl,
  tourQueryDisplayPath,
  tourQueryHotelUpdatePath,
  tourQueryPdfPath,
  tourQueryPdfWithVariantsPath,
} from "@/lib/tour-queries-web-urls";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  createTourQueryLifecycleClient,
  type TourQueryLifecycleAction,
} from "@/lib/tour-query-lifecycle";
import { downloadAndSharePdf } from "@/lib/pdf-download";

interface FlightDetail {
  id: string;
  date: string | null;
  flightName: string | null;
  flightNumber: string | null;
  from: string | null;
  to: string | null;
  departureTime: string | null;
  arrivalTime: string | null;
  flightDuration: string | null;
}

interface VariantSnapshot {
  id: string;
  name: string;
  sortOrder: number | null;
  sourceVariantId: string | null;
}

interface RoomAllocationDetail {
  id: string;
  quantity: number | null;
  customRoomType: string | null;
  roomType: { name: string } | null;
  occupancyType: { name: string } | null;
  mealPlan: { name: string } | null;
}

interface TransportDetailItem {
  id: string;
  quantity: number | null;
  description: string | null;
  vehicleType: { name: string } | null;
}

interface PricingItem {
  name: string | null;
  price: string | null;
  description: string | null;
  [key: string]: unknown;
}

interface ItineraryItem {
  id: string;
  dayNumber: number | null;
  days: string | null;
  itineraryTitle: string | null;
  itineraryDescription: string | null;
  mealsIncluded: string | null;
  hotel: { id: string; name: string } | null;
  roomAllocations: RoomAllocationDetail[];
  transportDetails: TransportDetailItem[];
}

interface TourQueryDetail {
  id: string;
  tourPackageQueryNumber: string | null;
  tourPackageQueryName: string | null;
  tourPackageQueryType: string | null;
  tourCategory: string | null;
  customerName: string | null;
  customerNumber: string | null;
  numDaysNight: string | null;
  period: string | null;
  tourStartsFrom: string | null;
  tourEndsOn: string | null;
  numAdults: string | null;
  numChild5to12: string | null;
  numChild0to5: string | null;
  transport: string | null;
  pickup_location: string | null;
  drop_location: string | null;
  price: string | null;
  pricePerAdult: string | null;
  pricePerChildOrExtraBed: string | null;
  pricePerChild5to12YearsNoBed: string | null;
  pricePerChildwithSeatBelow5Years: string | null;
  totalPrice: string | null;
  pricingSection: PricingItem[];
  pricingCalculationMethod: string | null;
  selectedMealPlanId: string | null;
  variantPricingData: Record<string, unknown>;
  remarks: string | null;
  isFeatured: boolean;
  isArchived: boolean;
  confirmedVariantId: string | null;
  assignedTo: string | null;
  assignedToMobileNumber: string | null;
  assignedToEmail: string | null;
  createdAt: string;
  updatedAt: string;
  location: { id: string; label: string } | null;
  associatePartner: { id: string; name: string } | null;
  inquiry: {
    id: string;
    customerName: string | null;
    customerMobileNumber: string | null;
    status: string | null;
    associatePartnerId?: string | null;
  } | null;
  flightDetails: FlightDetail[];
  queryVariantSnapshots: VariantSnapshot[];
  itineraries: ItineraryItem[];
  inclusionsList: string[];
  exclusionsList: string[];
  importantNotesList: string[];
  paymentPolicyList: string[];
  usefulTipList: string[];
  cancellationPolicyList: string[];
  airlineCancellationPolicyList: string[];
  termsconditionsList: string[];
  kitchenGroupPolicyList: string[];
}

function getAdminBase(): string {
  return API_BASE_URL.replace(/\/$/, "");
}

function formatDate(s: string | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString(
      "en-IN",
      opts ?? { day: "2-digit", month: "short", year: "numeric" }
    );
  } catch {
    return "—";
  }
}

function formatINR(value: string | number | null | undefined): string {
  if (value == null) return "—";
  const n = typeof value === "string" ? Number.parseFloat(value) : value;
  if (!Number.isFinite(n)) return "—";
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function hasPositiveTotal(price: string | null | undefined): boolean {
  if (!price) return false;
  const n = Number.parseFloat(price);
  return Number.isFinite(n) && n > 0;
}

function pricingMethodLabel(method: string | null | undefined): string {
  if (method === "manual") return "Manual pricing";
  if (method === "autoHotelTransport") return "Hotel + transport";
  if (method === "autoTourPackage" || method === "useTourPackagePricing") {
    return "Package pricing";
  }
  return "Pricing";
}

function buildRoomLabel(r: RoomAllocationDetail): string {
  const parts: string[] = [];
  const qty = r.quantity && r.quantity > 0 ? `${r.quantity}x ` : "";
  const rt = r.customRoomType || r.roomType?.name || "Room";
  parts.push(`${qty}${rt}`);
  if (r.occupancyType?.name) parts.push(r.occupancyType.name);
  if (r.mealPlan?.name) parts.push(r.mealPlan.name);
  return parts.join(" · ");
}

function buildTransportSummary(items: TransportDetailItem[]): string {
  if (!items.length) return "";
  return items
    .map((t) => {
      const qty = t.quantity && t.quantity > 0 ? `${t.quantity}x ` : "";
      const vt = t.vehicleType?.name ?? "Vehicle";
      return t.description ? `${qty}${vt}: ${t.description}` : `${qty}${vt}`;
    })
    .join("; ");
}

type PrimaryAction =
  | { key: "restore"; label: string; run: () => void }
  | { key: "variants"; label: string; run: () => void }
  | { key: "edit"; label: string; run: () => void }
  | { key: "sharePdf"; label: string; run: () => void }
  | { key: "shareTrip"; label: string; run: () => void };

type PrimaryKind = PrimaryAction["key"];

function primaryActionKind(data: TourQueryDetail, canWriteSales: boolean): PrimaryKind {
  if (data.isArchived) return canWriteSales ? "restore" : "shareTrip";
  const draft = !data.isFeatured;
  if (draft && data.queryVariantSnapshots.length > 0) return "variants";
  if (draft && !hasPositiveTotal(data.totalPrice)) return "edit";
  if (draft && hasPositiveTotal(data.totalPrice)) return "sharePdf";
  return "shareTrip";
}

function derivePrimary(
  data: TourQueryDetail,
  id: string,
  router: { push: (h: never) => void },
  canWriteSales: boolean
): PrimaryAction {
  const openVariants = () => router.push(`/admin/tour-queries/${id}/variants` as never);
  const edit = () => router.push(`/admin/tour-queries/${id}/edit` as never);

  if (data.isArchived) {
    if (canWriteSales) return { key: "restore", label: "Restore query", run: () => {} };
    return { key: "shareTrip", label: "Share query", run: () => {} };
  }
  const draft = !data.isFeatured;
  if (draft && data.queryVariantSnapshots.length > 0) {
    return { key: "variants", label: "Compare variants", run: openVariants };
  }
  if (draft && !hasPositiveTotal(data.totalPrice)) {
    return { key: "edit", label: "Edit query", run: edit };
  }
  if (draft && hasPositiveTotal(data.totalPrice)) {
    return { key: "sharePdf", label: "Share PDF", run: () => {} };
  }
  return { key: "shareTrip", label: "Share query", run: () => {} };
}

export default function TourQueryDetailScreen() {
  return (
    <PermissionGate permission="salesTrips.read">
      <TourQueryDetailScreenInner />
    </PermissionGate>
  );
}

function TourQueryDetailScreenInner() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();

  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const request = useMemo(() => withAuth(() => getTokenRef.current()), []);
  const lifecycleClient = useMemo(
    () => createTourQueryLifecycleClient(request),
    [request]
  );
  const { permissions } = useCurrentUser();
  const canWriteSales = permissions.includes("salesTrips.write");

  const [data, setData] = useState<TourQueryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lifecycleBusy, setLifecycleBusy] = useState<TourQueryLifecycleAction | null>(
    null
  );
  const [pdfBusy, setPdfBusy] = useState<"plain" | "variants" | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [itineraryExpanded, setItineraryExpanded] = useState(false);
  const [policiesOpen, setPoliciesOpen] = useState(false);
  const [flightsOpen, setFlightsOpen] = useState(false);
  const [successNote, setSuccessNote] = useState<string | null>(null);

  useEffect(() => {
    if (!successNote) return;
    const t = setTimeout(() => setSuccessNote(null), 2800);
    return () => clearTimeout(t);
  }, [successNote]);

  const load = useCallback(
    async (mode: "initial" | "refresh") => {
      if (!id) return;
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await request<TourQueryDetail>(
          `/api/mobile/tour-queries/${id}`,
          { retries: 1 }
        );
        setData(res);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load query.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id, request]
  );

  useEffect(() => {
    void load("initial");
  }, [load]);

  const shareUrl = useMemo(() => {
    if (!id) return "";
    return absoluteAdminUrl(getAdminBase(), tourQueryDisplayPath(id));
  }, [id]);
  const pdfUrl = useMemo(() => {
    if (!id) return "";
    return absoluteAdminUrl(getAdminBase(), tourQueryPdfPath(id));
  }, [id]);
  const pdfVariantsUrl = useMemo(() => {
    if (!id) return "";
    return absoluteAdminUrl(getAdminBase(), tourQueryPdfWithVariantsPath(id));
  }, [id]);
  const hotelEditUrl = useMemo(() => {
    if (!id) return "";
    return absoluteAdminUrl(getAdminBase(), tourQueryHotelUpdatePath(id));
  }, [id]);

  const callCustomer = useCallback((phone: string | null | undefined) => {
    if (!phone) {
      Alert.alert("No phone number", "This customer does not have a phone number on file.");
      return;
    }
    Linking.openURL(`tel:${phone.replace(/[^0-9+]/g, "")}`).catch(() => {
      Alert.alert("Could not place call", "This device does not support phone calls.");
    });
  }, []);

  const messageOnWhatsApp = useCallback((phone: string | null | undefined) => {
    if (!phone) {
      Alert.alert("No phone number", "Add a number to message on WhatsApp.");
      return;
    }
    const cleaned = phone.replace(/[^0-9]/g, "");
    Linking.openURL(`https://wa.me/${cleaned}`).catch(() => {
      Alert.alert("WhatsApp unavailable", "Could not open WhatsApp.");
    });
  }, []);

  const handleShareTrip = useCallback(async () => {
    if (!data) return;
    const title =
      data.tourPackageQueryName ||
      data.tourPackageQueryNumber ||
      "Tour Query";
    try {
      await Share.share({
        title,
        message: `${title}\n${shareUrl}`,
        url: shareUrl,
      });
    } catch {
      /* dismissed */
    }
  }, [data, shareUrl]);

  const sharePdf = useCallback(
    async (variant: boolean, fallbackWebUrl: string) => {
      if (!id) return;
      setPdfBusy(variant ? "variants" : "plain");
      try {
        const name =
          data?.tourPackageQueryNumber ||
          data?.tourPackageQueryName ||
          "query";
        await downloadAndSharePdf({
          endpoint: `/api/mobile/tour-queries/${encodeURIComponent(id)}/pdf${variant ? "?variant=1" : ""
            }`,
          fileName: variant ? `${name}-variants` : name,
          getToken: () => getTokenRef.current(),
          dialogTitle: "Share query PDF",
        });
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : "Could not generate the PDF.";
        Alert.alert("PDF unavailable", message, [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open in browser",
            onPress: () => {
              if (fallbackWebUrl) void Linking.openURL(fallbackWebUrl);
            },
          },
        ]);
      } finally {
        setPdfBusy(null);
      }
    },
    [id, data]
  );

  const openPdf = useCallback(() => {
    void sharePdf(false, pdfUrl);
  }, [sharePdf, pdfUrl]);

  const openPdfVariants = useCallback(() => {
    void sharePdf(true, pdfVariantsUrl);
  }, [sharePdf, pdfVariantsUrl]);

  const openHotelEditor = useCallback(() => {
    if (!hotelEditUrl) return;
    Linking.openURL(hotelEditUrl).catch(() => {
      Alert.alert("Could not open page", "Opening the hotel editor failed.");
    });
  }, [hotelEditUrl]);

  const shareWebLink = useCallback(async () => {
    await handleShareTrip();
  }, [handleShareTrip]);

  const runLifecycle = useCallback(
    async (action: TourQueryLifecycleAction) => {
      if (!id) return;
      const exec = async () => {
        setLifecycleBusy(action);
        try {
          const res = await lifecycleClient.run(id, action);
          setData((prev) =>
            prev
              ? {
                ...prev,
                isFeatured: res.isFeatured,
                isArchived: res.isArchived,
              }
              : null
          );
          const msg =
            action === "confirm"
              ? "Query marked confirmed."
              : action === "unconfirm"
                ? "Query moved to draft."
                : action === "archive"
                  ? "Query archived."
                  : action === "unarchive"
                    ? "Query restored."
                    : "Updated.";
          setSuccessNote(msg);
        } catch (err) {
          const message =
            err instanceof ApiError ? err.message : "Could not update this query.";
          Alert.alert("Update failed", message);
        } finally {
          setLifecycleBusy(null);
        }
      };

      if (action === "archive") {
        Alert.alert(
          "Archive this query?",
          "Archived queries stay out of default lists. You can restore from the archived tab.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Archive", style: "destructive", onPress: () => void exec() },
          ]
        );
        return;
      }
      if (action === "unconfirm") {
        Alert.alert(
          "Move query to draft?",
          "Clears confirmation on this query. Sync related inquiry updates on web if needed.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Move to draft", style: "destructive", onPress: () => void exec() },
          ]
        );
        return;
      }
      await exec();
    },
    [id, lifecycleClient]
  );

  const menuSections = useMemo((): TripActionMenuSection[] => {
    if (!data || !id) return [];
    const pk = primaryActionKind(data, canWriteSales);
    const base: TripActionMenuSection[] = [];

    base.push({
      title: "Share",
      rows: [
        {
          id: "pdf-vars",
          label: "PDF with variants",
          icon: "documents-outline",
          testID: "tour-query-web-pdf-variants",
          accessibilityHint:
            "Generates a PDF that includes variants and opens your device share sheet.",
          onPress: openPdfVariants,
          disabled: pdfBusy !== null,
        },
        {
          id: "web-link",
          label: "Web link",
          icon: "globe-outline",
          accessibilityHint: "Shares this query viewer link using the native share sheet.",
          onPress: () => void shareWebLink(),
        },
      ],
    });

    const buildRows: TripMoreActionRow[] = [
      ...(pk !== "variants"
        ? [
            {
              id: "variants-screen",
              label: "Variants",
              icon: "layers-outline" as const,
              testID: "tour-query-variants",
              accessibilityHint: "Opens native variant comparison.",
              onPress: () =>
                router.push(`/admin/tour-queries/${id}/variants` as never),
            },
          ]
        : []),
      ...(pk !== "edit"
        ? [
            {
              id: "edit-screen",
              label: "Edit query",
              icon: "create-outline" as const,
              testID: "tour-query-edit",
              accessibilityHint: "Opens itinerary text and booking fields.",
              onPress: () => router.push(`/admin/tour-queries/${id}/edit` as never),
            },
          ]
        : []),
      ...(canWriteSales
        ? [
            {
              id: "pricing-screen",
              label: "Pricing",
              icon: "calculator-outline" as const,
              testID: "tour-query-pricing",
              accessibilityHint: "Opens native quote pricing rows and total.",
              onPress: () =>
                router.push(`/admin/tour-queries/${id}/pricing` as never),
            },
          ]
        : []),
      {
        id: "hotels-web",
        label: "Hotels (web)",
        icon: "bed-outline",
        testID: "tour-query-web-hotels",
        accessibilityHint:
          "Opens the web admin hotel editor where pricing is rebuilt when needed.",
        onPress: openHotelEditor,
      },
    ];

    base.push({
      title: "Build",
      rows: buildRows,
    });

    base.push({
      title: "Business",
      rows: [
        {
          id: "finance",
          label: "Finance",
          icon: "wallet-outline",
          testID: "tour-query-finance",
          accessibilityHint: "Opens the native finance summary for this query.",
          onPress: () =>
            router.push(`/admin/tour-queries/${id}/finance` as never),
        },
        ...(data.inquiry?.id
          ? [
              {
                id: "inquiry",
                label: "Linked inquiry",
                icon: "document-text-outline" as const,
                testID: "tour-query-open-inquiry",
                onPress: () =>
                  router.push(`/associate/inquiries/${data.inquiry!.id}` as never),
              },
            ]
          : []),
      ],
    });

    if (!canWriteSales) return base;

    const lifecycleRows: TripMoreActionRow[] = data.isArchived
      ? pk === "restore"
        ? []
        : [
            {
              id: "restore",
              label: "Restore query",
              icon: "archive-outline" as const,
              testID: "tour-query-unarchive",
              accessibilityHint: "Unarchives this query so it appears in active lists.",
              onPress: () => void runLifecycle("unarchive"),
              disabled: lifecycleBusy !== null,
            },
          ]
      : [
          ...(!data.isFeatured
            ? [
                {
                  id: "confirm",
                  label: "Mark confirmed",
                  icon: "checkmark-done-outline" as const,
                  testID: "tour-query-confirm",
                  accessibilityHint: "Locks this quote as confirmed for ops and finance.",
                  onPress: () => void runLifecycle("confirm"),
                  disabled: lifecycleBusy !== null,
                },
              ]
            : [
                {
                  id: "unconfirm",
                  label: "Move to draft",
                  icon: "arrow-undo-outline" as const,
                  testID: "tour-query-unconfirm",
                  accessibilityHint: "Clears confirmation on this quote.",
                  onPress: () => void runLifecycle("unconfirm"),
                  destructive: true,
                  disabled: lifecycleBusy !== null,
                },
              ]),
          {
            id: "archive",
            label: "Archive query",
            icon: "archive-outline",
            testID: "tour-query-archive",
            accessibilityHint:
              "Archived queries stay hidden from active work until restored.",
            onPress: () => void runLifecycle("archive"),
            disabled: lifecycleBusy !== null,
          },
        ];

    if (lifecycleRows.length) {
      base.push({
        title: "Status",
        rows: lifecycleRows,
      });
    }

    return base;
  }, [
    data,
    id,
    openPdfVariants,
    openHotelEditor,
    router,
    shareWebLink,
    canWriteSales,
    runLifecycle,
    lifecycleBusy,
    pdfBusy,
  ]);

  if (loading) {
    return (
      <AdminLoadingState label="Loading query…" testID="tq-detail-loading" />
    );
  }

  if (error || !data) {
    return (
      <AdminScreen testID="tq-detail-error">
        <Stack.Screen options={{ title: "Tour Package Query", headerShown: false }} />
        <AdminErrorState
          message={error ?? "Query not found"}
          onRetry={() => void load("initial")}
          testID="tq-detail-error-state"
        />
      </AdminScreen>
    );
  }

  const confirmed = data.isFeatured && !data.isArchived;
  let primary = derivePrimary(data, id!, router, canWriteSales);
  if (primary.key === "restore") {
    primary = {
      key: "restore",
      label: "Restore query",
      run: () => void runLifecycle("unarchive"),
    };
  }
  if (primary.key === "sharePdf") {
    primary = { ...primary, run: () => void openPdf() };
  }
  if (primary.key === "shareTrip") {
    primary = { ...primary, run: () => void handleShareTrip() };
  }

  const primaryShowsSpinner =
    (primary.key === "restore" && lifecycleBusy === "unarchive") ||
    (primary.key === "sharePdf" && pdfBusy === "plain");

  const primaryDisabled =
    (primary.key === "restore" && lifecycleBusy !== null) ||
    (primary.key === "sharePdf" && pdfBusy !== null);

  const primaryIcon: keyof typeof Ionicons.glyphMap =
    primary.key === "variants"
      ? "layers-outline"
      : primary.key === "edit"
        ? "create-outline"
        : primary.key === "shareTrip"
          ? "share-outline"
          : primary.key === "restore"
            ? "archive-outline"
            : "document-outline";

  const r = buildDetailReadinessItems({
    isArchived: data.isArchived,
    customerNumber: data.customerNumber,
    tourStartsFrom: data.tourStartsFrom,
    numAdults: data.numAdults,
    numChild5to12: data.numChild5to12,
    numChild0to5: data.numChild0to5,
    itineraryDayCount: data.itineraries.length,
    totalPrice: data.totalPrice,
    variantCount: data.queryVariantSnapshots.length,
    confirmedVariantId: data.confirmedVariantId,
  });

  const summaryMuted = [data.location?.label, data.tourPackageQueryType, data.tourCategory, data.numDaysNight]
    .filter(Boolean)
    .join(" · ");

  const statusContext = data.isArchived
    ? "Archived queries stay out of active query lists."
    : confirmed
      ? "Confirmed queries are ready for operations and finance follow-up."
      : "Draft queries can still be edited before sharing or confirmation.";

  const itinerarySlice = itineraryExpanded ? data.itineraries : data.itineraries.slice(0, 2);

  const pricingLines: Array<[string, string | null]> = [
    ["Per adult", data.pricePerAdult],
    ["Per child (extra bed)", data.pricePerChildOrExtraBed],
    ["Per child 5-12", data.pricePerChild5to12YearsNoBed],
    ["Per child under 5", data.pricePerChildwithSeatBelow5Years],
  ];
  const visiblePricing = pricingLines.filter(([, v]) => v && String(v).trim());
  const pricingItems = Array.isArray(data.pricingSection)
    ? data.pricingSection.filter((item) =>
        Boolean(
          item &&
            (String(item.name ?? "").trim() ||
              String(item.price ?? "").trim() ||
              String(item.description ?? "").trim())
        )
      )
    : [];
  const pricingItemTotal = pricingItems.reduce((sum, item) => {
    const n = Number.parseFloat(String(item.price ?? ""));
    return Number.isFinite(n) ? sum + n : sum;
  }, 0);
  const policyBlocks = [
    { title: "Inclusions", items: data.inclusionsList },
    { title: "Exclusions", items: data.exclusionsList },
    { title: "Important notes", items: data.importantNotesList },
    { title: "Payment policy", items: data.paymentPolicyList },
    { title: "Cancellation policy", items: data.cancellationPolicyList },
    { title: "Useful tips", items: data.usefulTipList },
    { title: "Airline cancellation", items: data.airlineCancellationPolicyList },
    { title: "Terms and conditions", items: data.termsconditionsList },
    { title: "Kitchen / group", items: data.kitchenGroupPolicyList },
  ].filter((b) => b.items.length > 0);
  const policiesCount = policyBlocks.length;

  return (
    <AdminScreen
      testID="tq-detail-screen"
      bottomInset={Spacing.xl}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void load("refresh")}
          tintColor={Colors.primary}
        />
      }
      contentContainerStyle={styles.scroll}
    >
      <Stack.Screen options={{ title: "Tour Package Query", headerShown: false }} />
      <AdminTopBar
        title={data.tourPackageQueryName?.trim() || "Tour Package Query"}
        subtitle={data.tourPackageQueryNumber ?? undefined}
        onBackPress={() => router.back()}
        testID="tq-detail-header"
        rightSlot={
          <AdminTopBarIconButton
            icon="share-outline"
            label="Share query link"
            hint="Opens the native share sheet with the web viewer link."
            testID="tq-detail-share"
            onPress={handleShareTrip}
          />
        }
      />
        {successNote ? (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success ?? "#16a34a"} />
            <Text style={styles.successBannerText}>{successNote}</Text>
          </View>
        ) : null}

        {/* Trip summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <TripStatusPill isArchived={data.isArchived} isConfirmed={confirmed} />
          </View>
          {summaryMuted ? (
            <Text style={styles.summaryMuted} numberOfLines={2}>
              {summaryMuted}
            </Text>
          ) : null}
          <View style={styles.summaryMetrics}>
            <TripMiniMetric
              label="Travel"
              value={
                data.tourStartsFrom
                  ? `${formatDate(data.tourStartsFrom, { day: "2-digit", month: "short" })} to ${data.tourEndsOn ? formatDate(data.tourEndsOn, { day: "2-digit", month: "short" }) : "..."}`
                  : "Add dates"
              }
            />
            <TripMiniMetric
              label="Pax"
              value={
                data.numAdults
                  ? `${data.numAdults}A${data.numChild5to12 ? ` / ${data.numChild5to12}C` : ""}${data.numChild0to5 ? ` / ${data.numChild0to5}I` : ""}`
                  : "TBD"
              }
            />
            <TripMiniMetric
              label="Total"
              value={hasPositiveTotal(data.totalPrice) ? formatINR(data.totalPrice) : "TBD"}
            />
          </View>
          <Text style={styles.customerEcho} numberOfLines={2}>
            {data.customerName ?? "Customer"}
          </Text>
        </View>

        <TripReadinessBar
          testID="trip-detail-readiness"
          items={r.items}
          summary={data.isArchived ? "Archived" : r.summary}
        />

        <Text style={styles.statusLead}>{statusContext}</Text>

        {/* Primary action */}
        <Pressable
          testID="trip-primary-action"
          accessibilityRole="button"
          accessibilityLabel={primary.label}
          accessibilityHint="Primary next step suggested for this trip."
          disabled={primaryDisabled}
          style={({ pressed }) => [
            styles.primaryCta,
            primaryDisabled ? styles.primaryCtaDisabled : null,
            pressed ? styles.primaryCtaPressed : null,
          ]}
          onPress={() => {
            void primary.run();
          }}
        >
          {primaryShowsSpinner ?
            <ActivityIndicator color="#fff" />
            : (
              <>
                <Ionicons name={primaryIcon} size={18} color="#fff" />
                <Text style={styles.primaryCtaText}>{primary.label}</Text>
              </>
            )}
        </Pressable>

        {/* Secondary row */}
        <View style={styles.secondaryRow}>
          <Pressable
            testID="tour-query-action-call"
            accessibilityRole="button"
            accessibilityLabel="Call customer"
            accessibilityHint="Starts a phone call to the customer number."
            style={styles.secondaryBtn}
            onPress={() => callCustomer(data.customerNumber)}
          >
            <Ionicons name="call-outline" size={18} color={Colors.primary} />
            <Text style={styles.secondaryText}>Call</Text>
          </Pressable>
          <Pressable
            testID="tour-query-action-whatsapp"
            accessibilityRole="button"
            accessibilityLabel="WhatsApp customer"
            accessibilityHint="Opens WhatsApp with the customer number."
            style={styles.secondaryBtn}
            onPress={() => messageOnWhatsApp(data.customerNumber)}
          >
            <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
            <Text style={styles.secondaryText}>WhatsApp</Text>
          </Pressable>
          <Pressable
            testID="tour-query-action-pdf"
            accessibilityRole="button"
            accessibilityLabel="Share PDF"
            accessibilityHint="Generates the trip PDF and opens the share sheet."
            style={styles.secondaryBtn}
            disabled={pdfBusy !== null}
            onPress={openPdf}
          >
            {pdfBusy === "plain" ?
              <ActivityIndicator size="small" color={Colors.primary} />
              : <Ionicons name="document-outline" size={18} color={Colors.primary} />}
            <Text style={styles.secondaryText}>PDF</Text>
          </Pressable>
          <Pressable
            testID="trip-more-actions"
            accessibilityRole="button"
            accessibilityLabel={moreOpen ? "Hide more actions" : "More actions"}
            accessibilityHint="Shows grouped share, build, business, and status actions."
            style={[styles.secondaryBtn, moreOpen ? styles.secondaryBtnActive : null]}
            onPress={() => setMoreOpen((v) => !v)}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color={Colors.primary} />
            <Text style={styles.secondaryText}>More</Text>
          </Pressable>
        </View>

        <TripActionMenu
          expanded={moreOpen}
          onExpandedChange={setMoreOpen}
          sections={menuSections}
          omitToggle
        />

        {/* Customer */}
        <Section title="Customer">
          <Row label="Name" value={data.customerName ?? "—"} />
          <View style={styles.phoneRow}>
            <View style={styles.phoneRowText}>
              <Text style={styles.kvLabel}>Phone</Text>
              <Text style={styles.kvValue}>{data.customerNumber ?? "—"}</Text>
            </View>
            <View style={styles.phoneActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Call customer"
                accessibilityHint="Starts a phone call."
                style={styles.inlineIcon}
                onPress={() => callCustomer(data.customerNumber)}
              >
                <Ionicons name="call-outline" size={18} color={Colors.primary} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="WhatsApp customer"
                accessibilityHint="Opens WhatsApp."
                style={styles.inlineIcon}
                onPress={() => messageOnWhatsApp(data.customerNumber)}
              >
                <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
              </Pressable>
            </View>
          </View>
          {data.location?.label ? <Row label="Destination" value={data.location.label} /> : null}
          {data.associatePartner?.name ? (
            <Row label="Associate" value={data.associatePartner.name} />
          ) : null}
          {data.assignedTo ? <Row label="Assigned to" value={data.assignedTo} /> : null}
          {data.inquiry?.id ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open linked inquiry"
              accessibilityHint="Opens the inquiry linked to this trip."
              style={styles.inquiryLink}
              onPress={() =>
                router.push(`/associate/inquiries/${data.inquiry!.id}` as never)
              }
            >
              <Text style={styles.inquiryLinkText}>Linked inquiry</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
            </Pressable>
          ) : null}
        </Section>

        {/* Itinerary */}
        {data.itineraries.length ?
          (
            <View style={styles.section}>
              <Pressable
                testID="trip-section-itinerary-toggle"
                accessibilityRole="button"
                accessibilityLabel={
                  itineraryExpanded ? "Show fewer itinerary days" : "Show all itinerary days"
                }
                style={styles.sectionHeaderPress}
                onPress={() => setItineraryExpanded((v) => !v)}
              >
                <Text style={styles.sectionTitle}>
                  Itinerary · {data.itineraries.length} days
                </Text>
                <Ionicons
                  name={itineraryExpanded ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={Colors.textTertiary}
                />
              </Pressable>
              <View style={styles.sectionBody}>
                {itinerarySlice.map((it) => (
                  <View key={it.id} style={styles.dayCard}>
                    <View style={styles.dayHead}>
                      <View style={styles.dayBadge}>
                        <Text style={styles.dayBadgeText}>D{it.dayNumber ?? "?"}</Text>
                      </View>
                      <Text style={styles.dayTitle} numberOfLines={2}>
                        {stripHtml(it.itineraryTitle ?? "Untitled")}
                      </Text>
                    </View>
                    {it.hotel?.name ?
                      (
                        <View style={styles.miniRow}>
                          <Ionicons name="bed-outline" size={14} color={Colors.textSecondary} />
                          <Text style={styles.miniRowText}>{it.hotel.name}</Text>
                        </View>
                      )
                      : null}
                    {buildTransportSummary(it.transportDetails) ?
                      (
                        <View style={styles.miniRow}>
                          <Ionicons name="car-outline" size={14} color={Colors.textSecondary} />
                          <Text style={styles.miniRowText}>
                            {buildTransportSummary(it.transportDetails)}
                          </Text>
                        </View>
                      )
                      : null}
                    {it.mealsIncluded ?
                      (
                        <View style={styles.miniRow}>
                          <Ionicons name="restaurant-outline" size={14} color={Colors.textSecondary} />
                          <Text style={styles.miniRowText}>{it.mealsIncluded}</Text>
                        </View>
                      )
                      : null}
                    {it.roomAllocations.length ?
                      it.roomAllocations.map((r) => (
                        <View key={r.id} style={styles.miniRow}>
                          <Ionicons name="people-outline" size={14} color={Colors.textSecondary} />
                          <Text style={styles.miniRowText}>{buildRoomLabel(r)}</Text>
                        </View>
                      ))
                      : null}
                    {it.itineraryDescription ?
                      (
                        <CollapsibleDayDescription text={stripHtml(it.itineraryDescription)} />
                      )
                      : null}
                  </View>
                ))}
                {data.itineraries.length > 2 && !itineraryExpanded ?
                  (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Show all itinerary days"
                      style={styles.showAllPress}
                      onPress={() => setItineraryExpanded(true)}
                    >
                      <Text style={styles.showAllText}>Show all days</Text>
                    </Pressable>
                  )
                  : null}
              </View>
            </View>
          )
          : null}

        {/* Pricing */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderInline}>
            <Text style={styles.sectionTitle}>Pricing</Text>
            {canWriteSales ? (
              <Pressable
                testID="tour-query-pricing-edit"
                accessibilityRole="button"
                accessibilityLabel="Edit pricing"
                accessibilityHint="Opens native quote pricing rows and total."
                style={styles.sectionHeaderAction}
                onPress={() => router.push(`/admin/tour-queries/${id}/pricing` as never)}
              >
                <Ionicons name="calculator-outline" size={15} color={Colors.primary} />
                <Text style={styles.sectionHeaderActionText}>Edit</Text>
              </Pressable>
            ) : null}
          </View>
          <View style={styles.sectionBody}>
            <Text style={styles.pricingTotal}>
              {hasPositiveTotal(data.totalPrice) ? formatINR(data.totalPrice) : "No total yet"}
            </Text>
            <Text style={styles.pricingNote}>
              {hasPositiveTotal(data.totalPrice)
                ? pricingMethodLabel(data.pricingCalculationMethod)
                : "No pricing yet"}
            </Text>
            {pricingItems.length ? (
              <View style={styles.pricingItems}>
                {pricingItems.map((item, index) => (
                  <View key={`pricing-item-${index}`} style={styles.pricingItemRow}>
                    <View style={styles.pricingItemText}>
                      <Text style={styles.pricingItemName} numberOfLines={1}>
                        {item.name || "Pricing item"}
                      </Text>
                      {item.description ? (
                        <Text style={styles.pricingItemDescription} numberOfLines={2}>
                          {item.description}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={styles.pricingItemPrice}>{formatINR(item.price)}</Text>
                  </View>
                ))}
                {!hasPositiveTotal(data.totalPrice) && pricingItemTotal > 0 ? (
                  <Text style={styles.pricingNote}>
                    Item total {formatINR(pricingItemTotal)}
                  </Text>
                ) : null}
              </View>
            ) : null}
            {data.price ?
              <Text style={styles.priceSummaryLine} numberOfLines={3}>
                {data.price}
              </Text>
              : null}
            {visiblePricing.map(([label, value]) => (
              <View key={label} style={styles.perPersonRow}>
                <Text style={styles.perPersonLabel}>{label}</Text>
                <Text style={styles.perPersonValue}>{formatINR(value)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Variants */}
        {data.queryVariantSnapshots.length ?
          (
            <Section title={`Variants · ${data.queryVariantSnapshots.length}`}>
              {data.queryVariantSnapshots.map((v) => {
                const isSel =
                  data.confirmedVariantId === v.sourceVariantId ||
                  data.confirmedVariantId === v.id;
                return (
                  <View key={v.id} style={styles.variantRow}>
                    <Ionicons
                      name={isSel ? "checkmark-circle" : "ellipse-outline"}
                      size={16}
                      color={isSel ? (Colors.success ?? "#16a34a") : Colors.textTertiary}
                    />
                    <Text style={styles.variantName}>{v.name}</Text>
                  </View>
                );
              })}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open variant comparison"
                accessibilityHint="Opens side-by-side variant pricing."
                style={styles.linkish}
                onPress={() => router.push(`/admin/tour-queries/${id}/variants` as never)}
              >
                <Text style={styles.linkishText}>Compare pricing</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
              </Pressable>
            </Section>
          )
          : null}

        {/* Flights (collapsed) */}
        {data.flightDetails.length ?
          (
            <View style={styles.section}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={flightsOpen ? "Hide flights" : "Show flights"}
                style={styles.sectionHeaderPress}
                onPress={() => setFlightsOpen((v) => !v)}
              >
                <Text style={styles.sectionTitle}>Flights · {data.flightDetails.length}</Text>
                <Ionicons
                  name={flightsOpen ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={Colors.textTertiary}
                />
              </Pressable>
              {flightsOpen ?
                (
                  <View style={styles.sectionBody}>
                    {data.flightDetails.map((f) => (
                      <View key={f.id} style={styles.flightCard}>
                        <Text style={styles.flightHead}>
                          {f.flightName ?? ""}
                          {f.flightNumber ? ` · ${f.flightNumber}` : ""}
                        </Text>
                        <Text style={styles.flightRoute}>
                          {f.from ?? "—"} to {f.to ?? "—"}
                        </Text>
                        <Text style={styles.flightMeta}>
                          {formatDate(f.date)}
                          {f.departureTime ? ` · ${f.departureTime}` : ""}
                          {f.arrivalTime ? ` to ${f.arrivalTime}` : ""}
                          {f.flightDuration ? ` · ${f.flightDuration}` : ""}
                        </Text>
                      </View>
                    ))}
                  </View>
                )
                : null}
            </View>
          )
          : null}

        {/* Policies aggregate */}
        {policiesCount ?
          (
            <View style={styles.section}>
              <Pressable
                testID="trip-section-policies-toggle"
                accessibilityRole="button"
                accessibilityLabel={
                  policiesOpen ? "Hide policy sections" : `Show ${policiesCount} policy sections`
                }
                style={styles.sectionHeaderPress}
                onPress={() => setPoliciesOpen((v) => !v)}
              >
                <Text style={styles.sectionTitle}>Policies · {policiesCount} sections</Text>
                <Ionicons
                  name={policiesOpen ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={Colors.textTertiary}
                />
              </Pressable>
              {policiesOpen ?
                (
                  <View style={styles.sectionBody}>
                    {policyBlocks.map((b) => (
                      <View key={b.title} style={styles.policySub}>
                        <Text style={styles.policySubTitle}>
                          {b.title} · {b.items.length} lines
                        </Text>
                        {b.items.map((item, i) => (
                          <View key={`${b.title}-${i}`} style={styles.bulletRow}>
                            <Text style={styles.bulletDot}>·</Text>
                            <Text style={styles.bulletText}>
                              {item.replace(/<[^>]+>/g, "")}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>
                )
                : null}
            </View>
          )
          : null}

        {data.remarks ?
          (
            <Section title="Remarks">
              <Text style={styles.bodyText}>{data.remarks}</Text>
            </Section>
          )
          : null}

        <Text style={styles.metaFoot}>
          Updated {formatDate(data.updatedAt)} · Created {formatDate(data.createdAt)}
        </Text>
    </AdminScreen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitleStatic}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text style={styles.kvValue} numberOfLines={3}>
        {value}
      </Text>
    </View>
  );
}

function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function CollapsibleDayDescription({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  if (!text.trim()) return null;
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={open ? "Hide day details" : "View day details"}
        style={styles.dayDescToggle}
        onPress={() => setOpen((v) => !v)}
      >
        <Text style={styles.dayDescToggleText}>{open ? "Hide details" : "View details"}</Text>
      </Pressable>
      {open ?
        <Text style={styles.dayDescriptionFull}>{text}</Text>
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
    backgroundColor: Colors.background,
  },
  headerIconMirror: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { paddingHorizontal: Spacing.lg },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: "#ecfdf5",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  successBannerText: { flex: 1, fontSize: FontSize.sm, fontWeight: "700", color: Colors.text },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
    shadowOpacity: 0,
    elevation: 0,
  },
  summaryTop: { flexDirection: "row", alignItems: "center" },
  summaryMuted: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: "600",
    lineHeight: 18,
  },
  summaryMetrics: { flexDirection: "row", gap: Spacing.xs },
  customerEcho: { fontSize: FontSize.sm, fontWeight: "800", color: Colors.text },
  statusLead: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: "600",
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  primaryCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
  },
  primaryCtaDisabled: { opacity: 0.55 },
  primaryCtaPressed: { opacity: 0.88 },
  primaryCtaText: { color: "#fff", fontSize: FontSize.md, fontWeight: "800" },
  secondaryRow: { flexDirection: "row", gap: Spacing.xs, marginBottom: Spacing.sm },
  secondaryBtn: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    minWidth: 0,
  },
  secondaryBtnActive: {
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.primaryBg,
  },
  secondaryText: { fontSize: 10, fontWeight: "800", color: Colors.text },
  section: { marginBottom: Spacing.md },
  sectionHeaderPress: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
    paddingHorizontal: 2,
  },
  sectionHeaderInline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    paddingHorizontal: 2,
  },
  sectionHeaderAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: BorderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  sectionHeaderActionText: {
    fontSize: FontSize.xs,
    fontWeight: "900",
    color: Colors.primary,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: "900",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    flex: 1,
  },
  sectionTitleStatic: {
    fontSize: FontSize.xs,
    fontWeight: "900",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: Spacing.sm,
    marginLeft: 4,
  },
  sectionBody: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
    gap: 8,
    shadowOpacity: 0,
    elevation: 0,
  },
  kvRow: { flexDirection: "row", justifyContent: "space-between", gap: Spacing.md },
  kvLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, flexShrink: 0 },
  kvValue: {
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: "700",
    flex: 1,
    textAlign: "right",
  },
  phoneRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Spacing.md },
  phoneRowText: { flex: 1 },
  phoneActions: { flexDirection: "row", gap: Spacing.xs },
  inlineIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
  inquiryLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderSubtle,
  },
  inquiryLinkText: { fontSize: FontSize.sm, fontWeight: "800", color: Colors.primary },
  dayCard: {
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    gap: 6,
  },
  dayHead: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  dayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
  },
  dayBadgeText: { color: "#fff", fontSize: FontSize.xs, fontWeight: "900" },
  dayTitle: { flex: 1, fontSize: FontSize.sm, fontWeight: "800", color: Colors.text },
  miniRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  miniRowText: { fontSize: FontSize.xs, color: Colors.textSecondary, flex: 1, lineHeight: 18 },
  dayDescToggle: { alignSelf: "flex-start", paddingVertical: 4 },
  dayDescToggleText: { fontSize: FontSize.xs, fontWeight: "800", color: Colors.primary },
  dayDescriptionFull: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
  showAllPress: { paddingVertical: Spacing.sm, alignItems: "center" },
  showAllText: { fontSize: FontSize.sm, fontWeight: "800", color: Colors.primary },
  pricingTotal: { fontSize: FontSize.xxl, fontWeight: "900", color: Colors.text },
  pricingNote: { fontSize: FontSize.xs, fontWeight: "700", color: Colors.textTertiary },
  pricingItems: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderSubtle,
    paddingTop: Spacing.sm,
    gap: Spacing.xs,
  },
  pricingItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  pricingItemText: { flex: 1, minWidth: 0 },
  pricingItemName: { fontSize: FontSize.sm, fontWeight: "800", color: Colors.text },
  pricingItemDescription: {
    marginTop: 2,
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    lineHeight: 16,
  },
  pricingItemPrice: {
    flexShrink: 0,
    fontSize: FontSize.sm,
    fontWeight: "900",
    color: Colors.text,
  },
  priceSummaryLine: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
  perPersonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.md,
    paddingVertical: 2,
  },
  perPersonLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, flex: 1 },
  perPersonValue: { fontSize: FontSize.sm, fontWeight: "700", color: Colors.text },
  variantRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  variantName: { fontSize: FontSize.sm, color: Colors.text, fontWeight: "700" },
  linkish: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderSubtle,
  },
  linkishText: { fontSize: FontSize.sm, fontWeight: "800", color: Colors.primary },
  flightCard: {
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    gap: 2,
  },
  flightHead: { fontSize: FontSize.sm, fontWeight: "800", color: Colors.text },
  flightRoute: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: "700" },
  flightMeta: { fontSize: FontSize.xs, color: Colors.textTertiary },
  policySub: { gap: 6, paddingBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle },
  policySubTitle: {
    fontSize: FontSize.xs,
    fontWeight: "800",
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  bulletRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  bulletDot: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20 },
  bulletText: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
  bodyText: { fontSize: FontSize.sm, color: Colors.text, lineHeight: 20 },
  metaFoot: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    textAlign: "center",
    marginTop: Spacing.lg,
  },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: "800", color: Colors.text },
  primaryBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
  },
  primaryBtnText: { color: "#fff", fontSize: FontSize.sm, fontWeight: "800" },
});
