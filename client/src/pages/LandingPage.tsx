import { SignInButton, SignUpButton } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { HoloDisc } from '@/components/ui/holo-disc';
import { ArrowRight, LogIn } from 'lucide-react';

function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-surface-app text-text-primary flex flex-col">
      {/* ── Backdrop stack (spec §9 / §8) ───────────────────────────────── */}
      <div className="backdrop-stack">
        {/* base vignette */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(80% 70% at 50% 46%, rgba(21,10,20,0.9) 0%, rgba(10,5,16,0.9) 48%, #050308 80%, #030205 100%)',
          }}
        />
        {/* vertical fractal-glass reeded refraction (poster tier — splash only) */}
        <div className="absolute inset-0 overflow-hidden opacity-[0.5] animate-ds-bloom">
          <div
            className="absolute -inset-[4%]"
            style={{
              filter: 'saturate(1.15)',
              background:
                'radial-gradient(120% 82% at 14% 44%, #37d6ff 0%, transparent 46%), radial-gradient(110% 90% at 42% 66%, #ff3d6e 0%, transparent 50%), radial-gradient(120% 100% at 72% 40%, #ff9a3d 0%, transparent 48%), radial-gradient(120% 92% at 96% 58%, #4a6bff 0%, transparent 52%), radial-gradient(90% 80% at 60% 14%, #a05af0 0%, transparent 46%)',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'repeating-linear-gradient(90deg, rgba(255,255,255,0.14) 0px, rgba(255,255,255,0.02) 2px, rgba(0,0,0,0.34) 5px, rgba(0,0,0,0.04) 8px, rgba(255,255,255,0.14) 10px)',
            }}
          />
          <div
            className="absolute inset-0 mix-blend-overlay"
            style={{
              background:
                'repeating-linear-gradient(90deg, transparent 0px, rgba(120,200,255,0.26) 2px, transparent 5px, rgba(255,120,180,0.22) 8px, transparent 10px)',
            }}
          />
        </div>
        {/* darkening center scrim so content reads on top */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(66% 66% at 50% 46%, rgba(5,3,8,0.7) 0%, rgba(5,3,8,0.45) 45%, rgba(3,1,5,0.8) 100%)',
          }}
        />
        <div className="backdrop-dotgrid" />
        {/* edge vignette crush */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(80% 80% at 50% 48%, transparent 40%, rgba(3,1,5,0.85) 100%)',
          }}
        />
      </div>
      <div className="backdrop-grain" />

      {/* HUD corner ticks (gold — splash-only accent, spec §8) */}
      <div className="pointer-events-none absolute top-6 left-6 h-8 w-8 border-t-[1.5px] border-l-[1.5px] border-[rgba(212,163,115,0.55)]" />
      <div className="pointer-events-none absolute top-6 right-6 h-8 w-8 border-t-[1.5px] border-r-[1.5px] border-[rgba(212,163,115,0.55)]" />
      <div className="pointer-events-none absolute bottom-6 left-6 h-8 w-8 border-b-[1.5px] border-l-[1.5px] border-[rgba(212,163,115,0.55)]" />
      <div className="pointer-events-none absolute bottom-6 right-6 h-8 w-8 border-b-[1.5px] border-r-[1.5px] border-[rgba(212,163,115,0.55)]" />

      {/* top HUD strip */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6 font-mono text-[11px] uppercase tracking-[0.28em] text-text-muted">
        <div className="flex items-center gap-3">
          <img src="/logo4.png" alt="Music Label Manager" className="h-8 w-auto" />
          <span>Music Label Manager</span>
        </div>
        <div className="hidden sm:block">est. mmxxvi</div>
      </header>

      {/* ── Center stage ────────────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center gap-7 px-6 py-10 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.5em] text-money pl-2">
          a record label simulation
        </p>

        <HoloDisc size={360} spinSeconds={32} className="w-[min(44vmin,360px)] h-[min(44vmin,360px)]" />

        <h1 className="font-display text-aberration text-[clamp(26px,4vw,46px)] leading-[0.92] font-normal text-text-primary tracking-tight">
          music label manager
        </h1>

        <p className="max-w-lg font-sans text-sm font-light uppercase tracking-[0.3em] text-text-body">
          Run the label. Shape the charts.
        </p>

        {/* diegetic prompt / auth row */}
        <div className="flex flex-col items-center gap-4 pt-2">
          <SignInButton mode="modal">
            <button className="group flex items-center gap-3 rounded-button border border-[rgba(212,163,115,0.6)] bg-[rgba(212,163,115,0.06)] px-5 py-2.5 font-mono text-[13px] uppercase tracking-[0.22em] text-text-primary shadow-[inset_0_0_12px_rgba(212,163,115,0.15),0_0_14px_rgba(212,163,115,0.12)] transition-colors hover:bg-[rgba(212,163,115,0.12)]">
              <LogIn className="h-4 w-4 text-money" aria-hidden="true" />
              <span>press</span>
              <span className="rounded-chip border border-[rgba(212,163,115,0.6)] px-2.5 py-1 text-money">
                enter
              </span>
              <span>to begin</span>
              <span
                className="ml-0.5 inline-block h-[18px] w-[10px] animate-pulse bg-money shadow-[0_0_10px_rgba(212,163,115,0.7)]"
                aria-hidden="true"
              />
            </button>
          </SignInButton>

          <SignUpButton mode="modal">
            <Button
              size="lg"
              variant="ghost"
              className="gap-2 font-mono text-xs uppercase tracking-[0.24em] text-text-muted hover:text-text-primary"
            >
              new label
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </SignUpButton>
        </div>
      </main>

      {/* bottom strip */}
      <footer className="relative z-10 px-8 py-6 text-center font-mono text-[11px] uppercase tracking-[0.24em] text-text-muted">
        Secure authentication provided by Clerk. Gameplay data is stored privately per account.
      </footer>
    </div>
  );
}

export default LandingPage;
