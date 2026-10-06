---
name: Energy Management Intelligence
description: A calm, operational console for turning shared energy data into practical action.
colors:
  navigation-navy: "#0d1b2c"
  data-ink: "#0b1730"
  secondary-text: "#66748b"
  divider: "#dfe7f0"
  workspace-canvas: "#f3f7fb"
  surface: "#ffffff"
  energy-teal: "#0bb894"
  energy-teal-dark: "#05856e"
  energy-teal-soft: "#e2f8f3"
  utility-blue: "#137be8"
  utility-blue-soft: "#eaf3ff"
  kpi-icon-blue: "#2563eb"
  positive: "#009c6e"
  warning: "#df5a2c"
  danger: "#dc3e32"
  kpi-positive: "#137a4b"
  kpi-positive-soft: "#e7f6ee"
  kpi-negative: "#b4234f"
  kpi-negative-soft: "#fdeaf0"
  kpi-meta: "#667085"
typography:
  display:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1.25
  body:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "10px"
    fontWeight: 650
    lineHeight: 1.35
rounded:
  track: "3px"
  badge: "6px"
  control: "7px"
  action: "8px"
  compact: "9px"
  field: "10px"
  prompt: "11px"
  panel: "12px"
  kpi-card-compact: "20px"
  kpi-card: "24px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "7px"
  md: "10px"
  grid: "12px"
  control: "14px"
  section: "18px"
  spacious: "22px"
  kpi-card: "24px"
components:
  button-primary:
    backgroundColor: "{colors.utility-blue}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.field}"
    padding: "11px 14px"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.utility-blue}"
    typography: "{typography.label}"
    padding: "7px 0"
  select-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.data-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 28px 0 10px"
    height: "36px"
  panel-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.data-ink}"
    rounded: "{rounded.panel}"
    padding: "18px"
  stat-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.data-ink}"
    rounded: "{rounded.kpi-card}"
    padding: "24px"
  stat-card-compact:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.data-ink}"
    rounded: "{rounded.kpi-card-compact}"
    padding: "21px 20px 19px"
  navigation-active:
    backgroundColor: "#213b57"
    textColor: "{colors.surface}"
    typography: "{typography.body}"
    rounded: "{rounded.compact}"
    padding: "12px 14px"
  unit-chip:
    backgroundColor: "#f8fafc"
    textColor: "#52627a"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "7px 10px"
---

# Design System: Energy Management Intelligence

## Overview

**Creative North Star: "Energy Operations Console"**

The system is calm and operational: a dense but orderly workspace where energy measurements, cost, emissions, and next actions share one visual language. Deep navigation anchors the experience while cool analytical surfaces, fine rules, and restrained teal and blue signals keep attention on evidence instead of decoration.

Layered white surfaces and ambient shadows create quiet separation without making the dashboard feel ornamental. Compact controls and strong numeric hierarchy support scanning, while clear source and estimate language keeps decisions grounded. This is one unified product experience for employees and management; role relevance should come from content and permissions, not competing visual systems.

**Key Characteristics:**

- Deep navy navigation against a cool, low-contrast workspace canvas.
- White analytical surfaces with fine borders and shallow ambient depth.
- Teal reserved for energy data and positive energy cues; blue reserved for interaction and Copilot.
- Crisp Geist typography with compact labels and prominent tabular metrics.
- Dense desktop composition that becomes stacked, shrink-safe, and explicitly controlled on small screens.

## Colors

The palette is cool and restrained, using dark blue neutrals for structure, teal for energy meaning, and utility blue for interaction.

### Primary

- **Energy Teal** (`energy-teal`): charts, ranking bars, and energy-specific signals.
- **Deep Energy Teal** (`energy-teal-dark`): readable teal text and selected energy states.
- **Soft Energy Wash** (`energy-teal-soft`): low-emphasis icon wells and positive contextual backgrounds.

### Secondary

- **Utility Blue** (`utility-blue`): links, focus, Copilot entry points, and other interactive affordances.
- **Soft Utility Wash** (`utility-blue-soft`): badges and low-emphasis assistant context.
- **KPI Icon Blue** (`kpi-icon-blue`): uncontained corner icons on summary statistic cards.

### Tertiary

- **Positive Green** (`positive`): favorable change and confirmed positive status.
- **Operational Amber** (`warning`): attention-worthy values that are not failures.
- **Exception Red** (`danger`): high-priority anomalies and risk signals.
- **KPI Positive** (`kpi-positive`) on **KPI Positive Wash** (`kpi-positive-soft`): accessible favorable-change pills.
- **KPI Negative** (`kpi-negative`) on **KPI Negative Wash** (`kpi-negative-soft`): accessible unfavorable-change pills.

### Neutral

- **Navigation Navy** (`navigation-navy`): the persistent navigation shell and dark system feedback.
- **Data Ink** (`data-ink`): primary text and numeric values.
- **Secondary Text** (`secondary-text`): explanatory copy, metadata, and axes.
- **Cool Divider** (`divider`): field borders, separators, and light structural rules.
- **Workspace Canvas** (`workspace-canvas`): the application background.
- **Analytical Surface** (`surface`): panels, cards, and controls.
- **KPI Metadata** (`kpi-meta`): comparison and provenance text beneath statistic values.

### Named Rules

**The Signal Ownership Rule.** Teal communicates energy data or positive energy context; blue communicates interaction, focus, or assistant behavior. Do not swap their jobs casually.

**The Quiet Canvas Rule.** Large areas stay neutral. Status colors belong to small, information-bearing regions rather than decorative washes.

## Typography

**Display Font:** Geist (with Arial and sans-serif fallback)
**Body Font:** Geist (with Arial and sans-serif fallback)
**Label/Mono Font:** Geist for labels; Geist Mono is available but is not part of the current visible dashboard language.

**Character:** Crisp, compact, and numerically literate. A single sans-serif family keeps the shared employee-and-management experience cohesive while weight, scale, and spacing distinguish hierarchy.

### Hierarchy

- **Display** (700, `30px`, `1.1`): page-level orientation; reduce to `25px` on small screens.
- **Headline** (700, `16px`, `1.25`): analytical panel titles; reduce to `14px` on small screens.
- **Title** (700, `14px`, `1.25`): rail and compact section identity.
- **Body** (400, `12px`, `1.45`): explanatory copy and supporting context; keep lines concise in dense regions.
- **Label** (650, `10px`, `1.35`): controls, chart annotations, metadata, and compact actions.
- **Metric** (750, `clamp(29px, 2vw, 36px)`, `0.98`): StatCard values with tabular numerals and tight tracking; compact layouts settle at `30px`, with the narrowest view using `28px`.

### Named Rules

**The Number Leads Rule.** In metric cards, the value carries the highest contrast and scale; its label and provenance remain visibly subordinate.

**The Compact, Not Cryptic Rule.** Small labels are acceptable for secondary operational metadata, but essential actions and explanations must remain readable and explicit.

## Layout

Desktop uses a three-part operations shell: a fixed `184px` navigation rail, a fluid workspace, and a `250px` Copilot rail. The workspace uses a compact `12px` grid rhythm: four summary metrics, a wider analytical column paired with a supporting column, then balanced lower panels. Panels and cards must use `min-width: 0` so charts, labels, and numeric content can shrink without causing horizontal overflow.

At `1280px`, Copilot becomes an off-canvas rail controlled by a visible trigger and scrim. At `980px`, metric cards form two columns and analytical grids stack. At `700px`, navigation becomes a keyboard-accessible off-canvas rail with an explicit menu button, close behavior, focus return, and scrim; filters become three equal shrink-safe columns. At `430px`, metrics stack into one column. Inputs and selects must keep `min-width: 0` or `width: 100%` inside responsive grids so long values do not force overflow.

StatCard collections switch to a single column below `560px`. The cards themselves keep `min-width: 0`, allow the tabular value to wrap safely, and reduce their corner radius from `24px` to `20px` in compact layouts.

**The Console Density Rule.** Prefer compact, aligned groups and a repeatable grid rhythm over oversized whitespace, but preserve a clear reading order and comfortable control targets.

## Elevation & Depth

Depth is layered and ambient. White cards sit on a cool canvas with fine borders plus soft blue-gray shadows; fixed rails receive slightly broader directional shadows. Elevation clarifies containment and overlap, never spectacle.

### Shadow Vocabulary

- **Card Ambient** (`0 8px 22px rgba(32,66,103,.055)`): summary metrics.
- **Panel Ambient** (`0 8px 24px rgba(32,66,103,.045)`): analytical containers.
- **Navigation Edge** (`12px 0 32px rgba(10,26,44,.08)`): persistent left rail separation.
- **Rail Overlay** (`-18px 0 48px rgba(20,45,72,.15)`): off-canvas Copilot separation.
- **Interactive Lift** (`0 10px 24px rgba(19,123,232,.25)`): the floating Copilot trigger only.

### Named Rules

**The Ambient Layers Rule.** Resting containers use soft shadows plus quiet borders. Reserve stronger shadows for elements that physically overlay the workspace.

## Shapes

The form language is compact and gently rounded. Analytical panels use a `12px` radius, while prominent StatCards deliberately use a more generous `24px` desktop radius that compacts to `20px`. Navigation items and compact containers sit around `9px` to `11px`; fields and action controls use `7px` to `10px`; progress tracks use `3px`. Circular geometry is reserved for identity avatars, status dots, and scroll thumbs. Borders are thin, cool, and structural rather than decorative.

**The Nested Radius Rule.** Inner controls use a radius equal to or smaller than their containing surface, preserving a clear container hierarchy.

## Components

### Buttons

Buttons are restrained and task-oriented, with compact labels and unmistakable focus.

- **Shape:** Gently rounded action geometry (`7px` to `10px`).
- **Primary:** Utility blue with white text and compact `11px 14px` padding; use for the Copilot entry point and similarly important contextual actions.
- **Hover / Focus:** Shift toward a darker blue on hover and use the global `2px` blue focus outline with `2px` offset. Motion uses short `160ms` to `200ms` transitions.
- **Text:** Transparent, blue, and compact; include a directional icon when navigation or drill-down is implied.
- **Reduced motion:** Remove rail transitions and chart tracing when reduced motion is requested.

### Chips

- **Style:** Quiet neutral or soft-blue fills, compact label typography, thin borders where the chip carries a unit or scope.
- **State:** Use chips for metadata such as units and beta status, not as decoration. Interactive chips must expose hover and focus states.

### Cards / Containers

- **Corner Style:** Gently rounded panels (`12px`).
- **Background:** Analytical Surface over Workspace Canvas.
- **Shadow Strategy:** Use Card Ambient or Panel Ambient according to prominence.
- **Border:** One-pixel cool-gray rule.
- **Internal Padding:** Compact `14px` to `18px`, with denser list rows nested inside.

### Inputs / Fields

- **Style:** White or transparent field surface, thin cool border, compact field radius, and inherited Geist type.
- **Focus:** Utility-blue border plus a soft three-pixel blue halo; preserve the global focus outline.
- **Responsive:** Fields must be shrink-safe (`min-width: 0`, `width: 100%` when gridded) and retain visible labels.
- **Error / Disabled:** Use Exception Red only for true invalid states; do not repurpose warning colors as generic decoration.

### Navigation

Navigation uses a deep navy rail, cool light labels, and compact icon-label rows. Hover uses a modest navy lift; active items use a lighter navy field, fine blue border, cyan edge marker, and white text. On mobile, render navigation as an off-canvas dialog-like region with explicit open and close controls, Escape behavior, focus management, a scrim, and no background interaction while open.

### Metric Card

StatCards are generous white KPI surfaces with a `24px` desktop radius, `20px` compact radius, and `24px` desktop padding. Place a blue `28px` icon directly in the top-right corner without a containing well; its uncontained treatment keeps the card quiet and lets the value lead.

Use a high-contrast tabular value sized from `29px` to `36px`, a compact heading, and muted comparison metadata (`kpi-meta`). Optional change pills use green or pink semantic washes with WCAG-compliant foregrounds (`kpi-positive` and `kpi-negative`); neutral pills remain gray. Keep pills compact, never rely on hue alone when an arrow or explicit delta can carry direction, and let long values wrap instead of widening the grid. StatCard collections become a single column below `560px`.

### Energy Copilot Rail

Treat Copilot as part of the same evidence system, distinguished by utility blue rather than a separate visual brand. On constrained screens it becomes an off-canvas rail with initial focus, trapped Tab navigation, Escape dismissal, scrim dismissal, and focus returned to its trigger.

## Do's and Don'ts

### Do:

- **Do** preserve one calm visual system for employee participation and management oversight.
- **Do** use teal for energy meaning, blue for interaction, and neutrals for the majority of every screen.
- **Do** pair ambient shadows with fine borders so layered surfaces remain legible on the cool canvas.
- **Do** keep responsive fields shrink-safe and make off-canvas navigation and Copilot fully keyboard accessible.
- **Do** label estimates, sources, and data limitations close to the values they qualify.

### Don't:

- **Don't** promote a page-specific dashboard composition into a global template; reuse the system, not the exact arrangement.
- **Don't** split employee and management areas into unrelated visual identities within the unified product experience.
- **Don't** use saturated status colors across large surfaces or as non-semantic decoration.
- **Don't** let fixed-width controls, charts, or long numeric values create horizontal overflow.
- **Don't** imply that current mobile accessibility or field-sizing follow-ups are resolved merely because their intended behavior is documented here.
