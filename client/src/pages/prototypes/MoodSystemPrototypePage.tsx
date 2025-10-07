import { MoodSystemPrototype } from '@/components/ux-prototypes/MoodSystemPrototype';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';

/**
 * MoodSystemPrototypePage - Wrapper page for MoodSystemPrototype component
 *
 * Task: 1.7 - Register MoodSystemPrototype in routing
 */
export default function MoodSystemPrototypePage() {
  return (
    <div className="min-h-screen bg-black">
      <div className="sticky top-0 z-10 bg-black/95 border-b border-white/10 p-4">
        <div className="container mx-auto">
          <Link href="/prototypes">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Prototypes
            </Button>
          </Link>
        </div>
      </div>
      <MoodSystemPrototype />
    </div>
  );
}
