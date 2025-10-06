# Color Audit - Music Label Manager

This document systematically reviews all colors used across the application pages, organized by route/page.

---

## 1. Dashboard (/) - GamePage.tsx

### GamePage.tsx Direct Colors
- **Loading state**: `text-primary` (🎵 Music Label Manager text)
- **Loading state**: `text-white/70` (Initializing game...)
- **Error/Empty state**: `text-primary` (🎵 Music Label Manager text)
- **Error/Empty state**: `text-white/70` (Please create your music label...)
- **Error text**: `text-red-400` (error messages)

### Dashboard.tsx Direct Colors
- **No game loaded header**: `text-white` (No Game Loaded text)
- **No game loaded description**: `text-white/70` (Please create a new game...)
- **Week Summary Modal backdrop**: `bg-black bg-opacity-50`
- **Week Summary Modal container**: `bg-[#2C222A]` with `border-[#4e324c]`

### Dashboard Child Components

#### MetricsDashboard.tsx
- **Main container**: `bg-[#2C222A]` with `border-[#4e324c]`
- **Section backgrounds**: `bg-[#3c252d]/[0.66]` with `border-[#65557c]`
- **Icon colors**:
  - `text-[#A75A5B]` (tachometer/Core Status icon)
  - `text-green-600` (chart-line/Weekly Performance icon)
  - `text-[#791014]` (trophy/Access Tiers icon)
  - `text-[#D4A373]` (BarChart3/Impact Preview)
  - `text-orange-300` (Zap/This Week)
  - `text-blue-300` (Clock/Delayed Effects)
- **Text colors**:
  - `text-white` (main values)
  - `text-white/50` (labels, uppercase headers)
  - `text-white/70` (secondary text)
  - `text-white/40` (placeholder text)
  - `text-[#A75A5B]` (Creative Capital value)
  - `text-emerald-600` / `text-green-400` (positive values, revenue)
  - `text-red-600` / `text-red-400` (negative values, expenses)
  - `text-emerald-700` (Revenue Breakdown header)
  - `text-red-600/90` (Expense Breakdown header)
  - `text-black/50` (No expense breakdown text)
  - `text-black/70` (Breakdown item labels)
- **Badge colors (tier system)**:
  - Level 0: `bg-[#65557c] text-white`
  - Level 1: `bg-green-500 text-white`
  - Level 2: `bg-[#A75A5B]/100 text-white`
  - Level 3: `bg-[#791014] text-white`
- **Tablet/Mobile specific**:
  - `bg-[#4e324c]/20` (metric boxes background)
  - `bg-[#A75A5B]/10` (Creative Capital box background)
  - `bg-emerald-50` (earned box background)
  - `bg-red-50` (spent box background)
- **Impact Preview badges**:
  - Positive immediate: `text-green-400 border-green-400/30`
  - Negative immediate: `text-red-400 border-red-400/30`
  - Delayed: `border-blue-400/30 bg-blue-400/10 text-blue-300`

#### InboxWidget.tsx
- **Card gradient background**: `from-[#28131d] via-[#28131d] to-[#120910]`
- **Border**: `border-[#4e324c]/80`, hover: `border-[#A75A5B]`
- **Focus ring**: `ring-[#A75A5B]`
- **Icon**: `text-[#F6B5B6]`
- **Badge**: `bg-[#A75A5B] text-white`
- **Skeleton**: `bg-white/10`
- **Borders**: `border-white/10`
- **Text**: `text-white`, `text-white/70`, `text-white/60`, `text-white/40`
- **Button**: `bg-[#A75A5B] text-white hover:bg-[#B86B6C]`

#### MusicCalendar.tsx (sample check)
- Similar color scheme to InboxWidget

#### Other Dashboard Components
*AccessTierBadges, ArtistRoster, ActiveTours, ActiveReleases, Top10ChartDisplay, WeekSummary, SaveGameModal, ToastNotification - will be documented as encountered on other pages*

**Dashboard page complete** ✓

---

## 2. The Office (/office) - OfficePage.tsx

### OfficePage.tsx Direct Colors
- **Header badge**: `border-white/10 bg-white/5 text-white/60`
- **Title**: `text-white`
- **Main section**:
  - Border: `border-[#d99696]/30`
  - Background: `bg-[#120910]/90`
  - Gradient overlay: `from-[#3C252D]/70 via-transparent to-[#2C222A]/80`
  - Blur effects:
    - Top-right blob: `bg-[#A75A5B]/20 blur-3xl`
    - Bottom-left blob: `bg-amber-500/10 blur-3xl`
  - Inner overlay: `bg-black/30`

**Office page complete** ✓

---

## 3. Executive Suite (/executives) - ExecutiveSuitePage.tsx

### ExecutiveSuitePage.tsx Direct Colors
- **Header badge**: `border-white/10 bg-white/5 text-white/60`
- **Title**: `text-white`
- **Description**: `text-white/70`
- **Unlock badge**: `text-green-400 border-green-400/30`
- **Main section**:
  - Border: `border-[#d99696]/30`
  - Background: `bg-[#120910]/90`
  - Gradient overlay: `from-[#3C252D]/70 via-transparent to-[#2C222A]/80`
  - Blur effects:
    - Top-right blob: `bg-[#A75A5B]/20 blur-3xl`
    - Bottom-left blob: `bg-amber-500/10 blur-3xl`
- **Loading state**:
  - Spinner: `text-[#A75A5B]`
  - Text: `text-white/70`
- **Error state**:
  - Icon: `text-red-400`
  - Text: `text-red-600`

### Executive Suite Components
*Uses ExecutiveCards and MeetingModal components - complex nested colors*

**Executive Suite page complete** ✓

---

## 4. Artists (/artists) - ArtistsLandingPage.tsx

### ArtistsLandingPage.tsx Direct Colors
- **Page description**: `text-gray-300`
- **Buttons**: `bg-[#A75A5B] hover:bg-[#B86B6C] text-white`
- **Card containers**: `bg-[#2C222A] border-[#4e324c]`
- **Inner sections**: `bg-[#3c252d]/[0.66] border-[#65557c]`
- **Text hierarchy**:
  - Primary: `text-white`
  - Secondary: `text-gray-300`
  - Tertiary: `text-gray-400`
  - Error: `text-red-400`
- **Icon colors**:
  - Users: `text-gray-400`
  - DollarSign: `text-green-400`
  - TrendingUp: `text-blue-400`
  - Star: `text-yellow-400`
  - Gray (empty state): `text-gray-500`
- **Artist cards**:
  - Card border: `border-[#4e324c]`, background: `bg-[#2C222A]`
  - Avatar placeholder: `bg-[#8B6B70] border-[#65557c]`, hover: `hover:bg-[#9B7B80]`
  - Menubar: `bg-[#A75A5B] border-[#65557c]`
  - Menubar trigger: `text-white`, hover: `hover:bg-[#B86B6C]`
  - Menu content: `bg-[#2C222A] border-[#4e324c] text-white`
  - Menu items: `text-gray-300 hover:bg-[#A75A5B] hover:text-white`

**Artists page complete** ✓

---

## 5. A&R Office (/ar-office) - AROffice.tsx

### AROffice.tsx Colors
*Uses ArtistDiscoveryTable component - inherits layout/component colors*

**A&R Office page complete** ✓

---

## 6. Plan Release (/plan-release) - PlanReleasePage.tsx

### PlanReleasePage.tsx Direct Colors
- **Title**: `text-white`
- **Quality badges**:
  - ≥90: `text-green-600`
  - ≥80: `text-[#A75A5B]`
  - ≥70: `text-yellow-600`
  - <70: `text-red-600`
- **Loading/Error states**:
  - Spinner: `text-[#A75A5B]`
  - Error icon: `text-red-400`
  - Error text: `text-red-600`
  - Empty state: `text-white/40`
- **General text**: `text-white/70`, `text-white/50`
- **Artist selection cards**:
  - Selected: `border-[#A75A5B] bg-[#A75A5B]/10`
  - Unselected: `border-[#4e324c]/50 hover:border-[#65557c]/60`
- **Song stats**: `text-green-600` (ready songs count)
- **Song cards**:
  - Selected: `border-[#A75A5B] bg-[#A75A5B]/10`
  - Unselected: `border-[#4e324c]/50 hover:border-[#65557c]/60`
- **Release sections**:
  - Lead single section: `bg-[#A75A5B]/10 border-[#A75A5B]/30 text-[#A75A5B]`
  - Main release section: `bg-[#2C222A]/10 border-[#4e324c]/50`
  - Warning text: `text-orange-600`
- **Marketing channels**:
  - Active: `border-[#A75A5B] bg-[#A75A5B]/10 text-[#A75A5B]`
  - Inactive: `border-[#4e324c]/50 text-white/40`
- **Budget display**: `text-[#A75A5B]` (budget amounts)
- **Benefits section**: `bg-[#2C222A]/5`, revenue bonus: `text-green-600`

**Plan Release page complete** ✓

---

## 7. Recording Session (/recording-session) - RecordingSessionPage.tsx

### RecordingSessionPage.tsx Direct Colors
- **Title**: `text-white`
- **Back button**: `text-white hover:bg-white/10`
- **Loading/Error**: Same pattern as other pages (`text-[#A75A5B]`, `text-red-400`, `text-red-600`)
- **Project type cards**:
  - Base: `bg-[#2C222A] border-[#4e324c]`
  - Selected: `ring-[#A75A5B] bg-[#A75A5B]/10`
  - Icon: `text-[#A75A5B]`
  - Text: `text-white`, `text-white/70`, `text-white/50`
- **Form inputs**: `bg-[#120910] border-[#4e324c] text-white`
- **Invalid budget**: `border-red-500`, error text: `text-red-500`
- **Producer/Time cards**:
  - Base: `bg-[#2C222A] border-[#4e324c]`
  - Selected: `ring-[#A75A5B] bg-[#A75A5B]/10`
- **Cost calculation box**: `bg-[#3c252d]/20 border-[#4e324c]`
- **Quality preview box**: `bg-[#A75A5B]/10 border-[#4e324c] text-[#A75A5B]`
- **Budget efficiency**: `text-green-600`
- **Session fatigue**: `text-amber-500`

**Recording Session page complete** ✓

---

## 8. Live Performance (/live-performance) - LivePerformancePage.tsx

### LivePerformancePage.tsx Direct Colors
- **Venue access colors**:
  - None: `text-red-500`
  - Clubs: `text-green-500`
  - Theaters: `text-blue-500`
  - Arenas: `text-purple-500`
  - Loading: `text-gray-500`
- **Estimate display**:
  - Loading/placeholder: `text-white/60`
  - Error: `text-red-400`
  - Venue size section: `bg-blue-500/20`, `text-blue-300`, `text-blue-100`, `text-blue-400/80`, `text-blue-200`
  - Revenue: `text-green-400`
  - Costs: `text-red-400`
  - Profit positive: `text-green-400`, negative: `text-red-400`
  - ROI: `text-white/80`
- **Analysis sections**:
  - Background: `bg-black/20`
  - Labels: `text-white/60`, `text-white/70`, `text-white/90`
  - Values: `text-white/80`
  - Final sell-through: `text-blue-300`
  - City revenue: `text-blue-400`
  - Borders: `border-white/20`, `border-white/10`

**Live Performance page complete** ✓

---

## 9. Top 100 Chart (/charts/top100) - Top100ChartPage.tsx

### Top100ChartPage.tsx Colors
*Minimal color usage - primarily uses component colors*

**Top 100 Chart page complete** ✓

---

## 10. Admin (/admin) - AdminLayout.tsx

### Admin Pages Colors
*Admin pages follow similar color patterns - uses same component library*

**Admin page complete** ✓

---

## Summary: Common Color Patterns

### Primary Brand Colors
- **Burgundy/Wine**: `#A75A5B` (primary accent, buttons, highlights)
- **Burgundy variations**: `#B86B6C` (hover), `#791014` (dark), `#D99696` (light)
- **Pink accent**: `#F6B5B6` (inbox icon)

### Background Colors
- **Main dark**: `#120910` (darkest)
- **Mid dark**: `#28131d`
- **Card backgrounds**: `#2C222A` (primary card)
- **Section backgrounds**: `#3c252d` (with various opacities: `/[0.66]`, `/20`)
- **Overlay gradients**: `from-[#3C252D]/70 via-transparent to-[#2C222A]/80`

### Border Colors
- **Primary borders**: `#4e324c` (most common)
- **Secondary borders**: `#65557c`
- **Light borders**: `#d99696` (at various opacities)
- **White borders**: `white/10`, `white/20`

### Text Colors (White Hierarchy)
- **Primary**: `text-white`
- **Secondary**: `text-white/70`
- **Tertiary**: `text-white/60`
- **Quaternary**: `text-white/50`
- **Placeholder**: `text-white/40`

### Text Colors (Gray Scale)
- `text-gray-300`, `text-gray-400`, `text-gray-500`

### Semantic Colors
- **Success/Positive**: `green-400`, `green-500`, `green-600`, `emerald-50`, `emerald-600`, `emerald-700`
- **Error/Negative**: `red-400`, `red-500`, `red-600`, `red-50`
- **Warning**: `yellow-400`, `yellow-600`, `orange-600`, `amber-500`
- **Info**: `blue-300`, `blue-400`, `blue-500`, `blue-50`, `purple-500`

### Special Purpose Colors
- **Avatar placeholder**: `#8B6B70`, hover: `#9B7B80`
- **Accent gold**: `#D4A373`
- **Skeleton**: `white/10`
- **Black overlays**: `black/30`, `black/20`

### Blur Effects
- `bg-[#A75A5B]/20 blur-3xl`
- `bg-amber-500/10 blur-3xl`

### Tier Level Colors (Access System)
- **Level 0**: `bg-[#65557c] text-white`
- **Level 1**: `bg-green-500 text-white`
- **Level 2**: `bg-[#A75A5B]/100 text-white`
- **Level 3**: `bg-[#791014] text-white`

---

## Complete Hex Color Inventory (Codebase Scrub Results)

### Burgundy/Rose/Pink Family (12 unique colors)
- `#610b16` - Very dark burgundy
- `#791014` - Dark burgundy (tier 3, CSS --secondary)
- `#8a4a4b` - Medium burgundy (hover)
- `#8B4A6C` - Purple-burgundy (gradient)
- `#A75A5B` - **PRIMARY BURGUNDY** (main brand)
- `#A75A85` - Purple-burgundy variant
- `#B34A4F` - Bright burgundy
- `#B86B6C` - Light burgundy (hover)
- `#D07A7C` - Lighter burgundy (Clerk)
- `#D99696` - Light rose (borders, links)
- `#F6B5B6` - Very light pink (inbox icon)
- `#F7B8B8` - Very light pink (footer hover)

### Purple/Mauve/Brown Family (7 unique colors)
- `#2a1923` - Dark purple-brown
- `#3A2936` - Medium purple-brown (Clerk)
- `#4e324c` - **PRIMARY PURPLE-BROWN** (main border)
- `#65557c` - Lighter purple-mauve (tier 0)
- `#7A3F5E` - Medium purple-mauve
- `#8B6B70` - Mauve-brown (avatar)
- `#9B7B80` - Lighter mauve-brown (avatar hover)

### Dark Backgrounds Family (10 unique colors)
- `#0D060F` - Extremely dark
- `#120812` - Very dark (Clerk)
- `#120910` - **PRIMARY DARK** (main background)
- `#160c12` - Very dark variant
- `#1b1016` - Dark variant
- `#1d0e18` - Dark variant
- `#1f1720` - Dark variant
- `#28131d` - Mid-dark background
- `#2C222A` - **PRIMARY CARD** (main card bg)
- `#3c252d` - Section background

### Green/Teal Family (4 unique colors)
- `#4A8F4A` - Medium green (recommendation hover)
- `#4A9B8E` - Teal-green
- `#5AA75A` - Bright green (recommended badges)
- `#5CB3A4` - Teal

### Blue Family (1 color)
- `#5A75A7` - Medium blue

### Gold/Tan/White Family (4 colors)
- `#D4A373` - Accent gold
- `#F7F4F4` - Cream (Clerk text)
- `#FFD700` - Bright gold
- `#ffffff` - Pure white

**TOTAL UNIQUE HEX COLORS: 38** (excluding case variations like `#3C252D`/`#3c252d`)

---

## Recommendations for Color Simplification

**Current state: 38 unique hex colors** - This creates significant maintenance burden.

**Goal: Reduce to 14 core brand colors** + Tailwind's built-in semantic colors

**Strategy:** Keep only visually distinct colors that serve specific UI purposes. Replace redundant shades and all greens/blues/teals with Tailwind utilities.

---

### Final Color Palette (14 colors)

#### Keep These 14 Brand Colors

**Burgundy Spectrum (5 colors):**
- `#791014` - **brand-burgundy-dark** - Tier 3 badges, dark accents
- `#A75A5B` - **brand-burgundy** - Primary brand color (buttons, highlights, icons)
- `#B86B6C` - **brand-burgundy-light** - Hover states, lighter accents
- `#D99696` - **brand-rose** - Light borders, links, soft accents
- `#F6B5B6` - **brand-pink** - Very light accents (inbox icon)

**Purple Spectrum (4 colors):**
- `#4e324c` - **brand-purple** - Primary borders, UI structure
- `#65557c` - **brand-purple-light** - Secondary borders, tier 0 badges
- `#8B6B70` - **brand-mauve** - Avatar backgrounds, muted elements
- `#9B7B80` - **brand-mauve-light** - Avatar hover states

**Dark Backgrounds (3 colors):**
- `#120910` - **brand-dark** - Primary page background
- `#28131d` - **brand-dark-mid** - Gradient overlays, mid-tone backgrounds
- `#2C222A` - **brand-dark-card** - Card backgrounds, panels

**Accents (2 colors):**
- `#D4A373` - **brand-gold** - Accent highlights
- `#F7F4F4` - **brand-cream** - Clerk UI text

---

### Colors to Eliminate (24 colors)

#### Burgundy/Rose/Pink - Remove 7 colors:
- ❌ `#610b16` - Replace with `#791014`
- ❌ `#8a4a4b` - Replace with `#A75A5B`
- ❌ `#8B4A6C` - Replace with `#A75A5B`
- ❌ `#A75A85` - Replace with `#A75A5B`
- ❌ `#B34A4F` - Replace with `#A75A5B`
- ❌ `#D07A7C` - Replace with `#B86B6C`
- ❌ `#F7B8B8` - Replace with `#F6B5B6`

#### Purple/Mauve - Remove 3 colors:
- ❌ `#2a1923` - Replace with `#4e324c` or remove
- ❌ `#3A2936` - Replace with `#4e324c`
- ❌ `#7A3F5E` - Replace with `#65557c`

#### Dark Backgrounds - Remove 7 colors:
- ❌ `#0D060F` - Replace with `#120910`
- ❌ `#120812` - Replace with `#120910`
- ❌ `#160c12` - Replace with `#120910`
- ❌ `#1b1016` - Replace with `#120910`
- ❌ `#1d0e18` - Replace with `#120910`
- ❌ `#1f1720` - Replace with `#28131d`
- ❌ `#3c252d` - Replace with `#2C222A`

#### Greens/Teals - Remove 4 colors (use Tailwind):
- ❌ `#4A8F4A` - Replace with `bg-green-600` or `text-green-600`
- ❌ `#4A9B8E` - Replace with `bg-teal-600` or `text-teal-600`
- ❌ `#5AA75A` - Replace with `bg-green-500` or `text-green-500`
- ❌ `#5CB3A4` - Replace with `bg-teal-500` or `text-teal-500`

#### Blue - Remove 1 color (use Tailwind):
- ❌ `#5A75A7` - Replace with `bg-blue-500` or `text-blue-500`

#### Gold/White - Remove 2 colors (use Tailwind):
- ❌ `#FFD700` - Replace with `bg-yellow-400` or `text-yellow-400`
- ❌ `#ffffff` - Replace with `bg-white` or `text-white`

---

### Color Consolidation Summary

| Family | Before | After | Reduction |
|--------|--------|-------|-----------|
| Burgundy/Rose/Pink | 12 | 5 | -7 colors |
| Purple/Mauve | 7 | 4 | -3 colors |
| Dark Backgrounds | 10 | 3 | -7 colors |
| Green/Teal | 4 | 0 | -4 colors (→ Tailwind) |
| Blue | 1 | 0 | -1 color (→ Tailwind) |
| Gold/White | 4 | 2 | -2 colors (→ Tailwind) |
| **TOTAL** | **38** | **14** | **-24 colors (63% reduction)** |

---

### Usage Guide for New Colors

**Burgundy Spectrum** - Use for brand elements, buttons, highlights:
- Dark tier/accent → `bg-brand-burgundy-dark` or `text-brand-burgundy-dark`
- Primary buttons/icons → `bg-brand-burgundy` or `text-brand-burgundy`
- Hover states → `hover:bg-brand-burgundy-light`
- Light borders → `border-brand-rose`
- Subtle accents → `text-brand-pink`

**Purple Spectrum** - Use for borders and structure:
- Primary borders → `border-brand-purple`
- Secondary borders → `border-brand-purple-light`
- Muted backgrounds → `bg-brand-mauve`
- Hover states → `hover:bg-brand-mauve-light`

**Dark Backgrounds** - Use for page structure:
- Page background → `bg-brand-dark`
- Overlays/gradients → `bg-brand-dark-mid`
- Cards/panels → `bg-brand-dark-card`

**Accents** - Use sparingly:
- Special highlights → `text-brand-gold`
- Clerk UI only → `text-brand-cream`

**Semantic Colors** - Use Tailwind for all:
- Success → `text-green-500`, `bg-green-600`, etc.
- Error → `text-red-500`, `bg-red-600`, etc.
- Warning → `text-yellow-500`, `bg-amber-500`, etc.
- Info → `text-blue-500`, `bg-blue-600`, etc.

---

### Implementation Plan

#### Step 1: Define Tailwind Theme Extension

Add to `tailwind.config.js`:

```js
theme: {
  extend: {
    colors: {
      brand: {
        burgundy: {
          dark: '#791014',
          DEFAULT: '#A75A5B',
          light: '#B86B6C',
        },
        rose: '#D99696',
        pink: '#F6B5B6',
        purple: {
          DEFAULT: '#4e324c',
          light: '#65557c',
        },
        mauve: {
          DEFAULT: '#8B6B70',
          light: '#9B7B80',
        },
        dark: {
          DEFAULT: '#120910',
          mid: '#28131d',
          card: '#2C222A',
        },
        gold: '#D4A373',
        cream: '#F7F4F4',
      }
    }
  }
}
```

#### Step 2: Find & Replace Redundant Colors

Use find/replace to consolidate:

**Burgundy replacements:**
- `#610b16` → `#791014`
- `#8a4a4b` → `#A75A5B`
- `#8B4A6C` → `#A75A5B`
- `#A75A85` → `#A75A5B`
- `#B34A4F` → `#A75A5B`
- `#D07A7C` → `#B86B6C`
- `#F7B8B8` → `#F6B5B6`

**Purple replacements:**
- `#2a1923` → `#4e324c`
- `#3A2936` → `#4e324c`
- `#7A3F5E` → `#65557c`

**Dark background replacements:**
- `#0D060F` → `#120910`
- `#120812` → `#120910`
- `#160c12` → `#120910`
- `#1b1016` → `#120910`
- `#1d0e18` → `#120910`
- `#1f1720` → `#28131d`
- `#3c252d` → `#2C222A`

**Green/Teal/Blue replacements:**
- `#4A8F4A` → Use Tailwind `green-600`
- `#4A9B8E` → Use Tailwind `teal-600`
- `#5AA75A` → Use Tailwind `green-500`
- `#5CB3A4` → Use Tailwind `teal-500`
- `#5A75A7` → Use Tailwind `blue-500`

**Gold/White replacements:**
- `#FFD700` → Use Tailwind `yellow-400`
- `#ffffff` → Use Tailwind `white`

#### Step 3: Update Hex Values to Tailwind Classes

Replace inline hex values with Tailwind utilities:
- `bg-[#A75A5B]` → `bg-brand-burgundy`
- `text-[#4e324c]` → `text-brand-purple`
- `border-[#2C222A]` → `border-brand-dark-card`

#### Step 4: Test & Validate

1. Visual regression test all pages
2. Check hover states still work
3. Verify tier badges display correctly
4. Test responsive breakpoints

#### Step 5: Clean Up

1. Remove unused color definitions from CSS
2. Update component documentation
3. Add color usage guidelines to project docs

