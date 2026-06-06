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

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError("Please fill in all fields");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(
        `https://${process.env.EXPO_PUBLIC_DOMAIN}/api/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
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

        <Text style={s.heading}>Welcome back</Text>
        <Text style={s.subheading}>Sign in to your investor account</Text>

        {error && (
          <View style={s.errorBox}>
            <Ionicons name="alert-circle" size={16} color={colors.destructive} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

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
              testID="email-input"
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
              placeholder="••••••••"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry={!showPassword}
              testID="password-input"
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

        <Pressable
          style={({ pressed }) => [s.btn, { opacity: pressed ? 0.8 : 1 }]}
          onPress={handleLogin}
          disabled={loading}
          testID="login-btn"
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={s.btnText}>Sign In</Text>
          )}
        </Pressable>

        <View style={s.footer}>
          <Text style={s.footerText}>Don't have an account? </Text>
          <Link href="/(auth)/register" asChild>
            <Pressable>
              <Text style={[s.footerText, { color: colors.primary }]}>Create one</Text>
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
      paddingTop: topPad + 40,
      paddingHorizontal: 24,
      paddingBottom: 40,
    },
    logoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 40,
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
      marginBottom: 32,
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
