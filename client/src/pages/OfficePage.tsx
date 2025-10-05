import GameLayout from '@/layouts/GameLayout';

export default function OfficePage() {
  return (
    <GameLayout>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-white/60">
            The Office
          </div>
          <h1 className="mt-4 text-3xl font-heading font-bold text-white">Headquarters</h1>
        </header>

        <section
          className="relative overflow-hidden rounded-3xl border border-[#d99696]/30 bg-[#120910]/90 min-h-[420px] bg-cover bg-center"
          style={{ backgroundImage: "url('/theoffice_background.png')" }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#2a1624]/70 via-transparent to-[#1b0e19]/80" aria-hidden />
          <div className="absolute -top-32 -right-16 h-72 w-72 rounded-full bg-[#a75a5b]/20 blur-3xl" aria-hidden />
          <div className="absolute -bottom-40 -left-10 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" aria-hidden />
          <div className="relative flex h-full items-center justify-center">
            <div className="h-full w-full bg-black/30" />
          </div>
        </section>
      </main>
    </GameLayout>
  );
}
