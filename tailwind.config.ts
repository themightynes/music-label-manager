import type { Config } from "tailwindcss";

/**
 * Music Label Manager — Tailwind Color System (Design System v2 · "Neo-Cyber HUD")
 *
 * v2 supersedes the burgundy-flat v1. The world is a near-black indigo substrate
 * (#070610) with translucent glass panels, a wide SPECTRAL-NEON accent range reserved
 * for accents / data / glow, and depth built from LIGHT (inset highlights + soft drops +
 * colored glows) rather than flat borders. See docs/04-frontend/design/v2/design-system-v2.md.
 *
 * Two-tier color model (unchanged in structure):
 *
 * 1. SEMANTIC COLORS (CSS custom properties, defined in client/src/index.css)
 *    - Consumed by shadcn UI primitives: primary, card, popover, border, ring, sidebar-*…
 *    - v2 values: --background ≈ #070610, --primary = d14a7a→7a2fb0 action family,
 *      --border = white-alpha. The app is DARK-ONLY in v2.
 *
 * 2. V2 TOKENS (direct Tailwind classes) — the new source of truth for game UI:
 *
 *    Surfaces:
 *      - surface-app (#070610)        page background
 *      - surface-sidebar (indigo/glass) nav chrome
 *      - surface-panel / surface-panel-alt  glass card fills
 *      - surface-inner (#1e142c)      nested cards
 *      - surface-tooltip (#180f2e)    tooltip / popover recipe base
 *
 *    Spectral neon (accents/data/glow ONLY — never paint a surface):
 *      neon-magenta #ff3d6e · neon-amber #ff9a3d · neon-yellow #ffe14d · neon-green #57ff8f
 *      neon-cyan #37d6ff · neon-blue #4a6bff · neon-purple #a05af0 · neon-lilac #c8a6ff
 *      (secondary gradient hues: neon-pink #ff4d8d, action-pink #d14a7a, action-purple #7a2fb0)
 *
 *    Semantic + money:
 *      positive #37e0b0 (mint) · negative #ff5d8a (pink) · warning #f5c542 · money #F0C98A
 *      (Money ALWAYS renders in JetBrains Mono + gold.)
 *
 *    Text ramp:
 *      text-primary #F7F4FB · text-body rgba(233,230,244,.7) · text-muted rgba(233,230,244,.5)
 *      text-label rgba(180,170,220,.5) · text-accent #c8a6ff
 *
 * ── v1 LEGACY MAPPING ──────────────────────────────────────────────────────────
 * The `brand-*` class NAMES are preserved but remapped onto v2 hues so the whole app
 * shifts without touching every file:
 *   brand-burgundy(-dark/-light) → v2 magenta/action family (was wine red)
 *   brand-rose / brand-pink      → lilac / soft-neon-pink
 *   brand-purple(-light)         → deep indigo panel / lilac accent
 *   brand-mauve(-light)          → muted indigo
 *   brand-dark(-mid/-card)       → v2 app / panel / inner-card indigo
 *   brand-gold                   → #F0C98A (money gold)
 *   brand-cream                  → #F7F4FB (primary text)
 * New code should prefer the v2 tokens above.
 *
 * TIER BADGE CONVENTIONS (v2):
 *   Bronze amber · Silver gray · Gold brand-gold · Platinum (c8a6ff→7a2fb0 gradient + glow)
 */

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        // shadcn scale keyed off --radius (16px card in v2)
        lg: "var(--radius)",
        md: "calc(var(--radius) - 3px)",
        sm: "calc(var(--radius) - 7px)",
        // v2 named radii (spec §3): card 16 / button 13 / chip 9 / pill 999
        card: "16px",
        button: "13px",
        chip: "9px",
        pill: "999px",
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        success: {
          DEFAULT: "var(--success)",
          foreground: "var(--success-foreground)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          foreground: "var(--warning-foreground)",
        },
        danger: {
          DEFAULT: "var(--danger)",
          foreground: "var(--danger-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        chart: {
          "1": "var(--chart-1)",
          "2": "var(--chart-2)",
          "3": "var(--chart-3)",
          "4": "var(--chart-4)",
          "5": "var(--chart-5)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },

        // ── v2 surface tokens ──────────────────────────────────────────────
        surface: {
          app: "#070610",
          sidebar: "rgba(9,8,18,0.8)",
          panel: "#181228",
          "panel-alt": "#16102a",
          inner: "#1e142c",
          tooltip: "#180f2e",
        },

        // ── v2 spectral neon accents (accents/data/glow only) ─────────────
        neon: {
          magenta: "#ff3d6e",
          amber: "#ff9a3d",
          yellow: "#ffe14d",
          green: "#57ff8f",
          cyan: "#37d6ff",
          blue: "#4a6bff",
          purple: "#a05af0",
          lilac: "#c8a6ff",
          pink: "#ff4d8d",
        },

        // ── v2 semantic + money ───────────────────────────────────────────
        positive: "#37e0b0",
        negative: "#ff5d8a",
        money: "#F0C98A",

        // ── v2 action gradient stops ──────────────────────────────────────
        action: {
          pink: "#d14a7a",
          purple: "#7a2fb0",
        },

        // ── v2 text ramp ──────────────────────────────────────────────────
        text: {
          primary: "#F7F4FB",
          body: "rgba(233,230,244,0.7)",
          muted: "rgba(233,230,244,0.5)",
          label: "rgba(180,170,220,0.5)",
          accent: "#c8a6ff",
        },

        // ── brand-* : v1 names remapped to v2 hues (see header) ───────────
        brand: {
          burgundy: {
            dark: "#7a2fb0",     // deep action purple (was #791014)
            DEFAULT: "#d14a7a",  // action magenta-pink (was #A75A5B)
            light: "#ff4d8d",    // neon pink hover (was #B86B6C)
            foreground: "#ffffff",
          },
          rose: "#c8a6ff",       // lilac accent (was #D99696)
          pink: "#ff8ab0",       // soft neon pink (was #F6B5B6)
          purple: {
            DEFAULT: "#241a3a",  // deep indigo panel edge (was #4e324c)
            light: "#a05af0",    // neon purple accent (was #65557c)
          },
          mauve: {
            DEFAULT: "#6a5a86",  // muted indigo (was #8B6B70)
            light: "#8a7aa8",    // (was #9B7B80)
          },
          dark: {
            DEFAULT: "#070610",  // v2 app bg (was #120910)
            mid: "#16102a",      // panel-alt (was #28131d)
            card: "#1e142c",     // inner card (was #2a1821)
          },
          gold: "#F0C98A",       // money gold (was #D4A373)
          cream: "#F7F4FB",      // primary text (was #F7F4F4)
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
        mono: ["var(--font-mono)"],
        display: ["var(--font-display)"],
        // legacy alias — some components use font-heading
        heading: ["var(--font-heading)"],
      },
      boxShadow: {
        // Panel elevation (spec §3): inset top-highlight + soft drop
        panel:
          "inset 0 1px 0 rgba(255,255,255,0.05), 0 16px 40px rgba(0,0,0,0.4)",
        // Action button colored cast + rim light (spec §6)
        action:
          "0 6px 26px rgba(140,60,200,0.5), inset 0 1px 0 rgba(255,255,255,0.25)",
        // Command Dock float
        dock:
          "0 26px 60px rgba(0,0,0,0.55), 0 10px 34px rgba(106,47,208,0.35), inset 0 1px 0 rgba(255,255,255,0.14)",
        // Pure neon accent glows (spec §3/§6)
        "glow-magenta": "0 0 16px rgba(255,61,110,0.4)",
        "glow-cyan": "0 0 16px rgba(55,214,255,0.4)",
        "glow-purple": "0 0 16px rgba(160,90,240,0.45)",
        "glow-lilac": "0 0 16px rgba(200,166,255,0.4)",
        "glow-green": "0 0 16px rgba(87,255,143,0.4)",
        "glow-positive": "0 0 16px rgba(55,224,176,0.4)",
        "glow-negative": "0 0 16px rgba(255,93,138,0.4)",
        "glow-amber": "0 0 16px rgba(245,197,66,0.4)",
        "glow-money": "0 0 16px rgba(240,201,138,0.4)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        // ── v2 signature keyframes (spec §5) ──────────────────────────────
        "ds-spin": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "ds-shimmer": {
          "0%": { backgroundPosition: "0% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "ds-bloom": {
          "0%,100%": { transform: "translate(-3%,-2%) scale(1.05)" },
          "50%": { transform: "translate(4%,3%) scale(1.16)" },
        },
        "ds-grain": {
          "0%": { transform: "translate(0,0)" },
          "25%": { transform: "translate(-3%,2%)" },
          "50%": { transform: "translate(2%,-3%)" },
          "75%": { transform: "translate(-2%,2%)" },
          "100%": { transform: "translate(0,0)" },
        },
        "ds-ring": {
          "0%,100%": { opacity: "0.6", transform: "translate(-50%,-50%) scale(1)" },
          "50%": { opacity: "1", transform: "translate(-50%,-50%) scale(1.08)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        // ── v2 signature animations (spec §5) ─────────────────────────────
        "ds-spin": "ds-spin 14s linear infinite",
        "ds-shimmer": "ds-shimmer 6s linear infinite",
        "ds-bloom": "ds-bloom 52s ease-in-out infinite",
        "ds-grain": "ds-grain 3s steps(6) infinite",
        "ds-ring": "ds-ring 4s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
