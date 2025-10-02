import type { WeekSummary, ChartUpdate, GameChange } from "@shared/types/gameTypes";
import type { InsertEmail } from "@shared/schema";
import type { EmailCategory } from "@shared/types/emailTypes";

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
}

interface EmailFactoryContext {
  gameId: string;
  week: number;
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

function buildTourCompletionEmails(ctx: EmailFactoryContext, completion: GameChange): FactoryResult | null {
  if (!completion.description?.toLowerCase().includes("tour")) {
    return null;
  }

  const metadata: Record<string, unknown> = { ...completion };

  const subject = completion.description.includes("completed")
    ? `Tour Metrics – ${completion.description}`
    : `Tour Performance Update`;

  return createBaseEmail(ctx, "artist", subject, {
    description: completion.description,
    amount: completion.grossRevenue ?? completion.amount ?? 0,
    grossRevenue: completion.grossRevenue ?? null,
    projectId: completion.projectId ?? null,
    metadata,
  }, {
    sender: EXECUTIVE_SENDERS.head_distribution,
    senderRoleId: "head_distribution",
    preview: completion.description,
    metadata: {
      ...metadata,
      grossRevenue: completion.grossRevenue ?? null,
    },
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

  if (chart.isDebut && chart.position === 1) {
    emails.push(createBaseEmail(ctx, "chart", `#1 Debut – "${chart.songTitle}"`, {
      ...baseMetadata,
    }, {
      sender: EXECUTIVE_SENDERS.cmo,
      senderRoleId: "cmo",
      preview: `"${chart.songTitle}" debuted at #1`,
      metadata: baseMetadata,
    }));
    return emails;
  }

  if (chart.isDebut && chart.position !== null && chart.position <= 10) {
    emails.push(createBaseEmail(ctx, "chart", `Top 10 Debut – "${chart.songTitle}" at #${chart.position}`, {
      ...baseMetadata,
    }, {
      sender: EXECUTIVE_SENDERS.cmo,
      senderRoleId: "cmo",
      preview: `"${chart.songTitle}" debuted at #${chart.position}`,
      metadata: baseMetadata,
    }));
  }

  return emails;
}

function buildReleaseEmails(ctx: EmailFactoryContext, change: GameChange): FactoryResult | null {
  if (change.type !== "song_release" && change.type !== "release") {
    return null;
  }

  const metadata = {
    description: change.description,
    projectId: change.projectId ?? null,
  };

  return createBaseEmail(ctx, "artist", change.description ?? "New Release", metadata, {
    sender: EXECUTIVE_SENDERS.head_distribution,
    senderRoleId: "head_distribution",
    preview: change.description ?? undefined,
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
  let subject = change.description;

  if (description.includes("playlist access")) {
    senderRoleId = "head_distribution";
    sender = EXECUTIVE_SENDERS.head_distribution;
    subject = `Playlist Tier Unlocked – ${change.description}`;
  } else if (description.includes("press access")) {
    senderRoleId = "cmo";
    sender = EXECUTIVE_SENDERS.cmo;
    subject = `Press Tier Unlocked – ${change.description}`;
  } else if (description.includes("venue access")) {
    senderRoleId = "head_distribution";
    sender = EXECUTIVE_SENDERS.head_distribution;
    subject = `Venue Tier Unlocked – ${change.description}`;
  } else if (description.includes("producer tier")) {
    senderRoleId = "cco";
    sender = EXECUTIVE_SENDERS.cco;
    subject = `Producer Access Unlocked – ${change.description}`;
  } else if (description.includes("focus slot")) {
    senderRoleId = null;
    sender = "System Notification";
    subject = change.description;
  } else {
    return null;
  }

  const metadata = {
    description: change.description,
    amount: change.amount ?? 0,
  };

  return createBaseEmail(ctx, "financial", subject, metadata, {
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
  const metadata = {
    artistId: artist.id,
    name: artist.name,
    archetype: artist.archetype,
    talent: artist.talent,
    genre: artist.genre ?? null,
    bio: artist.bio ?? null,
    signingCost: artist.signingCost ?? null,
    weeklyCost: artist.weeklyCost ?? null,
    sourcingType: weekSummary.arOffice?.sourcingType ?? null,
  };

  return createBaseEmail(ctx, "ar", `Artist Discovery – ${artist.name}`, metadata, {
    sender: EXECUTIVE_SENDERS.head_ar,
    senderRoleId: "head_ar",
    preview: `Mac scouted ${artist.name}`,
    metadata,
  });
}

function buildFinancialReportEmail(ctx: EmailFactoryContext, weekSummary: WeekSummary): FactoryResult {
  const metadata = {
    revenue: weekSummary.revenue,
    expenses: weekSummary.expenses,
    streams: weekSummary.streams ?? 0,
    expenseBreakdown: weekSummary.expenseBreakdown ?? null,
    financialBreakdown: weekSummary.financialBreakdown ?? null,
  };

  const subject = `Week ${ctx.week} Financial Summary`;

  return createBaseEmail(ctx, "financial", subject, metadata, {
    sender: EXECUTIVE_SENDERS.finance,
    senderRoleId: null,
    preview: `Revenue $${weekSummary.revenue} • Expenses $${weekSummary.expenses}`,
    metadata,
  });
}

export function generateEmails(params: GenerateEmailParams): FactoryResult[] {
  const { gameId, weekSummary, chartUpdates = [], discoveredArtist } = params;
  const ctx: EmailFactoryContext = {
    gameId,
    week: weekSummary.week,
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