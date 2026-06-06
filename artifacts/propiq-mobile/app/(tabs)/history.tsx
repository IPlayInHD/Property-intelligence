import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { getGetAnalysisHistoryQueryKey, useDeleteAnalysis, useGetAnalysisHistory } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

type AnalysisSummary = {
  id: string;
  community: string;
  emirate?: string;
  propertyType: string;
  bedrooms: number;
  listedPrice: number;
  overallScore?: number | null;
  status: string;
  createdAt: string;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-AE", { day: "numeric", month: "short", year: "numeric" });
}

function StatusIcon({ status, colors }: { status: string; colors: ReturnType<typeof useColors> }) {
  if (status === "complete") return <Ionicons name="checkmark-circle" size={16} color={colors.primary} />;
  if (status === "pending") return <ActivityIndicator size="small" color={colors.accent} />;
  return <Ionicons name="alert-circle" size={16} color={colors.destructive} />;
}

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { data: history, isLoading, refetch } = useGetAnalysisHistory({});
  const { mutateAsync: deleteAnalysis } = useDeleteAnalysis();
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string) {
    Alert.alert("Delete Analysis", "Are you sure you want to delete this analysis?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeleting(id);
          try {
            await deleteAnalysis({ id });
            queryClient.invalidateQueries({ queryKey: getGetAnalysisHistoryQueryKey() });
          } catch {
            Alert.alert("Error", "Failed to delete analysis");
          } finally {
            setDeleting(null);
          }
        },
      },
    ]);
  }

  const s = makeStyles(colors, topPad);

  const renderItem = ({ item }: { item: AnalysisSummary }) => {
    const scoreColor =
      item.overallScore != null
        ? item.overallScore >= 70
          ? colors.primary
          : item.overallScore >= 45
          ? colors.accent
          : colors.destructive
        : colors.mutedForeground;

    return (
      <Pressable
        onPress={() => router.push(`/analysis/${item.id}`)}
        style={({ pressed }) => [
          s.card,
          { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <View style={s.cardTop}>
          <View style={s.cardInfo}>
            <Text style={s.cardCommunity} numberOfLines={1}>{item.community}</Text>
            <Text style={s.cardMeta}>
              {item.propertyType} · {item.bedrooms}BR · AED {(item.listedPrice / 1000).toFixed(0)}K
            </Text>
            <Text style={s.cardDate}>{formatDate(item.createdAt)}</Text>
          </View>
          <View style={s.cardRight}>
            {item.status === "complete" && item.overallScore != null ? (
              <View style={[s.scorePill, { backgroundColor: `${scoreColor}22` }]}>
                <Text style={[s.scoreText, { color: scoreColor, fontFamily: "JetBrainsMono_400Regular" }]}>
                  {Math.round(item.overallScore)}
                </Text>
              </View>
            ) : (
              <StatusIcon status={item.status} colors={colors} />
            )}
          </View>
        </View>
        <View style={s.cardActions}>
          <View style={[s.statusChip, { backgroundColor: colors.secondary }]}>
            <StatusIcon status={item.status} colors={colors} />
            <Text style={[s.statusText, { color: colors.mutedForeground }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
          <Pressable
            onPress={() => handleDelete(item.id)}
            hitSlop={8}
            disabled={deleting === item.id}
          >
            {deleting === item.id ? (
              <ActivityIndicator size="small" color={colors.destructive} />
            ) : (
              <Ionicons name="trash-outline" size={18} color={colors.mutedForeground} />
            )}
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={s.root}>
      <FlatList
        data={(history as AnalysisSummary[] | undefined) ?? []}
        keyExtractor={(item) => item.id}
        scrollEnabled={!!((history?.length ?? 0) > 0)}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <View style={s.header}>
            <Text style={s.heading}>History</Text>
            <Text style={s.count}>{history?.length ?? 0} analyses</Text>
          </View>
        }
        renderItem={renderItem}
        ListEmptyComponent={
          !isLoading ? (
            <View style={s.emptyWrap}>
              <Ionicons name="time-outline" size={40} color={colors.mutedForeground} />
              <Text style={s.emptyTitle}>No analyses yet</Text>
              <Text style={s.emptySubtitle}>Your completed analyses will appear here</Text>
            </View>
          ) : null
        }
        contentContainerStyle={s.content}
      />
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>, topPad: number) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: 20, paddingBottom: 100 },
    header: {
      paddingTop: topPad + 20,
      flexDirection: "row" as const,
      alignItems: "baseline" as const,
      justifyContent: "space-between" as const,
      marginBottom: 20,
    },
    heading: {
      fontSize: 26,
      fontWeight: "700" as const,
      color: colors.foreground,
      fontFamily: "DMSans_700Bold",
    },
    count: { fontSize: 14, color: colors.mutedForeground },
    card: {
      borderRadius: 12,
      borderWidth: 1,
      padding: 16,
      marginBottom: 12,
    },
    cardTop: {
      flexDirection: "row" as const,
      alignItems: "flex-start" as const,
      marginBottom: 12,
    },
    cardInfo: { flex: 1 },
    cardCommunity: {
      fontSize: 15,
      fontWeight: "600" as const,
      color: colors.foreground,
      marginBottom: 3,
    },
    cardMeta: { fontSize: 13, color: colors.mutedForeground, marginBottom: 3 },
    cardDate: { fontSize: 12, color: `${colors.mutedForeground}88` },
    cardRight: { marginLeft: 12 },
    scorePill: {
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 5,
      minWidth: 40,
      alignItems: "center",
    },
    scoreText: { fontSize: 16, fontWeight: "700" as const },
    cardActions: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    statusChip: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 5,
      borderRadius: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    statusText: { fontSize: 12 },
    emptyWrap: { alignItems: "center" as const, paddingVertical: 48, gap: 10 },
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
