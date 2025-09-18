import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { ClerkLoaded, ClerkLoading, SignedIn, SignedOut } from '@clerk/clerk-react';
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GameProvider } from "@/contexts/GameContext";
import NotFound from "@/pages/not-found";
import GamePage from "@/pages/GamePage";
import TestDataPage from "@/pages/TestData";
import PlanReleasePage from "@/pages/PlanReleasePage";
import ArtistsLandingPage from "@/pages/ArtistsLandingPage";
import ArtistPage from "@/pages/ArtistPage";
import QualityTester from "@/pages/QualityTester";
import ToursTest from "@/pages/ToursTest";
import Top100ChartPage from "@/pages/Top100ChartPage";
import LandingPage from "@/pages/LandingPage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={GamePage} />
      <Route path="/plan-release" component={PlanReleasePage} />
      <Route path="/artists" component={ArtistsLandingPage} />
      <Route path="/artist/:artistId" component={ArtistPage} />
      <Route path="/quality-tester" component={QualityTester} />
      <Route path="/charts/top100" component={Top100ChartPage} />
      <Route path="/tours-test" component={ToursTest} />
      <Route path="/test-data" component={TestDataPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ClerkLoading>
        <div className="min-h-screen flex items-center justify-center bg-black text-white">
          <div className="text-yellow-500 text-xl">🎵 Connecting to Clerk...</div>
        </div>
      </ClerkLoading>
      <ClerkLoaded>
        <SignedIn>
          <GameProvider>
            <TooltipProvider>
              <ErrorBoundary>
                <Toaster />
                <Router />
              </ErrorBoundary>
            </TooltipProvider>
          </GameProvider>
        </SignedIn>
        <SignedOut>
          <LandingPage />
        </SignedOut>
      </ClerkLoaded>
    </QueryClientProvider>
  );
}

export default App;
