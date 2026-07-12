/**
 * In-game Help content — About page, Slice 1 (data-only module).
 *
 * VOICE: a veteran label executive letting the player in on the business.
 * Consequence-first, second person, industry vocabulary. Directional heuristics
 * only — NO engine numbers (multipliers, thresholds, decay rates, formulas).
 * Plainly-visible game facts are allowed (52-week campaign, three focus slots,
 * the Top 100).
 *
 * ACCURACY: this copy is a contract with players — every heuristic here is
 * directionally TRUE of the engine. Sources it was written against:
 *   - client/src/lib/releaseBuzz.ts (SONG_BUZZ_TOOLTIP, BANKED_HYPE_TOOLTIP,
 *     MARKETING_CHANNEL_PERSONALITIES, summarizeAnticipation) — the two "Buzz"
 *     mechanics and the pre-release build.
 *   - shared/engine/processors/ActionProcessor.ts EFFECT_CHANNEL_DESCRIPTIONS
 *     (awareness_boost = "Hype banked for your NEXT release").
 *   - docs/01-planning/implementation-specs/[READY] hype-and-premarketing-plan.md
 *     (attach-at-plan, per-artist + label pools, lead-single conduit, cancel
 *     kills pre-buzz).
 *   - docs/02-architecture/system-architecture.md + game-system-workflows.md
 *     (currencies, access tiers, venue tiers Clubs/Theaters/Arenas, weekly
 *     streaming decay, Top 100).
 *
 * The UI page (Slice 2) consumes this module; it renders nothing itself.
 */

export interface HelpTopic {
  /** kebab-case, unique */
  id: string;
  /** player-activity framing, exec voice */
  title: string;
  /** 1-2 sentence recognizable situation */
  hook: string;
  /** 1-2 sentence bold summary — reading only tldrs gives a working mental model */
  tldr: string;
  /** 2-4 paragraphs, 150-250 words total */
  body: string[];
  /** 2-3 "Rules of the game" heuristic bullets */
  rules: string[];
  /** optional deeper nuance paragraphs (collapsible in UI) */
  veteranNotes?: string[];
  /** HELP_TERMS keys shown as header chips on the accordion trigger, at-a-glance */
  terms?: string[];
}

/**
 * Term registry — scanning-cue slice (about-help slice 3).
 *
 * Mirrors the REAL UI treatments so a player who has seen the term in-game
 * recognizes it instantly in the guide:
 *   - money: SongCatalog/MetricsDashboard etc. — always font-mono text-money (gold).
 *   - reputation: shown neutral/white in the UI; the star is a weekly-summary motif,
 *     not a hue — do NOT invent a color for it.
 *   - creative-capital: MetricsDashboard.tsx stat uses text-text-accent.
 *   - buzz / awareness: SongBuzzChip (SongCatalog.tsx) uses text-neon-cyan; awareness
 *     IS a released song's buzz, so the two share the hue on purpose.
 *   - hype: BuzzStatusStat's "+N Hype banked" chip (MetricsDashboard.tsx) is
 *     font-mono text-money — hype shares money's gold intentionally, that IS the
 *     game's visual language (banked value waiting to be spent).
 */
export interface HelpTerm {
  /** canonical display label, e.g. 'Buzz' */
  label: string;
  /** Tailwind classes for INLINE occurrences in prose */
  inlineClassName: string;
  /** optional glyph shown in header CHIPS only (not inline) */
  icon?: string;
}

export const HELP_TERMS: Record<string, HelpTerm> = {
  money: {
    label: 'Money',
    inlineClassName: 'font-mono text-money',
    icon: '$',
  },
  reputation: {
    label: 'Reputation',
    inlineClassName: 'font-semibold text-text-primary',
    icon: '⭐',
  },
  'creative-capital': {
    label: 'Creative Capital',
    inlineClassName: 'font-semibold text-text-accent',
    icon: '✦',
  },
  buzz: {
    label: 'Buzz',
    inlineClassName: 'font-semibold text-neon-cyan',
    icon: '◎',
  },
  hype: {
    label: 'Hype',
    inlineClassName: 'font-mono text-money',
    icon: '▲',
  },
  awareness: {
    label: 'Awareness',
    inlineClassName: 'font-semibold text-neon-cyan',
  },
};

export const HELP_PREAMBLE: { title: string; body: string[] } = {
  title: 'A word before you start',
  body: [
    'I have run labels long enough to tell you how the first stretch feels, so you do not mistake it for failure. [[money]] is tight early — that is the job, not a mistake you made. You will pass on things you want because you cannot afford them yet, and that discipline is what keeps you alive to week fifty-two.',
    '[[reputation]] is the slow money. It does not spike; it compounds. Every solid week adds a little standing, and standing is what opens the doors that cheaper money cannot. Play for it patiently.',
    'One flop will not end you. I have watched good labels talk themselves off a cliff over a single cold release. Absorb it, learn the read, move on. The one thing you can never get back is a week — you have a fixed run, so spend your weeks like they are the scarcest thing on your desk. They are.',
  ],
};

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'weekly-grind',
    title: 'The Weekly Grind',
    hook: 'It is Monday. Your desk has a handful of decisions on it and a run that only gets shorter from here.',
    tldr: 'A campaign is fifty-two weeks. Each week you commit a few moves, advance, and everything resolves at once — so the real budget you are managing is time.',
    body: [
      'The game moves in weeks, and a campaign runs fifty-two of them. That is your whole run. Every week you sit down, decide where your attention goes — which executives you meet with, what you set in motion — and then you advance. Nothing happens in a vacuum; when the week turns, every choice you made resolves together.',
      'You cannot do everything in a given week, and that is the point. Your attention is rationed into a small number of focus slots. Fill them with what matters most right now and let the rest wait. A week spent well early pays off for the rest of the run; a week wasted is simply gone.',
      'Think in arcs, not turns. Recording a record, setting it up, touring behind it — these play out over many weeks. The players who do well are the ones who look a month ahead and line the weeks up, instead of reacting one Monday at a time.',
    ],
    rules: [
      'Weeks are your scarcest resource — you get fifty-two and no more. Spend them on purpose.',
      'Your focus is rationed into slots each week. Do not spread it so thin that nothing lands.',
      'Everything resolves when you advance, so commit to a plan before you turn the week.',
    ],
    veteranNotes: [
      'A run this length rewards front-loading the foundational moves — signing, first recordings — because the payoff compounds over the weeks that follow. The same move made in week forty has far fewer weeks left to work for you.',
    ],
  },
  {
    id: 'three-currencies',
    title: 'The Three Currencies',
    hook: 'You want to sign the artist, cut the record, and book the tour — and you can afford maybe one of the three.',
    tldr: '[[money]] buys moves, [[reputation]] opens doors, and [[creative-capital|creative capital]] fuels the art. They rarely refill at the same pace, so you are always trading one against the others.',
    body: [
      'You run on three resources, and they do different jobs. [[money]] is the obvious one — it pays for everything you set in motion. [[reputation]] is your standing in the industry, and it is what unlocks access: better playlists, real press attention, bigger venues. [[creative-capital|Creative capital]] is the fuel for the art itself; you spend it to start projects and to plan releases.',
      'The trap is treating them as interchangeable. They are not. Money you can win back in a good week. Reputation you build slowly and cannot buy — it is the gate in front of the moves that actually grow a label, so protect it. Creative capital is the quiet limiter; run dry and you cannot make anything, no matter how full your bank account is.',
      'Most weeks you are trading. Chase money now and you may stall your reputation climb. Push for standing and you may spend past what is comfortable. There is no correct ratio — there is only what this week needs.',
    ],
    rules: [
      '[[money|Money]] buys moves, [[reputation|reputation]] opens doors, [[creative-capital|creative capital]] makes the art — respect what each one is for.',
      '[[reputation|Reputation]] is the one you cannot buy and the one that unlocks access tiers. Guard it.',
      'Keep some [[creative-capital|creative capital]] in reserve — being out of it stops the art cold, cash or no cash.',
    ],
    veteranNotes: [
      'Access tiers are the real reason reputation compounds: each level you cross opens playlists, press, and venues that were simply closed before (see "Access: The Doors Reputation Opens"). A move that looks like a pure standing play is often really an investment in what you will be allowed to do later.',
    ],
    terms: ['money', 'reputation', 'creative-capital'],
  },
  {
    id: 'access-tiers',
    title: 'Access: The Doors Reputation Opens',
    hook: 'The record was good and the marketing was real, but it went nowhere — because the rooms that matter were not taking your calls yet.',
    tldr: 'Your [[reputation]] unlocks three ladders of industry access — playlists, press, and venues — and each rung is a step-change in what the same work can achieve.',
    body: [
      'This business runs on who will take your call, and that is what access is. There are three ladders, and your [[reputation]] climbs all of them for you: playlists, from niche placements up to the flagship lists; press, from blogs up to national outlets; and venues, from clubs up to arenas. You do not apply for a rung. When your standing clears the bar, the door opens on its own — and the game tells you the week it happens.',
      'Each ladder gates a different part of the machine. Playlist access is reach: the same release travels further from a higher shelf, so a tier jump lifts every record you put out after it. Press access is attention: higher tiers mean the story of your label gets picked up more often, and covered more warmly — and coverage feeds the [[reputation]] that got you there. Venue access is the ceiling on your touring money (see "On the Road").',
      'Treat these as step-changes, not a slow slope. The week you cross into a new tier, the math behind your releases and tours genuinely changes — which is why a [[reputation]] play that looks modest on its own can be the most valuable move on the board when you are sitting just under a door.',
    ],
    rules: [
      'Three ladders — playlists, press, venues — all climbed by [[reputation]] automatically. No one hands you a form.',
      'Tier jumps are step-changes: the same record or tour simply does more from a higher rung.',
      'Playlists carry your streams, press carries your name, venues carry your tours — know which door your plan needs next.',
    ],
    veteranNotes: [
      'These doors swing both ways. Access follows your CURRENT standing, so a label that lets its reputation slide can watch a door quietly close on it. Protect the standing that got you into the room.',
    ],
  },
  {
    id: 'executive-team',
    title: 'Your Executive Team',
    hook: 'Your execs are waiting on your call this week, and the choice you hand them actually changes what happens.',
    tldr: 'Your weekly meetings are where you steer the label. Choices have teeth — they land on real systems — so read them, and let an exec sit out when they have nothing worth your slot.',
    body: [
      'Every week your executives come to you with something on their desk, and the meeting is where you make the call. This is your steering wheel. What you decide is not flavor text — the choices land on real parts of the label: an artist\'s mood, your press position, the [[buzz]] waiting for your next release. Choices have teeth, so read them before you pick.',
      'Meetings cost you focus. You have three slots to spend, and a fourth opens once your [[reputation]] has climbed far enough. Some choices also ask for a little [[creative-capital|creative capital]] — the pricier bets usually do. Spend those slots on the execs whose call matters most this week.',
      'When an exec has nothing relevant, they will tell you so and sit the week out. That is not a dead week — it is them being honest that there is no move worth your slot, which frees you to spend it elsewhere. If you would rather not micromanage, you can let the team auto-select, then review what they chose before you commit.',
    ],
    rules: [
      'Meeting choices land on real systems — treat them as levers, not conversation.',
      'You get three focus slots, with a fourth once your [[reputation|reputation]] is high enough. Spend them where the call matters.',
      'An exec with nothing relevant sits out — take the freed slot elsewhere rather than forcing a weak move.',
    ],
    veteranNotes: [
      'A meeting that lets you name the artist tends to bank its payoff toward THAT artist\'s next release, while a label-wide call banks toward your label generally. When you are setting up a specific act, the targeted meetings are the ones that pull in the same direction as your plan.',
    ],
  },
  {
    id: 'delegation-trust',
    title: 'Delegation & Trust',
    hook: 'You skip your CMO this week. You expect nothing to happen. Instead you come back to find she already spent real money without you.',
    tldr: 'A meeting you skip is never simply skipped — your executive makes the call themselves, and how they make it depends on how much they trust you. Neglect a disloyal exec and your own absence can hand you a crisis.',
    body: [
      'Here is the shift: every executive meeting resolves, whether you show up or not. Spend a slot and you make the call. Walk away and your exec makes it for you — with real [[money]], on the label\'s behalf, while your attention is somewhere else. There is no longer a free week where a meeting simply evaporates unattended.',
      'What they do with that freedom depends on trust, and trust is something you build or burn over time. An exec who has felt backed by you tends to make the call you would have made yourself — the safe, sensible read. An exec you have kept close and rewarded plays it like a professional who wants the label to win. But an exec left to drift, ignored meeting after meeting, stops reading your intent and starts reading their own — chasing whatever serves them, not you.',
      'That is why AUTO and simply walking away are not the same move, even though both save you the trouble of deciding. AUTO still spends a slot, and you are knowingly endorsing the safe pick. Walking away costs nothing today, but you are handing the wheel to whoever is sitting in that chair — and if they have stopped trusting you, they may not steer where you would have.',
      'And an ignored urgent call is not the end of it. Wave off a pressing situation with an exec who has soured on you, and it rarely just quietly resolves. It can come back around, landing on your desk the following week as a real crisis that eats a focus slot and will not be waved off a second time.',
    ],
    rules: [
      'A skipped meeting is never a free pass — your exec still spends on the label\'s behalf whether you are in the room or not.',
      'Trust runs the wheel when you are not holding it: an exec who trusts you plays it safe, one who does not plays for themselves.',
      'Ignore an urgent call from an exec who has stopped trusting you, and the fallout has a way of finding its way back to your desk.',
    ],
    veteranNotes: [
      'AUTO is not the same as walking away. AUTO still costs a slot and still endorses the safe pick with your eyes open; only genuine neglect hands an exec full discretion — and that discretion is exactly what a disloyal exec spends on themselves.',
    ],
  },
  {
    id: 'ar-office',
    title: 'The A&R Office',
    hook: 'The roster you have is the label you are. Somewhere out there is the act that changes that — if you spend the week looking.',
    tldr: 'A&R is the front of the machine: sourcing costs a focus slot, discovery surfaces prospects, and signing puts an artist on your payroll — a bet on their ceiling, not their present.',
    body: [
      'Everything this label will ever release starts with who you sign, and who you sign starts in the A&R office. Sourcing is real work: committing the office to a search costs you a focus slot for the week, the same attention you could have spent in a meeting. That is the first lesson — finding talent is not free, and treating it as an afterthought is how labels end up with nothing to record.',
      'When the search lands, it surfaces prospects: artists you can look over before anyone commits to anything. Read them the way you would read a deal. What they can do today matters less than what they could become with your machine behind them — a modest act with real talent and a work ethic can outgrow a polished one who has already peaked.',
      'Signing is where it becomes serious. The signing fee is the visible cost; the payroll is the real one, because every artist on the roster draws money week after week whether they are earning or not. So sign like an investor, not a collector. Every act you carry should have a job in your plan — a record coming, a tour worth booking, an audience worth building. A roster full of maybes is a burn rate, not a label.',
    ],
    rules: [
      'Sourcing costs a focus slot — budget the search like any other move, and search before the cupboard is bare.',
      'Judge prospects on ceiling, not polish: talent and work ethic compound under your machine; a peak already reached does not.',
      'Every signing joins the payroll and burns [[money]] weekly — sign acts you have a plan for, not acts you merely like.',
    ],
    veteranNotes: [
      'Different sourcing postures trade speed against reach. When you need a body in the studio next month, take the direct road; when you can afford to wait, a wider search tends to turn up the act you did not know to look for.',
    ],
  },
  {
    id: 'roster-health',
    title: 'Keeping Your Roster Healthy',
    hook: 'Same artist, same songs — but this month the takes are flat and the rooms feel half-asleep. The talent did not change. Their condition did.',
    tldr: 'Artists run on mood and energy. A happy artist records sharper; a rested one sells the room harder. A quiet week gives energy back on its own, but the road and the studio both drain it faster than rest returns it — so resting an act is a real decision, not lost time.',
    body: [
      'Your artists are not machines with a fixed output. They run on two things you can watch and influence: mood — how they feel about the work and about you — and energy — how much of themselves they have left to give. Both move with what you put them through, and both show up in the results before they show up anywhere else.',
      'Mood is the studio stat. A happy artist records sharper, and an unhappy one gets erratic — low morale does not just drag the work down, it makes it unpredictable, and unpredictable is the enemy of a label trying to plan releases. Watch what your choices do to the people making the music; the meeting that saves money by burning an artist rarely prices in what it costs the next record.',
      'Energy is the road stat. A rested act sells the room harder — and the road is exactly what wears energy down, city after city, with long studio stretches taking their own quieter toll. A genuinely idle week does hand some energy back on its own, so time off is never wasted. But here is the part that catches new label heads: the road and the studio pull energy down far faster than a quiet week returns it, so an exhausted act will not claw its way back between back-to-back runs on idle time alone. So the tour that looks like pure profit is also spending down an asset, and deliberately clearing a run-down artist\'s calendar before the next run is a real decision with a real payoff, not dead air.',
    ],
    rules: [
      'Mood drives the studio: happy artists record sharper, unhappy ones get erratic — protect morale like it is quality, because it is.',
      'Energy drives the road and the studio: the tour that fills your bank drains the act, and a long recording stretch quietly does too — a quiet week gives some back, but never as fast as work takes it.',
      'Rest is a move, not a gap — a genuinely idle week refills energy slowly, so an exhausted artist sent straight back out still sells fewer seats than the calendar suggests.',
    ],
    veteranNotes: [
      'Read condition before you book, not after. The moment to check an artist\'s energy is when you are pricing the tour; the moment to check their mood is when you are scheduling the sessions. By the time poor condition shows up in the numbers, you already paid for it.',
    ],
  },
  {
    id: 'getting-heard',
    title: 'Getting Heard: Buzz, Hype & Awareness',
    hook: 'It is week thirty. The record is good, the numbers are quiet, and you cannot tell whether anyone knows it exists.',
    tldr: '[[hype|Hype]] is anticipation you bank BEFORE a release and spend INTO it. [[buzz|Buzz]] — a song\'s [[awareness]] — is whether the public knows a released record exists and keeps it earning after launch week.',
    body: [
      'These are the softest levers you have, and the most misread, so let me name them cleanly. [[hype]] is anticipation you build before a record is out. Your executive meetings can bank it, and it waits — for a specific artist\'s next release, or for your label\'s next one — until you plan that release, at which point the banked hype pours in and gives the record a running start. Think of it as pre-selling the record: a hyped release opens bigger than a cold one, every time. Left unbanked into a plan, hype does not wait forever.',
      '[[buzz|Buzz]] is the other side of the drop. Once a record is out, its buzz — call it [[awareness]] — is simply whether the public knows the thing exists. While buzz is alive, the record keeps pulling streams instead of sinking the moment launch week ends. A record can also break through: the public catches on harder than expected, and that moment stretches how long the release keeps earning.',
      'But buzz fades. Awareness is a lifecycle — it builds off your marketing in the first weeks, it can break through while it is climbing, and then, left alone, it cools. I have never seen a cold release outperform a hyped one, and I have never seen buzz hold forever. The work is stacking hype before the drop, then working the record so its awareness lasts.',
    ],
    rules: [
      '[[hype|Hype]] is banked BEFORE the drop and spent INTO it; [[buzz|buzz]] is a released song\'s live [[awareness]] AFTER it.',
      'Live buzz keeps a record earning past launch week — while it lasts, the streams ride it.',
      'Buzz fades. Breakthroughs happen while it is still building, so build it before you need it.',
    ],
    veteranNotes: [
      'Two things share the word "Buzz" in this business and it trips people up. The meeting "Buzz" you bank is hype for a release you have not shipped yet. The "Buzz" on a released song is its live awareness, out in the world right now. Same word, opposite ends of the timeline — the first one feeds the second.',
    ],
    terms: ['hype', 'buzz'],
  },
  {
    id: 'putting-out-a-record',
    title: 'Putting Out a Record',
    hook: 'The songs are recorded. Now you decide how loud they land — or whether they slip out to silence.',
    tldr: 'Record it, then set it up: plan ahead, split your marketing across channels with different personalities, and run a pre-release campaign so the record arrives with anticipation instead of cold.',
    body: [
      'A record is two jobs. First you record it — and there you are trading quality against cost and time. A stronger producer and more time invested lift the songs; both cost you [[money]]. Then you release it, and releasing well is a craft of its own. Do not just drop a record and hope. Set it up.',
      'Plan the release ahead and put marketing behind it. Your channels are not interchangeable — they have personalities. Some, like PR, build slowly but leave the longest tail. Others, like radio, hit hard in launch week and fade fast. Match the channel mix to whether you want a long burn or an opening-week spike. A lead single dropped ahead of the record is your setup tool: it gives the campaign something to work.',
      'The weeks between planning and release are not dead air — that is your pre-release campaign, quietly building anticipation so the record arrives warm. This is where [[hype|Hype]] from your meetings (see "Getting Heard") pours in. Planning early buys you runway to build; drop cold and you are starting the conversation on release day, which is late.',
    ],
    rules: [
      'Recording trades quality against cost and time — a better producer and more time cost you [[money]] but lift the songs.',
      'Marketing channels have personalities: some build a long tail, some spike launch week. Mix for the shape you want.',
      'Set the record up before it drops — a pre-release campaign and a lead single make it land warm with [[hype]], not cold.',
    ],
    veteranNotes: [
      'The lead single is more than a taster — it is the conduit your pre-release campaign works through. With a lead single out ahead, your setup builds at full strength; without one, the same effort does less. If you are planning to build anticipation, drop the single first.',
    ],
  },
  {
    id: 'streams-and-money',
    title: 'Streams: Where the Money Comes From',
    hook: 'The record is out, the streams are ticking, and you want to know what makes that number big — and why it keeps shrinking.',
    tldr: 'Streams are where a record\'s [[money]] comes from. What you did before the drop decides the opening; [[buzz|Buzz]] decides how long it keeps paying.',
    body: [
      'Nearly everything that decides an opening week was settled before release day. The song\'s quality. The playlists your access can reach. Your label\'s standing — [[reputation]] pulls streams on its own. The marketing you put behind it. And the artist\'s own pull: a popular act moves more streams with the same song, and the bigger the star, the harder that works. Then the market adds its own swing — no one calls a hit to the decimal, not even me.',
      'A word on marketing spend: it works every time, but each extra dollar buys less than the last. Doubling the budget does not double the opening. Size the spend to the record instead of trying to buy your way past a weak one. And don\'t expect the streams to pay it back alone — most of that spend earns its keep in the opening, the charts, and the reputation they build.',
      'Every stream pays, and the shape of the payout is always the same: a launch spike, then a weekly trickle that shrinks — unless the record\'s live [[buzz|Buzz]] keeps it in the conversation and stretches the tail (see "Getting Heard"). And a hit pays twice. The [[money]] is the first half; the second is the scoreboard — streams are what put a song on the charts, big chart moments build [[reputation]], and a strong run lifts the artist\'s popularity, which makes the NEXT record open bigger. A flop costs what you spent and nothing more — read what was weak, and cut the next one smarter.',
    ],
    rules: [
      'The opening is decided before release day: quality, playlist access, [[reputation]], marketing, and the artist\'s pull.',
      'Marketing is a loss-leader on streams alone — it pays back in charts, [[reputation]], and the record\'s tail, not the receipt. Spend it to break the record, not to buy revenue; each extra dollar still buys less than the last.',
      'Streams fade week over week; live [[buzz|Buzz]] stretches the tail. [[money|Money]] follows streams — and so do the charts.',
    ],
    veteranNotes: [
      'Two identical setups will not stream identically — there is a swing in this business nobody controls. Judge your process over several releases, not one opening week. And success compounds: hits lift the artist\'s popularity, and popularity feeds the next opening, which is why breaking an artist is worth more than any single record.',
    ],
  },
  {
    id: 'on-the-road',
    title: 'On the Road',
    hook: 'The catalog is earning but you need cash now, and an artist with fans is sitting idle.',
    tldr: 'A tour is cash now and popularity built city by city. Bigger venues need the reputation to unlock them, and the run plays out over several weeks.',
    body: [
      'Touring is how you turn an audience into [[money]] you can use this stretch, and into popularity that follows the artist afterward. It is the move when the bank is thin but the fans are real. A record earns slowly over time; a tour pays more directly, on the road.',
      'Where you can play depends on your standing. Access to venues climbs with [[reputation]] — clubs first, then theaters, then arenas — and the bigger the room, the bigger the take. That is another reason your reputation climb is never just vanity: it is literally what lets you book rooms that pay.',
      'A tour is not a single click. It plays out city by city over several weeks, and each stop reports back before the next. Book it when you have the weeks to spare and an artist with the popularity to fill the rooms you can reach — an empty room in a big venue is a bad night for everyone. Watch their energy too: a rested act sells the room harder, so do not send an exhausted artist out to fill it.',
    ],
    rules: [
      'A tour is [[money|cash]] now plus lasting popularity — reach for it when the bank is thin and the fans are real.',
      'Venue tiers unlock with [[reputation]]: clubs, then theaters, then arenas. Bigger rooms, bigger takes.',
      'It runs city by city over weeks — commit the calendar, and only book rooms your artist can actually fill.',
    ],
  },
  {
    id: 'side-events',
    title: 'When the Week Fights Back: Side Events',
    hook: 'You had the week planned to the hour. Then a crisis lands on your desk, and the plan has to make room — because handling it is now part of the week.',
    tldr: 'Side events are the world reacting to you — not your executives\' agenda. When one lands, it takes over a focus slot the following week and you cannot advance until you decide how to handle it. Read each choice for the trade it is offering.',
    body: [
      'Your meetings are the agenda you set; side events are the industry setting one for you. They arrive uninvited — a licensing offer, a billing dispute, a mess that happened on someone else\'s stage — and they do not wait for a convenient week. This is not noise. It is the world responding to the label you are building.',
      'Here is the part that matters for your planning: a crisis does not resolve itself in the margins. It lands on your desk and claims one of that week\'s focus slots, the same slots your executives compete for — because handling a real problem eats real management time. You will have one fewer meeting to run while it sits there, and the week will not advance until you have chosen how to deal with it. It is mandatory; there is no quietly ignoring it away.',
      'So when one lands, slow down and read the trade. Every option is offering you something and asking for something — cash now against standing later, a quick exit against a slower play that compounds. The right answer depends on what your label needs this stretch, not on which line sounds boldest. A cash-poor week and a reputation-rich week can make opposite choices correct on the same crisis — and remember you are paying for it in bandwidth no matter which you pick, so make the slot count.',
    ],
    rules: [
      'Side events are the world\'s agenda, not yours — they arrive on their schedule and demand a decision.',
      'A crisis costs you a focus slot the following week and blocks the advance until you resolve it — plan for one fewer meeting when one is on your desk.',
      'Every option is a trade: name what it gives and what it takes before you pick, and match it to what this stretch of the run needs.',
    ],
  },
  {
    id: 'reading-the-charts',
    title: 'Reading the Charts',
    hook: 'Your single lands on the Top 100 and you want to know whether that number means anything.',
    tldr: 'The charts are a scoreboard, not a lever. They read back how your songs are doing against the competition — a debut and its climb tell you what is working, but you do not play them directly.',
    body: [
      'The weekly Top 100 is where your songs stand against the field — your releases and rival songs, ranked together. Read it as a scoreboard, not a control. You do not move the charts by pulling on them; you move them by making good records and setting them up well. The chart is the readout of everything else you did.',
      'Watch two things. The debut tells you how a song entered — a strong opening says your setup landed. The movement week to week tells you the rest: a song climbing has momentum behind it; one sliding is cooling off, and the chart is telling you before the money does. The competition on the board is real, and it is not standing still, so a flat position can still mean you are losing ground.',
      'Charting is not only a mirror. A song doing well on the board feeds back into the label — it lifts your [[reputation]] and keeps the record in the conversation. So the charts are worth watching closely, but I put this last on purpose: read them to learn, then go pull the levers that actually move them.',
    ],
    rules: [
      'The charts are a scoreboard, not a lever — you influence them through records and setup, never directly.',
      'Read the debut for how a song entered, and the week-to-week movement for where it is heading.',
      'Competitor songs share the board and keep moving, and a strong run here builds [[reputation]] too, so judge your position against a field that is not standing still.',
    ],
  },
  {
    id: 'saving-the-run',
    title: 'Saving the Run',
    hook: 'You are about to bet a quarter of the bank on one release. Before you pull that lever, make sure this exact moment is somewhere you can come back to.',
    tldr: 'A save snapshots the whole label — roster, catalog, money, momentum, all of it. Save before the big irreversible bets, and export the runs you are proud of so they outlive the machine they were played on.',
    body: [
      'A save is not a bookmark; it is the entire label frozen in place. The roster and their condition, every song in the catalog, the releases in flight, the bank balance, the standing you have built — all of it, captured as one moment you can return to. When you load it back, you are not resuming a story, you are reopening the business exactly as you left it.',
      'The discipline worth building is simple: save before the big irreversible bets. This game resolves everything when the week turns, and some of what resolves cannot be walked back — the record drops, the money is spent, the weeks are gone. The moment before a heavy commitment is the moment a snapshot earns its keep. Not because you should undo every stumble — absorbing a flop is part of the craft — but because a fifty-two week run deserves better than dying to a slip of the finger.',
      'And when a run turns into something you are proud of, export it. An exported save is yours — a file that lives outside the machine, a label you can bring back, hand around, or shelve like a gold record. Campaigns end; the ones worth remembering do not have to.',
    ],
    rules: [
      'A save is the whole label in one snapshot — roster, catalog, [[money]], standing — not just a checkpoint marker.',
      'Save before the big irreversible bet: once the week turns, what resolved stays resolved.',
      'Export the runs you are proud of — a file outside the game survives anything that happens inside it.',
    ],
  },
];
