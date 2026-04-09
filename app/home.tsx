import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../services/supabase";
type SideStatus = "partial" | "pending" | "returned" | "non-returnable";

type DCItem = {
  id: string;
  dcNumber: string;
  fromTo: string;
  detail: string;
  address?: string;
  topBanner?: "overdue";
  sideStatus: SideStatus;
  isReturnable: boolean;
};

type DCRow = Record<string, unknown>;

function normalizeSideStatus(raw: unknown, isReturnable: boolean): SideStatus {
  const value = String(raw || "").toLowerCase();

  if (!isReturnable) return "non-returnable";

  if (value === "partial") return "partial";
  if (value === "returned") return "returned";

  return "pending";
}
function rowToDCItem(row: DCRow): DCItem {
  const id = String(row.id ?? "");
  const fromName = String(row.from_details ?? "");
  const toName = String(row.to_details ?? "");
  const items = row.items as any[];

  const itemText =
    items && items.length > 0
      ? `${items[0].part_name} (${items[0].quantity})`
      : "No items";
  const dcNum =
    typeof row.dc_number === "string" && row.dc_number
      ? row.dc_number
      : `DC #${id}`;
  const isReturnable = Boolean(row.is_returnable);
  return {
    id,
    dcNumber: dcNum,
    fromTo: `${fromName} → ${toName}`,
    detail: itemText,
    address: typeof row.address === "string" ? row.address : undefined,

    sideStatus: normalizeSideStatus(row.side_status, isReturnable),
    isReturnable,
  };
}

function matchesSearch(item: DCItem, q: string) {
  if (!q.trim()) return true;
  const s = q.trim().toLowerCase();
  return (
    item.dcNumber.toLowerCase().includes(s) ||
    item.fromTo.toLowerCase().includes(s) ||
    item.detail.toLowerCase().includes(s) ||
    (item.address?.toLowerCase().includes(s) ?? false)
  );
}

function SideStatusChip({
  status,
  isReturnable,
}: {
  status: SideStatus;
  isReturnable: boolean;
}) {
  let config: {
    label: string;
    textColor: string;
    bgColor: string;
  };

  if (!isReturnable) {
    config = {
      label: "Non-Returnable",
      textColor: "#475569",
      bgColor: "#e2e8f0",
    };
  } else {
    if (status === "partial") {
      config = {
        label: "Partial",
        textColor: "#7c3aed",
        bgColor: "#ede9fe",
      };
    } else if (status === "returned") {
      config = {
        label: "Returned",
        textColor: "#16a34a",
        bgColor: "#dcfce7",
      };
    } else {
      config = {
        label: "Pending",
        textColor: "#0284c7",
        bgColor: "#e0f2fe",
      };
    }
  }

  return (
    <View style={[styles.sideChip, { backgroundColor: config.bgColor }]}>
      <Text style={[styles.sideChipText, { color: config.textColor }]}>
        {config.label}
      </Text>
    </View>
  );
}
const router = useRouter();

function DCCard({
  item,
  onUpdateStatus,
  router,
  onDelete,
}: {
  item: DCItem;
  router: any;
  onUpdateStatus: (id: string, status: SideStatus) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/dc-details?id=${item.id}`)}
    >
      {item.topBanner ? (
        <View style={styles.overdueBanner}>
          <Text style={styles.overdueBannerText}>Overdue</Text>
        </View>
      ) : null}
      <View style={styles.cardTopRow}>
        <Text style={styles.dcNumber}>{item.dcNumber}</Text>
        <SideStatusChip
          status={item.sideStatus}
          isReturnable={item.isReturnable}
        />
      </View>
      <View style={styles.routeRow}>
        <Ionicons name="swap-horizontal" size={16} color="#64748b" />
        <Text style={styles.routeText}>{item.fromTo}</Text>
      </View>
      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={16} color="#94a3b8" />
        <Text style={styles.detailText}>{item.detail}</Text>
      </View>
      {item.address ? (
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={16} color="#94a3b8" />
          <Text style={styles.addressText}>{item.address}</Text>
        </View>
      ) : null}
      <Pressable
        onPress={() => onDelete(item.id)}
        style={{
          marginTop: 10,
          backgroundColor: "#ff4444",
          padding: 8,
          borderRadius: 8,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "bold" }}>Delete</Text>
      </Pressable>
      <Pressable
        onPress={() =>
          router.push({
            pathname: "/create-dc",
            params: { editData: JSON.stringify(item) },
          })
        }
        style={{
          marginTop: 10,
          backgroundColor: "#2196F3",
          padding: 8,
          borderRadius: 8,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "bold" }}>Edit</Text>
      </Pressable>
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const [dcs, setDcs] = useState<DCRow[]>([]);
  const [search, setSearch] = useState("");

  const allItems = useMemo((): DCItem[] => {
    return dcs.map(rowToDCItem);
  }, [dcs]);

  const filteredItems = useMemo(
    () => allItems.filter((d) => matchesSearch(d, search)),
    [allItems, search],
  );

  const nonReturnableDCs = useMemo(
    () => filteredItems.filter((d) => !d.isReturnable),
    [filteredItems],
  );
  const returnableDCs = useMemo(
    () => filteredItems.filter((d) => d.isReturnable),
    [filteredItems],
  );

  const pendingDCs = useMemo(
    () => returnableDCs.filter((d) => d.sideStatus === "pending"),
    [returnableDCs],
  );
  const partialDCs = useMemo(
    () => returnableDCs.filter((d) => d.sideStatus === "partial"),
    [returnableDCs],
  );
  const returnedDCs = useMemo(
    () => returnableDCs.filter((d) => d.sideStatus === "returned"),
    [returnableDCs],
  );

  const fetchDCs = async () => {
    const { data, error } = await supabase.from("delivery_challans").select(`
      *,
      items (
        part_name,
        quantity
      )
    `);
    if (error) {
      console.log(error);
    } else if (data) {
      setDcs(data as DCRow[]);
    }
  };

  useEffect(() => {
    fetchDCs();
  }, []);

  const leaveToLogin = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };
  const updateStatus = async (id: string, newStatus: SideStatus) => {
    const { error } = await supabase
      .from("delivery_challans")
      .update({ side_status: newStatus })
      .eq("id", id);

    if (error) {
      console.log(error);
    } else {
      fetchDCs();
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert("Confirm", "Delete this DC?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from("delivery_challans")
            .delete()
            .eq("id", id);

          if (error) {
            alert(error.message);
          } else {
            fetchDCs();
          }
        },
      },
    ]);
  };
  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "bottom", "left", "right"]}
    >
      <View style={styles.body}>
        <View style={styles.header}>
          <Pressable onPress={leaveToLogin} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={28} color="#64748b" />
          </Pressable>
          <Text style={styles.headerTitle}>Dashboard</Text>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color="#94a3b8" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search DCs..."
              placeholderTextColor="#94a3b8"
              style={styles.searchInput}
            />
          </View>
        </View>

        <View style={styles.listOuter}>
          <ScrollView
            style={styles.listScroll}
            contentContainerStyle={styles.listContent}
          >
            <View style={styles.sectionBlock}>
              <Text style={styles.mainSectionTitle}>Non-Returnable DCs</Text>
              <View style={styles.cardsStack}>
                {nonReturnableDCs.length === 0 ? (
                  <Text style={styles.empty}>No Non-Returnable DCs</Text>
                ) : (
                  nonReturnableDCs.map((item) => (
                    <DCCard
                      key={item.id}
                      item={item}
                      router={router}
                      onUpdateStatus={updateStatus}
                      onDelete={handleDelete}
                    />
                  ))
                )}
              </View>
            </View>

            <View style={styles.sectionBlock}>
              <Text style={styles.mainSectionTitle}>Returnable DCs</Text>

              <View style={styles.subSectionBlock}>
                <Text style={styles.subSectionTitle}>Pending</Text>
                <View style={styles.cardsStack}>
                  {pendingDCs.length === 0 ? (
                    <Text style={styles.empty}>No Pending DCs</Text>
                  ) : (
                    pendingDCs.map((item) => (
                      <DCCard
                        key={item.id}
                        item={item}
                        router={router}
                        onUpdateStatus={updateStatus}
                        onDelete={handleDelete}
                      />
                    ))
                  )}
                </View>
              </View>

              <View style={styles.subSectionBlock}>
                <Text style={styles.subSectionTitle}>Partial</Text>
                <View style={styles.cardsStack}>
                  {partialDCs.length === 0 ? (
                    <Text style={styles.empty}>No Partial DCs</Text>
                  ) : (
                    partialDCs.map((item) => (
                      <DCCard
                        key={item.id}
                        item={item}
                        router={router}
                        onUpdateStatus={updateStatus}
                        onDelete={handleDelete}
                      />
                    ))
                  )}
                </View>
              </View>

              <View style={styles.subSectionBlock}>
                <Text style={styles.subSectionTitle}>Returned</Text>
                <View style={styles.cardsStack}>
                  {returnedDCs.length === 0 ? (
                    <Text style={styles.empty}>No Returned DCs</Text>
                  ) : (
                    returnedDCs.map((item) => (
                      <DCCard
                        key={item.id}
                        item={item}
                        router={router}
                        onUpdateStatus={updateStatus}
                        onDelete={handleDelete}
                      />
                    ))
                  )}
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>

      <Pressable style={styles.fab} onPress={() => router.push("/create-dc")}>
        <Text style={styles.fabPlus}>+</Text>
      </Pressable>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFDBBB",
  },
  body: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 8,
    gap: 4,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ff6600",
    letterSpacing: -0.5,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#0f172a",
    paddingVertical: 0,
  },
  mainSectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ff6600",
    marginBottom: 12,
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 10,
  },
  listOuter: {
    flex: 1,
    minHeight: 0,
  },
  listScroll: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 96,
    gap: 24,
  },
  sectionBlock: {
    backgroundColor: "#fff7ef",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#ffe7d1",
  },
  subSectionBlock: {
    marginTop: 14,
  },
  cardsStack: {
    gap: 12,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    borderWidth: 0,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 3,
    gap: 10,
  },
  overdueBanner: {
    alignSelf: "flex-start",
    backgroundColor: "#ff6600",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  overdueBannerText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  dcNumber: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
    flex: 1,
  },
  sideChip: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 110,
  },
  sideChipText: {
    fontSize: 13,
    fontWeight: "700",
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  routeText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#334155",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  detailText: {
    flex: 1,
    fontSize: 14,
    color: "#94a3b8",
    lineHeight: 24,
  },
  addressText: {
    flex: 1,
    fontSize: 13,
    color: "#94a3b8",
  },
  empty: {
    textAlign: "left",
    color: "#94a3b8",
    fontSize: 14,
    paddingVertical: 8,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#ff6600",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 10,
  },
  fabPlus: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "bold",
    lineHeight: 34,
  },
});
