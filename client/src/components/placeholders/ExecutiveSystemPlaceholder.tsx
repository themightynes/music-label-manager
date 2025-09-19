import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

// TODO: Rebuild executive meeting system with the planned XState implementation.
export function ExecutiveSystemPlaceholder() {
  return (
    <Card className="h-full border-dashed border-[#4e324c] bg-[#2C222A]/60">
      <CardHeader className="flex flex-row items-start gap-3">
        <div className="w-10 h-10 rounded-md bg-[#3c252d]/60 flex items-center justify-center text-[#A75A5B]">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <CardTitle className="text-white">Executive System Placeholder</CardTitle>
          <CardDescription className="text-white/70">
            Executive meetings and dialogue have been temporarily removed while we rework the system.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-white/70">
        <p>
          Historical data files and backend schema remain available for reference. The upcoming rebuild will
          shift to an XState-driven experience with streamlined meeting flow.
        </p>
        <p className="text-xs text-white/50">
          Added on 2025-09-19 after removing the legacy executive UI. Track follow-up tasks before re-enabling
          interactions here.
        </p>
      </CardContent>
    </Card>
  );
}
