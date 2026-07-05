import type { WeekSummary, ChartUpdate, GameChange } from "@shared/types/gameTypes";
import type { InsertEmail } from "@shared/schema";
import type { EmailCategory } from "@shared/types/emailTypes";
import {
  moodToBand,
  pickVariant,
  pickFlag,
  narrativeTimestamp,
  type MoodBand,
} from "./emailNarrative";
import {
  discoveryTemplate,
  chartTemplate,
  tourTemplate,
  releaseTemplate,
  tierTemplate,
  financialTemplate,
  renderBody,
  type Picker,
  type TierKind,
  type NarrativeParts,
} from "./emailTemplates";

/**
 * Executive moods keyed by role id, threaded in read-only from the engine
 * (getExecutivesByGame). Optional: when absent the generator falls back to the
 * neutral band, so callers/tests that don't supply moods still get valid output.
 */
export type ExecutiveMoodMap = Partial<Record<ExecutiveRoleId, number>>;

interface GenerateEmailParams {
  gameId: string;
  weekSummary: WeekSummary;
  chartUpdates?: ChartUpdate[];
  discoveredArtist?: {
    id: string;
    name: string;
    archetype: string;
    talent: number;
    genre?: string | null;
    bio?: string | null;
    signingCost?: number | null;
    weeklyCost?: number | null;
  } | null;
  /** Read-only executive moods (0-100) keyed by role id. */
  executiveMoods?: ExecutiveMoodMap;
}

interface EmailFactoryContext {
  gameId: string;
  week: number;
  executiveMoods: ExecutiveMoodMap;
}

type ExecutiveRoleId = "head_distribution" | "cmo" | "head_ar" | "cco" | "finance";

const EXECUTIVE_SENDERS: Record<ExecutiveRoleId, string> = {
  head_distribution: "Patricia \"Pat\" Williams, PhD",
  cmo: "Samara \"Sam\" Chen",
  head_ar: "Marcus \"Mac\" Rodriguez",
  cco: "Dante \"D-Wave\" Washington",
  finance: "Finance Department",
};

type FactoryResult = InsertEmail;

type NarrativeRole = "head_ar" | "cmo" | "cco" | "head_distribution";

/**
 * Build a deterministic Picker for a given (category, discriminator). Variant/
 * flag/timestamp selection is a pure function of (gameId, week, category, role)
 * — no RNG, no Math.random(), so identical inputs yield byte-identical emails.
 */
function makePicker(ctx: EmailFactoryContext, category: string, role: NarrativeRole): Picker {
  const seedBase = { gameId: ctx.gameId, week: ctx.week, category };
  return {
    pick: <T,>(variants: readonly T[], discriminator?: string): T =>
      pickVariant(variants, { ...seedBase, discriminator }),
    flag: (discriminator?: string, denominator = 2): boolean =>
      pickFlag({ ...seedBase, discriminator }, denominator),
    timestamp: (): string => narrativeTimestamp(role, seedBase),
  };
}

function bandFor(ctx: EmailFactoryContext, role: NarrativeRole): MoodBand {
  return moodToBand(ctx.executiveMoods[role]);
}

/**
 * Derive a small deterministic 0-100 narrative figure (e.g. "efficiency
 * rating") from a stable seed. NARRATIVE FLAVOR ONLY — never fed back into game
 * math. Range [min, max].
 */
function narrativeFigure(
  ctx: EmailFactoryContext,
  category: string,
  discriminator: string,
  min: number,
  max: number,
): number {
  const picker = makePicker(ctx, category, "head_distribution");
  const span = Math.max(1, Math.round((max - min) * 10) + 1);
  const bucket = picker.pick(Array.from({ length: span }, (_, i) => i), `figure-${discriminator}`) as number;
  return min + bucket / 10;
}

function createBaseEmail(
  ctx: EmailFactoryContext,
  category: EmailCategory,
  subject: string,
  body: Record<string, unknown>,
  options?: {
    sender?: string;
    senderRoleId?: ExecutiveRoleId | null;
    preview?: string | null;
    metadata?: Record<string, unknown>;
  },
): FactoryResult {
  return {
    gameId: ctx.gameId,
    week: ctx.week,
    category,
    subject,
    body,
    sender: options?.sender ?? EXECUTIVE_SENDERS.finance,
    senderRoleId: options?.senderRoleId ?? null,
    preview: options?.preview ?? null,
    metadata: options?.metadata ?? {},
    isRead: false,
  };
}

/** Fold narrative parts into the body/metadata additively. */
function withNarrative(
  parts: NarrativeParts,
  extraMetadata: Record<string, unknown>,
): { bodyNarrative: Record<string, unknown>; metadata: Record<string, unknown> } {
  return {
    bodyNarrative: {
      subject: parts.subject,
      greeting: parts.greeting,
      narrative: parts.narrative,
      signOff: parts.signOff,
      ...(parts.quirk ? { quirk: parts.quirk } : {}),
      narrativeBody: renderBody(parts),
    },
    metadata: {
      ...extraMetadata,
      narrativeBody: renderBody(parts),
    },
  };
}

function buildTourCompletionEmails(ctx: EmailFactoryContext, completion: GameChange): FactoryResult | null {
  if (!completion.description?.toLowerCase().includes("tour")) {
    return null;
  }

  const baseMetadata: Record<string, unknown> = { ...completion };

  // #12: the player reads NET profit (gross − tour costs), not just top-line
  // gross. ProjectStageProcessor now attaches `totalCosts`/`netProfit` to the
  // completion change; carry them through so the email headline reflects actual
  // profit/loss. Fall back to gross when net wasn't computed (legacy change).
  const grossRevenue = completion.grossRevenue ?? completion.amount ?? 0;
  const totalCosts = completion.totalCosts ?? null;
  const netProfit = completion.netProfit ?? null;
  const netPreview =
    netProfit !== null
      ? `Net ${netProfit >= 0 ? "profit" : "loss"} $${Math.abs(netProfit).toLocaleString()} (gross $${grossRevenue.toLocaleString()})`
      : completion.description;

  const band = bandFor(ctx, "head_distribution");
  const picker = makePicker(ctx, "artist", "head_distribution");
  const tourName = (completion.description ?? "Tour").replace(/\s*(tour)?\s*completed.*$/i, "").trim() || "Tour";
  const efficiency = narrativeFigure(ctx, "artist", `tour-eff-${completion.projectId ?? ""}`, 60, 99);
  const varianceMagnitude = narrativeFigure(ctx, "artist", `tour-var-${completion.projectId ?? ""}`, 1, 30);
  const variance = (netProfit ?? grossRevenue) >= 0 ? varianceMagnitude : -varianceMagnitude;

  const parts = tourTemplate(band, {
    description: completion.description ?? "Tour completed",
    tourName,
    grossRevenue,
    totalCosts,
    netProfit,
    efficiency,
    variance,
  }, picker);

  const { bodyNarrative, metadata } = withNarrative(parts, {
    ...baseMetadata,
    grossRevenue: completion.grossRevenue ?? null,
    totalCosts,
    netProfit,
    moodBand: band,
    algorithmConfidence: efficiency,
    varianceFromProjection: variance,
    systemStatus: band === "terrible" || band === "poor" ? "degraded" : "optimal",
  });

  return createBaseEmail(ctx, "artist", parts.subject, {
    description: completion.description,
    amount: grossRevenue,
    grossRevenue: completion.grossRevenue ?? null,
    totalCosts,
    netProfit,
    projectId: completion.projectId ?? null,
    ...bodyNarrative,
    metadata: baseMetadata,
  }, {
    sender: EXECUTIVE_SENDERS.head_distribution,
    senderRoleId: "head_distribution",
    preview: netPreview,
    metadata,
  });
}

function buildChartEmails(ctx: EmailFactoryContext, chart: ChartUpdate): FactoryResult[] {
  const emails: FactoryResult[] = [];

  const baseMetadata = {
    songTitle: chart.songTitle,
    artistName: chart.artistName,
    position: chart.position,
    movement: chart.movement ?? 0,
    weeksOnChart: chart.weeksOnChart ?? 0,
    peakPosition: chart.peakPosition ?? chart.position,
  };

  const band = bandFor(ctx, "cmo");
  const picker = makePicker(ctx, "chart", "cmo");

  const emitChart = (isNumberOneDebut: boolean, defaultSubject: string, preview: string) => {
    const parts = chartTemplate(band, {
      songTitle: chart.songTitle ?? "Untitled",
      artistName: chart.artistName ?? "Artist",
      position: chart.position ?? 0,
      movement: chart.movement ?? 0,
      weeksOnChart: chart.weeksOnChart ?? 0,
      isNumberOneDebut,
    }, picker);

    const narrativeType: "offensive" | "defensive" | "neutral" =
      band === "excellent" || band === "good" ? "offensive" : band === "neutral" ? "neutral" : "defensive";

    const { bodyNarrative, metadata } = withNarrative(parts, {
      ...baseMetadata,
      moodBand: band,
      narrativeType,
    });

    emails.push(createBaseEmail(ctx, "chart", parts.subject, {
      ...baseMetadata,
      ...bodyNarrative,
    }, {
      sender: EXECUTIVE_SENDERS.cmo,
      senderRoleId: "cmo",
      preview,
      metadata,
    }));
  };

  if (chart.isDebut && chart.position === 1) {
    emitChart(true, `#1 Debut – "${chart.songTitle}"`, `"${chart.songTitle}" debuted at #1`);
    return emails;
  }

  if (chart.isDebut && chart.position !== null && chart.position <= 10) {
    emitChart(false, `Top 10 Debut – "${chart.songTitle}" at #${chart.position}`, `"${chart.songTitle}" debuted at #${chart.position}`);
  }

  return emails;
}

function buildReleaseEmails(ctx: EmailFactoryContext, change: GameChange): FactoryResult | null {
  if (change.type !== "song_release" && change.type !== "release") {
    return null;
  }

  const band = bandFor(ctx, "head_distribution");
  const picker = makePicker(ctx, "artist", "head_distribution");
  const description = change.description ?? "New Release";
  const algorithmConfidence = narrativeFigure(ctx, "artist", `rel-conf-${change.projectId ?? description}`, 70, 99);
  const chartProbability = narrativeFigure(ctx, "artist", `rel-prob-${change.projectId ?? description}`, 30, 90);

  const parts = releaseTemplate(band, {
    description,
    algorithmConfidence,
    chartProbability,
  }, picker);

  const { bodyNarrative, metadata } = withNarrative(parts, {
    description,
    projectId: change.projectId ?? null,
    moodBand: band,
    algorithmConfidence,
    varianceFromProjection: 0,
    systemStatus: band === "terrible" || band === "poor" ? "degraded" : "optimal",
  });

  return createBaseEmail(ctx, "artist", parts.subject, {
    description,
    projectId: change.projectId ?? null,
    ...bodyNarrative,
  }, {
    sender: EXECUTIVE_SENDERS.head_distribution,
    senderRoleId: "head_distribution",
    preview: description,
    metadata,
  });
}

function buildTierUnlockEmail(ctx: EmailFactoryContext, change: GameChange): FactoryResult | null {
  if (change.type !== "unlock" || !change.description) {
    return null;
  }

  const description = change.description.toLowerCase();
  let senderRoleId: ExecutiveRoleId | null = null;
  let sender = EXECUTIVE_SENDERS.finance;
  let kind: TierKind | null = null;
  let narrativeRole: NarrativeRole = "head_distribution";

  if (description.includes("playlist access")) {
    senderRoleId = "head_distribution";
    sender = EXECUTIVE_SENDERS.head_distribution;
    kind = "playlist";
    narrativeRole = "head_distribution";
  } else if (description.includes("press access")) {
    senderRoleId = "cmo";
    sender = EXECUTIVE_SENDERS.cmo;
    kind = "press";
    narrativeRole = "cmo";
  } else if (description.includes("venue access")) {
    senderRoleId = "head_distribution";
    sender = EXECUTIVE_SENDERS.head_distribution;
    kind = "venue";
    narrativeRole = "head_distribution";
  } else if (description.includes("producer tier")) {
    senderRoleId = "cco";
    sender = EXECUTIVE_SENDERS.cco;
    kind = "producer";
    narrativeRole = "cco";
  } else if (description.includes("focus slot")) {
    // System notification — no narrative persona.
    const metadata = { description: change.description, amount: change.amount ?? 0 };
    return createBaseEmail(ctx, "financial", change.description, metadata, {
      sender: "System Notification",
      senderRoleId: null,
      preview: change.description,
      metadata,
    });
  } else {
    return null;
  }

  const band = bandFor(ctx, narrativeRole);
  const picker = makePicker(ctx, "financial", narrativeRole);
  const parts = tierTemplate(band, { description: change.description, kind }, picker);

  const { bodyNarrative, metadata } = withNarrative(parts, {
    description: change.description,
    amount: change.amount ?? 0,
    moodBand: band,
    tierKind: kind,
  });

  return createBaseEmail(ctx, "financial", parts.subject, {
    description: change.description,
    amount: change.amount ?? 0,
    ...bodyNarrative,
  }, {
    sender,
    senderRoleId,
    preview: change.description,
    metadata,
  });
}

function buildArtistDiscoveryEmail(
  ctx: EmailFactoryContext,
  weekSummary: WeekSummary,
  artist: NonNullable<GenerateEmailParams["discoveredArtist"]>,
): FactoryResult {
  const band = bandFor(ctx, "head_ar");
  const picker = makePicker(ctx, "ar", "head_ar");

  const scoutingLocations = [
    "the Mercury Lounge",
    "the Troubadour",
    "First Avenue",
    "a DIY venue in Brooklyn",
    "a warehouse show downtown",
  ];
  const scoutingLocation = picker.pick(scoutingLocations, `scoutloc-${artist.id}`);
  const isLateNight = band === "excellent";
  const isTuesdayException = picker.flag(`tuesday-${artist.id}`, 4);

  const parts = discoveryTemplate(band, {
    artistName: artist.name,
    genre: artist.genre ?? "Open Format",
    archetype: artist.archetype,
    talent: artist.talent,
    signingCost: artist.signingCost ?? null,
    weeklyCost: artist.weeklyCost ?? null,
    scoutingLocation,
  }, picker);

  const { bodyNarrative, metadata } = withNarrative(parts, {
    artistId: artist.id,
    name: artist.name,
    archetype: artist.archetype,
    talent: artist.talent,
    genre: artist.genre ?? null,
    bio: artist.bio ?? null,
    signingCost: artist.signingCost ?? null,
    weeklyCost: artist.weeklyCost ?? null,
    sourcingType: weekSummary.arOffice?.sourcingType ?? null,
    // Guide §"For A&R Emails" metadata:
    scoutingLocation,
    macMoodLevel: ctx.executiveMoods.head_ar ?? 50,
    moodBand: band,
    isLateNightEmail: isLateNight,
    isTuesdayException,
  });

  return createBaseEmail(ctx, "ar", parts.subject, {
    artistId: artist.id,
    name: artist.name,
    archetype: artist.archetype,
    talent: artist.talent,
    genre: artist.genre ?? null,
    bio: artist.bio ?? null,
    signingCost: artist.signingCost ?? null,
    weeklyCost: artist.weeklyCost ?? null,
    sourcingType: weekSummary.arOffice?.sourcingType ?? null,
    ...bodyNarrative,
  }, {
    sender: EXECUTIVE_SENDERS.head_ar,
    senderRoleId: "head_ar",
    preview: `Mac scouted ${artist.name}`,
    metadata,
  });
}

function buildFinancialReportEmail(ctx: EmailFactoryContext, weekSummary: WeekSummary): FactoryResult {
  const revenue = weekSummary.revenue;
  const expenses = weekSummary.expenses;
  const net = revenue - expenses;

  const parts = financialTemplate({
    week: ctx.week,
    revenue,
    expenses,
    net,
    streams: weekSummary.streams ?? 0,
  });

  const baseMetadata = {
    revenue,
    expenses,
    streams: weekSummary.streams ?? 0,
    expenseBreakdown: weekSummary.expenseBreakdown ?? null,
    financialBreakdown: weekSummary.financialBreakdown ?? null,
  };

  const { bodyNarrative, metadata } = withNarrative(parts, {
    ...baseMetadata,
    net,
    isProfit: net >= 0,
  });

  return createBaseEmail(ctx, "financial", parts.subject, {
    ...baseMetadata,
    ...bodyNarrative,
  }, {
    sender: EXECUTIVE_SENDERS.finance,
    senderRoleId: null,
    preview: `Revenue $${revenue} • Expenses $${expenses}`,
    metadata,
  });
}

export function generateEmails(params: GenerateEmailParams): FactoryResult[] {
  const { gameId, weekSummary, chartUpdates = [], discoveredArtist, executiveMoods = {} } = params;
  const ctx: EmailFactoryContext = {
    gameId,
    week: weekSummary.week,
    executiveMoods,
  };

  const emails: FactoryResult[] = [];

  for (const change of weekSummary.changes ?? []) {
    if (change.type === "project_complete") {
      const tourEmail = buildTourCompletionEmails(ctx, change);
      if (tourEmail) emails.push(tourEmail);
    }

    const releaseEmail = buildReleaseEmails(ctx, change);
    if (releaseEmail) emails.push(releaseEmail);

    const unlockEmail = buildTierUnlockEmail(ctx, change);
    if (unlockEmail) emails.push(unlockEmail);
  }

  for (const chart of chartUpdates) {
    emails.push(...buildChartEmails(ctx, chart));
  }

  if (weekSummary.arOffice?.completed && weekSummary.arOffice.discoveredArtistId && discoveredArtist) {
    emails.push(buildArtistDiscoveryEmail(ctx, weekSummary, discoveredArtist));
  }

  emails.push(buildFinancialReportEmail(ctx, weekSummary));

  return emails;
}
