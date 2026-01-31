# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development
- `npm install` - Install dependencies
- `npm run build` - Compile TypeScript to JavaScript and copy assets to dist/
- `npm start` - Build and run the game in Electron
- `npm run dev` - Run in development mode with hot-reload (TypeScript watch mode + Electron)

### Testing the Game
After running `npm start` or `npm run dev`, the game will open in an Electron window. Use these controls:
- Arrow Keys / WASD: Move character in game
- Enter: Select menu options / Confirm actions
- Escape: Go back to previous screen

### Deployment
- `npm run pack` - Package the app without creating installers (output in `release/`)
- `npm run dist` - Create distributable packages for the current platform
- `npm run dist:win` - Create Windows .exe installer (works cross-platform, outputs to `release/`)

The Windows installer will be named `JSRoguelike Setup 1.0.0.exe` and placed in the `release/` directory.

## Architecture

### Electron Structure
This is an Electron app with a simple architecture:
- **Main Process** (`src/main.ts`): Creates the Electron window and loads the renderer
- **Renderer Process** (`src/game.ts` + HTML): Runs the game logic in a browser-like environment

The main process loads `dist/index.html`, which contains a canvas element and loads `game.js`.

### Game Architecture
The game uses a **screen-based state machine** pattern:

1. **Game Controller** (`src/game.ts`):
   - Manages the game loop using `requestAnimationFrame`
   - Tracks current screen state (menu, characterSelect, levelSelect, game, levelUp, gameOver)
   - Routes input and rendering to the appropriate screen
   - Maintains game state (player, current level)

2. **Screen System** (`src/screens/*.ts`):
   Each screen is a separate class with `update()` and `render()` methods:
   - **MenuScreen**: Main menu with options
   - **CharacterSelectScreen**: Character class selection (Warrior/Rogue/Tank)
   - **LevelSelectScreen**: Difficulty level selection
   - **GameplayScreen** (`gameScreen.ts`): Main gameplay with grid-based movement and combat
   - **LevelUpScreen**: Reward selection between levels
   - **GameOverScreen**: End screen with score

3. **Core Systems**:
   - **Renderer** (`src/renderer.ts`): Canvas-based rendering with tile drawing, text, rectangles, and health bars
   - **InputManager** (`src/input.ts`): Keyboard input handling with key press detection and "just pressed" tracking
   - **Game Data** (`src/gameData.ts`): Character definitions, level-up options, item drops

4. **Type System** (`src/types.ts`):
   Defines all game types including Player, Enemy, Item, GameState, and screen types.

### Gameplay Flow
```
Menu → Character Select → Level Select → Gameplay → Level Up → Level Select (next level)
                                              ↓
                                          Game Over → Menu
```

### Key Gameplay Mechanics
- **Grid-based Movement**: 40x22 tile grid with turn-based movement
- **Combat**: Moving into an enemy attacks it; enemies chase and attack the player
- **Progression**: Defeating enemies grants XP; leveling up occurs during gameplay
- **Level Completion**: Triggered when all enemies are defeated
- **Upgrades**: Between levels, players choose from 3 random upgrade options

## Code Patterns

### Adding a New Screen
1. Create a new file in `src/screens/` (e.g., `myScreen.ts`)
2. Implement a class with `update(input: InputManager)` and `render(renderer: Renderer)` methods
3. Add the screen to the `GameScreen` type union in `src/types.ts`
4. Add screen instance and routing logic in `src/game.ts`

### Adding New Enemies or Characters
Modify `src/gameData.ts`:
- Add to `CHARACTERS` array for player characters
- Spawn logic in `GameplayScreen.spawnEnemies()` for enemies

### Adding New Upgrades
Add to `LEVEL_UP_OPTIONS` array in `src/gameData.ts`. Each option has:
- `name`: Display name
- `description`: Short description
- `apply`: Function that modifies the player

### Build Process
The build process:
1. TypeScript compiles `src/**/*.ts` to `dist/**/*.js`
2. `src/index.html` is copied to `dist/index.html`
3. Electron packages everything in `dist/` and `assets/` into the executable

When modifying the build, update the `"build"` script in `package.json`.

## Important Notes

- The renderer uses a **40x22 grid** by default (defined in `game.ts`). Changing this requires updating both the Renderer initialization and any hardcoded references.
- The game loop uses **delta time** for movement delays, but movement itself is turn-based (grid-locked).
- Screen transitions return the next screen name from `update()` or `null` to stay on current screen.
- The `InputManager.clearJustPressed()` must be called each frame (done in game loop) to prevent input repeating.
