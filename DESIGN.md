# Ask Ted — Design System

> Captures the shipping design language so future work stays on-brand.

## Color strategy

**Committed dark.** A deep midnight-navy field carries the surface; metallic gold
is the single load-bearing accent (≤10% of any view). Neutrals are tinted warm,
never pure black or pure white.

| Role | Value | Notes |
|---|---|---|
| Field (deepest) | `#050E17` | Page background |
| Field (raised) | `#091521` / `#0A1929` | Chat surface, icons |
| Gold (line/accent) | `#D4AF37` | Hairlines, focus, key accents |
| Gold (solid) | `#AA8C2C` → `#D4AF37` | Send button, emphasis |
| Warm white (text) | `#FDFBF7` (cream) | Body/display — never `#fff` |
| Muted text | `cream` at 40–70% opacity | Eyebrows, hints |

Gold is precious: used as thin hairlines, small seals, and single focal accents.
Large gold fills are reserved for the one primary action.

## Typography

A magazine shape — display serif over a sans body. These are the brand's
**established identity fonts**; identity-preservation overrides the usual
greenfield reflex-reject guidance.

- **Display:** Playfair Display / Cormorant Garamond (serif, italic cuts for warmth).
- **Body / labels:** Montserrat (sans). Track-spaced uppercase for eyebrows and labels.
- Headline scale is fluid via `clamp()`; light type on dark gets extra line-height.
- Eyebrows: ~11px, `0.4–0.5em` letter-spacing, uppercase, gold at low opacity.

## Elevation & atmosphere

- Soft, deep shadows (`shadow-2xl`); no hard edges.
- Subtle vertical pinstripe texture (gold at ~2% opacity) evokes suiting fabric.
- A single low-chroma gold radial glow adds depth behind the hero. Use sparingly.
- Glass/backdrop-blur only on the floating chat window, never decoratively.

## Motion

- Ease-out only, exponential curves: `cubic-bezier(0.16, 1, 0.3, 1)`. No bounce.
- Brand permits ambitious first-load choreography: staggered reveals on the hero.
- Magnetic/parallax pointer response on the bell; calm, slow durations (0.6–1.2s).
- Respect `prefers-reduced-motion`.

## Components

- **Concierge bell** — rotating dashed gold ring, magnetic pointer follow, chime.
- **Chat** — docked sidebar (desktop) or floating draggable window; serif italic
  for Ted, track-spaced uppercase gold for the guest; gold hairline under replies.
- **Quick replies / calendar** — gold-outlined pills, business-hours validation.
