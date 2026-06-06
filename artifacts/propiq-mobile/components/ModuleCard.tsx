import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface ModuleCardProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  score?: number | null;
  verdict?: string | null;
  detail?: string | null;
  locked?: boolean;
}

function getScoreColor(score: number, primary: string, accent: string, destructive: string) {
  if (score >= 70) return primary;
  if (score >= 45) return accent;
  return destructive;
}

export function ModuleCard({ title, icon, score, verdict, detail, locked }: ModuleCardProps) {
  const colors = useColors();
  const scoreColor =
    score != null
      ? getScoreColor(score, colors.primary, colors.accent, colors.destructive)
      : colors.mutedForeground;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
          <Ionicons name={icon} size={18} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        {locked && (
          <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
            <Ionicons name="lock-closed" size={12} color={colors.accent} />
            <Text style={[styles.badgeText, { color: colors.accent }]}>Pro</Text>
          </View>
        )}
        {score != null && !locked && (
          <Text style={[styles.scoreText, { color: scoreColor, fontFamily: "JetBrainsMono_400Regular" }]}>
            {Math.round(score)}
          </Text>
        )}
      </View>
      {!locked && verdict && (
        <Text style={[styles.verdict, { color: scoreColor }]}>{verdict}</Text>
      )}
      {!locked && detail && (
        <Text style={[styles.detail, { color: colors.mutedForeground }]} numberOfLines={2}>
          {detail}
        </Text>
      )}
      {locked && (
        <Text style={[styles.detail, { color: colors.mutedForeground }]}>
          Upgrade to Pro to unlock this module
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    marginBottom: 8,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600" as const,
  },
  badge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
  scoreText: {
    fontSize: 22,
    fontWeight: "700" as const,
  },
  verdict: {
    fontSize: 13,
    fontWeight: "600" as const,
    marginBottom: 4,
  },
  detail: {
    fontSize: 13,
    lineHeight: 18,
  },
});
