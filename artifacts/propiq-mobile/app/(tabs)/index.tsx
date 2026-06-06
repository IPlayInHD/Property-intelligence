import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { type AnalysisSummary, useGetAnalysisHistory } from "@workspace/api-client-react";

function ScorePill({ score }: { score: number | null | undefined }) {
  const colors = useColors();
  if (score == null) return null;
  const color = score >= 70 ? colors.primary : score >= 45 ? colors.accent : colors.destructive;
  return (
    <View style={[pilStyles.pill, { backgroundColor: `${color}22` }]}>
      <Text style={[pilStyles.text, { color, fontFamily: "JetBrainsMono_400Regular" }]}>
        {Math.round(score)}
      </Text>
    </View>
  );
}

const pilStyles = StyleSheet.create({
  pill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  text: { fontSize: 15, fontWeight: "700" as const },
});

function AnalysisItem({ item }: { item: AnalysisSummary }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={() => router.push(`/analysis/${item.id}`)}
      style={({ pressed }) => [
        itemStyles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={itemStyles.row}>
        <View style={itemStyles.info}>
          <Text style={[itemStyles.community, { color: colors.foreground }]} numberOfLines={1}>
            {item.community}
          </Text>
          <Text style={[itemStyles.meta, { color: colors.mutedForeground }]}>
            {item.propertyType} · {item.bedrooms}BR · AED {(item.listedPrice / 1_000).toFixed(0)}K
          </Text>
        </View>
        <View style={itemStyles.right}>
          {item.status === "complete" ? (
            <ScorePill score={item.overallScore} />
          ) : item.status === "pending" ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Ionicons name="alert-circle" size={18} color={colors.destructive} />
          )}
        </View>
      </View>
    </Pressable>
  );
}

const itemStyles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
  },
  row: { flexDirection: "row" as const, alignItems: "center" as const },
  info: { flex: 1 },
  community: { fontSize: 15, fontWeight: "600" as const, marginBottom: 3 },
  meta: { fontSize: 13 },
  right: { marginLeft: 12 },
});

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data: history, isLoading, refetch } = useGetAnalysisHistory({});

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const planColors: Record<string, string> = {
    starter: colors.mutedForeground,
    analyst: colors.primary,
    pro: colors.accent,
  };
  const planColor = planColors[user?.plan ?? "starter"] ?? colors.mutedForeground;

  const s = makeStyles(colors, topPad);

  const recent = history?.slice(0, 5) ?? [];

  return (
    <View style={s.root}>
      <FlatList
        data={recent}
        keyExtractor={(item) => item.id}
        scrollEnabled={!!(recent.length > 0)}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View>
            <View style={s.header}>
              <View>
                <Text style={s.greeting}>
                  Good {getGreeting()}, {user?.fullName?.split(" ")[0] ?? "Investor"}
                </Text>
                <View style={s.planRow}>
                  <View style={[s.planBadge, { borderColor: planColor }]}>
                    <Text style={[s.planText, { color: planColor }]}>
                      {(user?.plan ?? "starter").toUpperCase()}
                    </Text>
                  </View>
                  <Text style={s.usageText}>
                    {user?.analysesUsedThisMonth ?? 0} analyses this month
                  </Text>
                </View>
              </View>
              <View style={[s.logoMark, { borderColor: colors.primary }]}>
                <Ionicons name="analytics" size={22} color={colors.primary} />
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [s.cta, { opacity: pressed ? 0.85 : 1 }]}
              onPress={() => router.push("/(tabs)/new-analysis")}
            >
              <View style={s.ctaContent}>
                <Ionicons name="add-circle" size={22} color="#FFFFFF" />
                <Text style={s.ctaText}>New Analysis</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
            </Pressable>

            <View style={s.statsRow}>
              <StatCard
                label="Total Analyses"
                value={String(history?.length ?? 0)}
                icon="bar-chart-outline"
                colors={colors}
              />
              <StatCard
                label="Completed"
                value={String(history?.filter((h) => h.status === "complete").length ?? 0)}
                icon="checkmark-circle-outline"
                colors={colors}
              />
            </View>

            {recent.length > 0 && (
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Recent Analyses</Text>
                <Pressable onPress={() => router.push("/(tabs)/history")}>
                  <Text style={[s.sectionLink, { color: colors.primary }]}>See all</Text>
                </Pressable>
              </View>
            )}

            {isLoading && recent.length === 0 && (
              <View style={s.loadingWrap}>
                <ActivityIndicator color={colors.primary} />
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => <AnalysisItem item={item} />}
        ListEmptyComponent={
          !isLoading ? (
            <View style={s.emptyWrap}>
              <Ionicons name="home-outline" size={40} color={colors.mutedForeground} />
              <Text style={s.emptyTitle}>No analyses yet</Text>
              <Text style={s.emptySubtitle}>Tap New Analysis to evaluate your first property</Text>
            </View>
          ) : null
        }
        contentContainerStyle={s.content}
      />
    </View>
  );
}

function StatCard({
  label,
  value,
  icon,
  colors,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[statStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={[statStyles.value, { color: colors.foreground, fontFamily: "JetBrainsMono_400Regular" }]}>
        {value}
      </Text>
      <Text style={[statStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 6,
  },
  value: { fontSize: 24, fontWeight: "700" as const },
  label: { fontSize: 12 },
});

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function makeStyles(colors: ReturnType<typeof useColors>, topPad: number) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: 20, paddingBottom: 100 },
    header: {
      flexDirection: "row" as const,
      alignItems: "flex-start" as const,
      justifyContent: "space-between" as const,
      paddingTop: topPad + 20,
      marginBottom: 24,
    },
    greeting: {
      fontSize: 22,
      fontWeight: "700" as const,
      color: colors.foreground,
      marginBottom: 8,
      fontFamily: "DMSans_700Bold",
    },
    planRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 10,
    },
    planBadge: {
      borderWidth: 1,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    planText: { fontSize: 11, fontWeight: "700" as const, letterSpacing: 0.5 },
    usageText: { fontSize: 12, color: colors.mutedForeground },
    logoMark: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: colors.card,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    cta: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingHorizontal: 18,
      paddingVertical: 16,
      marginBottom: 20,
    },
    ctaContent: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 10,
    },
    ctaText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "600" as const,
      fontFamily: "DMSans_600SemiBold",
    },
    statsRow: {
      flexDirection: "row" as const,
      gap: 12,
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      marginBottom: 14,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "600" as const,
      color: colors.foreground,
    },
    sectionLink: { fontSize: 13 },
    loadingWrap: { paddingVertical: 40, alignItems: "center" as const },
    emptyWrap: {
      alignItems: "center" as const,
      paddingVertical: 48,
      gap: 10,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: "600" as const,
      color: colors.foreground,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: "center" as const,
      paddingHorizontal: 32,
    },
  });
}
