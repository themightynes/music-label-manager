MVP Content Scope (Lock for PRD)
1) Playtime & Campaign
•	Turn scale: Monthly
•	Campaign length (MVP): 12 months (soft end with scorecard; “Continue” optional)
•	Focus Slots per month: 3 meetings/actions (scales to 4 later)
2) Core Entities & Counts
•	Artists: 3 total, start with 1 signed, can sign up to 2
o	Archetypes included: Visionary, Workhorse, Trendsetter
•	Top Roles (always-on backbone): 8
o	Manager, A&R, Producer, PR/Publicist, Digital Marketing, Streaming Curator Pitches, Booking/Promoter, Distributor/Operations
•	Side Stories (from ranks 21–36): 12 total in pool (≈15–25% monthly appearance chance)
o	Include at least 1 each: Sync, Copyright/Law, Data Analyst, Music Critic, Platform Dev, Royalty Collector
•	Projects supported: Single, EP (3–5 tracks), Mini Tour (3–5 dates)
o	(Albums & full tours come post MVP)
3) Actions & Systems
•	Monthly actions (choose 3):
o	Meet a Role (dialogue with 3 choices → immediate + delayed effects)
o	Start/advance Single or EP production
o	Schedule/advance Mini Tour
o	Run PR push (press angle)
o	Run Digital ad push (awareness or conversion)
o	Submit Streaming pitch (one lead track per release window)
•	Dialogue: 3–4 options per meeting, no nested branches in MVP (use delayed flags)
•	Resources tracked: Money, Reputation, Creative Capital, Focus Slots, Artist Mood, Artist Loyalty, Access Tiers (Playlist/Press/Venue/Producer/Radio—use Playlist, Press, Venue in MVP)
4) Economy & Balancing (initial ranges)
•	Money: start $75k, monthly burn ≈ $3–6k baseline
•	Release costs (per Single): $3–12k (producer tier + mix/master)
•	EP cost: $15–35k
•	PR push: $2–6k, Digital push: $1–8k
•	Mini Tour upfront: $5–15k, target margin 10–25%
•	Quality score: 0–100 (Talent/Producer tier/Time invested)
•	Market outcome formula (MVP):
o	Streams_first_week = f(Quality, Playlist Access, Reputation, Ad spend) × RNG(0.9–1.1)
o	Press pickups = f(Press Access, PR push, Artist story flag)
o	Ticket sell through = f(Venue tier, Reputation local, Artist Popularity)
•	Relationship stats: 0–100 (Mood, Loyalty, Role relationship)
5) Access Tiers (MVP subset)
•	Playlist Access: None → Niche → Mid → Flagship (cap at Mid in MVP)
•	Press Access: None → Blogs → Mid Tier (cap at Mid Tier)
•	Venue Tier: Clubs (cap at Clubs in MVP; Theaters post MVP)
6) Progression & Unlocks (within 12 months)
•	Month 1: 1 artist, 3 Focus Slots, Access = None
•	First hit single (≥ threshold) → Playlist Access: Niche + minor Reputation
•	Consistent press (2+ pickups in a month) → Press: Blogs
•	Two sell out club shows → Venue: Clubs (stable)
•	Reputation milestones unlock:
o	Second artist slot (mid campaign)
o	Fourth Focus Slot (late campaign, optional if pacing allows)
7) Win/Score Conditions (end of Month 12)
•	Show 3 scorecards (weights differ; player picks their pursuit at Month 1):
o	Commercial King: Streams, revenue, sell through
o	Critical Darling: Press pickups, average quality, awards flag (simulated nods)
o	Balanced Mogul: Blended score (smaller bonuses across all)
•	No fail state; poor finances trigger “survival mode” tutorial tips
8) UI Screens (MVP)
•	Dashboard (KPIs, alerts, artists, money, access badges)
•	Month Planner (pick 3 actions/meetings)
•	Conversation Modal (role dialogues, 3–4 choices)
•	Project Sheets (Single/EP/Tour cards with milestones)
•	End of Month Summary (immediate + delayed outcomes)
•	Saves (3 slots + autosave, Export/Import JSON)
9) Content Writing Targets (small, doable)
•	Role meetings: 8 roles × 3 scenes each × 3 choices = 72 choice lines
•	Artist dialogues: 3 archetypes × 3 scenes × 3 choices = 27 choice lines
•	Side stories: 12 events × 3 choices = 36 choice lines
•	Tooltips/UX copy: ~30–50 short strings
(Total is modest; you can ship with this and expand later.)
10) Acceptance Criteria (feature level)
•	Turn loop: One click Advance Month resolves all queued actions deterministically with seeded RNG; summary lists 5–8 key deltas.
•	Dialogue engine: Supports immediate stat toasts and delayed flags that fire on month end.
•	Projects: Single & EP track stage, budget, quality, dueMonth; Tours track cities, guarantees, sell through.
•	Access: Tiers visually update; outcomes respect tier gates.
•	Saves: 3 slots + autosave; export/import JSON; schema validated (Zod).
•	Perf: Initial load < 4s on mid range laptop; Advance Month calc < 300ms average on MVP data.
11) Seeded RNG & Testing
•	Seed input visible in settings; same seed + same choices ⇒ same results.
•	Debug panel (dev only): dump world state, rerun month, force event.

