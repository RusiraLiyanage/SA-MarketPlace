# Sample Assist — Design System

A working design system for **Sample Assist**, a digital-health and workforce-safety company that provides chain-of-custody sample collection, on-site workforce safety, and lab-reporting software. Built from the *SA Brand Guidelines 2025* (18 pages, PDF).

---

## Company & product context

**Sample Assist** ("SA") sits at the intersection of digital health, workforce safety, and drug-and-alcohol testing. Their positioning: *"professional, clear, and confident… reflecting our expertise in digital health and workforce safety."* The brand pivots around the concept of **chain of custody** — the legally-auditable trail that follows a biological sample from collection through lab. That phrase literally appears on the primary shield logo.

### Products in the Sample Assist platform

Eight named sub-products are enumerated on page 16 of the brand guide:

| Product | Icon / symbol in guide | Inferred purpose |
|---|---|---|
| **Collection Manager** | person-with-connected-dots | Back-office dashboard for managing collectors, sites, jobs |
| **Collect Assist** | specimen jar | Field app for sample collectors — the chain-of-custody capture tool |
| **Work Assist** | hard-hat + gear | Workforce safety / workplace drug-&-alcohol program admin |
| **Welcome Assist** | person with check-mark | Worker onboarding / induction & consent |
| **Report Assist** | bar-chart + arrow | Reporting and analytics |
| **Secure Assist** | shield + circuit-nodes | Identity / access / secure data layer |
| **Book Assist** | calendar with check | Appointment / slot booking for collections |
| **Lab Assist** | lab flask | Lab-facing result-processing app |

> **Important — I was not given a codebase, Figma link, or screenshots of any of these products.** Only the brand guide PDF. Each product's actual UI is unknown. The UI kit I build in `ui_kits/` is therefore **a branded approximation** — a believable Sample Assist product interface grounded in the real logo, palette, typography and tone, but the layouts and flows are inferred, not copied. Please attach a codebase or Figma file so I can ground these properly.

### Company details (from page 18)
- **Phone:** +61 2 8006 8111
- **Email:** hello@sampleassist.com
- **Address:** iAccelerate, Suite 9, Building 239, Innovation Campus, Squires Way, North Wollongong NSW 2500 (Australia)
- **Web:** www.sampleassist.com

### Sources
- `uploads/SA - Brand Guidelines 2025-2.pdf` — the only provided source (18 pages)
- Rendered previews of each page: `pdf_pages/page_01.png` … `pdf_pages/page_18.png` (kept for reference)
- No codebase, Figma, or production screenshots were provided.

---

## CONTENT FUNDAMENTALS

The tone-of-voice page (page 3) is explicit and I treat it as the contract.

**Tone:** *professional, clear, and confident.* Authoritative and precise — this is a regulated-industry brand (pathology, chain-of-custody, workplace safety). Copy is never cute, never startup-y, never jokey.

**Voice properties**
- **Grounded and factual.** Lead with what the product *does* and what it *delivers*, not how users will *feel.*
- **Clarity over complexity.** Short sentences. Plain English. If a word has a 5-letter and a 10-letter version, use the 5-letter one — *unless* it is a genuine domain term (chain of custody, specimen, collector, donor, adulteration, on-site testing).
- **Evidence-based.** Where credible, point to measurable outcomes ("reliable, evidence-based solutions that deliver measurable results" — their own words).
- **Reassuring, not hype-y.** The audience is safety managers, HR, pathology partners. They want "we've got this," not "revolutionary."

**Mechanics**
- **Pronouns:** "we" for the company, "you" for the customer. Never "our amazing team." Rarely "I."
- **Casing:** Title Case for page headers and product names (*Collect Assist*, *Chain of Custody*). Sentence case for UI labels and body copy.
- **Product-name formatting:** `ProductAssist` is rendered as two words with a space in marketing (`Collect Assist`) and always with a ™ in product-logo lockups.
- **No emoji.** Not in marketing, not in-app. The brand guide shows zero emoji and the regulatory context makes them inappropriate.
- **No exclamation marks** in product copy. They are permissible at most once in a welcome moment.
- **Oxford comma:** yes (Australian business English default).
- **Units & dates:** Metric (mm, not inches — see logo minimum "25 mm"). Dates `DD MMM YYYY` (e.g. `22 Apr 2026`).
- **Acronyms on first use:** spelled out, then abbreviated — *Chain of Custody (CoC)*.

**Examples (written in this voice)**
- ✅ "Capture every step of the chain of custody, from collection to lab result."
- ✅ "Book a collection, check in the donor, print the CoC form, and sync to Lab Assist — in under two minutes."
- ❌ "Say goodbye to paperwork! 🎉 Chain of custody made magical ✨"
- ❌ "Revolutionize your testing workflow with AI-powered insights"

**Microcopy patterns**
- Empty states: describe the action, not the absence. *"Start a collection to see it here."* not *"Nothing to show."*
- Errors: plain, non-blaming. *"We couldn't save the form. Check your connection and try again."*
- Buttons: verbs. *Start collection*, *Print CoC form*, *Submit to lab.* Not *Submit* alone.

---

## VISUAL FOUNDATIONS

### Color
- **Primary duo:** SA Navy `#00004C` (backgrounds, headings) + SA Plasma `#01B4D2` (subheads, accents, interactive highlights). This duo carries the entire brand.
- **Support palette:** SA Mid Blue `#156CC9`, SA Red `#FD0000`, SA Green `#0AD181` (also labelled "ON-SITE" — it doubles as a status color), SA Gray Blue `#4B5767`, SA Teal `#3EB8A4`.
- **Temperament:** Cool, analytical. No warm tones except very minor exceptions. Reds are saturated and used *only* for errors/critical — the `#FD0000` is a true red, not a brand accent.
- **Backgrounds:** two modes —
  - **Navy mode** (hero, section intros, app header bars, presentation slides) uses SA Navy full-bleed with white type and Plasma accents.
  - **Light mode** (documents, app interiors, data screens) uses white with Navy text and Plasma accents.
- Avoid gradient washes between unrelated hues. The only gradient-like treatment in the guide is the **subtle wave line pattern** at the bottom of each navy page (see "Backgrounds" below).

### Typography
- **Roboto** → documents, marketing, collateral, decks. Weights used: 400 body, 700 headings/subheadings.
- **Inter** → in-app UI. Weights used: 400 regular, 500 medium, 700 bold.
- Both load from Google Fonts — no substitution needed.
- The brand guide also uses an all-caps, wide-letterspaced page-tag style ("P A G E 0 4  C O L O R  P A L E T T E") — I've codified this as `.sa-eyebrow` with `letter-spacing: 0.12em`.
- The `SampleAssist` wordmark in the logo uses a serif — this is *only* for the logo, not for body copy. Do not try to set headings in a serif.

### Backgrounds & texture
- Hero / section backgrounds are **solid navy** with a **thin cyan linework wave pattern** at the bottom (visible on most pages of the brand PDF). This motif should be used sparingly — it's a *finishing touch*, not a primary decoration.
- Never use photographic textures, grain, or film overlays.
- No hand-drawn illustrations. No doodles. No cute characters.
- Product marks are flat, geometric pictograms on navy backgrounds (see page 16).

### Spacing & layout
- **4-px grid.** All spacing tokens in `colors_and_type.css` are multiples of 4.
- **Generous whitespace** around the logo — the guide specifies clear space equal to the height of the *"S" in Sample* (page 10). This generosity extends to layouts generally: the brand is not dense.
- **Logo placement:** top-left or bottom-right (guide p.9). Keep consistent within a document set.
- **Minimum logo width:** 100 px digital, 25 mm print.

### Corner radii & cards
- Radii are **moderate** — 8–16 px for cards, 4 px for small elements, pill for chips and status badges. Not ultra-rounded (this is an enterprise regulated-industry brand, not a consumer app).
- Cards are **white on light backgrounds** with a hairline navy-tinted border (`#D8DFE8`) and a very soft navy-tinted shadow. On navy backgrounds, cards are a **translucent lift** (white with 4–8% opacity + subtle border).
- No colored-left-border accent cards. No gradient borders.

### Shadows
- Brand guide explicitly forbids shadows **on the logo**. For UI, shadows are allowed but must be **cool and subtle** — see `--shadow-*` tokens. All are tinted toward `rgba(0,0,76,…)` (navy), not neutral black.

### Borders & dividers
- Hairlines at 1 px. Color `--border` = `#D8DFE8` on light, `rgba(255,255,255,0.14)` on navy.
- Avoid double-borders or decorative rules.

### Animation & motion
- The brand guide has **no motion spec** — I am inferring conservatively, matching the tone:
  - **Easing:** `cubic-bezier(0.2, 0, 0.2, 1)` — gentle ease-out, no overshoot.
  - **Durations:** 120 ms (hover), 180 ms (state change), 240 ms (panel/sheet), 320 ms max (page transition).
  - **Style:** fades, subtle Y-translates (4–8 px), scale changes no greater than 0.98–1. **No bouncy springs. No elastic.**
  - **Reduced-motion:** always respected — disable translate/scale, keep opacity only.

### Hover states
- **On light backgrounds:** primary buttons darken Navy → `#0A1566`; Plasma accents deepen to `--sa-plasma-600` (`#0190A8`).
- **On navy backgrounds:** accents brighten from Plasma-500 to Plasma-400 (`#38C8DE`).
- **Text links:** underline-on-hover (border-bottom 1 px), color unchanged.
- **Tertiary / ghost buttons:** background shifts from transparent to `rgba(0,0,76,0.06)` on light, `rgba(255,255,255,0.08)` on navy.

### Press / active states
- A subtle **darken**, not a shrink. Buttons do not physically shrink; instead the background darkens one more step. Optional `transform: translateY(1px)` for tactile feedback, no scale.

### Focus ring
- **3 px ring** in Plasma at 35% opacity: `0 0 0 3 px rgba(1,180,210,0.35)` — visible on both navy and white.

### Transparency & blur
- Used sparingly. Acceptable: app nav bars (navy + `backdrop-filter: saturate(140%) blur(12px)` at 92% opacity); translucent card lifts on navy. **Not acceptable:** glassmorphism everywhere, frosted-everything looks.
- Never drop logo opacity — it must always be 100%.

### Imagery tone
- If photography is used, it should be **cool-toned, clinical, calm** — medical settings, lab environments, PPE, workplace safety. Natural daylight, not moody. Not warm-golden-hour.
- No stock photos of "young happy team in WeWork."
- No AI-generated imagery.
- When photography isn't available, fall back to the flat product-icon illustrations (page 16) or solid navy blocks with the wave motif.

### Iconography philosophy
Laid out in detail in the `ICONOGRAPHY` section below.

---

## ICONOGRAPHY

**What the brand guide shows.** Page 16 reveals the full product-icon set: 8 flat, geometric, single-concept pictograms rendered in **white + Plasma cyan on navy**. They are confident, chunky, and pictographic (a specimen jar, a hard hat, a lab flask). No outlines-only. No fine-line mysticism. No duotone gradients. They read cleanly at small sizes.

**What I've copied into this system.**
- `assets/logos/logo-horizontal-color.png` — full-colour horizontal lockup (light backgrounds)
- `assets/logos/logo-horizontal-white.png` — white horizontal lockup (navy backgrounds)
- `assets/logos/logo-stacked-color.png` — stacked lockup, full-colour
- `assets/logos/logo-stacked-white.png` — stacked lockup, white
- `assets/logos/logo-shield-white.png` — shield-only support mark (white-on-navy)
- `assets/logos/logo-powered-by-white.png` — "Powered by Sample Assist" lockup
- `assets/logos/product-*-white.png` — 8 product marks (`collection-manager`, `collect-assist`, `work-assist`, `welcome-assist`, `report-assist`, `secure-assist`, `book-assist`, `lab-assist`)

All were extracted from the brand-guide PDF by rendering pages 7, 8, 13 and 15 at 2× and cropping. They are PNGs with the original navy matte — good enough for mockups; for production we should ask the brand team for the source SVGs.

**UI icons (line icons for in-app tool use).** The brand guide does **not** specify a UI icon set. For the UI kits I use **[Lucide](https://lucide.dev/)** via CDN. Reasoning:
- Lucide's stroke weight (1.5 px) and square-ish geometry harmonise with the flat, solid look of the brand's own pictograms.
- It has broad coverage (clinical, safety, data, calendar — everything these products need).
- It's free, permissive, and CDN-hosted, so UI-kit prototypes don't need an asset pipeline.

> **⚠️ Substitution flag.** The real Sample Assist products may already use a different icon set (Font Awesome, Material Symbols, or a bespoke kit). **Please confirm** — if you have a specific icon system, share it and I will swap.

**Emoji & unicode characters.** Not used. The brand guide has no emoji, and the regulated-industry tone makes them off-brand. Do not introduce 🎉 ✨ 📦 🚀 etc. Plain typographic characters (→, ×, ✓) are acceptable in UI *only* when a dedicated icon doesn't fit — and always in the on-brand accent colours.

**Logo usage rules (from guide p.11–12 — respect strictly).**
- Do not stretch, compress, rotate, flip, or recolor the logo.
- Do not add shadows, gradients, outlines, or effects.
- Do not place on cluttered backgrounds — use a solid-color overlay if needed.
- Maintain clear space = height of the *"S" in Sample* on all sides.

---

## Index — what's in this folder

```
README.md                           — you are here
SKILL.md                            — makes this kit work as a portable Claude skill
colors_and_type.css                 — all CSS variables + semantic type classes

assets/
  logos/                            — primary, stacked, shield, powered-by, 8 products
  (fonts loaded via Google Fonts — no local files needed)

preview/                            — small HTML cards that render in the Design System tab
  type-*.html                       — typography specimens
  color-*.html                      — color palette cards
  spacing-*.html                    — radius, shadow, spacing tokens
  component-*.html                  — buttons, inputs, cards, badges
  brand-*.html                      — logos, product marks

ui_kits/
  marketing-site/                   — branded marketing-site components + interactive demo
  product-app/                      — branded in-app components (Inter font, "Collect Assist"-style shell)
    README.md
    index.html
    components/...jsx

pdf_pages/                          — raw 2× page renders of the brand PDF (reference only)
uploads/                            — original source PDFs (do not modify)

SKILL.md                            — portable Claude Code / Agent Skill manifest
```

See each UI kit's own `README.md` for component coverage and caveats.
