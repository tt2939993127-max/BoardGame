# Smash Up UI Refactor Plan

## 1. Goal
Refactor `src/games/smashup/Board.tsx` from a debug/text-based UI to a graphical, tabletop-style interface.

## 2. Layout Specifications

### 2.1 Game Board Layout
- **Center**: Row of Active Bases.
- **Under Each Base**: A grid/flex container divided into 4 vertical columns (one for each player).
- **Bottom**: Player Hand.
- **Top/Overlay**: HUD (Turn info, VP scores).

### 2.2 Card Rendering
- **Base Cards**:
  - Show Art (placeholder or actual), Title, Breakpoint (big number), VP rewards (big numbers).
  - Ability text.
- **Minion Cards**:
  - Render as vertical cards.
  - **Stacking**: In the player's column under a base, minions overlap vertically (margin-top negative).
  - **Visibility**: Headers (Power, Name) must be visible when stacked.

### 2.3 Interactions
- **Play Minion**: Drag & Drop (ideal) or Click Hand Card -> Click Target Base's Player Column.
- **Play Action**: Click Hand Card -> Click Target (Base/Minion) or Auto-resolve if global.
- **Tooltips/Zoom**: Hover over stacked cards to bring to front or show full details (crucial for stacked UI).

## 3. Implementation Steps

### Phase 1: Component Structure & Assets
- [x] Create `Card` component (generic frame for Base/Minion/Action).
- [x] Create `MinionStack` component (handles the vertical overlap of multiple cards).
- [x] Create `BaseZone` component (The Base card + the 4-column container below it).
- [x] Refactor `Board.tsx` to use these new components.

### Phase 2: Styling & Layout (Tailwind)
- [x] Implement the "4 columns per base" grid system.
- [x] Implement the "Solitaire" stacking style using negative margins and z-index.
- [x] Ensure responsive sizing so 4 bases + columns fit on screen (horizontal scrolling if necessary).

### Phase 3: Polish
- [x] Add animations for playing cards.
- [x] Improve readability of stacked cards (hover effects).
- [x] Update HUD styles.

## 4. Asset Integration (New)
- [x] Set up Atlas System (copied from replacement DiceThrone pattern).
- [x] Generate uniform atlases for `base1.png` (4x4) and `cards1.png` (10x7).
- [x] Compress images to AVIF/WebP.
- [x] Apply `previewRef` to card definitions (Indices provisional).
- [x] Update `Board.tsx` to render using `CardPreview`.

## 5. Status
**Refactor Completed**. The `Board.tsx` now implements the requested tabletop layout and uses actual image assets.

## 6. Technical Details
- **Tech Stack**: React, Tailwind CSS.
- **Icons**: Lucide-React (replace emojis if any).
- **responsive**: Ensure min-width holds for the board to prevent squishing.
