import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { Colors } from "@/constants/theme";
import { ApiError, withAuth } from "@/lib/api";
import { cache } from "@/lib/cache";

const RECENT_KEY = "wa_recent_templates";
const RECENT_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

interface Template {
  id: string;
  name: string;
  language: string;
  status: string;
  category: string | null;
  components?: { type: string; text?: string; format?: string }[] | null;
  qualityScore: string | null;
}

interface TemplatesResponse {
  items: Template[];
  fetchedAt: number;
  notModified: boolean;
}

const CATEGORY_FILTERS: ("ALL" | "MARKETING" | "UTILITY" | "AUTHENTICATION")[] = [
  "ALL",
  "MARKETING",
  "UTILITY",
  "AUTHENTICATION",
];

function pickBodyText(t: Template): string {
  const body = t.components?.find((c) => (c.type ?? "").toUpperCase() === "BODY");
  return body?.text ?? "";
}

export default function WhatsAppTemplateList() {
  const params = useLocalSearchParams<{ phone?: string; return?: string }>();
  const phone = params.phone ? decodeURIComponent(params.phone) : null;
  const router = useRouter();
  const navigation = useNavigation();
  const { getToken } = useAuth();
  const api = useRef(withAuth(getToken)).current;

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] =
    useState<(typeof CATEGORY_FILTERS)[number]>("ALL");
  const [recentNames, setRecentNames] = useState<string[]>([]);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: "Send a template",
      headerBackTitle: phone ? "Chat" : "Back",
      headerRight: () =>
        phone ? null : (
          <TouchableOpacity
            testID="wa-templates-new"
            accessibilityRole="button"
            accessibilityLabel="Create template"
            onPress={() => router.push("/whatsapp/templates/new")}
            style={{ paddingHorizontal: 12 }}
          >
            <Ionicons name="add" size={26} color="#25D366" />
          </TouchableOpacity>
        ),
    });
  }, [navigation, phone, router]);

  const fetchTemplates = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) setLoading(true);
      try {
        const data = await api<TemplatesResponse>(
          "/api/mobile/whatsapp/templates",
        );
        setTemplates(data.items ?? []);
      } catch (error) {
        const message =
          error instanceof ApiError ? error.message : "Could not load templates.";
        Alert.alert("WhatsApp", message);
      } finally {
        if (!silent) setLoading(false);
        setRefreshing(false);
      }
    },
    [api],
  );

  useFocusEffect(
    useCallback(() => {
      fetchTemplates();
      void cache.get<string[]>(RECENT_KEY).then((stored) => {
        if (Array.isArray(stored)) setRecentNames(stored);
      });
    }, [fetchTemplates]),
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((t) => {
      if (category !== "ALL") {
        if ((t.category ?? "").toUpperCase() !== category) return false;
      }
      if (!q) return true;
      const body = pickBodyText(t).toLowerCase();
      return t.name.toLowerCase().includes(q) || body.includes(q);
    });
  }, [templates, search, category]);

  // Pin recently-used templates that match the active filter to the top.
  const sectioned = useMemo(() => {
    if (recentNames.length === 0) return { recent: [], rest: visible };
    const byName = new Map(visible.map((t) => [t.name, t]));
    const recent: Template[] = [];
    const seen = new Set<string>();
    for (const name of recentNames) {
      const t = byName.get(name);
      if (t && !seen.has(name)) {
        recent.push(t);
        seen.add(name);
      }
    }
    const rest = visible.filter((t) => !seen.has(t.name));
    return { recent, rest };
  }, [visible, recentNames]);

  function openTemplate(template: Template) {
    // Templates are unique by (name, language); pass `lang` so the detail
    // screen loads the exact variant the user picked.
    const langQuery = `lang=${encodeURIComponent(template.language)}`;
    if (phone) {
      router.push(
        `/whatsapp/templates/${encodeURIComponent(template.name)}?${langQuery}&phone=${encodeURIComponent(phone)}&return=${params.return ?? ""}`,
      );
    } else {
      router.push(
        `/whatsapp/templates/${encodeURIComponent(template.name)}?${langQuery}`,
      );
    }
  }

  if (loading) {
    return (
      <View style={styles.center} testID="wa-templates-loading">
        <ActivityIndicator size="large" color="#25D366" />
      </View>
    );
  }

  type Row =
    | { kind: "header"; label: string }
    | { kind: "item"; t: Template };
  const sections: Row[] = [];
  if (sectioned.recent.length > 0) {
    sections.push({ kind: "header", label: "Recently used" });
    for (const t of sectioned.recent) sections.push({ kind: "item", t });
    sections.push({ kind: "header", label: "All templates" });
  }
  for (const t of sectioned.rest) sections.push({ kind: "item", t });

  const pillStyle = (cat: string | null) => {
    const c = (cat ?? "").toUpperCase();
    if (c === "MARKETING") return styles.pill_MARKETING;
    if (c === "UTILITY") return styles.pill_UTILITY;
    if (c === "AUTHENTICATION") return styles.pill_AUTHENTICATION;
    return null;
  };

  return (
    <View style={styles.container}>
      {phone ? (
        <View style={styles.contextBanner}>
          <Ionicons name="logo-whatsapp" size={14} color="#25D366" />
          <Text style={styles.contextText} numberOfLines={1}>
            Sending to {phone}
          </Text>
        </View>
      ) : null}

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={Colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search templates"
          placeholderTextColor={Colors.textTertiary}
          accessibilityLabel="Search templates"
          testID="wa-templates-search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")} hitSlop={6}>
            <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.chipRow}>
        {CATEGORY_FILTERS.map((c) => {
          const active = category === c;
          return (
            <TouchableOpacity
              key={c}
              onPress={() => setCategory(c)}
              style={[styles.chip, active && styles.chipActive]}
              accessibilityRole="button"
              accessibilityLabel={`Filter ${c}`}
              accessibilityState={{ selected: active }}
              testID={`wa-templates-chip-${c}`}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {c.charAt(0) + c.slice(1).toLowerCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={sections}
        keyExtractor={(item, idx) =>
          item.kind === "header" ? `h-${item.label}-${idx}` : `t-${item.t.id}`
        }
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          fetchTemplates({ silent: true });
        }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="document-text-outline" size={42} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>No matching templates.</Text>
          </View>
        }
        renderItem={({ item }) => {
          if (item.kind === "header") {
            return <Text style={styles.section}>{item.label}</Text>;
          }
          const t = item.t;
          const body = pickBodyText(t);
          return (
            <TouchableOpacity
              style={styles.row}
              onPress={() => openTemplate(t)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Send template ${t.name}`}
              testID={`wa-template-${t.name}`}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{t.name}</Text>
                <Text style={styles.rowBody} numberOfLines={2}>
                  {body || "—"}
                </Text>
                <View style={styles.rowMeta}>
                  {t.category ? (
                    <View style={[styles.metaPill, pillStyle(t.category)]}>
                      <Text style={styles.metaPillText}>{t.category}</Text>
                    </View>
                  ) : null}
                  <Text style={styles.metaLang}>{t.language}</Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={Colors.textTertiary}
              />
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

/** Persist a template name as recently used. Call after a successful send. */
export async function pushRecentTemplate(name: string): Promise<void> {
  try {
    const stored = (await cache.get<string[]>(RECENT_KEY)) ?? [];
    const next = [name, ...stored.filter((n) => n !== name)].slice(0, 8);
    await cache.set(RECENT_KEY, next, RECENT_TTL_SECONDS);
  } catch {
    /* best effort */
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  contextBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#E0F7E9",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#A7E5BC",
  },
  contextText: { fontSize: 13, color: "#075E54", fontWeight: "600" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.border,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: Colors.text },
  chipRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
  },
  chipActive: { backgroundColor: "#25D366" },
  chipText: { fontSize: 12, color: Colors.text, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    backgroundColor: Colors.background,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  rowName: { fontSize: 15, fontWeight: "700", color: Colors.text },
  rowBody: { fontSize: 13, color: Colors.textTertiary, marginTop: 4 },
  rowMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  metaPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "#E2E8F0",
  },
  pill_MARKETING: { backgroundColor: "#FEF3C7" },
  pill_UTILITY: { backgroundColor: "#DBEAFE" },
  pill_AUTHENTICATION: { backgroundColor: "#E0E7FF" },
  metaPillText: { fontSize: 10, fontWeight: "700", color: Colors.text },
  metaLang: { fontSize: 11, color: Colors.textTertiary },
  emptyWrap: { alignItems: "center", padding: 40, gap: 12 },
  emptyText: { fontSize: 14, color: Colors.textTertiary, textAlign: "center" },
});
