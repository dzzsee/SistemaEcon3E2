# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

delegated: React + Vite SPA, single admin, data persisted in browser localStorage (no backend).

## Users

A single administrator manages weekly membership dues ("cuotas") for a small group — a classroom/cohort (e.g. "3ro E2"). Members are simple records (name + weekly amount). No member-facing login; the admin is the sole operator.

## Product Purpose

Track weekly-per-user dues, record payments, and surface who is behind by one or two weeks, so the admin can follow up. Success means the admin sees at a glance who is current, who owes one week, and who owes two or more, and can register payments with minimal effort.

## Positioning

A focused, single-admin weekly-dues tracker for a small group. No bank-grade accounting — just clear per-person arrears status derived from each member's last recorded payment.

## Operating Context

Weekly cadence. Each member pays the same amount, set by the admin. Arrears are computed from the last recorded payment date per member (not a global collection day). The admin records a payment (amount + date) and the system derives status.

## Capabilities and Constraints

- Admin-managed list of members (name + weekly amount; minimal data).
- A single weekly amount defined by the admin applies to all members.
- Register a payment per member (amount + date).
- Arrears status derived from last recorded payment: current, 1 week behind, 2+ weeks behind.
- Visual-only notification of lateness in the panel; no real email/WhatsApp/SMS delivery.
- Status computation is based on each member's last recorded payment, not a shared collection date.
- Open decision: whether "behind" is measured against today's date or the member's own due baseline; current build measures against today.
- Open decision: rules for members who have never paid (treated as from their join week).

## Evidence on Hand

None. No logo, brand assets, or real member data. Future work must not fabricate testimonials, figures, or sample users beyond obvious placeholder content.

## Product Principles

1. Scanability first — arrears status (current / 1 week / 2+) must be readable at a glance.
2. Minimal friction to record a payment — the core repeated action.
3. Single-admin simplicity — no roles, no auth complexity, no member self-service.
4. Trustworthy math — arrears always derived transparently from the last recorded payment date.
5. Small-group human context — warm, clear, not bureaucratic.

## Accessibility & Inclusion

Spanish-language UI (per request). No specific accessibility standard established beyond readable contrast and operable controls.