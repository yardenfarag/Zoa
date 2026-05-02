# Plan: Topbar and branding

## Goal

Make the archive shell feel distinctive: clear site identity in the top bar without cluttering the search-first layout.

## Decisions (current)

- **Wordmark:** Text-only `ZOA` with a subtle “microbial” treatment on the letter **O** (CSS), no separate mascot SVG in the bar.
- **Typography:** Heading font uses **Cinzel Decorative** (via `next/font/google` and `--font-heading`), not Roboto, for a more archival / magical tone.
- **Motion:** No logo animation in the top bar (keeps focus on search and keeps layout calm).

## Implementation map

- Shell title: `frontend/components/layout/Topbar.tsx`
- Heading font wiring: `frontend/app/layout.tsx`
- Custom letter styling: `frontend/app/globals.css` (classes used by the top bar)

## Follow-ups (optional)

- Favicon / social preview image aligned with the wordmark.
- Sidebar nav polish so category routes match future data models.
