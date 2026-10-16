# asanHire Design System Specification (Frozen Mist)

---

## 1. Brand Identity & Design Philosophy
**asanHire** (written with a lowercase "a" and capital "H") represents precision, calm focus, and modern tactile depth. 

The visual identity is anchored by the **"Frozen Mist" Neumorphic Dark** theme. Unlike flat, uninspiring corporate dashboards or harsh neon themes, Frozen Mist uses soft, dual-directional lighting and deep organic slate tones to create a tactile surface where components feel sculpted directly out of slate.

---

## 2. Color Palette & Design Tokens

### Core Color Tokens
| Token Name | Hex Code | Role & Application |
|---|---|---|
| **Background Primary** (`--bg`) | `#1E201E` | Deep slate canvas base for all pages, layouts, and body background. |
| **Surface Container** (`--surface`) | `#2A2D2A` | Elevated surface for cards, input fields, modal panels, and sidebars. |
| **Primary Neutral Gray** (`--muted`) | `#8A8B82` | Secondary body text, subtle borders, inactive tab labels, metadata. |
| **Light Neutral Gray** (`--text`) | `#D9DADF` | High-contrast headings, primary readable body text, prominent icons. |
| **Accent Cinnamon** (`--accent`) | `#DD700B` | Primary action buttons, active tabs, focus rings, progress bars, key metric badges. |
| **Soft Cream Accent** (`--cream`) | `#FCF8D8` | Highlighting tags, alert notifications, shortlisted indicators, warm contrast. |

### Neumorphic Shadow & Glow Tokens
* **Extruded / Raised Surface (`--shadow-raised` / `.neu-raised`):**
  - Used on cards, clickable secondary buttons, floating panels, dropdown menus.
  - Shadow Value: `6px 6px 12px #151715, -6px -6px 12px #272927`
  - Effect: Elements appear organically lifted above the `#1E201E` slate background.
* **Pressed / Inset Surface (`--shadow-inset` / `.neu-inset`):**
  - Used on text inputs, search fields, active/pressed toggle buttons, selected nav items.
  - Shadow Value: `inset 4px 4px 8px #151715, inset -4px -4px 8px #272927`
  - Effect: Elements recede smoothly into the surface.
* **Primary CTA Glow (`--glow-accent` / `.btn-primary`):**
  - Solid background: `#DD700B` (Accent Cinnamon)
  - Text color: `#1E201E` (Dark Slate text for high contrast and legible affordance)
  - Shadow Value: `0 4px 14px rgba(221, 112, 11, 0.4)`
  - Hover state: `0 6px 20px rgba(221, 112, 11, 0.6)`, scale `1.01`.
  - Notice: Primary CTAs avoid heavy neumorphic extrusion to preserve instant visual affordance.

---

## 3. Typography & Hierarchy
* **Primary Font:** **Plus Jakarta Sans** (with fallback to Inter and sans-serif).
* **Text Contrast Standards:**
  - H1/H2/H3 Titles: `#D9DADF` (Light Neutral Gray, 700/600 weight)
  - Body Text: `#D9DADF` on `#1E201E` / `#2A2D2A` (Calculated contrast ratio > 7.2:1, exceeding WCAG AAA)
  - Secondary Text: `#8A8B82` (Calculated contrast ratio > 4.6:1, meeting WCAG AA)
  - Buttons (Primary): `#1E201E` on `#DD700B` (Contrast ratio > 5.1:1, meeting WCAG AA)

---

## 4. Status Badge Color System

Status badges are paired with descriptive icons and clear text to never rely on color alone:

| Candidate Status | Background / Border Styling | Text Color | Visual Meaning |
|---|---|---|---|
| **applied** | Background `#2A2D2A`, border `#8A8B82` | `#8A8B82` | Initial submission pending evaluation |
| **shortlisted** | Background `rgba(252, 248, 216, 0.1)`, border `#FCF8D8` | `#FCF8D8` | Meets minimum threshold ($\ge$ `min_score`) |
| **invited** | Transparent, border 1.5px `#DD700B` | `#DD700B` | Interview invitation dispatched |
| **interviewing** | Solid `rgba(221, 112, 11, 0.2)`, border `#DD700B` | `#DD700B` | Voice screening currently in progress |
| **interviewed** | Background `#2A2D2A`, border `#D9DADF` | `#D9DADF` | Session completed, supervisor evaluated |
| **hired** | Background `rgba(62, 90, 68, 0.25)`, border `#689F77` | `#8FD19E` | Offer extended / accepted |
| **rejected** | Background `rgba(90, 42, 42, 0.25)`, border `#9E4A4A` | `#E57373` | Disqualified or rejected |
| **on_hold** | Transparent, dashed border `#FCF8D8` | `#FCF8D8` | Under review / waitlisted |

---

## 5. Neumorphic Component Library (`src/components/neu/`)

1. **`NeuCard`:** The foundational extruded container. Supports variants: `flat`, `raised`, `inset`, with customizable padding and hover lift.
2. **`NeuButton`:**
   - `variant="primary"`: Solid Cinnamon `#DD700B` with ambient glow and dark text `#1E201E`.
   - `variant="secondary"`: Extruded `#2A2D2A` with `#D9DADF` text. Insets on `:active`.
   - `variant="ghost"`: Transparent with subtle hover background.
   - `variant="danger"`: Muted red tone for destructive actions.
3. **`NeuInput`:** Inset slate input box with `#DD700B` 2px focus ring.
4. **`NeuModal`:** Elevated overlay panel featuring a backdrop blur, focus trap, and Escape key dismissal.
5. **`NeuBadge`:** Pill container supporting the 8 status states and trust ratings.
6. **`NeuTable`:** Elevated data grid with striped hover rows and sticky headers.
7. **`NeuToggle`:** Pill switch that transitions smoothly from inset to cinnamon active fill.
8. **`NeuSidebar`:** Full-height tactile navigation rail with active inset indicators.
9. **`NeuProgress`:** Track container with inset shadow and glowing cinnamon fill.

---

## 6. Accessibility & Usability Standards (WCAG 2.1 AA)
- **Focus Rings:** All interactive elements (`<button>`, `<a>`, `<input>`) feature a distinct 2px Cinnamon `#DD700B` focus outline (`focus-visible:ring-2 focus-visible:ring-[#DD700B] focus-visible:outline-none`).
- **Non-Color Indicators:** Statuses pair color with distinct icons (e.g., checkmark for hired, clock for pending, cross for rejected).
- **Keyboard Navigation:** Modals capture tab focus and can be dismissed via `Escape`.
- **Screen Reader Support:** Semantic HTML tags (`<nav>`, `<main>`, `<header>`, `<table>`) with appropriate `aria-label` and `aria-expanded` attributes.

---

## 7. Design System Verification Page (`/hr/design-check`)
A dedicated development route `/hr/design-check` is provided to allow engineers to visually audit all neumorphic components in all interactive states (default, hover, active, disabled, focused) alongside color swatches, typography samples, and the full brand logo matrix.

---

## 8. Brand and Logo System

### Core Identity & Naming
The product name is strictly written as **asanHire** (lowercase "a", capital "H") across all user-facing interfaces, metadata, email subjects, and documentation.

The brand mark features a lowercase **"a"** crossed by an accent cinnamon (`#DD700B`) arrow paired with a capital **"H"**, symbolizing seamless upward career progression.

### Brand Asset Directory (`frontend/public/`)
| File | Format | Dimensions | Purpose & Application |
|---|---|---|---|
| `logo.svg` | SVG (Vector) | 256x256 | Mark on an extruded rounded tile |
| `logo-mark.svg` | SVG (Vector) | 206x180 | Standalone brand symbol (transparent) |
| `logo-full.svg` | SVG (Vector) | 665x180 | Wordmark + symbol lockup (transparent) |
| `favicon.svg` | SVG (Vector) | 32x32 | Browser tab icon |
| `apple-touch-icon.png` | PNG (Raster) | 180x180 | iOS home screen / bookmark icon |
| `icon.png` | PNG (Raster) | 512x512 | PWA manifest & Android home screen icon |
| `og-image.png` | PNG (Raster) | 1200x630 | Open Graph & Twitter card social preview on `#1E201E` |
| `logo-email.png` | PNG (Raster) | 240x65 | Fixed-width header for Resend HTML email templates |
| `manifest.webmanifest` | JSON | N/A | PWA web app manifest (`theme_color: #1E201E`) |

### Reusable Logo Component (`src/components/brand/Logo.tsx`)
```tsx
interface LogoProps {
  variant?: "mark" | "full" | "tile"; // default: "full"
  size?: "sm" | "md" | "lg" | "xl";    // default: "md"
  href?: string;                       // default: "/" (set null/undefined to disable link)
  className?: string;
}
```

#### Size Matrix & Proportions
| Size Token | Rendered Height | `full` Width | `mark` Width | `tile` Width |
|---|---|---|---|---|
| `sm` | 24px | 89px | 28px | 24px |
| `md` (Default) | 32px | 118px | 37px | 32px |
| `lg` | 48px | 177px | 55px | 48px |
| `xl` | 72px | 266px | 82px | 72px |

> [!NOTE]
> Below 24px height, standard vectors lose clarity. For sub-24px contexts, use `favicon.svg`.

### Clear Space Rules
A minimum clear space equal to **half the logo's height** ($0.5 \times h$) must be maintained on all sides of the logo at all times. No text, icons, buttons, or border dividers may intrude within this protective boundary.

### Contrast & Surface Rules
- On **`#1E201E` (Background Primary)**: Both `full` and `tile` variants render with optimal contrast.
- On **`#2A2D2A` (Surface Container)**: Use the `mark` or `full` variant directly on the slate surface. Avoid the `tile` variant on `#2A2D2A` cards when subtle border contrast is undesirable.

### Component Placement Map
1. **Landing Page (`/`)**:
   - Header: Large `full` logo (`size="lg"`, 48px).
   - Hero Section: Large decorative `mark` (`size="xl"`, 72px).
   - Footer: Subtle `mark` (`size="sm"`, 24px).
2. **Login Screen (`/login`)**:
   - Above Authentication Form: Elevated `tile` (`size="lg"`, 48px).
   - Card Header: `full` logo (`size="md"`, 32px).
3. **HR Sidebar Layout (`/hr/layout.tsx`)**:
   - Expanded Sidebar: `full` logo (`size="md"`, 32px).
   - Collapsed Sidebar / Mobile Rail: Automatically switches to `mark` (`size="md"`, 32px).
4. **HR Top Bars & Breadcrumbs**:
   - Talent Overview (`/hr`): Small `mark` (`size="sm"`) in title heading.
   - Job Requisitions (`/hr/jobs`): Small `mark` (`size="sm"`) in title heading.
   - Post Requisition (`/hr/jobs/new`): Small `mark` (`size="sm"`) in title heading.
   - Job Candidates (`/hr/jobs/[id]`): Small `mark` (`size="sm"`) beside job title.
   - Candidate Detail (`/hr/candidates/[id]`): Small `mark` (`size="sm"`) beside candidate name.
5. **Print & Audit Report (`/hr/candidates/[id]`)**:
   - Dedicated print-only header: High-contrast `full` logo (`size="md"`).
6. **Public Job Requisition (`/jobs/[id]`)**:
   - Header: Prominent `full` logo (`size="md"`).
   - Footer: "Powered by asanHire" lockup with `mark` (`size="sm"`).
7. **Interview Room (`/interview/[token]`)**:
   - Screen Header: Small `full` logo (`size="sm"`, 24px) positioned top-left (visible yet non-distracting during candidate voice screen).
   - Consent & Fullscreen Gate: Centered `mark` (`size="lg"`, 48px).
   - Thank You / Completion State: Centered `mark` (`size="lg"`, 48px).
8. **System Status & Boundary Pages**:
   - 404 Not Found (`not-found.tsx`): Centered `mark` (`size="xl"`).
   - Error Boundary (`error.tsx`): Centered `mark` (`size="xl"`).
   - Suspense Loading State (`loading.tsx`): Animated pulsing `mark` (`size="lg"`, respects `prefers-reduced-motion`).
9. **Modal Dialogs (`NeuModal.tsx`)**:
   - **STRICT RULE**: Modals must contain **no logo**. Keeping modal headers clean and task-focused maintains visual clarity.
10. **Transactional Emails (`backend/app/services/email.py`)**:
    - Email clients do not reliably render SVG. Emails reference `FRONTEND_URL/logo-email.png` (240px wide) in a fixed top header table row across `invite`, `hired`, `rejected`, `on_hold`, and `corrected_decision` templates.

### Brand Do's & Don'ts
* **DO**:
  - Always write the name as **asanHire**.
  - Maintain the fixed aspect ratios ($3.69:1$ for full, $1.14:1$ for mark, $1:1$ for tile).
  - Retain the 2px Cinnamon (`#DD700B`) keyboard focus ring when wrapping the logo in a link.
  - Serve all frontend assets locally from `/public/` (zero external font/image requests).
* **DON'T**:
  - **DON'T** stretch, skew, distort, or rotate the logo.
  - **DON'T** recolor the orange arrow or change the text fills.
  - **DON'T** place logos inside modal dialogs.
  - **DON'T** load logos from external CDNs.
  - **DON'T** inject user or candidate text inside the email logo markup.

