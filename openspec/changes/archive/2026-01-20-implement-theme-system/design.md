# Theme System Design

## Architecture

### 1. Theme Context
- **State**: `currentTheme` ('modern' | 'retro' | 'classic')
- **Persistence**: `localStorage` to save user preference.
- **Provider**: Wraps the entire application (or at least the Home route).
- **Effect**: Applies `data-theme` attribute to the `<body>` or root element.

### 2. Styling Strategy (Tailwind + CSS Variables)
We will use CSS variables scoped to `[data-theme="..."]` selectors in `index.css` to control:
- `--bg-primary`: Main background (Color or Texture URL)
- `--font-display`: Headings font
- `--font-body`: Body text font
- `--color-accent`: Main accent color

#### Theme Definitions:

| Parameter | Modern (Default) | Retro (Arcade) | Classic (Paper) |
|-----------|------------------|----------------|-----------------|
| **Font** | `Inter`, Sans | `Press Start 2P`, Pixel | `Crimson Text`, Serif |
| **Bg** | White/Slate + Gradients | Black + Grid/Stars | Paper Texture / Beige |
| **Border** | Rounded, Thin, Gray | Square, Thick, Neon | Hand-drawn/Rough |
| **Shadow** | Soft, Diffuse | Hard, Pixelated | Sketchy/None |

### 3. Component Adaptations

- **HomeHero**: 
  - *Modern*: Floating 3D shapes (Existing)
  - *Retro*: Pixel Art Cabinet / 8-bit Banner
  - *Classic*: Vintage Map / Blueprint style
  
- **GameCard**:
  - *Modern*: Glass/Clean card (Existing)
  - *Retro*: Pixel border, scanline overlay
  - *Classic*: Parchment background, ink stroke border

- **ThemeSwitcher**:
  - A fixed or sticky widget allowing 1-click toggling.

## External Assets
- Fonts: Google Fonts (`Press Start 2P`, `Crimson Text`)
- Textures: Simple CSS patterns or SVG filters for Paper/Noise.
