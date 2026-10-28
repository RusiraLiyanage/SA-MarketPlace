---
name: sample-assist-design
description: Use this skill to generate well-branded interfaces and assets for Sample Assist, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `README.md` file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out of `assets/` and create static HTML files for the user to view — linking `colors_and_type.css` gives you the whole token system in one line. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

Key things to remember for Sample Assist:
- Two fonts: **Roboto** for documents & marketing, **Inter** for in-app UI.
- Two backgrounds modes: **navy full-bleed** (hero, slides) and **light** (interiors, app).
- Colors: SA Navy `#00004C`, SA Plasma `#01B4D2` is the brand duo. Support: Mid Blue, Red, Green (on-site), Gray Blue, Teal.
- Tone: professional, clear, confident. **No emoji.** No hype. Evidence-based, sentence-case UI.
- Eight named products (Collect, Collection Manager, Work, Welcome, Report, Secure, Book, Lab Assist) — assets in `assets/logos/product-*`.
- Two UI kits live in `ui_kits/` — reference them before inventing layouts.
