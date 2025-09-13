import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GameProvider } from "@/contexts/GameContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import NotFound from "@/pages/not-found";
import GamePage from "@/pages/GamePage";
import TestDataPage from "@/pages/TestData";
import LoginPage from "@/pages/LoginPage";
import PlanReleasePage from "@/pages/PlanReleasePage";
import ArtistPage from "@/pages/ArtistPage";
import QualityTester from "@/pages/QualityTester";
import ToursTest from "@/pages/ToursTest";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-yellow-500 text-xl">🎵 Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <Switch>
      <Route path="/" component={GamePage} />
      <Route path="/plan-release" component={PlanReleasePage} />
      <Route path="/artist/:artistId" component={ArtistPage} />
      <Route path="/quality-tester" component={QualityTester} />
      <Route path="/tours-test" component={ToursTest} />
      <Route path="/test-data" component={TestDataPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <GameProvider>
          <TooltipProvider>
            <ErrorBoundary>
              <Toaster />
              <Router />
            </ErrorBoundary>
          </TooltipProvider>
        </GameProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;