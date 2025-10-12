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
import ExecutiveSuitePage from "@/pages/ExecutiveSuitePage";
import AROfficePage from "@/pages/AROffice";
import OfficePage from "@/pages/OfficePage";
import QualityTester from "@/pages/QualityTester";
import TourVarianceTesterPage from "@/pages/TourVarianceTesterPage";
import PopularityTester from "@/pages/PopularityTester";
import StreamingDecayTester from "@/pages/StreamingDecayTester";
import ToursTest from "@/pages/ToursTest";
import Top100ChartPage from "@/pages/Top100ChartPage";
import MarketsEditor from "@/pages/MarketsEditor";
import LandingPage from "@/pages/LandingPage";
import RecordingSessionPage from "@/pages/RecordingSessionPage";
import LivePerformancePage from "@/pages/LivePerformancePage";
import BugReportsPage from '@/pages/BugReportsPage';
import UXPrototypesPage from '@/pages/UXPrototypesPage';
import MoodSystemPrototypePage from '@/pages/prototypes/MoodSystemPrototypePage';
import AdminHome from "@/admin/AdminLayout";
import ActionsViewer from "@/admin/ActionsViewer";
import { withAdmin } from "@/admin/withAdmin";

function Router() {
  return (
    <Switch>
      <Route path="/" component={GamePage} />
      <Route path="/plan-release" component={PlanReleasePage} />
      <Route path="/artists" component={ArtistsLandingPage} />
      <Route path="/artist/:artistParam" component={ArtistPage} />
      <Route path="/executives" component={ExecutiveSuitePage} />
      <Route path="/ar-office" component={AROfficePage} />
      <Route path="/office" component={OfficePage} />
      <Route path="/recording-session" component={RecordingSessionPage} />
      <Route path="/live-performance" component={LivePerformancePage} />

      {/* Admin routes */}
      <Route path="/admin" component={withAdmin(AdminHome)} />
      <Route path="/admin/actions-viewer" component={withAdmin(ActionsViewer)} />
      <Route path="/admin/quality-tester" component={withAdmin(QualityTester)} />
      <Route path="/admin/tour-variance-tester" component={withAdmin(TourVarianceTesterPage)} />
      <Route path="/admin/popularity-tester" component={withAdmin(PopularityTester)} />
      <Route path="/admin/streaming-decay-tester" component={withAdmin(StreamingDecayTester)} />
      <Route path="/admin/markets-editor" component={withAdmin(MarketsEditor)} />
      <Route path="/admin/test-data" component={withAdmin(TestDataPage)} />
      <Route path="/admin/tours-test" component={withAdmin(ToursTest)} />
      <Route path="/admin/bug-reports" component={withAdmin(BugReportsPage)} />

      {/* Prototype routes */}
      <Route path="/prototypes" component={withAdmin(UXPrototypesPage)} />
      <Route path="/prototypes/mood-system" component={withAdmin(MoodSystemPrototypePage)} />

      {/* Legacy dev routes gated */}
      <Route path="/quality-tester" component={withAdmin(QualityTester)} />
      <Route path="/tour-variance-tester" component={withAdmin(TourVarianceTesterPage)} />
      <Route path="/popularity-tester" component={withAdmin(PopularityTester)} />
      <Route path="/streaming-decay-tester" component={withAdmin(StreamingDecayTester)} />
      <Route path="/tours-test" component={withAdmin(ToursTest)} />
      <Route path="/test-data" component={withAdmin(TestDataPage)} />
      <Route path="/markets-editor" component={withAdmin(MarketsEditor)} />

      <Route path="/charts/top100" component={Top100ChartPage} />
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
