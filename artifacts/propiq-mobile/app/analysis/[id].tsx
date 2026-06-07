import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ModuleCard } from "@/components/ModuleCard";
import { ScoreRing } from "@/components/ScoreRing";
import { useColors } from "@/hooks/useColors";
import { useGetAnalysis } from "@workspace/api-client-react";

type ComparableTransaction = {
  id: number;
  community: string;
  buildingName?: string | null;
  propertyType: string;
  bedrooms?: number | null;
  sizeSqft?: number | null;
  salePrice: number;
  pricePerSqft?: number | null;
  transactionDate: string;
  emirate: string;
};

type PriceFairness = {
  fairnessScore?: number;
  verdict?: string;
  listedPsf?: number;
  benchmarkPsf?: number;
  dataFreshnessDate?: string | null;
  dataQuality?: string | null;
  comparables?: ComparableTransaction[];
};

type QolScore = {
  overallScore?: number;
  verdict?: string;
};

type Forecast = {
  baseCase?: { fiveYearReturn?: number };
  verdict?: string;
};

type Liquidity = {
  liquidityScore?: number;
  verdict?: string;
};

type RentalYield = {
  grossYield?: number;
  netYield?: number;
  verdict?: string;
};

type Trends = {
  quarterlyChange?: number;
  verdict?: string;
};

type AnalysisResults = {
  priceFairness?: PriceFairness;
  qolScore?: QolScore;
  forecast?: Forecast;
  liquidity?: Liquidity;
  rentalYield?: RentalYield;
  trends?: Trends;
};

type ConfidenceLevel = "high" | "medium" | "low";

type Analysis = {
  id: string;
  status: string;
  overallScore?: number | null;
  confidence?: ConfidenceLevel | null;
  propertyData: {
    community: string;
    emirate: string;
    propertyType: string;
    bedrooms: number;
    sizeSqft: number;
    listedPrice: number;
    listingType: string;
  };
  results?: AnalysisResults;
  createdAt: string;
};

export default function AnalysisDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data, isLoading, error, refetch } = useGetAnalysis(id ?? "");
  const analysis = data as Analysis | undefined;

  const [showComparables, setShowComparables] = useState(false);

  // Poll for pending analyses
  const [polling, setPolling] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (analysis?.status === "pending") {
      setPolling(true);
      pollRef.current = setInterval(() => {
        refetch();
      }, 3000);
    } else {
      setPolling(false);
      if (pollRef.current) clearInterval(pollRef.current);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [analysis?.status, refetch]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (analysis?.status === "complete") {
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }
  }, [analysis?.status, fadeAnim]);

  const s = makeStyles(colors, topPad);

  if (isLoading && !analysis) {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !analysis) {
    return (
      <View style={[s.root, s.center]}>
        <Ionicons name="alert-circle-outline" size={40} color={colors.destructive} />
        <Text style={[s.errorText, { color: colors.foreground }]}>Failed to load analysis</Text>
        <Pressable style={[s.retryBtn, { backgroundColor: colors.primary }]} onPress={() => refetch()}>
          <Text style={s.retryBtnText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const pd = analysis.propertyData;
  const results = analysis.results;
  const isPro = false; // based on user plan; keeping simple here

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Back button */}
      <Pressable onPress={() => router.back()} style={s.backBtn}>
        <Ionicons name="arrow-back" size={20} color={colors.foreground} />
      </Pressable>

      {/* Property summary */}
      <View style={[s.propertyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={s.community}>{pd.community}</Text>
        <Text style={s.propMeta}>
          {pd.emirate} · {pd.propertyType} · {pd.bedrooms}BR · {pd.sizeSqft.toLocaleString()} sqft
        </Text>
        <Text style={s.price}>
          AED {pd.listedPrice.toLocaleString()}{" "}
          <Text style={s.priceSub}>({pd.listingType})</Text>
        </Text>
      </View>

      {/* Score */}
      {analysis.status === "pending" || polling ? (
        <View style={[s.pendingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[s.pendingTitle, { color: colors.foreground }]}>Analysing property…</Text>
          <Text style={[s.pendingSubtitle, { color: colors.mutedForeground }]}>
            Running 6 intelligence modules. This takes ~30 seconds.
          </Text>
        </View>
      ) : analysis.status === "failed" ? (
        <View style={[s.pendingCard, { backgroundColor: colors.card, borderColor: colors.destructive }]}>
          <Ionicons name="alert-circle" size={36} color={colors.destructive} />
          <Text style={[s.pendingTitle, { color: colors.foreground }]}>Analysis failed</Text>
        </View>
      ) : (
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Overall Score */}
          {analysis.overallScore != null && (
            <View style={[s.scoreCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ScoreRing score={analysis.overallScore} size={130} label="PropIQ Score" />
              <View style={s.scoreRight}>
                <Text style={s.scoreLabel}>Investment Rating</Text>
                <Text style={[s.scoreVerdict, { color: getScoreColor(analysis.overallScore, colors) }]}>
                  {getVerdict(analysis.overallScore)}
                </Text>
                <Text style={[s.scoreSub, { color: colors.mutedForeground }]}>
                  Based on {Object.keys(results ?? {}).length} modules
                </Text>
                {analysis.confidence && (
                  <ConfidenceBadge confidence={analysis.confidence} />
                )}
              </View>
            </View>
          )}

          {/* Stale-data footnote: shown when price fairness comparables are > 6 months old.
              Explains why the PropIQ Score may differ from individual module readings —
              the price-fairness component carries half its normal weight when data is stale. */}
          {results?.priceFairness?.dataFreshnessDate &&
            isPriceFainessStale(results.priceFairness.dataFreshnessDate) && (
            <View style={[s.staleFootnote, { backgroundColor: colors.card, borderColor: "#92400e33" }]}>
              <Ionicons name="information-circle-outline" size={14} color="#d97706" style={{ marginTop: 1 }} />
              <Text style={[s.staleFootnoteText, { color: colors.mutedForeground }]}>
                <Text style={{ color: "#d97706", fontFamily: "DMSans_600SemiBold" }}>Score note: </Text>
                Price Fairness comparables are older than 6 months ({formatFreshnessDate(results.priceFairness.dataFreshnessDate)}). Its contribution to the PropIQ Score has been halved to avoid an outdated verdict inflating the result.
              </Text>
            </View>
          )}

          {/* Module Cards */}
          <Text style={s.modulesTitle}>Intelligence Modules</Text>

          {results?.priceFairness && (
            <View>
              <ModuleCard
                title="Price Fairness"
                icon="trending-up-outline"
                score={results.priceFairness.fairnessScore}
                verdict={results.priceFairness.verdict}
                detail={
                  results.priceFairness.listedPsf != null && results.priceFairness.benchmarkPsf != null
                    ? `Listed: AED ${results.priceFairness.listedPsf.toFixed(0)}/sqft · Benchmark: AED ${results.priceFairness.benchmarkPsf.toFixed(0)}/sqft`
                    : undefined
                }
                lastUpdated={
                  results.priceFairness.dataFreshnessDate && !isPriceFainessStale(results.priceFairness.dataFreshnessDate)
                    ? formatFreshnessDate(results.priceFairness.dataFreshnessDate)
                    : undefined
                }
                warning={
                  results.priceFairness.dataFreshnessDate && isPriceFainessStale(results.priceFairness.dataFreshnessDate)
                    ? `Data may be stale — most recent comparable is from ${formatFreshnessDate(results.priceFairness.dataFreshnessDate)}. Price estimate could be less accurate.`
                    : undefined
                }
              />
              {(results.priceFairness.comparables?.length ?? 0) > 0 && (
                <View style={{ marginTop: -6, marginBottom: 12 }}>
                  <Pressable
                    onPress={() => setShowComparables((v) => !v)}
                    style={[s.comparablesToggle, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <Ionicons name="receipt-outline" size={14} color={colors.primary} />
                    <Text style={[s.comparablesToggleText, { color: colors.primary }]}>
                      {showComparables
                        ? "Hide comparables"
                        : `View ${results.priceFairness.comparables!.length} comparable sale${results.priceFairness.comparables!.length !== 1 ? "s" : ""}`}
                    </Text>
                    <Ionicons
                      name={showComparables ? "chevron-up" : "chevron-down"}
                      size={14}
                      color={colors.primary}
                      style={{ marginLeft: "auto" }}
                    />
                  </Pressable>
                  {showComparables && (
                    <View style={[s.comparablesPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      {results.priceFairness.comparables!.map((comp, idx) => {
                        const stale = isComparableStale(comp.transactionDate);
                        return (
                          <View
                            key={comp.id ?? idx}
                            style={[
                              s.comparableRow,
                              idx < results.priceFairness!.comparables!.length - 1 && {
                                borderBottomWidth: 1,
                                borderBottomColor: colors.border,
                              },
                            ]}
                          >
                            <View style={s.comparableMain}>
                              <View style={s.comparableTopRow}>
                                <Text style={[s.comparableCommunity, { color: colors.foreground }]} numberOfLines={1}>
                                  {comp.community}
                                </Text>
                                {stale && (
                                  <View style={s.staleBadge}>
                                    <Ionicons name="time-outline" size={10} color="#d97706" />
                                    <Text style={s.staleBadgeText}>Stale</Text>
                                  </View>
                                )}
                              </View>
                              <Text style={[s.comparableMeta, { color: colors.mutedForeground }]}>
                                {formatComparableDate(comp.transactionDate)}
                                {comp.sizeSqft != null ? ` · ${Math.round(comp.sizeSqft).toLocaleString()} sqft` : ""}
                              </Text>
                            </View>
                            <Text style={[s.comparablePsf, { color: comp.pricePerSqft != null ? colors.foreground : colors.mutedForeground, fontFamily: "JetBrainsMono_400Regular" }]}>
                              {comp.pricePerSqft != null
                                ? `AED ${Math.round(comp.pricePerSqft).toLocaleString()}/sqft`
                                : "—"}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {results?.qolScore && (
            <ModuleCard
              title="Quality of Life"
              icon="leaf-outline"
              score={results.qolScore.overallScore}
              verdict={results.qolScore.verdict}
            />
          )}

          {results?.rentalYield && (
            <ModuleCard
              title="True Rental Yield"
              icon="cash-outline"
              score={
                results.rentalYield.grossYield != null
                  ? results.rentalYield.grossYield * 10
                  : undefined
              }
              verdict={results.rentalYield.verdict}
              detail={
                results.rentalYield.grossYield != null
                  ? `Gross: ${(results.rentalYield.grossYield * 100).toFixed(1)}%${results.rentalYield.netYield != null ? ` · Net: ${(results.rentalYield.netYield * 100).toFixed(1)}%` : ""}`
                  : undefined
              }
            />
          )}

          {results?.forecast && (
            <ModuleCard
              title="5-Year Forecast"
              icon="stats-chart-outline"
              verdict={results.forecast.verdict}
              detail={
                results.forecast.baseCase?.fiveYearReturn != null
                  ? `Base case return: ${(results.forecast.baseCase.fiveYearReturn * 100).toFixed(1)}%`
                  : undefined
              }
            />
          )}

          {results?.trends && (
            <ModuleCard
              title="Neighbourhood Trends"
              icon="map-outline"
              verdict={results.trends.verdict}
              detail={
                results.trends.quarterlyChange != null
                  ? `Quarterly change: ${results.trends.quarterlyChange > 0 ? "+" : ""}${(results.trends.quarterlyChange * 100).toFixed(1)}%`
                  : undefined
              }
            />
          )}

          {results?.liquidity ? (
            <ModuleCard
              title="Liquidity Score"
              icon="water-outline"
              score={results.liquidity.liquidityScore}
              verdict={results.liquidity.verdict}
            />
          ) : (
            <ModuleCard
              title="Liquidity Score"
              icon="water-outline"
              locked
            />
          )}
        </Animated.View>
      )}
    </ScrollView>
  );
}

function ConfidenceBadge({ confidence }: { confidence: ConfidenceLevel }) {
  const cfg = {
    high: { label: "High Confidence", color: "#22C55E", bg: "#22C55E18" },
    medium: { label: "Medium Confidence", color: "#d97706", bg: "#d9770618" },
    low: { label: "Low Confidence", color: "#EF4444", bg: "#EF444418" },
  }[confidence];

  return (
    <View style={[confidenceBadgeStyle.pill, { backgroundColor: cfg.bg }]}>
      <View style={[confidenceBadgeStyle.dot, { backgroundColor: cfg.color }]} />
      <Text style={[confidenceBadgeStyle.label, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

const confidenceBadgeStyle = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 6,
    alignSelf: "flex-start",
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontSize: 11, fontFamily: "DMSans_600SemiBold", fontWeight: "600" },
});

function isPriceFainessStale(dataFreshnessDate: string): boolean {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  return new Date(dataFreshnessDate) < sixMonthsAgo;
}

function isComparableStale(transactionDate: string): boolean {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  return new Date(transactionDate) < sixMonthsAgo;
}

function formatFreshnessDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

function formatComparableDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function getScoreColor(score: number, colors: ReturnType<typeof useColors>) {
  if (score >= 70) return colors.primary;
  if (score >= 45) return colors.accent;
  return colors.destructive;
}

function getVerdict(score: number) {
  if (score >= 80) return "Strong Buy";
  if (score >= 65) return "Attractive";
  if (score >= 50) return "Fair Value";
  if (score >= 35) return "Caution";
  return "Avoid";
}

function makeStyles(colors: ReturnType<typeof useColors>, topPad: number) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: {
      paddingTop: topPad + 8,
      paddingHorizontal: 20,
      paddingBottom: 100,
    },
    center: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const, gap: 12 },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: colors.card,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    propertyCard: {
      borderRadius: 14,
      borderWidth: 1,
      padding: 16,
      marginBottom: 16,
    },
    community: {
      fontSize: 20,
      fontWeight: "700" as const,
      color: colors.foreground,
      marginBottom: 4,
      fontFamily: "DMSans_700Bold",
    },
    propMeta: { fontSize: 13, color: colors.mutedForeground, marginBottom: 6, textTransform: "capitalize" as const },
    price: {
      fontSize: 18,
      fontWeight: "700" as const,
      color: colors.accent,
      fontFamily: "JetBrainsMono_400Regular",
    },
    priceSub: { fontSize: 13, color: colors.mutedForeground, fontFamily: "DMSans_400Regular" },
    pendingCard: {
      borderRadius: 14,
      borderWidth: 1,
      padding: 28,
      alignItems: "center" as const,
      gap: 12,
      marginBottom: 16,
    },
    pendingTitle: {
      fontSize: 18,
      fontWeight: "600" as const,
      fontFamily: "DMSans_600SemiBold",
    },
    pendingSubtitle: { fontSize: 13, textAlign: "center" as const, lineHeight: 20 },
    scoreCard: {
      borderRadius: 14,
      borderWidth: 1,
      padding: 20,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 20,
      marginBottom: 24,
    },
    scoreRight: { flex: 1 },
    scoreLabel: {
      fontSize: 12,
      color: colors.mutedForeground,
      textTransform: "uppercase" as const,
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    scoreVerdict: {
      fontSize: 22,
      fontWeight: "700" as const,
      marginBottom: 4,
      fontFamily: "DMSans_700Bold",
    },
    scoreSub: { fontSize: 12 },
    modulesTitle: {
      fontSize: 16,
      fontWeight: "600" as const,
      color: colors.foreground,
      marginBottom: 14,
    },
    errorText: { fontSize: 16, fontWeight: "600" as const, textAlign: "center" as const },
    retryBtn: { borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
    retryBtnText: { color: "#FFFFFF", fontWeight: "600" as const, fontSize: 15 },
    staleFootnote: {
      flexDirection: "row" as const,
      alignItems: "flex-start" as const,
      gap: 8,
      borderRadius: 10,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 16,
    },
    staleFootnoteText: {
      flex: 1,
      fontSize: 12,
      lineHeight: 18,
      fontFamily: "DMSans_400Regular",
    },
    comparablesToggle: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 6,
      borderRadius: 8,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 9,
      marginBottom: 2,
    },
    comparablesToggleText: {
      fontSize: 13,
      fontFamily: "DMSans_600SemiBold",
      fontWeight: "600" as const,
    },
    comparablesPanel: {
      borderRadius: 10,
      borderWidth: 1,
      overflow: "hidden" as const,
      marginTop: 4,
      marginBottom: 2,
    },
    comparableRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      paddingHorizontal: 14,
      paddingVertical: 11,
      gap: 10,
    },
    comparableMain: {
      flex: 1,
      gap: 2,
    },
    comparableTopRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 6,
    },
    comparableCommunity: {
      fontSize: 13,
      fontFamily: "DMSans_600SemiBold",
      fontWeight: "600" as const,
      flex: 1,
    },
    comparableMeta: {
      fontSize: 11,
      lineHeight: 15,
    },
    comparablePsf: {
      fontSize: 12,
      fontWeight: "600" as const,
      textAlign: "right" as const,
    },
    staleBadge: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 3,
      backgroundColor: "#92400e22",
      borderRadius: 4,
      paddingHorizontal: 5,
      paddingVertical: 2,
    },
    staleBadgeText: {
      fontSize: 10,
      color: "#d97706",
      fontFamily: "DMSans_600SemiBold",
      fontWeight: "600" as const,
    },
  });
}
