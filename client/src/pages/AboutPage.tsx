import { Fragment, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import { HELP_PREAMBLE, HELP_TOPICS, HELP_TERMS } from '@/lib/helpTopics';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

/**
 * Inline scanning-cue renderer (about-help slice 3). Splits copy on
 * `[[key]]` / `[[key|Display Text]]` tokens and renders known HELP_TERMS
 * keys with their game-matching color treatment. Unknown keys degrade to
 * plain text defensively — content is a data contract, not a hard type.
 */
const TERM_TOKEN = /\[\[([a-z-]+)(?:\|([^\]]+))?\]\]/g;

function HelpText({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  TERM_TOKEN.lastIndex = 0;
  while ((match = TERM_TOKEN.exec(text)) !== null) {
    const [full, termKey, display] = match;
    if (match.index > lastIndex) {
      nodes.push(<Fragment key={key++}>{text.slice(lastIndex, match.index)}</Fragment>);
    }
    const term = HELP_TERMS[termKey];
    if (term) {
      nodes.push(
        <span key={key++} className={term.inlineClassName}>
          {display ?? term.label}
        </span>
      );
    } else {
      // Defensive: unknown key — render literally so a typo doesn't vanish text.
      nodes.push(<Fragment key={key++}>{display ?? full}</Fragment>);
    }
    lastIndex = match.index + full.length;
  }
  if (lastIndex < text.length) {
    nodes.push(<Fragment key={key++}>{text.slice(lastIndex)}</Fragment>);
  }
  return <>{nodes}</>;
}

/** Small header chip showing a term's icon + label, matching its in-game hue. */
function TermChip({ termKey }: { termKey: string }) {
  const term = HELP_TERMS[termKey];
  if (!term) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-pill border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide leading-none ${chipClassName(termKey)}`}
    >
      {term.icon && <span aria-hidden="true">{term.icon}</span>}
      {term.label}
    </span>
  );
}

/** Chip container classes per term — mirrors the game's real chip treatments (e.g. SongBuzzChip). */
function chipClassName(termKey: string): string {
  switch (termKey) {
    case 'buzz':
    case 'awareness':
      return 'text-neon-cyan bg-neon-cyan/10 border-neon-cyan/40';
    case 'money':
    case 'hype':
      return 'text-money bg-money/10 border-money/40';
    case 'creative-capital':
      return 'text-text-accent bg-text-accent/10 border-text-accent/40';
    case 'reputation':
    default:
      return 'text-text-primary bg-white/5 border-white/15';
  }
}

/**
 * About page — reachable from the MAIN MENU, possibly before any game exists.
 * Deliberately NOT wrapped in <GameLayout>: GameLayout's GameHeader assumes an
 * active game (balance chip, week/date, Advance Week button), which doesn't
 * exist at this entry point. Instead this follows the MainMenuPage/LandingPage
 * shell precedent — full-screen backdrop + its own slim header/footer.
 *
 * Content is sourced entirely from client/src/lib/helpTopics.ts (HELP_PREAMBLE +
 * HELP_TOPICS) — this page renders that data, it does not author new copy
 * beyond the short game blurb and structural labels below.
 */
export default function AboutPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="relative min-h-screen flex flex-col bg-surface-app text-text-primary overflow-hidden">
      {/* Backdrop stack (same idiom as MainMenuPage) */}
      <div className="backdrop-stack">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(80% 70% at 50% 20%, rgba(21,10,20,0.85) 0%, rgba(10,5,16,0.9) 48%, #050308 80%, #030205 100%)',
          }}
        />
        <div className="backdrop-bloom" />
        <div className="backdrop-dotgrid" />
        <div className="backdrop-scrim" />
      </div>
      <div className="backdrop-grain" />

      {/* one restrained blur-blob accent */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-[420px] w-[420px] rounded-full opacity-20 blur-[120px]"
        style={{ background: 'radial-gradient(circle, rgba(255,154,61,0.5) 0%, transparent 70%)' }}
      />

      {/* HUD corner ticks (spec §8, matches MainMenuPage) */}
      <div className="pointer-events-none absolute top-6 left-6 h-8 w-8 border-t-[1.5px] border-l-[1.5px] border-[rgba(212,163,115,0.55)]" />
      <div className="pointer-events-none absolute top-6 right-6 h-8 w-8 border-t-[1.5px] border-r-[1.5px] border-[rgba(212,163,115,0.55)]" />
      <div className="pointer-events-none absolute bottom-6 left-6 h-8 w-8 border-b-[1.5px] border-l-[1.5px] border-[rgba(212,163,115,0.55)]" />
      <div className="pointer-events-none absolute bottom-6 right-6 h-8 w-8 border-b-[1.5px] border-r-[1.5px] border-[rgba(212,163,115,0.55)]" />

      {/* Slim header */}
      <header className="relative z-10 flex items-center justify-between px-8 sm:px-12 pt-8 pb-2">
        <button
          onClick={() => {
            // Reachable from BOTH the main menu and the in-game dock's More menu —
            // go back to wherever the player came from; fall back to the main menu
            // when opened directly (no in-app history).
            if (window.history.length > 1) {
              window.history.back();
            } else {
              setLocation('/');
            }
          }}
          className="font-mono text-[12px] uppercase tracking-[0.22em] text-text-muted hover:text-money transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(212,163,115,0.7)] rounded-sm"
        >
          ◂ Back
        </button>
      </header>

      {/* Content */}
      <main className="relative z-10 flex-1 w-full max-w-3xl mx-auto px-6 sm:px-8 py-10">
        <div className="mb-10">
          <span className="block font-mono text-[10px] uppercase tracking-[0.28em] text-text-label mb-1.5">
            Music Label Manager
          </span>
          <h1 className="font-display text-aberration text-[clamp(26px,4vw,40px)] font-normal text-text-primary tracking-tight">
            About
          </h1>
          <div className="shimmer-bar w-24 mt-2" />
        </div>

        <p className="text-sm sm:text-[15px] leading-relaxed text-text-body font-sans mb-12">
          Music Label Manager puts you in charge of an independent record label for a fifty-two-week
          campaign. Sign artists, get songs recorded, plan and market releases, send acts on tour, and
          watch your reputation and the charts tell you whether it's working.
        </p>

        <section aria-labelledby="guide-heading" className="mb-6">
          <span className="block font-mono text-[10px] uppercase tracking-[0.28em] text-text-label mb-1.5">
            How to Play
          </span>
          <h2
            id="guide-heading"
            className="font-display text-[clamp(19px,2.4vw,24px)] font-normal text-text-primary tracking-tight"
          >
            The Label Head's Guide
          </h2>
          <div className="shimmer-bar w-16 mt-2" />
        </section>

        {/* Preamble — the exec's welcome letter, styled slightly distinct */}
        <div className="glass-panel chromatic-hairline border-neon-amber/30 rounded-lg p-6 sm:p-7 mb-8">
          <h3 className="font-display text-[16px] sm:text-[17px] text-neon-amber tracking-tight mb-3">
            {HELP_PREAMBLE.title}
          </h3>
          <div className="space-y-3">
            {HELP_PREAMBLE.body.map((paragraph, i) => (
              <p key={i} className="text-[13.5px] sm:text-sm leading-relaxed text-text-body font-sans">
                <HelpText text={paragraph} />
              </p>
            ))}
          </div>
        </div>

        {/* Topics — pure map over HELP_TOPICS, in array order */}
        <Accordion type="single" collapsible className="glass-panel chromatic-hairline rounded-lg px-5 sm:px-6">
          {HELP_TOPICS.map((topic) => (
            <AccordionItem key={topic.id} value={topic.id} className="border-white/10">
              <AccordionTrigger className="font-display text-[15px] sm:text-base text-text-primary hover:no-underline hover:text-money">
                <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-left">
                  <span>{topic.title}</span>
                  {topic.terms && topic.terms.length > 0 && (
                    <span className="flex flex-wrap items-center gap-1">
                      {topic.terms.map((termKey) => (
                        <TermChip key={termKey} termKey={termKey} />
                      ))}
                    </span>
                  )}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <p className="text-[13.5px] sm:text-sm font-semibold text-text-primary leading-relaxed">
                    <HelpText text={topic.tldr} />
                  </p>
                  <p className="text-[13px] sm:text-[13.5px] italic text-text-muted leading-relaxed">
                    <HelpText text={topic.hook} />
                  </p>
                  <div className="space-y-3">
                    {topic.body.map((paragraph, i) => (
                      <p key={i} className="text-[13.5px] sm:text-sm leading-relaxed text-text-body font-sans max-w-[62ch]">
                        <HelpText text={paragraph} />
                      </p>
                    ))}
                  </div>
                  <div>
                    <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-text-label mb-2">
                      Rules of the game
                    </span>
                    <ul className="space-y-1.5">
                      {topic.rules.map((rule, i) => (
                        <li key={i} className="flex gap-2 text-[13px] sm:text-[13.5px] leading-relaxed text-text-body font-sans">
                          <span aria-hidden="true" className="text-neon-amber shrink-0">▸</span>
                          <span><HelpText text={rule} /></span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {topic.veteranNotes && topic.veteranNotes.length > 0 && (
                    <Collapsible className="pt-1">
                      <CollapsibleTrigger className="group flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.2em] text-text-muted hover:text-money transition-colors duration-200 focus:outline-none">
                        <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        Veteran's notes
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-3 space-y-3 border-l-2 border-neon-amber/30 pl-4">
                        {topic.veteranNotes.map((paragraph, i) => (
                          <p key={i} className="text-[13px] sm:text-[13.5px] leading-relaxed text-text-muted font-sans max-w-[62ch]">
                            <HelpText text={paragraph} />
                          </p>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </main>

      {/* Footer */}
      <footer className="relative z-10 flex items-center justify-center px-8 sm:px-12 pt-4 pb-10 font-mono text-[10px] uppercase tracking-[0.24em] text-text-muted">
        <span>© {new Date().getFullYear()} music label manager</span>
      </footer>
    </div>
  );
}
