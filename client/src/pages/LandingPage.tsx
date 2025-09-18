import { SignInButton, SignUpButton } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';

function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between">
        <div className="text-xl font-semibold tracking-tight">Music Label Manager</div>
        <div className="flex gap-3">
          <SignInButton mode="modal">
            <Button variant="secondary">Sign in</Button>
          </SignInButton>
          <SignUpButton mode="modal">
            <Button>Get started</Button>
          </SignUpButton>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center space-y-8">
        <div className="space-y-4 max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Run the label. Shape the charts.
          </h1>
          <p className="text-lg text-slate-300">
            Assemble your roster, plan releases, and strategize month-over-month to grow your music empire.
            Sign in with Clerk to sync progress across devices instantly.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <SignUpButton mode="modal">
            <Button size="lg">Create a free account</Button>
          </SignUpButton>
          <SignInButton mode="modal">
            <Button size="lg" variant="outline" className="bg-transparent border-slate-700 text-slate-100 hover:bg-slate-800">
              I already have an account
            </Button>
          </SignInButton>
        </div>
      </main>

      <footer className="px-6 py-8 text-sm text-slate-500">
        Secure authentication provided by Clerk. Gameplay data is stored privately per account.
      </footer>
    </div>
  );
}

export default LandingPage;
