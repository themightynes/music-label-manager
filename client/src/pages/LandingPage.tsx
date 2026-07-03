import { SignInButton, SignUpButton } from '@clerk/clerk-react';
import { HoloDisc } from '@/components/ui/holo-disc';

const orbitBase =
  'group whitespace-nowrap font-mono text-[13px] uppercase tracking-[0.22em] transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(212,163,115,0.7)] rounded-sm';
const orbitPrimary = `${orbitBase} text-money [text-shadow:0_0_14px_rgba(212,163,115,0.45)] hover:[text-shadow:0_0_20px_rgba(212,163,115,0.7)]`;
const orbitMuted = `${orbitBase} text-text-muted hover:text-money focus-visible:text-money hover:[text-shadow:0_0_14px_rgba(212,163,115,0.45)] focus-visible:[text-shadow:0_0_14px_rgba(212,163,115,0.45)]`;

/** decorative connector (dot + thin line) pointing from the option toward the disc */
function Connector({ side }: { side: 'left' | 'right' }) {
  return (
    <span aria-hidden="true" className="pointer-events-none flex items-center">
      {side === 'right' && (
        <>
          <span className="h-px w-7 bg-[rgba(212,163,115,0.35)]" />
          <span className="mx-1.5 h-1 w-1 rounded-full bg-[rgba(212,163,115,0.55)]" />
        </>
      )}
      {side === 'left' && (
        <>
          <span className="mx-1.5 h-1 w-1 rounded-full bg-[rgba(212,163,115,0.55)]" />
          <span className="h-px w-7 bg-[rgba(212,163,115,0.35)]" />
        </>
      )}
    </span>
  );
}

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
        {/* optional liquid-chrome photo at splash dim (0.22 per splash-disc.html) — tolerates absence */}
        <img
          src="/liquid-chrome-bg.jpg"
          alt=""
          aria-hidden="true"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
          className="absolute inset-0 h-full w-full object-cover opacity-[0.22]"
          style={{ filter: 'saturate(1.05) brightness(0.9)' }}
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
      <header className="relative z-10 flex items-center justify-between px-12 pt-10 pb-4 font-mono text-[11px] uppercase tracking-[0.28em] text-text-muted">
        <div className="flex items-center gap-3">
          <HoloDisc size={34} spinSeconds={20} />
          <span className="font-display text-sm lowercase normal-case tracking-normal text-text-primary">
            music label manager
          </span>
        </div>
        <div className="hidden sm:block">est. mmxxvi</div>
      </header>

      {/* ── Center stage ────────────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center gap-7 px-6 py-10 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.5em] text-money pl-2">
          a record label simulation
        </p>

        {/* THE DISC + orbiting auth actions (md+) */}
        <div className="relative hidden md:block">
          <HoloDisc size={360} spinSeconds={32} grooves />
          {/* Sign In — left of the wheel (0°), primary gold */}
          <SignInButton mode="modal">
            <button
              className={`absolute top-1/2 -translate-y-1/2 flex items-center ${orbitPrimary}`}
              style={{ right: 'calc(100% + 28px)' }}
            >
              <span>▸ sign in</span>
              <Connector side="left" />
            </button>
          </SignInButton>
          {/* Sign Up — right of the wheel (0°) */}
          <SignUpButton mode="modal">
            <button
              className={`absolute top-1/2 -translate-y-1/2 flex items-center ${orbitMuted}`}
              style={{ left: 'calc(100% + 28px)' }}
            >
              <Connector side="right" />
              <span>
                <span
                  aria-hidden="true"
                  className="opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
                >
                  ▸{' '}
                </span>
                new label · sign up
              </span>
            </button>
          </SignUpButton>
        </div>

        {/* Smaller disc for narrow screens */}
        <div className="md:hidden">
          <HoloDisc size={200} spinSeconds={32} grooves />
        </div>

        <h1 className="font-display text-aberration text-[clamp(26px,4vw,46px)] leading-[0.92] font-normal text-text-primary tracking-tight">
          music label manager
        </h1>

        <p className="max-w-lg font-sans text-sm font-light uppercase tracking-[0.3em] text-text-body">
          Run the label. Shape the charts.
        </p>

        {/* Below-md fallback: auth actions stack under the wordmark */}
        <div className="md:hidden flex flex-col items-center gap-4 pt-2">
          <SignInButton mode="modal">
            <button className={orbitPrimary}>▸ sign in</button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className={orbitMuted}>new label · sign up</button>
          </SignUpButton>
        </div>
      </main>

      {/* bottom strip */}
      <footer className="relative z-10 px-12 pt-4 pb-10 text-center font-mono text-[11px] uppercase tracking-[0.24em] text-text-muted">
        Secure authentication provided by Clerk. Gameplay data is stored privately per account.
      </footer>
    </div>
  );
}

export default LandingPage;
