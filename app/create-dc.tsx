import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  pickImageFromCamera,
  pickImageFromGallery,
  scanImageAndFillFields,
} from "../services/gemini";
import { supabase } from "../services/supabase";
export default function CreateDCScreen() {
  const router = useRouter();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [partName, setPartName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [detectedStatus, setDetectedStatus] = useState("pending");
  const [isReturnable, setIsReturnable] = useState(false);
  const params = useLocalSearchParams();
  const editData = params.editData
    ? JSON.parse(params.editData as string)
    : null;

  useEffect(() => {
    if (editData) {
      const [fromText, toText] = editData.fromTo.split(" → ");

      setFrom(fromText || "");
      setTo(toText || "");
      setPartName(editData.detail?.split(" (")[0] || "");
      setQuantity(editData.detail?.match(/\((\d+)\)/)?.[1] || "");
    }
  }, []);
  function normalizeSideStatus(
    status: string,
  ): "pending" | "partial" | "returned" {
    const s = status?.toLowerCase();

    if (s === "returned") return "returned";
    if (s === "partial") return "partial";
    if (s === "pending") return "pending";

    return "pending";
  }
  const processSelectedImage = async (
    source: "camera" | "gallery",
    closePrompt?: () => void,
  ) => {
    try {
      if (closePrompt) closePrompt();
      const asset =
        source === "camera"
          ? await pickImageFromCamera()
          : await pickImageFromGallery();
      if (!asset) return;

      const extracted = await scanImageAndFillFields(asset).catch((err) => {
        console.log("Gemini scan failed:", err);
        return null;
      });
      if (!extracted) {
        Alert.alert(
          "Scan Failed",
          "Unable to process image. Please try again.",
        );
        return;
      }
      if (!from.trim() && extracted.from) setFrom(extracted.from);
      if (!to.trim() && extracted.to) setTo(extracted.to);
      if (!partName.trim() && extracted.item) setPartName(extracted.item);
      if (!quantity.trim() && extracted.quantity)
        setQuantity(extracted.quantity);
      if (!notes.trim() && extracted.notes) setNotes(extracted.notes);
      if (extracted.status) {
        setDetectedStatus(normalizeSideStatus(extracted?.status));
      }
      const hasAny =
        extracted.from ||
        extracted.to ||
        extracted.item ||
        extracted.quantity ||
        extracted.notes ||
        extracted.status;
      if (!hasAny) {
        Alert.alert(
          "No Data",
          "No extractable text found in the selected image.",
        );
      }
    } catch (error) {
      console.log("Scan pipeline error:", error);
      const message =
        error instanceof Error ? error.message : "Image scan processing failed";
      Alert.alert("Scan Error", message);
    }
  };

  const handleScanUpload = () => {
    if (Platform.OS === "web") {
      void processSelectedImage("gallery");
      return;
    }
    Alert.alert("Scan / Upload", "Choose an option", [
      {
        text: "Open Camera",
        onPress: () => void processSelectedImage("camera"),
      },
      {
        text: "Upload from Gallery",
        onPress: () => void processSelectedImage("gallery"),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };
  const handleCreate = async () => {
    const fromText = from.trim();
    const toText = to.trim();

    if (!fromText || !toText) {
      Alert.alert("Missing fields", "Please enter both From and To details.");
      return;
    }
    if (!partName || !quantity) {
      Alert.alert("Missing fields", "Please enter item name and quantity");
      return;
    }
    const payload = {
      dc_number: `DC-${Date.now()}`,
      date: new Date().toISOString(),
      from_details: fromText,
      to_details: toText,
      is_returnable: isReturnable,
      side_status: isReturnable
        ? normalizeSideStatus(detectedStatus)
        : "non-returnable",
    };

    let data, error;
    if (editData) {
      const response = await supabase
        .from("delivery_challans")
        .update(payload)
        .eq("id", editData.id)
        .select();

      data = response.data;
      error = response.error;
    } else {
      const response = await supabase
        .from("delivery_challans")
        .insert([payload])
        .select();

      data = response.data;
      error = response.error;
    }
    if (error) {
      console.log("Create DC error:", error);
      Alert.alert("Error", error.message);
      return;
    }
    const dcId = (data as any)?.[0]?.id;
    console.log("DC ID:", dcId);

    if (!dcId) {
      Alert.alert("Error", "DC ID not found");
      return;
    }

    console.log("Before inserting item");

    let itemData, itemError;

    if (editData) {
      const response = await supabase
        .from("items")
        .update({
          part_name: partName,
          quantity: Number(quantity || 0),
          notes: notes || "",
        })
        .eq("dc_id", dcId)
        .select();

      itemData = response.data;
      itemError = response.error;
    } else {
      const response = await supabase
        .from("items")
        .insert([
          {
            dc_id: dcId,
            part_name: partName,
            quantity: Number(quantity || 0),
            notes: notes || "",
          },
        ])
        .select();

      itemData = response.data;
      itemError = response.error;
    }
    console.log("Item Insert Data:", itemData);
    console.log("Item Insert Error:", itemError);

    if (itemError) {
      Alert.alert("Item Error", itemError.message);
      return;
    }
    console.log("Create DC success:", data);
    Alert.alert(
      "Success",
      editData ? "DC updated successfully." : "DC ceated successfully.",
    );
    router.replace("/home");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.headerSide}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={28} color="#404040" />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Create Delivery Challan</Text>
          </View>
          <View style={styles.headerSide} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formCard}>
            <View style={styles.field}>
              <Text style={styles.label}>Type of DC</Text>

              <Pressable
                onPress={() => {
                  setIsReturnable(!isReturnable);
                  if (isReturnable) {
                    setDetectedStatus("pending");
                  }
                }}
                style={{
                  backgroundColor: isReturnable ? "#ff6600" : "#ccc",
                  padding: 12,
                  borderRadius: 10,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>
                  {isReturnable ? "Returnable" : "Non-Returnable"}
                </Text>
              </Pressable>
            </View>
            {isReturnable && (
              <View style={styles.field}>
                <Text style={styles.label}>Status</Text>

                <View style={{ flexDirection: "row", gap: 10 }}>
                  {["pending", "partial", "returned"].map((status) => (
                    <Pressable
                      key={status}
                      onPress={() => setDetectedStatus(status)}
                      style={{
                        flex: 1,
                        padding: 10,
                        borderRadius: 8,
                        backgroundColor:
                          detectedStatus === status ? "#ff6600" : "#ddd",
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ color: "#fff", fontWeight: "bold" }}>
                        {status}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
            <View style={styles.field}>
              <Text style={styles.label}>Scan / Upload Challan</Text>
              <Pressable
                onPress={handleScanUpload}
                style={{
                  backgroundColor: "#2196F3",
                  padding: 10,
                  borderRadius: 8,
                  alignItems: "center",
                  marginTop: 10,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>
                  Tap to scan or upload image
                </Text>
              </Pressable>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>From</Text>
              <TextInput
                value={from}
                onChangeText={setFrom}
                placeholder="Enter sender's name"
                placeholderTextColor="#b0b0b0"
                style={styles.input}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>To</Text>
              <TextInput
                value={to}
                onChangeText={setTo}
                placeholder="Enter recipient's name"
                placeholderTextColor="#b0b0b0"
                style={styles.input}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Item Name</Text>
              <TextInput
                value={partName}
                onChangeText={setPartName}
                placeholder="Enter part name"
                placeholderTextColor="#b0b0b0"
                style={styles.input}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Quantity</Text>
              <TextInput
                value={quantity}
                onChangeText={setQuantity}
                placeholder="Enter quantity"
                placeholderTextColor="#b0b0b0"
                keyboardType="numeric"
                style={styles.input}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Enter notes"
                placeholderTextColor="#b0b0b0"
                style={styles.input}
              />
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.primaryBtnPressed,
            ]}
            onPress={handleCreate}
          >
            <Text style={styles.primaryBtnText}>
              {editData ? "Update DC" : "Create DC"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fafafa",
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    minHeight: 48,
  },
  headerSide: {
    width: 44,
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#404040",
    textAlign: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  formCard: {
    backgroundColor: "#f0f0f0",
    borderRadius: 15,
    padding: 20,
    gap: 20,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#404040",
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#333333",
  },
  primaryBtn: {
    marginTop: 24,
    backgroundColor: "#ff6321",
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryBtnPressed: {
    opacity: 0.92,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
  },
});
