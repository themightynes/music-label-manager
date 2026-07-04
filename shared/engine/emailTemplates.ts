/**
 * Email Narrative templates — Phase 1.
 *
 * Per-category, per-mood-band narrative content for executive emails. Each
 * template returns a { subject, greeting, narrative, signOff, quirk? } bundle in
 * the sending executive's voice, staying inside that exec's length budget and
 * quirk set (see the Character Bible + Storytelling Guide).
 *
 * These are PURE functions of their inputs plus a deterministic `pick`/`flag`
 * closure supplied by the caller (EmailGenerator). They never touch RNG or
 * Math.random(), so identical inputs yield byte-identical output.
 *
 * Length budgets (guide §"Email Length by Executive"):
 *   Mac (head_ar):        50–150 words, short/urgent/emotional
 *   Sam (cmo):            100–250 words, strategic/narrative
 *   Dante (cco):          75–200 words, poetic/abstract
 *   Pat (head_distribution): 150–400 words, detailed/data-heavy
 */

import type { MoodBand } from "./emailNarrative";

export interface NarrativeParts {
  subject: string;
  /** Salutation line, e.g. "Boss—" or "[PLAYER NAME]," */
  greeting: string;
  /** Body paragraphs, already joined with "\n\n". */
  narrative: string;
  /** Sign-off line(s), e.g. "Trust the ears,\n- Mac" */
  signOff: string;
  /** Optional trailing quirk line (timestamp, P.S., dashboard footer). */
  quirk?: string;
}

/** Deterministic selection helpers handed in by the generator. */
export interface Picker {
  pick<T>(variants: readonly T[], discriminator?: string): T;
  flag(discriminator?: string, denominator?: number): boolean;
  timestamp(): string;
}

const PLAYER = "Boss"; // Guide uses "[PLAYER NAME]"; the label CEO is addressed generically.

function money(n: number | null | undefined): string {
  const v = typeof n === "number" && !Number.isNaN(n) ? n : 0;
  return `$${Math.round(v).toLocaleString("en-US")}`;
}

// ---------------------------------------------------------------------------
// SIGN-OFFS by exec + mood band (guide §"Executive Email Signatures").
// ---------------------------------------------------------------------------

export const SIGN_OFFS: Record<
  "head_ar" | "cmo" | "cco" | "head_distribution",
  Record<MoodBand, string[]>
> = {
  head_ar: {
    excellent: ["Trust the ears,\n- Mac", "The hunt continues,\n- M"],
    good: ["Keep digging,\n- Mac"],
    neutral: ["More to come,\n- Mac Rodriguez"],
    poor: ["Hope this one works out,\n- Mac"],
    terrible: ["Doing my best,\n- Mac"],
  },
  cmo: {
    excellent: ["We own the narrative,\n- Sam"],
    good: ["Strategic as always,\n- SC"],
    neutral: ["By the numbers,\n- Samara Chen"],
    poor: ["Damage control mode,\n- Sam"],
    terrible: ["Calls not being returned,\n- SC"],
  },
  cco: {
    excellent: ["Channeling frequencies,\n- D-Wave 🎵"],
    good: ["In harmony,\n- Dante"],
    neutral: ["Sonically yours,\n- D"],
    poor: ["Finding the signal,\n- DW"],
    terrible: ["Frequency lost,\n- Dante"],
  },
  head_distribution: {
    excellent: ["Optimal outcomes ahead,\n- Dr. Williams"],
    good: ["Executing efficiently,\n- Pat"],
    neutral: ["Per our projections,\n- Patricia Williams, PhD"],
    poor: ["Debugging in progress,\n- PW"],
    terrible: ["System reset needed,\n- Pat"],
  },
};

function signOff(
  role: keyof typeof SIGN_OFFS,
  band: MoodBand,
  picker: Picker,
): string {
  return picker.pick(SIGN_OFFS[role][band], `signoff-${role}-${band}`);
}

// ---------------------------------------------------------------------------
// Subject-line mood affixes (guide §"Mood-Based Subject Line Patterns").
// ---------------------------------------------------------------------------

const SUBJECT_PREFIX: Record<MoodBand, string[]> = {
  excellent: ["BREAKING: ", "EXCLUSIVE: "],
  good: [""],
  neutral: ["Update: "],
  poor: ["Regarding: "],
  terrible: ["Status: "],
};

function moodSubject(base: string, band: MoodBand, picker: Picker, disc: string): string {
  const prefix = picker.pick(SUBJECT_PREFIX[band], `subjprefix-${disc}-${band}`);
  return `${prefix}${base}`;
}

// ===========================================================================
// 1. ARTIST DISCOVERY — Mac (head_ar), category "ar"
// ===========================================================================

export interface DiscoveryVars {
  artistName: string;
  genre: string;
  archetype: string;
  talent: number;
  signingCost: number | null;
  weeklyCost: number | null;
  scoutingLocation: string;
}

export function discoveryTemplate(band: MoodBand, v: DiscoveryVars, picker: Picker): NarrativeParts {
  const stats = `Talent Level: ${v.talent}/100\nSigning Cost: ${money(v.signingCost)}\nWeekly: ${money(v.weeklyCost)}`;
  const isTuesday = picker.flag("tuesday", 4);
  const tuesdayLine = isTuesday
    ? "I know, I know—Tuesday signing. Breaking my own rule for this one.\n\n"
    : "";

  switch (band) {
    case "excellent":
      return {
        subject: `Artist Discovery – ${v.artistName}`,
        greeting: `${PLAYER}—`,
        narrative:
          `I haven't slept. Didn't need to.\n\n` +
          tuesdayLine +
          `Found ${v.artistName} at ${v.scoutingLocation} last night. ${v.genre} with ${v.archetype} energy. This is what I've been hunting for since the one that got away.\n\n` +
          `${stats}\n\n` +
          `My vintage speakers don't lie. This is it.`,
        signOff: signOff("head_ar", band, picker),
        quirk: picker.timestamp(),
      };
    case "good":
      return {
        subject: `Artist Discovery – ${v.artistName}`,
        greeting: `${PLAYER},`,
        narrative:
          tuesdayLine +
          `Solid find this week. Caught ${v.artistName} at ${v.scoutingLocation}—${v.genre}, ${v.archetype}. The scene's buzzing and my ears are tuned in.\n\n` +
          `${stats}\n\n` +
          `Ran them through the vintage rig. They hold up. Worth a real look.`,
        signOff: signOff("head_ar", band, picker),
      };
    case "neutral":
      return {
        subject: `Artist Discovery – ${v.artistName}`,
        greeting: `${PLAYER},`,
        narrative:
          `It's a numbers game, and here's this week's number.\n\n` +
          `${v.artistName} – ${v.genre}, ${v.archetype}. Found them at ${v.scoutingLocation}.\n\n` +
          `${stats}\n\n` +
          `Not a slam dunk, not a pass. Your call.`,
        signOff: signOff("head_ar", band, picker),
      };
    case "poor":
      return {
        subject: `Artist Discovery – ${v.artistName}`,
        greeting: `${PLAYER},`,
        narrative:
          `Another week, another find. Not sure if my ear's working right anymore, but here's what I got:\n\n` +
          `${v.artistName} – ${v.genre}, ${v.archetype}\nNumbers: ${v.talent} talent, ${money(v.signingCost)} signing, ${money(v.weeklyCost)} weekly\n\n` +
          `Maybe they're good. Maybe I'm just hearing what I want to hear. You decide.`,
        signOff: signOff("head_ar", band, picker),
      };
    case "terrible":
    default:
      return {
        subject: `Artist Discovery – ${v.artistName}`,
        greeting: `${PLAYER},`,
        narrative:
          `Everything sounds like noise lately. But I've got obligations, so here's what I have:\n\n` +
          `${v.artistName} – ${v.genre}, ${v.archetype}\nNumbers: ${v.talent} talent, ${money(v.signingCost)} signing, ${money(v.weeklyCost)} weekly\n\n` +
          `I'm not going to oversell it. Take a look yourself.`,
        signOff: signOff("head_ar", band, picker),
      };
  }
}

// ===========================================================================
// 2. CHART UPDATES — Sam (cmo), category "chart"
// ===========================================================================

export interface ChartVars {
  songTitle: string;
  artistName: string;
  position: number;
  movement: number;
  weeksOnChart: number;
  isNumberOneDebut: boolean;
}

export function chartTemplate(band: MoodBand, v: ChartVars, picker: Picker): NarrativeParts {
  const chartData =
    `Chart Data:\n• Position: #${v.position}\n• Movement: ${v.movement === 0 ? "New entry" : v.movement > 0 ? `Up ${v.movement}` : `Down ${Math.abs(v.movement)}`}\n• Weeks on chart: ${v.weeksOnChart}`;

  if (v.isNumberOneDebut) {
    // #1 debut is always high-excitement regardless of band, but tone shifts.
    switch (band) {
      case "excellent":
      case "good":
        return {
          subject: moodSubject(`#1 DEBUT – "${v.songTitle}"`, "excellent", picker, "chart1"),
          greeting: `${PLAYER},`,
          narrative:
            `We just made history.\n\n` +
            `"${v.songTitle}" by ${v.artistName} debuted at #1. Not #10. Not #5. #1.\n\n` +
            `Every major outlet wants the story. I'm fielding calls while writing this. The narrative writes itself, but I'm writing it anyway—our way.\n\n` +
            `${chartData}\n\n` +
            `This is the kind of moment that defines a label.`,
          signOff: signOff("cmo", "excellent", picker),
          quirk: picker.flag("pitchfork", 2)
            ? `P.S. – Pitchfork's calling it "the arrival of a new era." They're not wrong.`
            : `P.S. – Three story angles already drafted. We control this one end to end.`,
        };
      default:
        return {
          subject: `#1 Debut – "${v.songTitle}"`,
          greeting: `${PLAYER},`,
          narrative:
            `A #1 debut. I'll be honest—I didn't see the numbers lining up this way, but "${v.songTitle}" by ${v.artistName} landed at the top.\n\n` +
            `${chartData}\n\n` +
            `The coverage window is open. I'm working the phones to make sure we don't waste it, even if I'm doing it uphill this week.`,
          signOff: signOff("cmo", band, picker),
        };
    }
  }

  // Top-10 (non-#1) debut.
  switch (band) {
    case "excellent":
      return {
        subject: moodSubject(`Top 10 Entry – "${v.songTitle}" at #${v.position}`, band, picker, "chart10"),
        greeting: `${PLAYER},`,
        narrative:
          `Top ten, first week. "${v.songTitle}" by ${v.artistName} hit #${v.position} out of the gate.\n\n` +
          `${chartData}\n\n` +
          `Every journalist owes me a favor and I'm calling them all in. We announce, we amplify, we own the conversation. Perfect timing—slow news cycle means maximum coverage.`,
        signOff: signOff("cmo", band, picker),
      };
    case "good":
      return {
        subject: `Top 10 Entry – "${v.songTitle}" at #${v.position}`,
        greeting: `${PLAYER},`,
        narrative:
          `Strong debut. "${v.songTitle}" entered at #${v.position}.\n\n` +
          `${chartData}\n\n` +
          `The media's hungry and I'm the chef. I've got a rollout ready to serve—we're not defending this position, we're fortifying it.`,
        signOff: signOff("cmo", band, picker),
      };
    case "neutral":
      return {
        subject: `Top 10 Entry – "${v.songTitle}" at #${v.position}`,
        greeting: `${PLAYER},`,
        narrative:
          `Solid debut for "${v.songTitle}" – #${v.position} position.\n\n` +
          `${chartData}\n\n` +
          `Standard coverage expected. I'll coordinate the rollout per our playbook.`,
        signOff: signOff("cmo", band, picker),
      };
    case "poor":
      return {
        subject: moodSubject(`Top 10 Entry – "${v.songTitle}" at #${v.position}`, band, picker, "chart10"),
        greeting: `${PLAYER},`,
        narrative:
          `"${v.songTitle}" charted at #${v.position}. On paper that's a win.\n\n` +
          `${chartData}\n\n` +
          `I'll be straight with you—we're playing defense on the coverage right now. The narrative's been getting away from us, but I can still work an angle here.`,
        signOff: signOff("cmo", band, picker),
      };
    case "terrible":
    default:
      return {
        subject: moodSubject(`Top 10 Entry – "${v.songTitle}" at #${v.position}`, "terrible", picker, "chart10"),
        greeting: `${PLAYER},`,
        narrative:
          `A chart entry has been recorded for "${v.songTitle}" at #${v.position}.\n\n` +
          `${chartData}\n\n` +
          `Coverage will be pursued through available channels. I should be candid: several of my contacts are not returning calls at present, which will limit the reach of any outreach.`,
        signOff: signOff("cmo", band, picker),
      };
  }
}

// ===========================================================================
// 3. TOUR COMPLETION — Pat (head_distribution), category "artist"
//    NOTE: subject keeps the substring "Tour Metrics" for good/neutral moods so
//    downstream detection (and existing tests) still match.
// ===========================================================================

export interface TourVars {
  description: string;
  tourName: string;
  grossRevenue: number;
  totalCosts: number | null;
  netProfit: number | null;
  efficiency: number; // deterministic 0-100 narrative figure
  variance: number; // deterministic +/- % narrative figure
}

export function tourTemplate(band: MoodBand, v: TourVars, picker: Picker): NarrativeParts {
  const isProfit = (v.netProfit ?? v.grossRevenue) >= 0;
  const metrics =
    `TOUR: ${v.tourName}\nGROSS REVENUE: ${money(v.grossRevenue)}\n` +
    (v.totalCosts !== null ? `TOTAL COSTS: ${money(v.totalCosts)}\n` : "") +
    (v.netProfit !== null ? `NET ${isProfit ? "PROFIT" : "LOSS"}: ${money(Math.abs(v.netProfit))}\n` : "") +
    `EFFICIENCY RATING: ${v.efficiency.toFixed(1)}%`;

  const footer = (accuracy: number) =>
    `---\nDashboard updated with full breakdown\nPredictive model accuracy: ${accuracy.toFixed(1)}%`;

  switch (band) {
    case "excellent":
      return {
        subject: `Tour Metrics – ${v.tourName} Completed`,
        greeting: `${PLAYER},`,
        narrative:
          `Tour metrics are in. System performance exceeded projections by ${Math.abs(v.variance).toFixed(0)}%.\n\n` +
          `${metrics}\n\n` +
          `Every variable aligned—venue capacity optimization, routing efficiency, merchandise conversion rates all hit target ranges. Well within acceptable parameters.\n\n` +
          footer(97.2),
        signOff: signOff("head_distribution", band, picker),
        quirk: picker.flag("celebrate", 3) ? "Scheduled 15-minute celebration block at 3:45 PM." : undefined,
      };
    case "good":
      return {
        subject: `Tour Metrics – ${v.tourName} Completed`,
        greeting: `${PLAYER},`,
        narrative:
          `Tour metrics are in. Multiple pathways showed positive ROI and the numbers confirm it.\n\n` +
          `${metrics}\n\n` +
          `Routing and merchandise conversion landed inside projected bands. Nothing to debug here—clean execution.\n\n` +
          footer(93.4),
        signOff: signOff("head_distribution", band, picker),
      };
    case "neutral":
      return {
        subject: `Tour Metrics – ${v.tourName} Report`,
        greeting: `${PLAYER},`,
        narrative:
          `Tour completed. Metrics recorded within margin of error.\n\n` +
          `${metrics}\n\n` +
          `Predictable outcome relative to the distribution model. Full breakdown is on the dashboard.\n\n` +
          footer(90.0),
        signOff: signOff("head_distribution", band, picker),
      };
    case "poor":
      return {
        subject: `Tour Performance Update – ${v.tourName}`,
        greeting: `${PLAYER},`,
        narrative:
          `Tour completed. Numbers below projections.\n\n` +
          `${metrics}\nVariance: ${v.variance.toFixed(0)}%\n\n` +
          `I've identified several variables that contributed to underperformance:\n• Routing inefficiency\n• Venue capacity mismatch\n• Merchandise conversion lag\n\n` +
          `Corrective algorithms in development.\n\n` +
          `---\nFull analysis available on dashboard`,
        signOff: signOff("head_distribution", band, picker),
      };
    case "terrible":
    default:
      return {
        subject: `Tour Performance Update – ${v.tourName}`,
        greeting: `${PLAYER},`,
        narrative:
          `Tour performance has been logged. Results fell outside the confidence interval.\n\n` +
          `${metrics}\nVariance: ${v.variance.toFixed(0)}%\n\n` +
          `A comprehensive review has been initiated. Every projection missed; the model requires recalibration from the ground up.\n\n` +
          `---\nEmergency dashboard audit in progress\nConfidence interval: Collapsed`,
        signOff: signOff("head_distribution", band, picker),
      };
  }
}

// ===========================================================================
// 4. SONG RELEASE — Pat (head_distribution), category "artist"
// ===========================================================================

export interface ReleaseVars {
  description: string;
  algorithmConfidence: number;
  chartProbability: number;
}

export function releaseTemplate(band: MoodBand, v: ReleaseVars, picker: Picker): NarrativeParts {
  const footer = `---\nReal-time metrics available on dashboard\nPrediction confidence: ${v.algorithmConfidence.toFixed(1)}%`;

  switch (band) {
    case "excellent":
    case "good":
      return {
        subject: `${v.description} – Distribution Complete`,
        greeting: `${PLAYER},`,
        narrative:
          `Release executed successfully. All systems green.\n\n` +
          `${v.description}\n\n` +
          `Algorithmic projections indicate ${v.chartProbability.toFixed(0)}% probability of chart entry within 3 weeks. Early streaming data incoming—monitoring key performance indicators now.\n\n` +
          footer,
        signOff: signOff("head_distribution", band, picker),
      };
    case "neutral":
      return {
        subject: `${v.description} – Distribution Complete`,
        greeting: `${PLAYER},`,
        narrative:
          `Release executed. Distribution pipeline nominal.\n\n` +
          `${v.description}\n\n` +
          `Model projects ${v.chartProbability.toFixed(0)}% probability of chart entry within 3 weeks—within standard range for this profile.\n\n` +
          footer,
        signOff: signOff("head_distribution", band, picker),
      };
    case "poor":
    case "terrible":
    default:
      return {
        subject: `${v.description} – Distribution Status`,
        greeting: `${PLAYER},`,
        narrative:
          `Release has gone live. Distribution completed, though the pipeline showed friction this cycle.\n\n` +
          `${v.description}\n\n` +
          `Model confidence is degraded; projected chart-entry probability of ${v.chartProbability.toFixed(0)}% carries a wider error band than I'd like. Monitoring closely.\n\n` +
          footer,
        signOff: signOff("head_distribution", band, picker),
      };
  }
}

// ===========================================================================
// 5. TIER UNLOCKS — sender varies by tier type, category "financial"
// ===========================================================================

export type TierKind = "playlist" | "press" | "producer" | "venue";

export interface TierVars {
  description: string;
  kind: TierKind;
}

export function tierTemplate(
  band: MoodBand,
  v: TierVars,
  picker: Picker,
): NarrativeParts {
  switch (v.kind) {
    case "playlist":
      return {
        subject: `Playlist Tier Unlocked – ${v.description}`,
        greeting: `${PLAYER},`,
        narrative:
          `Revenue threshold achieved. New distribution tier unlocked.\n\n` +
          `TIER: ${v.description}\n\n` +
          `New capabilities are live:\n• Expanded playlist access\n• Higher inclusion probability\n\n` +
          `System automatically grants access. No action required.`,
        signOff: signOff("head_distribution", band === "excellent" ? "excellent" : band, picker),
      };
    case "press":
      return {
        subject: `Press Tier Unlocked – ${v.description}`,
        greeting: `${PLAYER},`,
        narrative:
          `You just opened doors most labels take years to access.\n\n` +
          `NEW TIER: ${v.description}\n\n` +
          `Translation? We can now pitch to publications that actually move markets. This isn't just press access—it's narrative control at scale.`,
        signOff: signOff("cmo", band, picker),
        quirk: picker.flag("angles", 2) ? "P.S. – Already have three story angles ready to deploy." : undefined,
      };
    case "producer":
      return {
        subject: `Producer Access Unlocked – ${v.description}`,
        greeting: `${PLAYER},`,
        narrative:
          `The universe rewards alignment.\n\n` +
          `TIER UNLOCKED: ${v.description}\n\n` +
          `These aren't just producers—they're sonic architects who speak the language of hits. This frequency is tuned to commercial success while maintaining artistic integrity.\n\n` +
          `Creation awaits.`,
        signOff: signOff("cco", band, picker),
      };
    case "venue":
    default:
      return {
        subject: `Venue Tier Unlocked – ${v.description}`,
        greeting: `${PLAYER},`,
        narrative:
          `Capacity threshold cleared. New venue tier is online.\n\n` +
          `TIER: ${v.description}\n\n` +
          `Larger rooms, better routing math, higher gross ceilings. The dashboard reflects the new booking parameters.`,
        signOff: signOff("head_distribution", band, picker),
      };
  }
}

// ===========================================================================
// 6. FINANCIAL SUMMARY — Finance Department (no exec), category "financial"
//    No exec mood; banded on the week's profitability instead.
// ===========================================================================

export interface FinancialVars {
  week: number;
  revenue: number;
  expenses: number;
  net: number;
  streams: number;
}

export function financialTemplate(v: FinancialVars): NarrativeParts {
  const isProfit = v.net >= 0;
  const expenseRatio = v.revenue > 0 ? (v.expenses / v.revenue) * 100 : 0;

  if (isProfit) {
    return {
      subject: `Week ${v.week} Financial Summary`,
      greeting: `Financial Report – Week ${v.week}`,
      narrative:
        `REVENUE: ${money(v.revenue)}\nEXPENSES: ${money(v.expenses)}\nNET: +${money(v.net)}\n\n` +
        `Performance Indicators:\n` +
        `✓ Expense ratio: ${expenseRatio.toFixed(0)}% (target: <70%)\n` +
        `✓ Cash flow: Positive\n` +
        (v.streams > 0 ? `✓ Streaming volume: ${v.streams.toLocaleString("en-US")}\n` : ""),
      signOff: "— Finance Department",
    };
  }

  return {
    subject: `Week ${v.week} Financial Summary`,
    greeting: `Financial Report – Week ${v.week}`,
    narrative:
      `REVENUE: ${money(v.revenue)}\nEXPENSES: ${money(v.expenses)}\nNET: -${money(Math.abs(v.net))}\n\n` +
      `⚠ Warning Indicators:\n` +
      `• Expense ratio: ${expenseRatio.toFixed(0)}% (target: <70%)\n` +
      `• Cash flow: Negative\n` +
      `• Burn rate: ${money(Math.abs(v.net))}/week\n\n` +
      `Immediate attention recommended.`,
    signOff: "— Finance Department",
  };
}

/**
 * Assemble a full plaintext body string from narrative parts. Uses "\n" for line
 * breaks; the client email templates and the plaintext fallback both tolerate
 * this (they read the structured `body.*` fields; the assembled string rides
 * along in `body.narrativeBody` for future rich rendering and for tests).
 */
export function renderBody(parts: NarrativeParts): string {
  const segments = [parts.greeting, parts.narrative, parts.signOff];
  if (parts.quirk) {
    segments.push(parts.quirk);
  }
  return segments.join("\n\n");
}
