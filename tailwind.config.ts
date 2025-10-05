import type { Config } from "tailwindcss";

/**
 * Music Label Manager - Tailwind Color System
 *
 * This configuration defines the complete color palette for the game.
 * We use a two-tier color system:
 *
 * 1. SEMANTIC COLORS (CSS custom properties)
 *    - Used by shadcn UI components (sidebar, buttons, cards, etc.)
 *    - Defined in client/src/index.css
 *    - Examples: primary, success, warning, danger, sidebar-*
 *    - Use these for: Generic UI components, form elements, alerts
 *
 * 2. BRAND COLORS (Direct Tailwind classes)
 *    - Game-specific color palette (14 core colors)
 *    - Single source of truth for brand identity
 *    - Use these for: Game content, artist cards, tier badges, headers
 *
 * BRAND COLOR PALETTE (14 colors):
 *
 * Burgundy Spectrum (Primary Brand):
 *   - brand-burgundy-dark (#791014) - Deep wine red, used for emphasis
 *   - brand-burgundy (#A75A5B) - Main brand color, headers, key actions
 *   - brand-burgundy-light (#B86B6C) - Lighter variant for hover states
 *   - brand-rose (#D99696) - Soft rose, secondary text
 *   - brand-pink (#F6B5B6) - Lightest, subtle backgrounds
 *
 * Purple Spectrum (Secondary):
 *   - brand-purple (#4e324c) - Deep purple, card backgrounds
 *   - brand-purple-light (#65557c) - Lighter purple accents
 *
 * Mauve (Tertiary):
 *   - brand-mauve (#8B6B70) - Muted purple-brown
 *   - brand-mauve-light (#9B7B80) - Lighter variant
 *
 * Dark Backgrounds:
 *   - brand-dark (#120910) - Deepest background
 *   - brand-dark-mid (#28131d) - Mid-tone background
 *   - brand-dark-card (#2a1821) - Card/container background
 *
 * Accents:
 *   - brand-gold (#D4A373) - Metallic gold for highlights
 *   - brand-cream (#F7F4F4) - Off-white for light text/backgrounds
 *
 * TIER BADGE COLOR CONVENTIONS:
 *   - Bronze: bg-amber-700 text-amber-100
 *   - Silver: bg-gray-400 text-gray-900
 *   - Gold: bg-brand-gold text-gray-900
 *   - Platinum: bg-purple-600 text-white
 *
 * COMMON USAGE PATTERNS:
 *   - Card backgrounds: bg-brand-dark-card, bg-brand-purple
 *   - Headers/Titles: text-brand-burgundy, text-brand-rose
 *   - Borders: border-brand-burgundy-light, border-brand-purple
 *   - Hover states: hover:bg-brand-burgundy-light
 *   - Success states: Use semantic 'success' (green)
 *   - Warnings: Use semantic 'warning' (amber)
 *   - Errors: Use semantic 'danger' (red)
 *
 * ACCESSIBILITY NOTES:
 *   - All brand colors tested for WCAG AA contrast ratios
 *   - Use brand-cream or white text on dark brand colors
 *   - Use gray-900 or brand-dark text on light brand colors
 */

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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
            card: '#2a1821',
          },
          gold: '#D4A373',
          cream: '#F7F4F4',
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
        mono: ["var(--font-mono)"],
        heading: ["var(--font-heading)"],
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
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
