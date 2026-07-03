import { Building2 } from 'lucide-react';
import GameLayout from '@/layouts/GameLayout';

export default function OfficePage() {
  return (
    <GameLayout>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="mb-10 flex items-start justify-between">
          <div>
            <span className="block font-mono text-[10px] uppercase tracking-[0.28em] text-text-label mb-1.5">
              Headquarters
            </span>
            <h1 className="font-display text-aberration text-[clamp(20px,2.4vw,28px)] font-normal text-text-primary tracking-tight">
              The Office
            </h1>
            <div className="shimmer-bar w-24 mt-2" />
          </div>
        </header>

        <section className="glass-panel chromatic-hairline min-h-[420px] flex items-center justify-center">
          <div className="flex flex-col items-center text-center px-6 py-16">
            <div className="flex h-[52px] w-[52px] items-center justify-center rounded-[14px] bg-neon-lilac/[0.12] border border-neon-lilac/30 shadow-glow-lilac">
              <Building2 className="h-6 w-6 text-neon-lilac" aria-hidden />
            </div>
            <h2 className="mt-5 text-sm font-semibold text-text-primary">
              The Office is under construction
            </h2>
            <p className="mt-2 max-w-sm text-[12.5px] leading-relaxed text-text-muted font-sans">
              This space will house your label's headquarters — check back soon for staff, upgrades, and daily operations.
            </p>
          </div>
        </section>
      </main>
    </GameLayout>
  );
}
