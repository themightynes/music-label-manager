# UI Redesign Inventory: v1 (Burgundy/Flat) → v2 (Dark Indigo Neo-Cyber HUD)

**Created:** July 3, 2026  
**Scope:** Complete Music Label Manager client redesign from burgundy brand-dominated flat theme to dark indigo "neo-cyber HUD" aesthetic  
**Total App Pages:** 23 (14 player-facing, 9 admin/dev)  
**Total Components (non-UI):** 68  
**shadcn/ui Primitives:** 48  

---

## 1. ROUTING INVENTORY

All routes defined in `client/src/App.tsx`. Router uses **Wouter** (not React Router).

### Player-Facing Routes
| Route | Page Component | Purpose |
|-------|---|---|
| `/` | MainMenuPage | Main menu / hub, new game, continue game |
| `/game` | GamePage | Main dashboard with sidebar, game state mgmt |
| `/executives` | ExecutiveSuitePage | Weekly executive meetings, focus slot allocation |
| `/artists` | ArtistsLandingPage | Artist roster overview, discovery, details |
| `/artist/:artistParam` | ArtistPage | Artist detail page (tabs: Overview, Analytics, Releases, Discography, Management) |
| `/ar-office` | AROfficePage | A&R Office discovery flow, talent sourcing |
| `/office` | OfficePage | Empty placeholder, future office feature |
| `/plan-release` | PlanReleasePage | Release planning, workflow, scheduling |
| `/recording-session` | RecordingSessionPage | Recording session management |
| `/live-performance` | LivePerformancePage | Live performance tour planning |
| `/charts/top100` | Top100ChartPage | Top 100 chart display |
| (logged out) | LandingPage | Public landing page, sign in/up |

### Admin/Dev Routes (gated by `withAdmin` HOC)
| Route | Page Component | Purpose | Access |
|-------|---|---|---|
| `/admin` | AdminHome (AdminLayout) | Admin dashboard | Admin only |
| `/admin/actions-viewer` | ActionsViewer | JSON viewer for action definitions | Admin |
| `/admin/quality-tester` | QualityTester | Data quality inspection tool | Admin |
| `/admin/tour-variance-tester` | TourVarianceTesterPage | Tour math variance testing | Admin |
| `/admin/popularity-tester` | PopularityTester | Popularity calculation tester | Admin |
| `/admin/streaming-decay-tester` | StreamingDecayTester | Streaming decay formula tester | Admin |
| `/admin/markets-editor` | MarketsEditor | Market configuration editor | Admin |
| `/admin/test-data` | TestDataPage | Test data generator / reset tool | Admin |
| `/admin/tours-test` | ToursTest | Tour flow testing | Admin |
| `/admin/bug-reports` | BugReportsPage | Bug report viewer | Admin |
| `/admin/database-health` | AdminDatabaseHealthPage | DB integrity checks | Admin |
| `/prototypes` | UXPrototypesPage | UI/UX prototype gallery | Admin |
| `/prototypes/mood-system` | MoodSystemPrototypePage | Mood system prototype | Admin |

---

## 2. PAGES INVENTORY

### Player-Facing Pages

| Page | Lines | Components Used | Type |
|------|-------|---|---|
| **MainMenuPage.tsx** | 241 | LabelCreationModal, SaveGameModal, ConfirmDialog, UserButton (Clerk) | Menu/Hub |
| **GamePage.tsx** | 269 | Dashboard, CampaignResultsModal, GameLayout, LabelCreationModal | Main Game |
| **ExecutiveSuitePage.tsx** | 143 | ExecutiveMeetings, SelectionSummary, GameLayout, Badge | Game Mechanics |
| **ArtistsLandingPage.tsx** | 423 | ArtistCard, ArtistDiscoveryModal, ArtistDialogueModal, Menubar, Card | Artist Management |
| **ArtistPage.tsx** | 369 | OverviewTab, AnalyticsTab, ReleasesTab, DiscographyTab, ManagementTab, GameLayout | Artist Details |
| **AROfficePage.tsx** | 75 | AROffice (wrapper), GameLayout | A&R Mechanics |
| **PlanReleasePage.tsx** | 1370 | ReleaseWorkflowCard, GameLayout, Dialog, Tabs, Card | Release Planning |
| **RecordingSessionPage.tsx** | 772 | GameLayout, Card, Button, Tabs, Input | Recording Mechanics |
| **LivePerformancePage.tsx** | 975 | GameLayout, Card, Tabs, Select, Table, Button | Tour Mechanics |
| **Top100ChartPage.tsx** | 34 | Top100ChartDisplay | Chart View |
| **OfficePage.tsx** | 30 | GameLayout (placeholder) | Future Feature |
| **LandingPage.tsx** | 74 | SignInButton, SignUpButton (Clerk), Button | Public Auth |

### Admin/Dev Pages

| Page | Lines | Purpose | Access |
|------|-------|---|---|
| AdminHome | N/A | Admin dashboard index | Admin |
| ActionsViewer | ~100 | Actions JSON inspector | Admin |
| QualityTester | 681 | Game data quality checks | Admin |
| PopularityTester | 609 | Popularity calc testing | Admin |
| StreamingDecayTester | 843 | Decay formula testing | Admin |
| ToursTest | 492 | Tour flow verification | Admin |
| BugReportsPage | 456 | Bug report management | Admin |
| AdminDatabaseHealthPage | 386 | DB health checks | Admin |
| MarketsEditor | 547 | Market configuration | Admin |
| TestData | 118 | Data generator | Admin |
| UXPrototypesPage | 101 | Prototype gallery | Admin |
| MoodSystemPrototypePage | ~50 | Mood system prototype | Admin |
| TourVarianceTesterPage | 9 | Tour variance tester | Admin |

---

## 3. LAYOUT & NAVIGATION

### App Shell Architecture

**GameLayout** (`client/src/layouts/GameLayout.tsx`)
- Wraps all player-facing pages
- Provides sidebar + main content area
- Uses shadcn `<SidebarProvider>`, `<SidebarInset>`, `<SidebarTrigger>`
- Props: `children`, `onShowSaveModal`
- Border color: `border-brand-rose/30` (currently burgundy-rose)

**GameSidebar** (`client/src/components/GameSidebar.tsx`) — 500+ lines
- Left sidebar navigation in GameLayout
- Contains: Game state info, navigation links, week advancement, save/load, bug reports, admin access
- Primary colors: `sidebar-primary: #A75A5B`, `sidebar-accent: #4e324c`
- "Advance Week" button: critical control

**Dashboard** (`client/src/components/Dashboard.tsx`) — 150 lines
- Main game view after /game route
- Grid: MetricsDashboard, Inbox+Calendar, ArtistRoster, ActiveTours, ActiveReleases, Charts, Tiers
- Colors: white text on transparent background

---

## 4. SHARED PRIMITIVES (shadcn/ui)

Located: `client/src/components/ui/` (48 components)

### Most-Used Components
1. **button.tsx** — Primary CTA
2. **card.tsx** — Container
3. **dialog.tsx** + **alert-dialog.tsx** — Modals
4. **sidebar.tsx** — Layout (complex, 500+ lines)
5. **badge.tsx** — Labels/tags
6. **tabs.tsx** — Tab interface
7. **input.tsx** — Text input
8. **chart.tsx** — Recharts wrapper (10kb+)
9. **select.tsx** — Dropdown
10. **toast.tsx** / **toaster.tsx** — Notifications

Also present: breadcrumb, menubar, navigation-menu, carousel, dropdown-menu, context-menu, scroll-area, form, input-otp, label, checkbox, radio-group, popover, hover-card, progress, accordion, collapsible, pagination, drawer, sheet, resizable, separator, command, aspect-ratio.

**Custom:** `glow-dialog.tsx` for neo-cyber styling opportunities.

---

## 5. THEME USAGE ANALYSIS

### Current Theme (v1: Burgundy)

**CSS Variables** (`client/src/index.css`)
```
:root / .dark {
  --background: hsl(0 0% 0%)
  --foreground: hsl(200 6.7% 91.2%)
  --primary: hsl(238.5 94.1% 67.1%)  [blue]
  --sidebar-primary: #A75A5B  [burgundy]
  --sidebar-accent: #4e324c  [purple]
  ... (35 total CSS vars)
}
```

**Brand Colors** (Tailwind)
```
brand.burgundy: { dark: '#791014', DEFAULT: '#A75A5B', light: '#B86B6C' }
brand.rose: '#D99696'
brand.purple: { DEFAULT: '#4e324c', light: '#65557c' }
brand.dark: { DEFAULT: '#120910', mid: '#28131d', card: '#2a1821' }
brand.gold: '#D4A373'
brand.cream: '#F7F4F4'
```

**Usage Counts**
- `brand-*` classes: 642 occurrences
- Direct hex/rgb colors: ~30 inline styles
- `bg-white/text-black`: 110 (light fallback)
- Common: `bg-brand-dark-card`, `bg-brand-burgundy`, `border-brand-*`, `text-brand-*`

**Fonts** (Google Fonts)
- Heading: Major Mono Display
- Body: Inter
- Mono: JetBrains Mono
- Serif: Georgia

**Background Image**
- `/plum_background.880Z.png` — burgundy plum tone
- Applied via `body::after` pseudo-element

---

## 6. MODALS & OVERLAYS

| Modal | Component | Triggers | Purpose |
|-------|-----------|----------|---------|
| LabelCreationModal | LabelCreationModal.tsx | GamePage init, MainMenuPage | Create label for new game |
| SaveGameModal | SaveGameModal.tsx | GameSidebar save button | Save/load game |
| InboxModal | InboxModal.tsx | InboxWidget, email click | Read emails |
| BugReportModal | BugReportModal.tsx | GameSidebar report button | Submit bugs |
| CampaignResultsModal | CampaignResultsModal.tsx | GamePage on campaign end | Campaign summary |
| ArtistDiscoveryModal | ArtistDiscoveryModal.tsx | A&R office flow | Discover artists |
| ArtistDialogueModal | artist-dialogue/ArtistDialogueModal.tsx | Artist card interact | Artist dialogue |
| GenreSelectionModal | ar-office/GenreSelectionModal.tsx | A&R office | Genre filtering |
| WeekSummary | WeekSummary.tsx (modal) | Dashboard auto-show | Week results |
| ConfirmDialog | ConfirmDialog.tsx | Various | Confirmation prompts |

**Pattern:** shadcn `<Dialog>` or `<AlertDialog>`, page-level state, styled with `bg-brand-dark-card border border-brand-purple`.

---

## 7. COMPONENTS BREAKDOWN (68 non-UI files)

**Core (Dashboard/Game State):** GameSidebar, Dashboard, MetricsDashboard, SelectionSummary, WeekSummary (5)

**Cards & Display:** ArtistCard, ArtistDashboardCard, ChartPerformanceCard, ActionCard, ReleaseWorkflowCard, Top10/Top100ChartDisplay (6)

**Lists/Tables:** ArtistRoster, ActiveTours, ActiveReleases, SongCatalog, InboxWidget, AccessTierBadges (6)

**Modals/Overlays:** SaveGameModal, LabelCreationModal, BugReportModal, CampaignResultsModal, InboxModal, ConfirmDialog, ToastNotification (7)

**Executive Suite (6):** ExecutiveMeetings, ExecutiveCard, MeetingSelector, ArtistSelector, DialogueInterface, FocusSlotAttribution

**A&R Office (5):** AROffice, ArtistDiscoveryTable, SourcingModeSelector, GenreSelectionModal, FocusSlotStatus

**Artist Detail Tabs (5):** OverviewTab, AnalyticsTab, ReleasesTab, DiscographyTab, ManagementTab

**Email Templates (15):** AREmail, ArtistEmail, ArtistSigningEmail, ChartEmail, ReleaseEmail, TourCompletionEmail, FinancialEmail, FinancialReportEmail, NumberOneDebutEmail, Top10DebutEmail, TierUnlockEmail, ArtistDiscoveryEmail, + utilities

**Utilities/Other:** ErrorBoundary, TourVarianceTester, ChartDataTable, motion primitives (text-scramble, glow-effect)

**Total:** 5 + 6 + 6 + 7 + 6 + 5 + 5 + 15 + 8 = 63, plus ~5 utilities/admin = 68

---

## 8. SUGGESTED REDESIGN WORK PACKAGES

All 14 player-facing + 9 admin pages + 68 components grouped into 7 disjoint ownership sets:

### Package A: Navigation & App Shell
**Files:** GameLayout, GameSidebar, MainMenuPage, Dashboard (4 files)  
**Focus:** Sidebar colors, app frame, top-level nav  
**Estimate:** 4–6 files  
**Rationale:** Foundation; must establish baseline indigo palette early

### Package B: Executive Suite & Actions
**Files:** ExecutiveSuitePage, ExecutiveMeetings, ExecutiveCard, MeetingSelector, ArtistSelector, DialogueInterface, FocusSlotAttribution, SelectionSummary (8 files)  
**Focus:** Executive action cards, slot allocation, dialogue styling  
**Estimate:** 8 files  
**Rationale:** Complex interactions; needs unified card styling

### Package C: Artist Management
**Files:** ArtistsLandingPage, ArtistPage (+ 5 tabs), ArtistCard, ArtistDashboardCard, ArtistDiscoveryModal, ArtistDialogueModal (12 files)  
**Focus:** Artist cards, roster, detail pages, discovery flow  
**Estimate:** 12 files  
**Rationale:** Largest player surface; extensive card styling

### Package D: A&R Office & Discovery
**Files:** AROfficePage, AROffice, ArtistDiscoveryTable, SourcingModeSelector, GenreSelectionModal, FocusSlotStatus (6 files)  
**Focus:** Talent discovery flow, table styling  
**Estimate:** 6 files  
**Rationale:** Cohesive subsystem; after exec patterns established

### Package E: Release & Recording Workflows
**Files:** PlanReleasePage, RecordingSessionPage, ReleaseWorkflowCard, LivePerformancePage (4 files)  
**Focus:** Workflow cards, tabs, planning UI  
**Estimate:** 4 files  
**Rationale:** Distinct domain; establishes workflow pattern

### Package F: Modals, Toasts & Overlays
**Files:** SaveGameModal, LabelCreationModal, BugReportModal, CampaignResultsModal, InboxModal, WeekSummary, ConfirmDialog, ToastNotification (8 files)  
**Focus:** Modal styling, animations, overlay design  
**Estimate:** 8 files  
**Rationale:** Cross-cutting; unified design payoff

### Package G: Secondary & Admin Pages
**Files:** Top100ChartPage, Top10ChartDisplay, OfficePage, LandingPage, all admin pages (QualityTester, PopularityTester, StreamingDecayTester, MarketsEditor, BugReportsPage, AdminDatabaseHealthPage, TestData, ToursTest, UXPrototypesPage, etc.), email templates, utilities (20+ files)  
**Focus:** Charts, data tables, landing page, admin tools  
**Estimate:** 20+ files  
**Rationale:** Lower priority; reuse patterns from A–F

### Package H: Theme Tokens & Primitives (Parallel)
**Files:** `index.css`, `tailwind.config.ts`, shadcn/ui all 48 files, motion primitives  
**Focus:** CSS variable updates, brand color palette, Tailwind config changes, background image  
**Estimate:** 50+ files (mostly config)  
**Rationale:** Run in parallel; unblocks all pages

---

## 9. NEXT STEPS

1. **Define v2 palette** — Lock indigo, cyan hex values
2. **Update index.css + tailwind.config.ts** — CSS vars + brand colors
3. **Execute Package A** — App shell, sidebar, main menu
4. **Iterate B–C** — Major player surfaces
5. **Apply to D–G** — Consistent patterns
6. **QA & test** — Contrast, accessibility, responsiveness
7. **Deploy staged** — By package

---

## Summary

**23 pages, 68 reusable components, 48 shadcn primitives.** v1 is burgundy/flat; v2 is dark indigo neo-cyber. Seven work packages parallelize the redesign with zero overlap. All player-facing files accounted for.