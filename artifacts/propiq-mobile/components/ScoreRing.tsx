import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useColors } from "@/hooks/useColors";

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

function getScoreColor(score: number, primary: string, accent: string, destructive: string) {
  if (score >= 70) return primary;
  if (score >= 45) return accent;
  return destructive;
}

export function ScoreRing({ score, size = 120, strokeWidth = 10, label }: ScoreRingProps) {
  const colors = useColors();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.min(100, Math.max(0, score));
  const progress = (clampedScore / 100) * circumference;
  const color = getScoreColor(clampedScore, colors.primary, colors.accent, colors.destructive);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${progress} ${circumference}`}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.content}>
        <Text style={[styles.score, { color, fontFamily: "JetBrainsMono_400Regular" }]}>
          {Math.round(clampedScore)}
        </Text>
        {label && (
          <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    alignItems: "center",
  },
  score: {
    fontSize: 28,
    fontWeight: "700" as const,
  },
  label: {
    fontSize: 11,
    marginTop: 2,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
});
