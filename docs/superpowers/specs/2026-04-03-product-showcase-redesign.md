# Product Showcase Redesign — Design Spec

## Context

The landing page currently has 3 separate showcase areas:

1. **Hero AdminShowcaseCarousel** (L180-182) — 6-slide auto-rotating carousel
2. **Mobile Mockup Flow** (L342-530) — 4-phone jury journey
3. **Admin Gallery** (L699-848) — 6-card static grid

These feel disconnected and the content is generic. The redesign consolidates all three into a single, richer carousel that represents VERA's real product areas with realistic previews.

## Design Decision

**Full carousel (6 slides)** replacing all 3 existing sections. Same interaction model as current `AdminShowcaseCarousel`:

- Left side: meta text (eyebrow + title + description + feature bullets)
- Right side: stylized product preview window (mac-style toolbar)
- Footer: prev/next arrows, dot navigation, counter "01 / 06", auto-progress bar
- Auto-rotate at 5.5s interval, manual navigation resets timer

## Slide Definitions

### Slide 1: Overview

**Theme color:** Blue (#60a5fa)
**Eyebrow:** OVERVIEW
**Title:** Live Evaluation Dashboard
**Description:** Monitor evaluation progress in real time — KPIs, juror activity, and completion status at a glance.

**Visual (composite):**

- KPI strip (4 cards): Active Jurors (12), Projects (24), Completion (91%), Avg Score (78.4)
- Live activity feed (3-4 rows): juror name + action + timestamp
  - "Prof. E. Aslan scored EE-03" — 2m ago
  - "Dr. M. Yilmaz started session" — 5m ago
  - "A.Prof. S. Kaya completed all" — 12m ago
- Completion progress bar or mini donut

### Slide 2: Evaluation (Composite)

**Theme color:** Green (#4ade80)
**Eyebrow:** EVALUATION
**Title:** Rankings, Heatmap & Reviews
**Description:** See project rankings with consensus indicators, juror-by-project score heatmap, and detailed individual review breakdowns.

**Visual (3 sub-panels):**

- **Rankings mini-panel:** 6-project bar chart with scores (91.2, 88.7, 82.1, 79.5, 74.3, 68.9) + Top/High/Mid badges
- **Heatmap mini-panel:** 3x4 colored grid (jurors x projects) with heat colors
- **Reviews mini-panel:** 1-2 review rows showing juror + project + per-criteria scores + status badge

### Slide 3: Jury Evaluation Flow

**Theme color:** Emerald (#10b981)
**Eyebrow:** JURY FLOW
**Title:** Structured Jury Evaluation
**Description:** Guided scoring experience — jurors authenticate, receive criteria-based score cards, and submit with automatic save.

**Visual:**

- Step progress: Identity (done) -> PIN Auth (done) -> Scoring (active) -> Done
- Scoring card: "EE-03: EcoTrack Sensors"
  - Criteria progress bars: Technical 25/30, Design 22/30, Delivery 27/30, Teamwork 8/10
  - Badges: "Autosaved", "8 / 24 scored"

### Slide 4: Entry Control

**Theme color:** Purple (#a78bfa)
**Eyebrow:** ENTRY CONTROL
**Title:** QR Access & Session Control
**Description:** Generate time-limited QR tokens for juror access. Monitor active sessions and revoke tokens instantly.

**Visual:**

- Stylized QR code with VERA watermark
- Active sessions table (3 rows): avatar + name + last seen + status badge
- Token info badges: "Token Active", "2h 30m remaining"

### Slide 5: Criteria & Outcome Mapping

**Theme color:** Amber (#fbbf24)
**Eyebrow:** CRITERIA
**Title:** Evaluation Criteria & Outcome Mapping
**Description:** Define scoring rubrics with weighted criteria and map them to programme outcomes for accreditation reporting.

**Visual (2 sub-panels):**

- **Criteria cards** (2x2 grid): Technical (0-30, 30%), Written (0-30, 30%), Oral (0-30, 30%), Teamwork (0-10, 10%) — each with rubric band color strip (green/yellow-green/yellow/red)
- **Outcome mapping:** PO 1.2 -> Technical + Written [Direct], PO 3.1 -> Oral [Direct], PO 9.1 -> Teamwork [Indirect]

### Slide 6: Management (Composite)

**Theme color:** Pink (#f472b6)
**Eyebrow:** MANAGEMENT
**Title:** Jurors, Projects & Evaluation Periods
**Description:** Full roster management — add jurors, organize project groups, and control evaluation period lifecycle.

**Visual (3 sub-panels):**

- **Jurors:** 3 rows with avatar + name + affiliation + status badge (Done/Editing/In Progress)
- **Projects:** 3 rows with code (EE-01) + title + team count
- **Periods:** 2 badges — Spring 2025 (Active), Fall 2024 (Locked)

## Feature Bullets Per Slide

Each slide's meta section includes 3 feature bullets with colored diamond icons:

| Slide | Feature 1 | Feature 2 | Feature 3 |
|-------|-----------|-----------|-----------|
| Overview | Live KPI dashboard | Juror activity feed | Completion tracking |
| Evaluation | Project rankings | Juror-project heatmap | Individual reviews |
| Jury Flow | Step-by-step flow | Criteria-based scoring | Auto-save on every change |
| Entry Control | QR-based juror entry | 24h time-limited tokens | Live session monitoring |
| Criteria | Rubric band configuration | Direct/Indirect mapping | ABET / MUDEK alignment |
| Management | Juror roster & status | Project group management | Period lifecycle control |

## Dummy Data

All dummy data centralized in `showcaseData.js`. Domain-accurate, no lorem ipsum:

- **Projects:** SmartGrid Optimizer, MedAlert IoT System, EcoTrack Sensors, AutoDrive AI, RoboArm Control, DataVault
- **Jurors:** Prof. E. Aslan (Electrical Eng.), Dr. M. Yilmaz (Computer Sci.), A.Prof. S. Kaya (Mechanical Eng.)
- **Outcomes:** PO-1 through PO-6 with attainment percentages
- **Criteria:** Technical, Design (Written), Delivery (Oral), Teamwork — matching config.js field names
- **Periods:** Spring 2025 (Active), Fall 2024 (Locked)

## Sections Removed from LandingPage.jsx

1. **AdminShowcaseCarousel import + usage** (L4, L180-182)
2. **Mobile Mockup Flow section** (L342-530) — jury phone journey
3. **Admin Gallery section** (L699-848) — 6-card grid

All replaced by single `<ProductShowcase />` component placed at L180.

## Sections Kept

- Hero (logo, tagline, CTAs) — untouched
- Trust Band — untouched
- How It Works — untouched
- Features Grid — untouched
- Before/After — untouched
- Use Cases — untouched
- FAQ — untouched
- Footer — untouched

## Component Structure

```text
src/landing/components/
  ProductShowcase.jsx          -- carousel orchestrator (replaces AdminShowcaseCarousel)
  showcase/
    SlideOverview.jsx          -- slide 1 visual
    SlideEvaluation.jsx        -- slide 2 visual (composite)
    SlideJuryFlow.jsx          -- slide 3 visual
    SlideEntryControl.jsx      -- slide 4 visual
    SlideCriteria.jsx          -- slide 5 visual
    SlideManagement.jsx        -- slide 6 visual
    showcaseData.js            -- all dummy data
```

## CSS Strategy

- New styles go into `landing.css` under `.ps-*` namespace (reusing existing pattern)
- Remove old `.admin-gallery-*` styles
- Remove old `.landing-mobile` styles
- Keep existing `.product-showcase-*` footer control styles, adapt for 6 slides
- The visual window (`.ps-window`, `.ps-toolbar`, `.ps-body`) stays dark regardless of theme
- Light mode overrides stay for text contrast inside preview windows

## Responsive Behavior

| Breakpoint | Layout |
|------------|--------|
| Desktop (>900px) | Grid: 260px meta + flexible visual side-by-side |
| Tablet (700-900px) | Grid: 220px meta + visual, smaller fonts |
| Mobile (<700px) | Stacked: meta on top, visual below. Composite panels go single-column |

## Accessibility

- `role="tablist"` on dots, `role="tab"` on each dot
- `aria-label` on arrows
- `aria-live="polite"` on slide container for screen reader announcements
- Keyboard navigation: left/right arrows cycle slides
- Pause auto-rotation on focus within carousel

## Acceptance Criteria

1. Landing page has single product showcase carousel with 6 slides
2. Mobile Mockup section and Admin Gallery section are removed
3. Each slide has realistic product preview (not wireframe/mockup)
4. Jury Flow, QR/Entry Control, Criteria/Outcomes, Jurors/Projects/Periods, and Analytics are all represented
5. Auto-rotate works with 5.5s interval, arrows and dots work
6. Responsive at 900px and 700px breakpoints
7. Dark/light theme works correctly
8. All dummy data uses VERA domain terminology
