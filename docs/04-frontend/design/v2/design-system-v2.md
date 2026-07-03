# Design System v2 — "Neo-Cyber HUD" (distilled spec)

**Source of truth** for the 2026-07 full-client redesign. Distilled from the claude.ai/design project
"Copy of Design system curation" — full reference HTML lives beside this file:
`design-system-v2.html` (foundations), `dashboard-v2.html` (sidebar layout), `dashboard-dock.html`
(Command Dock layout — **the chosen nav**), `menu-bars.html` (5 nav studies), `artist-detail.html`,
`splash-disc.html`, `mood-board.html`, `fractal-glass-study.html`.

v2 **supersedes the burgundy-flat v1** ("kept only as reference"). Fidelity policy: *directional* —
match the visual language exactly (colors, glass, glow, type), preserve current UX/data/functionality
where mockups diverge from the real app.

---

## 1. Color

### Base & surfaces (dark indigo, glass)
| Token | Value | Use |
|---|---|---|
| `app` | `#070610` | page background (html/body) |
| `sidebar/dock` | `rgba(9,8,18,0.8)` + `backdrop-blur(10px)` | nav chrome |
| `panel` | `linear-gradient(180deg, rgba(24,18,40,0.72), rgba(12,10,24,0.72))` | standard card/panel fill |
| `panel-alt` | `linear-gradient(180deg, rgba(22,16,36,0.7), rgba(11,9,22,0.7))` | secondary cards |
| `inner card` | `rgba(30,20,44,0.5–0.9)` | nested cards (e.g. artist card in roster) |
| `hover fill` | `rgba(255,255,255,0.045)` | hover background |
| `hairline border` | `rgba(255,255,255,0.06)` panels · `0.08–0.12` on emphasis | ALL borders are white-alpha, never colored gray |

Panel recipe (the single most repeated block):
```
position:relative; border:1px solid rgba(255,255,255,0.06); border-radius:16px;
background:linear-gradient(180deg, rgba(24,18,40,0.72), rgba(12,10,24,0.72));
box-shadow:inset 0 1px 0 rgba(255,255,255,0.05), 0 16px 40px rgba(0,0,0,0.4);
overflow:hidden;   + chromatic hairline strip (see §4.1)
```

### Spectral neon accents (never paint surfaces with these — accents/data/glow only)
| Name | Hex | | Name | Hex |
|---|---|---|---|---|
| magenta | `#ff3d6e` | | cyan | `#37d6ff` |
| amber | `#ff9a3d` | | blue | `#4a6bff` |
| yellow | `#ffe14d` | | purple | `#a05af0` |
| green | `#57ff8f` | | lilac | `#c8a6ff` |

Full spectrum sweep appears ONLY in the holo disc mark + shimmer bars. Elsewhere pull ONE hue.
Secondary accent hexes seen in comps: pink `#ff4d8d` (gradients), deep purple `#7a2fb0`/`#d14a7a`
(primary button gradient), bloom colors `#6a2fd0`/`#2f8fff`/`#ff2f7a`.

### Semantic & money
| Token | Hex | Notes |
|---|---|---|
| positive | `#37e0b0` | mint — earned, ROI, success |
| negative | `#ff5d8a` | pink — spent-net-negative, errors, low stats |
| warning | `#f5c542` | mid-range stats, cautions |
| money | `#F0C98A` | **Money ALWAYS renders gold in JetBrains Mono** |

### Text ramp
| Role | Value |
|---|---|
| primary/headings | `#F7F4FB` |
| body | `rgba(233,230,244,0.7)` |
| muted/captions | `rgba(233,230,244,0.5)` (0.42–0.55 range) |
| mono labels | `rgba(180,170,220,0.5)` uppercase, letter-spacing 0.16–0.3em |
| accent/links/active | `#c8a6ff` |

## 2. Type
- **Display**: `Major Mono Display` (Google Fonts) — wordmarks & page titles, lowercase, with chromatic-aberration text-shadow: `2px 0 0 rgba(255,77,141,0.4), -2px 0 0 rgba(55,180,255,0.45), 0 0 40px rgba(160,90,240,0.3)`
- **Sans**: `Inter` 300–700 — body, labels, buttons
- **Mono**: `JetBrains Mono` 400–600 — money, stats, section labels, seeds; tabular figures
- Scale: display 44–66 / title 17 / body 14 / label 10 (mono, uppercase, tracked) / stat 26–27 (mono 600)
- Load via Google Fonts `<link>` in `client/index.html`: `Inter:wght@300;400;500;600;700`, `JetBrains+Mono:wght@400;500;600`, `Major+Mono+Display`

## 3. Shape & light
- Radii: **card 16px · button 13px · chip 9px · pill 999px** (inner cards 12–14px, small buttons 9–10px)
- Depth from LIGHT, not borders: inset top-highlight `inset 0 1px 0 rgba(255,255,255,0.05)` + soft drop `0 16px 40px rgba(0,0,0,0.4)` + colored glows
- Elevation tiers: **Panel** (inset highlight + drop) · **Action** (colored cast: `0 6px 26px rgba(140,60,200,0.5), inset 0 1px 0 rgba(255,255,255,0.25)`) · **Accent** (pure neon glow: `0 0 16px rgba(<hue>,0.35)`)

## 4. The 8 signature HUD motifs (use consistently; any new screen will belong)
1. **Chromatic hairline** — 1px gradient strip on the top edge of EVERY panel, inset 18px:
   `position:absolute; top:0; left:18px; right:18px; height:1px; background:linear-gradient(90deg, transparent, rgba(255,77,141,0.4), rgba(160,90,240,0.5), rgba(55,214,255,0.4), transparent)`
2. **HUD corner ticks** — purple top-left, cyan bottom-right 12–13px L-brackets on key panels: `border-top/left:1px solid rgba(160,90,240,0.5)` / `border-bottom/right:1px solid rgba(55,214,255,0.5)`
3. **Chromatic aberration** — RGB-split text-shadow on display headers (see §2)
4. **Shimmer underline** — 2–3px looping spectrum bar under page titles: `background:linear-gradient(90deg,#ff4d8d,#a05af0,#37d6ff,#ff4d8d); background-size:200% 100%; animation:shimmer 6s linear infinite`
5. **Dot grid + spectral bloom** — page backdrop: 26px dot lattice `radial-gradient(rgba(180,170,220,0.05) 1px, transparent 1px)` + large blurred (100px) radial blooms of `#6a2fd0/#2f8fff/#ff2f7a` at ~0.4–0.55 opacity
6. **Holo disc mark** — spinning `repeating-conic-gradient` rainbow disc with dark spindle center; the brand mark at every scale (sidebar 40px, dock center 60px, splash 360px)
7. **Grain overlay** — animated SVG fractal-noise at 0.07 opacity `mix-blend-mode:overlay` over the whole app (grainShift 3s steps(6))
8. **Vertical fractal glass ("reeded refraction")** — poster-tier surface for splash/section headers: fluid spectral gradient + `repeating-linear-gradient(90deg, ...)` ribs + chromatic rib glints. Rule of restraint: full warp = poster tier only; UI tier gets ribs+blur only.

## 5. Keyframes (define once in index.css)
```
ds-spin (discSpin): rotate 0→360 · 12–16s linear infinite
ds-shimmer: background-position 0%→200% · 6s linear
ds-bloom (bloomDrift): translate/scale drift · 48–52s ease-in-out
ds-grain (grainShift): 5-step translate jitter · 3s steps(6)
ds-ring (ringPulse): opacity .6→1, scale 1→1.08 · 4s ease-in-out
```

## 6. Components (recipes from shipping comps)
- **Primary button** ("Advance Week"): `border-radius:13px; background:linear-gradient(135deg,#d14a7a,#7a2fb0); box-shadow:0 6px 26px rgba(140,60,200,0.5), inset 0 1px 0 rgba(255,255,255,0.25)` + 1px white-gradient top rim (inset 14px); Inter 600 14px white
- **Outline/accent button**: `color:#37d6ff; border:1px solid rgba(55,214,255,0.35); background:rgba(55,214,255,0.06); border-radius:13px`
- **Ghost button**: `color:rgba(233,230,244,0.75); border:1px solid rgba(255,255,255,0.09); background:rgba(255,255,255,0.02)`
- **Chips/pills**: mono 11–12px, `padding:4–7px 11–14px; border-radius:999px`, hue-tinted bg at 0.1–0.14 + matching border at 0.35–0.4 + matching text (e.g. lilac chip: bg `rgba(160,90,240,0.14)`, border `rgba(160,90,240,0.4)`, text `#c8a6ff`)
- **Stat block**: mono 600 26px value + 11.5px muted label below; money gold, positive mint, negative pink
- **Progress bars**: 5–6px, pill, track `rgba(255,255,255,0.08)`, fill = single semantic hue (or 2-stop gradient); value in mono beside label
- **Status rail**: full-width panel split by 1px `rgba(255,255,255,0.07)` verticals into Core Status / Weekly Performance / Access Tiers groups; corner ticks
- **Tier badges**: locked = ghost chip ("None"); unlocked = gradient fill + glow (e.g. `linear-gradient(135deg,#37e0b0,#2fb0ff)` + `0 0 16px rgba(55,224,176,0.4)`, dark text `#04121a`)
- **Nav item (rail)**: 13.5px/500, muted → hover `rgba(255,255,255,0.045)` bg + full text; ACTIVE = `linear-gradient(90deg, rgba(160,90,240,0.22), rgba(55,214,255,0.03))` bg + 2.5px vertical gradient bar on left edge + lilac icon
- **Section labels (nav)**: mono 10px, tracking 0.24em, uppercase, `rgba(233,230,244,0.28)`
- **Empty states**: centered 52px rounded-14px icon tile (hue bg 0.12 / border 0.32 / glow), 14px/600 title, 12.5px muted caption
- **Tooltip**: `background:#180f2e; border:1px solid rgba(255,255,255,0.12); border-radius:8px; box-shadow:0 8px 22px rgba(0,0,0,0.55)`, 11.5px/500

## 7. Command Dock (chosen navigation — replaces sidebar; see dashboard-dock.html)
- `position:fixed; left:50%; bottom:28px; translateX(-50%); z-index:20` floating pill:
  `padding:11px 18px; border-radius:999px; background:rgba(18,14,32,0.72); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.12); box-shadow:0 26px 60px rgba(0,0,0,0.55), 0 10px 34px rgba(106,47,208,0.35), inset 0 1px 0 rgba(255,255,255,0.14)` + chromatic hairline (inset 24px) + purple under-glow blob
- Items: 46px rounded-13px icon buttons, muted → hover white bg 0.08; tooltips above; notification dot = 7px cyan glow dot top-right; active page = gradient bg + 16px purple glow + 5px lilac dot underneath
- **Center: 60px holo disc elevated (-26px margin-top)** = Dashboard/Home, with pulsing ring glow; disc has soft-light brushed-sheen second conic layer
- Right of divider: 38px user avatar (purple→blue gradient)
- Page content gets `padding-bottom:~170px` so the dock never covers content
- Header keeps: balance chip (gold mono in glass chip w/ hairline), week + date block, Advance Week primary button — top-right of page, since sidebar is gone
- Overflow ("More" ellipsis item): Save/Load, Report a Bug, Admin, misc — the design shows a "More" dock item; implement as popover menu matching tooltip/panel styling

## 8. Splash (splash-disc.html)
Full-viewport `#050308`; reeded fractal-glass backdrop (0.62 opacity) over spectral radials, dark scrim; centered 360px vinyl disc (holographic palette default) spinning 32s with brushed sheen, grooves, specular highlight, dark label w/ gold `33⅓ rpm` micro-copy; `music label manager` in Major Mono w/ aberration; gold-accent `press ENTER to begin` mono prompt w/ blinking cursor; corner ticks all 4 corners (gold `rgba(212,163,115,0.55)`); top HUD strip (label name · seed · build), bottom menu strip (new game / continue / settings). Splash uses warm gold `#D4A373` accents — unique to this screen.

## 9. Backdrop stack (every page, behind content)
1. `#070610` base
2. *(liquid-chrome photo at 0.3–0.42 opacity — asset NOT importable via API (256KB cap); use CSS approximation: large soft radial blooms `#6a2fd0 / #2f8fff / #ff2f7a / #a7343f` blurred 96–100px, opacity 0.32–0.55, `ds-bloom` drift. If `client/public/liquid-chrome-bg.jpg` exists at runtime, render it under the blooms — code should tolerate its absence.)*
3. Dark scrim `linear-gradient(180deg, rgba(7,6,16,0.4–0.62), rgba(7,6,16,0.28–0.5))`
4. 26px dot grid at 0.5 opacity
5. Content (z-index above)
6. Grain overlay at 0.07, `mix-blend-mode:overlay`, z-index above content, `pointer-events:none`

## 10. Implementation mapping (this repo)
- Tokens land in `tailwind.config.ts` (extend colors/borderRadius/boxShadow/keyframes/fontFamily) + `client/src/index.css` (CSS vars, base styles, scrollbar, `.glass-panel`/`.chromatic-hairline`/`.hud-ticks`/`.backdrop-stack` utilities, keyframes)
- shadcn/ui primitives in `client/src/components/ui/` restyled via their CSS-var theme (`--background`, `--card`, `--primary`…) + class updates
- Keep legacy `brand-*` Tailwind classes working during migration by remapping them to v2 equivalents where sensible; new code uses v2 tokens
- Icons: comps use Font Awesome; the app already has `lucide-react` — **map FA icons to their lucide equivalents** (gauge-high→Gauge, user-tie→UserRound/Briefcase, compact-disc→Disc3, rocket→Rocket, sliders→SlidersHorizontal, microphone-lines→Mic, chart-line→TrendingUp, trophy→Trophy, floppy-disk→Save, bug→Bug, shield-halved→ShieldHalf, building→Building2, users→Users, inbox→Inbox, coins→Coins, ellipsis→MoreHorizontal). Do NOT add Font Awesome.
- Accessibility: `prefers-reduced-motion` must disable disc spin / shimmer / grain / bloom drift animations. Contrast: body text ≥ 0.7 alpha on panels.
- Money formatting: always JetBrains Mono + gold `#F0C98A`; net values mint/pink by sign.
