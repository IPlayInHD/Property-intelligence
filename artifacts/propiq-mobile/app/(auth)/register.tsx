import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Link, router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const ROLES = [
  { value: "investor", label: "Investor" },
  { value: "agent", label: "Agent" },
  { value: "buyer", label: "Buyer" },
  { value: "general", label: "General" },
];

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("investor");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  async function handleRegister() {
    if (!fullName.trim() || !email.trim() || !password) {
      setError("Please fill in all fields");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(
        `https://${process.env.EXPO_PUBLIC_DOMAIN}/api/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: fullName.trim(),
            email: email.trim().toLowerCase(),
            password,
            role,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed");
        return;
      }
      await login(data.user, data.token);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const s = makeStyles(colors, topPad);

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.logoRow}>
          <View style={s.logoMark}>
            <Ionicons name="analytics" size={28} color={colors.primary} />
          </View>
          <Text style={s.logoText}>PropIQ</Text>
        </View>

        <Text style={s.heading}>Create account</Text>
        <Text style={s.subheading}>Start analysing UAE properties</Text>

        {error && (
          <View style={s.errorBox}>
            <Ionicons name="alert-circle" size={16} color={colors.destructive} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        <View style={s.field}>
          <Text style={s.label}>Full Name</Text>
          <View style={[s.inputWrap, { borderColor: fullName ? colors.primary : colors.border }]}>
            <Ionicons name="person-outline" size={18} color={colors.mutedForeground} />
            <TextInput
              style={s.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your name"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="words"
            />
          </View>
        </View>

        <View style={s.field}>
          <Text style={s.label}>Email</Text>
          <View style={[s.inputWrap, { borderColor: email ? colors.primary : colors.border }]}>
            <Ionicons name="mail-outline" size={18} color={colors.mutedForeground} />
            <TextInput
              style={s.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        <View style={s.field}>
          <Text style={s.label}>Password</Text>
          <View style={[s.inputWrap, { borderColor: password ? colors.primary : colors.border }]}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.mutedForeground} />
            <TextInput
              style={s.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Min 8 characters"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry={!showPassword}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={18}
                color={colors.mutedForeground}
              />
            </Pressable>
          </View>
        </View>

        <View style={s.field}>
          <Text style={s.label}>I am a...</Text>
          <View style={s.roleRow}>
            {ROLES.map((r) => (
              <Pressable
                key={r.value}
                onPress={() => setRole(r.value)}
                style={[
                  s.roleBtn,
                  {
                    borderColor: role === r.value ? colors.primary : colors.border,
                    backgroundColor: role === r.value ? "rgba(10,138,138,0.12)" : colors.card,
                  },
                ]}
              >
                <Text
                  style={[
                    s.roleBtnText,
                    { color: role === r.value ? colors.primary : colors.mutedForeground },
                  ]}
                >
                  {r.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [s.btn, { opacity: pressed ? 0.8 : 1 }]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={s.btnText}>Create Account</Text>
          )}
        </Pressable>

        <View style={s.footer}>
          <Text style={s.footerText}>Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text style={[s.footerText, { color: colors.primary }]}>Sign in</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>, topPad: number) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    scroll: {
      flexGrow: 1,
      paddingTop: topPad + 24,
      paddingHorizontal: 24,
      paddingBottom: 40,
    },
    logoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 32,
    },
    logoMark: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    logoText: {
      fontSize: 22,
      fontWeight: "700" as const,
      color: colors.foreground,
      fontFamily: "DMSans_700Bold",
    },
    heading: {
      fontSize: 28,
      fontWeight: "700" as const,
      color: colors.foreground,
      marginBottom: 6,
      fontFamily: "DMSans_700Bold",
    },
    subheading: {
      fontSize: 15,
      color: colors.mutedForeground,
      marginBottom: 28,
    },
    errorBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: "rgba(239,68,68,0.12)",
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
    },
    errorText: { color: colors.destructive, fontSize: 13, flex: 1 },
    field: { marginBottom: 16 },
    label: {
      fontSize: 13,
      color: colors.mutedForeground,
      marginBottom: 8,
      fontWeight: "500" as const,
    },
    inputWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    input: {
      flex: 1,
      color: colors.foreground,
      fontSize: 15,
      fontFamily: "DMSans_400Regular",
    },
    roleRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    roleBtn: {
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    roleBtnText: {
      fontSize: 13,
      fontWeight: "500" as const,
    },
    btn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 15,
      alignItems: "center",
      marginTop: 8,
      marginBottom: 24,
    },
    btnText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "600" as const,
      fontFamily: "DMSans_600SemiBold",
    },
    footer: {
      flexDirection: "row",
      justifyContent: "center",
    },
    footerText: {
      color: colors.mutedForeground,
      fontSize: 14,
    },
  });
}
