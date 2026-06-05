import { useState } from "react";
import {
  useGetUserProfile, getGetUserProfileQueryKey,
  useUpdateUserProfile,
  useGetUserSubscription, getGetUserSubscriptionQueryKey,
  useUpgradePlan, UpgradeInputPlan,
  useGetAnalysisHistory, getGetAnalysisHistoryQueryKey,
  useDeleteAnalysis,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { CheckCircle2, User, CreditCard, Clock, ExternalLink, Trash2 } from "lucide-react";

const profileSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  role: z.enum(["investor", "agent", "buyer", "general"]),
});

type ProfileForm = z.infer<typeof profileSchema>;

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "Free",
    priceNote: "forever",
    features: ["5 analyses/month", "3 modules", "Price Fairness", "QoL Score", "Neighbourhood Trends", "Community data"],
    locked: ["Forecast", "Rental Yield", "Liquidity Score"],
    color: "#7A94B4",
  },
  {
    id: "analyst",
    name: "Analyst",
    price: "AED 30",
    priceNote: "/month",
    features: ["100 analyses/month", "5 modules", "Everything in Starter", "Future Valuation Forecast", "True Rental Yield", "Priority support"],
    locked: ["Liquidity Score (Pro only)"],
    color: "#0A8A8A",
    recommended: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: "AED 150",
    priceNote: "/month",
    features: ["Unlimited analyses", "All 6 modules", "Everything in Analyst", "Liquidity Score", "PDF reports (no watermark)", "API access (soon)"],
    locked: [],
    color: "#C8960C",
  },
];

export default function Account() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [upgradingTo, setUpgradingTo] = useState<string | null>(null);

  const { data: profile, isLoading: profileLoading } = useGetUserProfile({
    query: { queryKey: getGetUserProfileQueryKey() },
  });

  const { data: subscription, isLoading: subLoading } = useGetUserSubscription({
    query: { queryKey: getGetUserSubscriptionQueryKey() },
  });

  const { data: history, isLoading: historyLoading } = useGetAnalysisHistory({
    query: { queryKey: getGetAnalysisHistoryQueryKey() },
  });

  const updateProfile = useUpdateUserProfile();
  const upgradePlan = useUpgradePlan();
  const deleteAnalysis = useDeleteAnalysis();

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profile?.fullName ?? "",
      role: (profile?.role as ProfileForm["role"]) ?? "investor",
    },
    values: {
      fullName: profile?.fullName ?? "",
      role: (profile?.role as ProfileForm["role"]) ?? "investor",
    },
  });

  const onProfileSubmit = async (values: ProfileForm) => {
    await updateProfile.mutateAsync({ data: values });
    queryClient.invalidateQueries({ queryKey: getGetUserProfileQueryKey() });
    toast({ title: "Profile updated" });
  };

  const handleUpgrade = async (planId: string) => {
    setUpgradingTo(planId);
    try {
      await upgradePlan.mutateAsync({ data: { plan: planId as UpgradeInputPlan } });
      queryClient.invalidateQueries({ queryKey: getGetUserSubscriptionQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetUserProfileQueryKey() });
      toast({ title: `Upgraded to ${planId} plan` });
    } catch {
      toast({ title: "Upgrade failed", description: "Please try again", variant: "destructive" });
    } finally {
      setUpgradingTo(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this analysis?")) return;
    await deleteAnalysis.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getGetAnalysisHistoryQueryKey() });
    toast({ title: "Analysis deleted" });
  };

  const analysesLimit = subscription?.analysesLimit ?? 5;
  const analysesUsed = subscription?.analysesUsedThisMonth ?? 0;
  const usagePct = analysesLimit ? (analysesUsed / analysesLimit) * 100 : 0;
  const currentPlan = subscription?.plan ?? "starter";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-8 max-w-5xl mx-auto space-y-8"
    >
      <h1 className="text-3xl font-serif font-bold">Account</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column */}
        <div className="space-y-6">
          {/* Profile form */}
          <Card className="bg-card/80 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-primary" />
                Profile Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profileLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onProfileSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-fullname" className="bg-background/50" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-role">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="investor">Investor</SelectItem>
                              <SelectItem value="agent">Real Estate Agent</SelectItem>
                              <SelectItem value="buyer">First-time Buyer</SelectItem>
                              <SelectItem value="general">General</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="text-sm font-mono">{profile?.email}</p>
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={updateProfile.isPending}
                      data-testid="button-save-profile"
                    >
                      {updateProfile.isPending ? "Saving…" : "Save Changes"}
                    </Button>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>

          {/* Current Plan */}
          <Card className="bg-card/80 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="h-5 w-5 text-primary" />
                Current Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {subLoading ? <Skeleton className="h-20 w-full" /> : (
                <>
                  <div className="flex items-center justify-between">
                    <Badge className="text-sm capitalize" variant="outline">{currentPlan} Plan</Badge>
                    {subscription?.planResetDate && (
                      <p className="text-xs text-muted-foreground">
                        Resets {new Date(subscription.planResetDate).toLocaleDateString("en-AE")}
                      </p>
                    )}
                  </div>
                  {analysesLimit !== null && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Analyses used this month</span>
                        <span className="font-mono">{analysesUsed} / {analysesLimit}</span>
                      </div>
                      <Progress value={usagePct} className="h-2" />
                    </div>
                  )}
                  {analysesLimit === null && (
                    <p className="text-sm text-success flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" /> Unlimited analyses
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Sign out */}
          <Button
            variant="outline"
            className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
            onClick={() => { logout(); }}
            data-testid="button-logout"
          >
            Sign Out
          </Button>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upgrade Plans */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLANS.map((plan) => {
              const isCurrent = currentPlan === plan.id;
              const isDowngrade = ["starter", "analyst", "pro"].indexOf(plan.id) < ["starter", "analyst", "pro"].indexOf(currentPlan);

              return (
                <Card
                  key={plan.id}
                  className={`relative bg-card/80 border-border/50 ${plan.recommended ? "ring-1 ring-primary" : ""}`}
                >
                  {plan.recommended && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground text-xs">Most Popular</Badge>
                    </div>
                  )}
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base" style={{ color: plan.color }}>{plan.name}</CardTitle>
                    <div>
                      <span className="font-mono text-2xl font-bold">{plan.price}</span>
                      <span className="text-xs text-muted-foreground ml-1">{plan.priceNote}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ul className="space-y-1.5">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-1.5 text-xs">
                          <CheckCircle2 className="h-3.5 w-3.5 text-success mt-0.5 flex-shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                      {plan.locked.map((f) => (
                        <li key={f} className="flex items-start gap-1.5 text-xs text-muted-foreground/50 line-through">
                          <span className="h-3.5 w-3.5 mt-0.5 flex-shrink-0">×</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant={isCurrent ? "outline" : "default"}
                      size="sm"
                      className="w-full"
                      disabled={isCurrent || upgradingTo !== null}
                      onClick={() => !isCurrent && !isDowngrade && handleUpgrade(plan.id)}
                      data-testid={`button-plan-${plan.id}`}
                    >
                      {isCurrent ? "Current Plan" : isDowngrade ? "Downgrade" : upgradingTo === plan.id ? "Processing…" : "Upgrade"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Analysis History */}
          <Card className="bg-card/80 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5 text-primary" />
                Analysis History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : !history?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="mb-3">No analyses yet.</p>
                  <Link href="/analysis/new">
                    <Button variant="outline" size="sm">Run Your First Analysis</Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2 py-3"
                      data-testid={`row-analysis-${item.id}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {(item.bedrooms as number) === 0 ? "Studio" : `${item.bedrooms} BR`} {item.propertyType} — {item.community}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(item.createdAt as string).toLocaleDateString("en-AE")} ·
                          {item.listedPrice ? ` AED ${(item.listedPrice as number).toLocaleString()}` : ""} ·
                          Score: {item.overallScore ?? "pending"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Badge
                          variant="outline"
                          className={`text-xs ${item.status === "complete" ? "border-success/30 text-success" : item.status === "failed" ? "border-destructive/30 text-destructive" : "border-warning/30 text-warning"}`}
                        >
                          {item.status as string}
                        </Badge>
                        <Link href={`/analysis/${item.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" data-testid={`link-analysis-${item.id}`}>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive/60 hover:text-destructive"
                          onClick={() => handleDelete(item.id as string)}
                          data-testid={`button-delete-${item.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
