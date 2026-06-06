import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const PLAN_DETAILS: Record<
  string,
  { label: string; analyses: string; features: string[] }
> = {
  starter: {
    label: "Starter",
    analyses: "3/mo",
    features: ["Price Fairness", "QoL Score", "Rental Yield"],
  },
  analyst: {
    label: "Analyst",
    analyses: "25/mo",
    features: ["All Starter modules", "Scenario Forecast", "Neighbourhood Trends"],
  },
  pro: {
    label: "Pro",
    analyses: "Unlimited",
    features: ["All Analyst modules", "Liquidity Score", "Priority support"],
  },
};

function MenuItem({
  icon,
  label,
  value,
  onPress,
  destructive,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        menuStyles.item,
        { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={[menuStyles.iconWrap, { backgroundColor: colors.secondary }]}>
        <Ionicons name={icon} size={18} color={destructive ? colors.destructive : colors.primary} />
      </View>
      <Text style={[menuStyles.label, { color: destructive ? colors.destructive : colors.foreground }]}>
        {label}
      </Text>
      <View style={menuStyles.right}>
        {value && <Text style={[menuStyles.value, { color: colors.mutedForeground }]}>{value}</Text>}
        {onPress && <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />}
      </View>
    </Pressable>
  );
}

const menuStyles = StyleSheet.create({
  item: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  label: { flex: 1, fontSize: 15 },
  right: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  value: { fontSize: 14 },
});

export default function AccountScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const plan = user?.plan ?? "starter";
  const planInfo = PLAN_DETAILS[plan];
  const planColors: Record<string, string> = {
    starter: colors.mutedForeground,
    analyst: colors.primary,
    pro: colors.accent,
  };
  const planColor = planColors[plan] ?? colors.mutedForeground;

  async function handleLogout() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  const s = makeStyles(colors, topPad);

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={s.heading}>Account</Text>

      {/* Profile card */}
      <View style={[s.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[s.avatar, { backgroundColor: colors.primary }]}>
          <Text style={s.avatarText}>
            {(user?.fullName ?? "U").charAt(0).toUpperCase()}
          </Text>
        </View>
        <View>
          <Text style={[s.fullName, { color: colors.foreground }]}>{user?.fullName}</Text>
          <Text style={[s.email, { color: colors.mutedForeground }]}>{user?.email}</Text>
          <Text style={[s.role, { color: colors.mutedForeground }]}>
            {user?.role?.charAt(0).toUpperCase() + (user?.role?.slice(1) ?? "")}
          </Text>
        </View>
      </View>

      {/* Subscription card */}
      <View style={[s.subCard, { backgroundColor: colors.card, borderColor: planColor }]}>
        <View style={s.subTop}>
          <View>
            <Text style={[s.subPlan, { color: planColor }]}>{planInfo?.label} Plan</Text>
            <Text style={[s.subAnalyses, { color: colors.foreground }]}>
              {planInfo?.analyses} analyses
            </Text>
          </View>
          <View style={[s.subBadge, { backgroundColor: `${planColor}22`, borderColor: planColor }]}>
            <Ionicons name="star" size={14} color={planColor} />
            <Text style={[s.subBadgeText, { color: planColor }]}>
              {plan.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={s.subUsage}>
          <Text style={[s.subUsageLabel, { color: colors.mutedForeground }]}>This month</Text>
          <Text style={[s.subUsageCount, { color: colors.foreground, fontFamily: "JetBrainsMono_400Regular" }]}>
            {user?.analysesUsedThisMonth ?? 0}
          </Text>
        </View>

        <View style={s.features}>
          {planInfo?.features.map((f) => (
            <View key={f} style={s.featureRow}>
              <Ionicons name="checkmark" size={14} color={planColor} />
              <Text style={[s.featureText, { color: colors.mutedForeground }]}>{f}</Text>
            </View>
          ))}
        </View>

        {plan !== "pro" && (
          <Pressable
            style={({ pressed }) => [s.upgradeBtn, { opacity: pressed ? 0.8 : 1 }]}
            onPress={() =>
              Alert.alert("Upgrade", "Contact support to upgrade your plan.")
            }
          >
            <Ionicons name="arrow-up-circle" size={18} color="#FFFFFF" />
            <Text style={s.upgradeBtnText}>Upgrade Plan</Text>
          </Pressable>
        )}
      </View>

      {/* Menu */}
      <View style={[s.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <MenuItem
          icon="person-circle-outline"
          label="Edit Profile"
          onPress={() => Alert.alert("Edit Profile", "Coming soon")}
          colors={colors}
        />
        <MenuItem
          icon="bar-chart-outline"
          label="My Analyses"
          onPress={() => router.push("/(tabs)/history")}
          colors={colors}
        />
        <MenuItem
          icon="card-outline"
          label="Subscription"
          value={planInfo?.label}
          colors={colors}
        />
        <MenuItem
          icon="log-out-outline"
          label="Sign Out"
          onPress={handleLogout}
          destructive
          colors={colors}
        />
      </View>

      <Text style={s.version}>PropIQ Mobile v1.0</Text>
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
    heading: {
      fontSize: 26,
      fontWeight: "700" as const,
      color: colors.foreground,
      marginBottom: 20,
      fontFamily: "DMSans_700Bold",
    },
    profileCard: {
      borderRadius: 14,
      borderWidth: 1,
      padding: 16,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 16,
      marginBottom: 16,
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    avatarText: {
      color: "#FFFFFF",
      fontSize: 22,
      fontWeight: "700" as const,
    },
    fullName: { fontSize: 17, fontWeight: "600" as const, marginBottom: 2 },
    email: { fontSize: 13, marginBottom: 2 },
    role: { fontSize: 12, textTransform: "capitalize" as const },
    subCard: {
      borderRadius: 14,
      borderWidth: 1.5,
      padding: 16,
      marginBottom: 16,
    },
    subTop: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "flex-start" as const,
      marginBottom: 12,
    },
    subPlan: { fontSize: 13, fontWeight: "700" as const, textTransform: "uppercase" as const, letterSpacing: 0.5 },
    subAnalyses: { fontSize: 20, fontWeight: "700" as const, marginTop: 2 },
    subBadge: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 4,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    subBadgeText: { fontSize: 11, fontWeight: "700" as const },
    subUsage: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      marginBottom: 12,
      paddingVertical: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    subUsageLabel: { fontSize: 13 },
    subUsageCount: { fontSize: 20, fontWeight: "700" as const },
    features: { gap: 6, marginBottom: 16 },
    featureRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8 },
    featureText: { fontSize: 13 },
    upgradeBtn: {
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingVertical: 12,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 8,
    },
    upgradeBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" as const },
    menuCard: {
      borderRadius: 14,
      borderWidth: 1,
      overflow: "hidden" as const,
      marginBottom: 24,
    },
    version: {
      textAlign: "center" as const,
      fontSize: 12,
      color: colors.mutedForeground,
      paddingBottom: 20,
    },
  });
}
