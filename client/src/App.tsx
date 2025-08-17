import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GameProvider } from "@/contexts/GameContext";
import NotFound from "@/pages/not-found";
import GamePage from "@/pages/GamePage";
import TestDataPage from "@/pages/TestData";

function Router() {
  return (
    <Switch>
      <Route path="/" component={GamePage} />
      <Route path="/test-data" component={TestDataPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GameProvider>
        <TooltipProvider>
          <ErrorBoundary>
            <Toaster />
            <Router />
          </ErrorBoundary>
        </TooltipProvider>
      </GameProvider>
    </QueryClientProvider>
  );
}

export default App;