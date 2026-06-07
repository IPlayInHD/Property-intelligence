import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";

import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import Dashboard from "@/pages/dashboard";
import Listings from "@/pages/listings";
import ListingDetail from "@/pages/listing-detail";
import AnalysisDetails from "@/pages/analysis-details";
import Account from "@/pages/account";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function ProtectedRouteWithLayout({ component: Component }: { component: React.ComponentType }) {
  return (
    <ProtectedRoute>
      <AppLayout>
        <Component />
      </AppLayout>
    </ProtectedRoute>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      
      <Route path="/dashboard">
        {() => <ProtectedRouteWithLayout component={Dashboard} />}
      </Route>
      <Route path="/listings">
        {() => <ProtectedRouteWithLayout component={Listings} />}
      </Route>
      <Route path="/listings/:id">
        {() => <ProtectedRouteWithLayout component={ListingDetail} />}
      </Route>
      <Route path="/analysis/history">
        {() => <ProtectedRouteWithLayout component={Dashboard} />}
      </Route>
      <Route path="/analysis/:id">
        {() => <ProtectedRouteWithLayout component={AnalysisDetails} />}
      </Route>
      <Route path="/account">
        {() => <ProtectedRouteWithLayout component={Account} />}
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
