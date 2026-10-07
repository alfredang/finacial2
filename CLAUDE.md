# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

One-page marketing site for "Horizon Wealth Planning", a financial planning firm. Everything lives in a single `index.html`: CSS goes in one `<style>` tag and vanilla JS in one `<script>` tag. That is a hard requirement, so don't add frameworks, build tools, package managers or separate CSS/JS files. External resources are limited to Google Fonts (Playfair Display for headings, Inter for body), one Unsplash hero image and pravatar.cc testimonial avatars.

## Commands

There is no build, lint or test setup.

- Open in browser (PowerShell): `Start-Process index.html`
- Syntax-check the inline JS (Git Bash):
  `sed -n '/<script>/,/<\/script>/p' index.html | sed '1d;$d' > "$TEMP/hw.js" && node --check "$TEMP/hw.js"`

## Structure of index.html

The file is organised into numbered, commented sections in all three layers, and new code should follow the same layout.

- **CSS**: (1) `:root` design tokens, (2) base, (3) buttons, (4) header/nav, (5) hero, (6) carousel, (7) contact/form, (8) footer, (9) back-to-top, (10) scroll animations, (11) `min-width: 768px`, (12) `min-width: 1024px`, (13) `prefers-reduced-motion`. Styles are mobile-first and the two media queries only add overrides. Always use the custom properties (`--navy #0B2545`, `--gold #C9A227`, `--bg #F7F9FC`, `--space-*`, etc.) instead of hard-coded values.
- **HTML**: sticky `header` with nav → `main` holding `#home` (hero), `#testimonials` and `#contact` → `footer` → back-to-top button. Nav links, footer quick links and the hero buttons all point at these ids.
- **JS**: everything runs inside a single `DOMContentLoaded` handler, numbered (1) nav, (2) fade-in, (3) count-up stats, (4) carousel, (5) enquiry form, (6) newsletter, (7) footer year, (8) scroll handlers.

## Conventions that span HTML, CSS and JS

- **Fade-in**: add `.fade-in` (optionally `.delay-1`–`.delay-3`) to an element. An IntersectionObserver adds `.visible` once and then stops watching it.
- **Count-up stats**: the HTML attributes `data-target`, `data-prefix` and `data-suffix` on `.stat-number` drive the animation.
- **Carousel**: slides are the `<article>` children of `#carousel-track`.
  - The JS sets the `--per-view` CSS variable: 1 below 1024px, 3 at 1024px and up.
  - Dots are rebuilt from `slides.length - perView`, and star SVGs are injected into every `.stars` element. Adding a slide only needs new markup plus an updated `aria-label="n of N"` on each slide.
  - Autoplay is gated by the `hovered`, `focused`, `document.hidden` and reduced-motion flags. Every restart should go through `startAutoplay()` so those pauses are respected.
  - Off-screen slides get `aria-hidden` and `inert`.
- **Form validation**: the `validators` map is keyed by form field `name`.
  - Each field needs a matching `<span id="{name}-error">`, and the input references it via `aria-describedby`.
  - `getTarget()` decides which element gets the `.invalid` red border. For the radio group and the consent checkbox that is the wrapper, not the input.
  - To add a field, add the markup, a validator and, if needed, a `getTarget` case, then add it to the `data` object logged on submit.
- **Accessibility**: keep ARIA attributes in sync whenever behaviour changes. That covers `aria-expanded` and `aria-label` on the hamburger, `aria-current` on the carousel dots, and `aria-invalid` on form fields.
