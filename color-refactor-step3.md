# Step 3: Hex to Tailwind Class Replacements (SIMPLIFIED)

**Strategy:** Replace base hex colors - opacity values will automatically transfer!

**Important:** Do replacements in this exact order (most specific first).

---

## 1. Special Cases - Do These First! (1 replacement)

| Find | Replace | Why Special |
|------|---------|-------------|
| `to-[#8B4A6C]` | `to-brand-burgundy` | Gradient-only color (already replaced in Step 2) |

**Note:** `bg-[#3c252d]/[0.66]` was already replaced with `bg-[#2C222A]/[0.66]` in Step 2, so we'll handle it in the base colors section.

---

## 2. State Variants - Do Before Base Colors (14 replacements)

### Hover States
| Find | Replace |
|------|---------|
| `hover:bg-[#4E324C]` | `hover:bg-brand-purple` |
| `hover:bg-[#4e324c]` | `hover:bg-brand-purple` |
| `hover:bg-[#8B6B70]` | `hover:bg-brand-mauve` |
| `hover:bg-[#9B7B80]` | `hover:bg-brand-mauve-light` |
| `hover:bg-[#A75A5B]` | `hover:bg-brand-burgundy` |
| `hover:bg-[#B86B6C]` | `hover:bg-brand-burgundy-light` |
| `hover:bg-[#D99696]` | `hover:bg-brand-rose` |
| `hover:bg-[#2C222A]` | `hover:bg-brand-dark-card` |
| `hover:border-[#4e324c]` | `hover:border-brand-purple` |
| `hover:border-[#65557c]` | `hover:border-brand-purple-light` |
| `hover:border-[#A75A5B]` | `hover:border-brand-burgundy` |
| `hover:text-[#A75A5B]` | `hover:text-brand-burgundy` |
| `hover:text-[#F6B5B6]` | `hover:text-brand-pink` |

### Focus States
| Find | Replace |
|------|---------|
| `focus:bg-[#2C222A]` | `focus:bg-brand-dark-card` |
| `focus:bg-[#A75A5B]` | `focus:bg-brand-burgundy` |
| `focus:border-[#A75A5B]` | `focus:border-brand-burgundy` |
| `focus:ring-[#A75A5B]` | `focus:ring-brand-burgundy` |
| `focus:text-[#A75A5B]` | `focus:text-brand-burgundy` |

### Data States
| Find | Replace |
|------|---------|
| `data-[state=open]:bg-[#B86B6C]` | `data-[state=open]:bg-brand-burgundy-light` |

---

## 3. Gradients (9 replacements)

| Find | Replace |
|------|---------|
| `from-[#28131d]` | `from-brand-dark-mid` |
| `from-[#2C222A]` | `from-brand-dark-card` |
| `from-[#A75A5B]` | `from-brand-burgundy` |
| `to-[#120910]` | `to-brand-dark` |
| `to-[#2C222A]` | `to-brand-dark-card` |
| `to-[#65557c]` | `to-brand-purple-light` |
| `to-[#791014]` | `to-brand-burgundy-dark` |
| `to-[#A75A5B]` | `to-brand-burgundy` |
| `via-[#28131D]` | `via-brand-dark-mid` |

---

## 4. Base Colors (32 replacements)

### Background Colors
| Find | Replace |
|------|---------|
| `bg-[#120910]` | `bg-brand-dark` |
| `bg-[#28131d]` | `bg-brand-dark-mid` |
| `bg-[#2C222A]` | `bg-brand-dark-card` |
| `bg-[#3c252d]` | `bg-brand-dark-card` |
| `bg-[#4E324C]` | `bg-brand-purple` |
| `bg-[#4e324c]` | `bg-brand-purple` |
| `bg-[#65557c]` | `bg-brand-purple-light` |
| `bg-[#791014]` | `bg-brand-burgundy-dark` |
| `bg-[#8B6B70]` | `bg-brand-mauve` |
| `bg-[#9B7B80]` | `bg-brand-mauve-light` |
| `bg-[#A75A5B]` | `bg-brand-burgundy` |
| `bg-[#B86B6C]` | `bg-brand-burgundy-light` |
| `bg-[#D99696]` | `bg-brand-rose` |

### Text Colors
| Find | Replace |
|------|---------|
| `text-[#65557c]` | `text-brand-purple-light` |
| `text-[#791014]` | `text-brand-burgundy-dark` |
| `text-[#A75A5B]` | `text-brand-burgundy` |
| `text-[#D4A373]` | `text-brand-gold` |
| `text-[#D99696]` | `text-brand-rose` |
| `text-[#F6B5B6]` | `text-brand-pink` |

### Border Colors
| Find | Replace |
|------|---------|
| `border-[#4e324c]` | `border-brand-purple` |
| `border-[#65557c]` | `border-brand-purple-light` |
| `border-[#791014]` | `border-brand-burgundy-dark` |
| `border-[#A75A5B]` | `border-brand-burgundy` |
| `border-[#D99696]` | `border-brand-rose` |
| `border-[#d99696]` | `border-brand-rose` |

### Ring Colors
| Find | Replace |
|------|---------|
| `ring-[#A75A5B]` | `ring-brand-burgundy` |

---

## Total: 60 replacements

✅ Opacity values like `/10`, `/20`, `/30` automatically transfer
✅ No need to replace them separately
✅ Order matters - do in sequence above

---

## How to Execute in Cursor/VS Code

1. **Open Find & Replace**: `Ctrl+Shift+H` (workspace-wide)
2. **Set scope**: `client/src/**/*.{ts,tsx}`
3. **Copy each Find/Replace pair** above
4. **Review matches** before replacing
5. **Replace All** for each pattern
6. **Commit after each section** (Special Cases, States, Gradients, Base Colors)

---

## Example of Auto-Transfer

When you replace:
- `bg-[#A75A5B]` → `bg-brand-burgundy`

It will also replace:
- `bg-[#A75A5B]/10` → `bg-brand-burgundy/10` ✅
- `bg-[#A75A5B]/20` → `bg-brand-burgundy/20` ✅
- `bg-[#A75A5B]/30` → `bg-brand-burgundy/30` ✅

The `/10`, `/20`, `/30` stays intact!
