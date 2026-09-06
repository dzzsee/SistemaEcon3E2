# Design

<!-- impeccable:design-schema 1 -->

## Visual World

A modern, digital finance/operations console. Dark, near-black ground with deep indigo radial glows; expressive color used exclusively to signal financial state (current / behind), never decoration. Money figures set large in a tabular mono against small uppercase sans labels — the page reads like a live ledger, not a classroom worksheet.

## Palette

- Background: `#0d0e12` (near-black), raised surfaces `#15171e` and `#1a1d26`.
- Lines/borders: `#262a36` (soft `#1e222d`).
- Text: `#e9ebf1` primary, `#9aa1b2` secondary, `#6b7282` faint.
- Accent (ultraviolet): `#7c5cff` / `#a78bfa`, used for primary actions and the brand mark.
- State colors (functional, reserved for money status): current `#34d399` (green), one week `#fbbf24` (amber), two-plus `#fb7185` (rose), no payments `#6b7282` (neutral gray). Each sits on a matching low-alpha tint.

## Typography

- Display/UI: Sora (400–700).
- Numeric/ledger figures and metadata: IBM Plex Mono (400–600). Money, dates, and eyebrows are always mono.

Hierarchy leans on scale contrast: hero balances (clamp 40–64px) beside 12px uppercase mono eyebrows; deuda values (17px mono) beside 11px labels.

## Components

- Cards: 16px radius, `#1a1d26` fill, 1px `#262a36` border, subtle inset highlight.
- Buttons: primary = violet gradient with glow shadow; ghost = transparent with hairline border; danger = rose tint. Small variant for row-level actions.
- Status badge: pill with a colored dot (functional), tint text + tint background per state.
- Member row: grid `1fr auto auto auto` (desktop), collapsing to a two-row `"id actions" / "status deuda"` arrangement under 760px. Avatar is a violet-tinted rounded square with initials.
- Modal: 20px radius, backdrop blur, pop-in animation.

## Motion

Minimal and purposeful: button press translate, hover color/background transitions, modal pop-in. No decorative animation.

## Responsive

Single breakpoint at 760px. Topbar nav reflows to full width; member rows collapse to 2-column grid; stat cards flex to equal width.

## Accessibility

Spanish language UI. Body text navigable, controls keyboard-operable with real labels. State is never conveyed by color alone — every status also carries a text label ("Al día", "1 semana", "2+ semanas", "Sin pagos").