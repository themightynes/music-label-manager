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

      <main
        className="flex-1 flex flex-col items-center justify-center px-6 text-center relative"
        style={{
          backgroundImage: 'url(/backround_splash.png)',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover'
        }}
      >
        {/* Overlay to ensure text readability */}
        <div className="absolute inset-0 bg-[#0D060F]/30"></div>

        <div className="max-w-3xl space-y-8 relative z-10 mb-20 mr-80 text-left">
          <div className="space-y-6">
            <p className="uppercase tracking-[0.4em] text-sm text-white/60">Run the label. Shape the charts.</p>
            <h1 className="text-4xl md:text-4xl font-bold tracking-tight text-white">
              Lead your artists, drop chart-topping hits, and grow the most influential label in the industry.
            </h1>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
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
        </div>
      </main>

      <footer className="px-6 py-8 text-sm text-white/50 border-t border-white/10 text-center">
        Secure authentication provided by Clerk. Gameplay data is stored privately per account.
      </footer>
    </div>
  );
}

export default LandingPage;
