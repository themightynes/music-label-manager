# Step 3: ULTRA-SIMPLIFIED Color Replacements

**Key Insight:** Just replace the color pattern itself - it works everywhere!

For example, replacing `brand-burgundy` → `brand-burgundy` will automatically work in:
- ✅ `bg-brand-burgundy` → `bg-brand-burgundy`
- ✅ `hover:bg-brand-burgundy` → `hover:bg-brand-burgundy`
- ✅ `focus:bg-brand-burgundy` → `focus:bg-brand-burgundy`
- ✅ `from-brand-burgundy` → `from-brand-burgundy`
- ✅ All other prefixes automatically!

---

## Just Do These 14 Replacements (In Order)

**Important:** Do in this exact order (case-sensitive variations first, then base colors)

| # | Find | Replace |
|---|------|---------|
| 1 | `brand-purple` | `brand-purple` |
| 2 | `brand-dark-mid` | `brand-dark-mid` |
| 3 | `brand-dark` | `brand-dark` |
| 4 | `brand-dark-mid` | `brand-dark-mid` |
| 5 | `brand-dark-card` | `brand-dark-card` |
| 6 | `brand-purple` | `brand-purple` |
| 7 | `brand-purple-light` | `brand-purple-light` |
| 8 | `brand-burgundy-dark` | `brand-burgundy-dark` |
| 9 | `brand-mauve` | `brand-mauve` |
| 10 | `brand-mauve-light` | `brand-mauve-light` |
| 11 | `brand-burgundy` | `brand-burgundy` |
| 12 | `brand-burgundy-light` | `brand-burgundy-light` |
| 13 | `brand-rose` | `brand-rose` |
| 14 | `brand-rose` | `brand-rose` |
| 15 | `brand-gold` | `brand-gold` |
| 16 | `brand-pink` | `brand-pink` |

---

## That's It! Just 16 Replacements Total

This replaces the color pattern everywhere it appears:
- Backgrounds (`bg-`)
- Text (`text-`)
- Borders (`border-`)
- Rings (`ring-`)
- Gradients (`from-`, `to-`, `via-`)
- Hover states (`hover:bg-`, `hover:text-`, etc.)
- Focus states (`focus:bg-`, `focus:border-`, etc.)
- Data states (`data-[state=open]:bg-`, etc.)
- **And automatically preserves opacity!** (`/10`, `/20`, etc.)

---

## How to Execute

1. **Open Find & Replace**: `Ctrl+Shift+H` (workspace-wide)
2. **Set scope**: `client/src/**/*.{ts,tsx}`
3. **Copy each Find/Replace pair** from the table above
4. **Review matches** - you should see them in all contexts!
5. **Replace All** for each pattern
6. **Done!** All 60+ instances replaced with just 16 operations

---

## Why This Works

When you search for `brand-burgundy`, it finds the pattern regardless of what comes before or after:
- ✅ `bg-brand-burgundy`
- ✅ `hover:bg-brand-burgundy`
- ✅ `focus:border-brand-burgundy`
- ✅ `from-brand-burgundy`
- ✅ `bg-brand-burgundy/10` (opacity preserved!)

And replaces just the color part, leaving everything else intact!
