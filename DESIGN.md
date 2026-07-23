---
name: Mountain Elegance
colors:
  surface: '#faf9f6'
  surface-dim: '#dbdad7'
  surface-bright: '#faf9f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3f0'
  surface-container: '#efeeeb'
  surface-container-high: '#e9e8e5'
  surface-container-highest: '#e3e2e0'
  on-surface: '#1a1c1a'
  on-surface-variant: '#434843'
  inverse-surface: '#2f312f'
  inverse-on-surface: '#f2f1ee'
  outline: '#737973'
  outline-variant: '#c3c8c1'
  surface-tint: '#4d6453'
  primary: '#061b0e'
  on-primary: '#ffffff'
  primary-container: '#1b3022'
  on-primary-container: '#819986'
  inverse-primary: '#b4cdb8'
  secondary: '#7c5730'
  on-secondary: '#ffffff'
  secondary-container: '#fdcb9b'
  on-secondary-container: '#79542d'
  tertiary: '#091a0f'
  on-tertiary: '#ffffff'
  tertiary-container: '#1d2f22'
  on-tertiary-container: '#839886'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d0e9d4'
  primary-fixed-dim: '#b4cdb8'
  on-primary-fixed: '#0b2013'
  on-primary-fixed-variant: '#364c3c'
  secondary-fixed: '#ffdcbd'
  secondary-fixed-dim: '#eebd8e'
  on-secondary-fixed: '#2c1600'
  on-secondary-fixed-variant: '#61401b'
  tertiary-fixed: '#d3e8d5'
  tertiary-fixed-dim: '#b7ccb9'
  on-tertiary-fixed: '#0e1f13'
  on-tertiary-fixed-variant: '#394b3d'
  background: '#faf9f6'
  on-background: '#1a1c1a'
  surface-variant: '#e3e2e0'
typography:
  display-lg:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-sm:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Work Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Work Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-caps:
    fontFamily: Work Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.0'
    letterSpacing: 0.1em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  xxl: 80px
  container-max: 1280px
  gutter: 24px
---

## Brand & Style
The brand personality is "Mountain Elegance"—a synthesis of the raw, untamed spirit of the Himalayas and the meticulous refinement of high-end gastronomy. It targets a discerning global audience that values provenance, rarity, and artisanal craft. The UI must evoke a sense of quiet luxury, authenticity, and environmental stewardship.

The design style is **High-Contrast Minimalist** with **Tactile** influences. It utilizes expansive whitespace to represent the clarity of mountain air, punctuated by fine-line details and high-fidelity textures. The interface should feel like a physical "field journal" discovered in a luxury boutique: structured, intentional, and deeply connected to the geography of the Ravi and Beas basins.

## Colors
The palette is drawn directly from the Himalayan landscape:
- **Primary (Forest Deep):** A dense, near-black green representing the cedar forests. Used for primary headings and key brand moments.
- **Secondary (Earthy Ochre):** Inspired by the sun-drenched soil and dried morels (Guchhi). Used for accents, calls to action, and interactive highlights.
- **Tertiary (Mineral Slate):** A muted, cool green-grey for secondary UI elements and borders.
- **Neutral (Snowy White):** Not a pure digital white, but a warm, slightly textured off-white that prevents visual fatigue and feels organic.
- **Surface (Mist):** A very light grey (#F0EFED) used for subtle container backgrounds to differentiate content without using heavy shadows.

## Typography
The typographic system pairs the high-contrast, editorial grace of **Playfair Display** with the grounded, professional clarity of **Work Sans**. 

- **Headlines:** Use Playfair Display for all display and heading roles. This conveys heritage and the "premium boutique" feel.
- **Body:** Work Sans provides high legibility for product descriptions and provenance stories, balancing the ornamentation of the serif.
- **Labels:** Use Work Sans in uppercase with wide letter spacing for navigation, small labels, and metadata to evoke a sense of modern organization and cataloging.

## Layout & Spacing
The layout follows a **Fixed Grid** model on desktop to maintain an editorial, magazine-like structure, while transitioning to a fluid model on mobile.

- **Desktop (1440px+):** 12-column grid with 80px margins and 24px gutters. Content is often offset or asymmetrical to reflect the organic nature of foraging.
- **Tablet (768px - 1024px):** 8-column grid with 48px margins.
- **Mobile (<768px):** 4-column grid with 20px margins.

Vertical rhythm is generous. Avoid crowding elements; the "luxury" feel is derived from the space *between* the content. Use `xxl` spacing between major sections to allow the user to "breathe" as they scroll.

## Elevation & Depth
This design system avoids traditional drop shadows in favor of **Tonal Layers** and **Fine Outlines**.

- **Depth through Color:** Use the "Mist" surface color to lift cards or sections off the "Snowy White" background. 
- **Borders:** Use 0.5pt to 1pt lines in "Tertiary" or "Accent Grey" with 30% opacity for subtle containment.
- **Glassmorphism:** Reserved exclusively for top navigation bars or modal overlays. Use a high backdrop blur (20px) with a very slight "Forest Deep" tint to create a "mountain mist" effect over photography.
- **Interaction:** On hover, elements should not rise (no shadow increase). Instead, use a subtle color shift or a fine-line border expansion to signal interactivity.

## Shapes
The shape language is "Softly Organic." While the grid is rigid and professional, the corners are softened to reflect the erosion of mountain stones and the organic curves of wild flora.

- **Standard Elements:** Use 0.5rem (8px) for buttons, input fields, and small cards.
- **Large Containers:** Use 1rem (16px) for major image containers or hero sections.
- **Image Treatment:** Photography should always have the standard `rounded-lg` treatment to avoid a "clinical" sharp-edged look.

## Components
- **Buttons:** Primary buttons use a solid "Forest Deep" background with "Snowy White" text. Secondary buttons use a fine 1px "Tertiary" border with no fill. Interaction should involve a gentle background fade to "Secondary Ochre."
- **Cards:** High-fidelity photography is the hero. Text within cards should be minimal, utilizing the `label-caps` style for categories and `headline-sm` for titles.
- **Chips/Tags:** Used for "Foraging Region" or "Seasonality." These should be pill-shaped with a light "Tertiary" tint and `label-caps` typography.
- **Inputs:** Underlined or fully boxed with very light borders. Focus state is signaled by the border color darkening to "Secondary Ochre."
- **Signature Component (The Provenance Map):** A bespoke component showing a simplified topographical line drawing of the valley where the specific food was foraged, using fine mineral-grey lines.
- **Lists:** Use custom icons—thin line drawings of mountain peaks or leaves—as bullets to reinforce the artisanal theme.