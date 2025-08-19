PRD – Top Roles: Music Label Manager (MVP)
Version: 0.9 (Draft for build)
Owner: Ernesto Chapa
Date: August 14, 2025
1. Product Overview
Run your own record label where every chart-topping hit—and every backstage blow-up—comes down to the relationships you build with the industry’s most powerful roles. This MVP delivers a browser-based, UI-first music management sim with monthly turns, role-driven meetings, simplified dialogue, and a clear 12-month campaign.
2. Goals & Non-Goals
2.1 Goals
• Ship a fun, replayable MVP in the browser with a full 12‑month loop.
• Prove the “Top Roles backbone + dialogue choices” formula.
• Enable rapid balancing via external JSON/CSV data.
• Keep scope solo-dev friendly while leaving room to expand.
2.2 Non‑Goals
• No full album/tour simulation beyond EP + mini‑tour.
• No 3D/real-time performance scenes.
• No cloud saves at launch (local only).
• No deep nested dialogue trees (use immediate/delayed flags).
3. Target Users & Platform
• Simulation/tycoon fans; music industry‑curious players.
• Platform: Browser (desktop-first). Mobile-friendly is a stretch goal.
4. Scope (MVP Content)
Campaign & Time
• Turn Scale: Monthly
• Campaign Length: 12 months (soft end + scorecard; continue optional)
• Focus Slots per Month: 3 (possible unlock to 4 late)
Entities & Counts
• Artists: 3 total; start with 1; max roster 2
• Archetypes: Visionary, Workhorse, Trendsetter
• Top Roles (8): Manager, A&R, Producer, PR/Publicist, Digital Marketing, Streaming Curator Pitches, Booking/Promoter, Distributor/Operations
• Side Stories: 12 events pooled (15–25% chance/month)
Projects & Actions
• Projects: Single, EP (3–5 tracks), Mini‑Tour (3–5 dates)
• Actions: Role meeting, Start/Advance Single/EP, Schedule/Advance Mini‑Tour, PR push, Digital ad push, Streaming pitch
5. Success Metrics
• Player completion rate of 12‑month campaign ≥ 35%.
• Average session length 20–30 minutes.
• ≥ 2 distinct viable strategies observed (Commercial vs Balanced/Artistic).
• Bugs blocking progression: zero known at release.
6. Technical Requirements
6.1 Stack
• React + TypeScript + Vite
• State: Zustand (XState optional for turn phases)
• UI: Tailwind + shadcn/ui; Charts: Recharts
• Data: JSON (validated with Zod); Dialogue: JSON (Ink optional later)
• RNG: seedrandom (seeded runs)
6.2 Performance
• Initial load < 4s on mid‑range laptop
• Advance Month resolution < 300ms with MVP data
• Bundle size target < 1.2 MB gzipped (stretch, not blocker)
6.3 Compatibility
• Desktop Chrome/Edge/Safari/Firefox (latest 2 versions)
• Minimum resolution 1366×768
• Keyboard-only navigation for core flow (accessibility)
7. Save System
• Local-only saves via localStorage
• 3 manual slots + 1 autosave (after Advance Month)
• Export/Import JSON (human-readable)
• Schema versioning + migrations on load; Zod validation
• Error messaging on import failures (field-level)
8. Game Systems & Acceptance Criteria
8.1 Turn Loop
• Player selects up to 3 Focus actions.
• End-of-month resolver applies queued actions deterministically (seeded RNG 0.9–1.1 variance).
• Summary screen lists 5–8 key deltas with simple “why” notes.
8.2 Dialogue System
• Each Role/Artist scene shows 3–4 options.
• On choose: immediate toasts (e.g., +Loyalty −Money) and optional delayed flags that fire at month-end.
• Content is data-driven; no rebuild for copy tweaks.
8.3 Projects
• Single & EP: track stage, budget, quality (0–100), dueMonth.
• Mini‑Tour: track cities, guarantees, sell‑through.
• Producer tier and time investment modify quality & cost.
8.4 Resources & Access
• Track Money, Reputation, Creative Capital, Focus Slots, Artist Mood, Artist Loyalty.
• MVP Access Tiers: Playlist (None→Niche→Mid), Press (None→Blogs→Mid‑Tier), Venue (Clubs).
• Outcomes respect tier gates; badges visible on Dashboard.
8.5 Market Outcomes
• Streams_first_week = f(Quality, PlaylistAccess, Reputation, AdSpend) × RNG.
• Press pickups = f(PressAccess, PR push, story flag).
• Ticket sell‑through = f(VenueTier, Reputation local, Artist Popularity).
8.6 Side Stories
• 12 events in pool; 15–25% chance/month.
• Each: 3 choices, clear immediate effect + optional delayed effect.
• Events are optional; ignoring is allowed and has no hidden penalty.
9. Content Requirements (Writing Counts)
• Role meetings: 8 roles × 3 scenes × 3 choices = 72 choice lines
• Artist dialogues: 3 archetypes × 3 scenes × 3 choices = 27 choice lines
• Side stories: 12 × 3 choices = 36 choice lines
• Tooltips/UX copy: ~30–50 strings
10. Economy & Balancing (Initial Ranges)
• Start Money: $75k; monthly burn $3–6k
• Single: $3–12k; EP: $15–35k; PR push: $2–6k; Digital push: $1–8k; Mini‑Tour: $5–15k
• Quality score: 0–100; Relationships/Mood/Loyalty: 0–100
• Access starts at None; unlocks via thresholds and results
• RNG band 0.9–1.1; seed visible in Settings
11. UI/UX
• Screens: Dashboard, Month Planner, Conversation Modal, Project Sheets, End‑of‑Month Summary, Saves
• Visual language: clean cards, badges for access tiers, compact toasts for stat changes
• Accessibility: font scaling, high-contrast mode (toggle), keyboard navigation for choices
12. Data & Files
• /data/*.json for roles, artists, events, dialogues
• Zod schemas in /data/schemas.ts
• Version field in all top-level files; migrations in /data/migrations.ts
• Optional: dialogue.ink supported later, compiled to JSON at build
13. Project Plan (Milestones)
M1 – Scaffold & State (Week 1–2): Vite+React+TS, Zustand store, Tailwind/shadcn
M2 – Loop & Summary (Week 3–4): Basic actions, resolver, summary view
M3 – Dialogue & Data (Week 5–6): JSON dialogues, Zod validation, toasts/delays
M4 – Projects & Access (Week 7–8): Single/EP/Tour, access gating, charts
M5 – Balancing & Content (Week 9–10): Fill initial content counts, tuning pass
M6 – Saves & Polish (Week 11–12): Save slots, export/import, bug bash, performance
14. Risks & Mitigations
• Scope creep → Strict MVP counts; backlog anything extra.
• Balancing difficulty → Externalize all numbers; daily tweak loop.
• Performance regressions → Budget checks in CI (bundle size, perf tests where possible).
• Content bottleneck → Reuse scene templates; focus on punchy, short lines.
15. Glossary
• Focus Slot: A monthly action/meeting opportunity.
• Access Tier: Your relationship-powered reach in a channel (Playlist/Press/Venue).
• Delayed Flag: A choice effect that resolves at month end.
• Seeded RNG: Randomness with a repeatable seed for testing.
