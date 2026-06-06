import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const PROPERTY_TYPES = ["apartment", "villa", "townhouse", "penthouse", "studio"];
const EMIRATES = ["Dubai", "Abu Dhabi", "Sharjah", "RAK", "Ajman"];
const LISTING_TYPES = ["sale", "rent"];
const FURNISHED = ["Yes", "No", "Partial"];
const VIEW_TYPES = ["Sea", "Marina", "Community", "Garden", "City", "None"];

function Chip({
  label,
  selected,
  onPress,
  colors,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        chipS.chip,
        {
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected ? "rgba(10,138,138,0.14)" : colors.card,
        },
      ]}
    >
      <Text style={[chipS.text, { color: selected ? colors.primary : colors.mutedForeground }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const chipS = StyleSheet.create({
  chip: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  text: { fontSize: 13, fontWeight: "500" as const },
});

export default function NewAnalysisScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [propertyType, setPropertyType] = useState("apartment");
  const [emirate, setEmirate] = useState("Dubai");
  const [community, setCommunity] = useState("");
  const [buildingName, setBuildingName] = useState("");
  const [sizeSqft, setSizeSqft] = useState("");
  const [bedrooms, setBedrooms] = useState("1");
  const [listedPrice, setListedPrice] = useState("");
  const [listingType, setListingType] = useState("sale");
  const [furnished, setFurnished] = useState("No");
  const [viewType, setViewType] = useState("None");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!community.trim()) {
      setError("Please enter a community");
      return;
    }
    if (!sizeSqft || isNaN(Number(sizeSqft)) || Number(sizeSqft) <= 0) {
      setError("Please enter a valid size");
      return;
    }
    if (!listedPrice || isNaN(Number(listedPrice)) || Number(listedPrice) <= 0) {
      setError("Please enter a valid price");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const token = await import("@react-native-async-storage/async-storage").then(
        (m) => m.default.getItem("propiq_auth_token")
      );
      const res = await fetch(
        `https://${process.env.EXPO_PUBLIC_DOMAIN}/api/analysis`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            propertyType,
            emirate,
            community: community.trim(),
            buildingName: buildingName.trim() || null,
            sizeSqft: Number(sizeSqft),
            bedrooms: Number(bedrooms),
            listedPrice: Number(listedPrice),
            listingType,
            furnished,
            viewType,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create analysis");
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push(`/analysis/${data.id}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const s = makeStyles(colors, topPad);

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={s.headerRow}>
        <Text style={s.heading}>New Analysis</Text>
        <Ionicons name="analytics-outline" size={24} color={colors.primary} />
      </View>

      {error && (
        <View style={s.errorBox}>
          <Ionicons name="alert-circle" size={16} color={colors.destructive} />
          <Text style={s.errorText}>{error}</Text>
        </View>
      )}

      <Text style={s.sectionTitle}>Property Type</Text>
      <View style={s.chips}>
        {PROPERTY_TYPES.map((t) => (
          <Chip
            key={t}
            label={t.charAt(0).toUpperCase() + t.slice(1)}
            selected={propertyType === t}
            onPress={() => setPropertyType(t)}
            colors={colors}
          />
        ))}
      </View>

      <Text style={s.sectionTitle}>Emirate</Text>
      <View style={s.chips}>
        {EMIRATES.map((e) => (
          <Chip
            key={e}
            label={e}
            selected={emirate === e}
            onPress={() => setEmirate(e)}
            colors={colors}
          />
        ))}
      </View>

      <Text style={s.sectionTitle}>Community *</Text>
      <View style={[s.inputWrap, { borderColor: community ? colors.primary : colors.border }]}>
        <Ionicons name="location-outline" size={18} color={colors.mutedForeground} />
        <TextInput
          style={s.input}
          value={community}
          onChangeText={setCommunity}
          placeholder="e.g. Dubai Marina"
          placeholderTextColor={colors.mutedForeground}
        />
      </View>

      <Text style={s.sectionTitle}>Building Name</Text>
      <View style={[s.inputWrap, { borderColor: buildingName ? colors.primary : colors.border }]}>
        <Ionicons name="business-outline" size={18} color={colors.mutedForeground} />
        <TextInput
          style={s.input}
          value={buildingName}
          onChangeText={setBuildingName}
          placeholder="Optional"
          placeholderTextColor={colors.mutedForeground}
        />
      </View>

      <View style={s.twoCol}>
        <View style={s.colField}>
          <Text style={s.sectionTitle}>Size (sqft) *</Text>
          <View style={[s.inputWrap, { borderColor: sizeSqft ? colors.primary : colors.border }]}>
            <TextInput
              style={s.input}
              value={sizeSqft}
              onChangeText={setSizeSqft}
              placeholder="1200"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
            />
          </View>
        </View>
        <View style={s.colField}>
          <Text style={s.sectionTitle}>Bedrooms *</Text>
          <View style={[s.inputWrap, { borderColor: colors.border }]}>
            <TextInput
              style={s.input}
              value={bedrooms}
              onChangeText={setBedrooms}
              placeholder="1"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
            />
          </View>
        </View>
      </View>

      <Text style={s.sectionTitle}>Listed Price (AED) *</Text>
      <View style={[s.inputWrap, { borderColor: listedPrice ? colors.primary : colors.border }]}>
        <Ionicons name="cash-outline" size={18} color={colors.mutedForeground} />
        <TextInput
          style={s.input}
          value={listedPrice}
          onChangeText={setListedPrice}
          placeholder="1,200,000"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="numeric"
        />
      </View>

      <Text style={s.sectionTitle}>Listing Type</Text>
      <View style={s.chips}>
        {LISTING_TYPES.map((t) => (
          <Chip
            key={t}
            label={t.charAt(0).toUpperCase() + t.slice(1)}
            selected={listingType === t}
            onPress={() => setListingType(t)}
            colors={colors}
          />
        ))}
      </View>

      <Text style={s.sectionTitle}>Furnished</Text>
      <View style={s.chips}>
        {FURNISHED.map((f) => (
          <Chip
            key={f}
            label={f}
            selected={furnished === f}
            onPress={() => setFurnished(f)}
            colors={colors}
          />
        ))}
      </View>

      <Text style={s.sectionTitle}>View</Text>
      <View style={s.chips}>
        {VIEW_TYPES.map((v) => (
          <Chip
            key={v}
            label={v}
            selected={viewType === v}
            onPress={() => setViewType(v)}
            colors={colors}
          />
        ))}
      </View>

      <Pressable
        style={({ pressed }) => [s.btn, { opacity: pressed || loading ? 0.8 : 1 }]}
        onPress={handleSubmit}
        disabled={loading}
        testID="run-analysis-btn"
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="flash" size={20} color="#FFFFFF" />
            <Text style={s.btnText}>Run Analysis</Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>, topPad: number) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: {
      paddingTop: topPad + 20,
      paddingHorizontal: 20,
      paddingBottom: 120,
    },
    headerRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      marginBottom: 24,
    },
    heading: {
      fontSize: 26,
      fontWeight: "700" as const,
      color: colors.foreground,
      fontFamily: "DMSans_700Bold",
    },
    errorBox: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 8,
      backgroundColor: "rgba(239,68,68,0.12)",
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
    },
    errorText: { color: colors.destructive, fontSize: 13, flex: 1 },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: colors.mutedForeground,
      marginBottom: 10,
      marginTop: 4,
      textTransform: "uppercase" as const,
      letterSpacing: 0.5,
    },
    chips: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      gap: 8,
      marginBottom: 20,
    },
    inputWrap: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 10,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 13,
      marginBottom: 20,
    },
    input: {
      flex: 1,
      color: colors.foreground,
      fontSize: 15,
      fontFamily: "DMSans_400Regular",
    },
    twoCol: {
      flexDirection: "row" as const,
      gap: 12,
    },
    colField: { flex: 1 },
    btn: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 16,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 8,
      marginTop: 8,
    },
    btnText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "600" as const,
      fontFamily: "DMSans_600SemiBold",
    },
  });
}
