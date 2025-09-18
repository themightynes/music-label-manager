import { SignInButton, SignUpButton } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0D060F] text-slate-100 flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <img src="/logo4.png" alt="Music Label Manager" className="h-10 w-auto" />
          <div className="font-semibold text-lg tracking-tight">Music Label Manager</div>
        </div>
        <div className="flex gap-3">
          <SignInButton mode="modal">
            <Button variant="ghost" className="border border-white/10 bg-transparent hover:bg-white/10 text-white">
              Sign in
            </Button>
          </SignInButton>
          <SignUpButton mode="modal">
            <Button className="bg-[#A75A5B] hover:bg-[#D07A7C] border-0 text-white">
              Get started
            </Button>
          </SignUpButton>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-3xl space-y-12">
          <div className="space-y-6">
            <p className="uppercase tracking-[0.4em] text-sm text-white/60">Run the label. Shape the charts.</p>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
              Lead your artists, drop chart-topping hits, and grow the most influential label in the industry.
            </h1>
            <p className="text-lg text-white/70">
              Assemble your roster, plan releases, tour the world, and navigate the business side of music month after month.
              Sign in with Clerk to pick up exactly where you left off.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <SignUpButton mode="modal">
              <Button size="lg" className="bg-[#A75A5B] hover:bg-[#D07A7C] border-0 text-white flex items-center gap-2">
                Create your label
                <ArrowRight className="h-4 w-4" />
              </Button>
            </SignUpButton>
            <SignInButton mode="modal">
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border border-white/10 text-white hover:bg-white/10"
              >
                I already have an account
              </Button>
            </SignInButton>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left text-white/70">
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h3 className="text-white font-semibold mb-2">Strategic Management</h3>
              <p className="text-sm">
                Scout artists, balance budgets, and plan monthly actions to keep your roster thriving.
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h3 className="text-white font-semibold mb-2">Dynamic Release Planner</h3>
              <p className="text-sm">
                Produce, market, and release singles or tours while tracking ROI and chart performance.
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h3 className="text-white font-semibold mb-2">Persistent Progress</h3>
              <p className="text-sm">
                Clerk-authenticated profiles ensure your label saves, analytics, and rosters travel with you.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="px-6 py-8 text-sm text-white/50 border-t border-white/10">
        Secure authentication provided by Clerk. Gameplay data is stored privately per account.
      </footer>
    </div>
  );
}

export default LandingPage;
