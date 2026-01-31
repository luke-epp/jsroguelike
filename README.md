# JSRoguelike

A 2D roguelike game built with TypeScript and Electron.

## Features

- **Character Selection**: Choose from 3 different character classes (Warrior, Rogue, Tank)
- **Level Selection**: Multiple difficulty levels with increasing enemies
- **Turn-based Combat**: Grid-based movement with simple combat mechanics
- **Progression System**: Level up your character and choose upgrades
- **Item Drops**: Collect items that enhance your character

## Development

### Prerequisites

- Node.js (v16 or higher)
- npm

### Installation

```bash
npm install
```

### Running in Development Mode

```bash
npm start
# or for hot-reload
npm run dev
```

### Building

```bash
npm run build
```

### Creating Distributable .exe

#### Windows

```bash
npm run dist:win
```

The .exe will be created in the `release` folder.

#### All Platforms

```bash
npm run dist
```

## Controls

- **Arrow Keys / WASD**: Move character
- **Enter**: Select / Confirm
- **Escape**: Back / Cancel

## Game Flow

1. **Main Menu**: Start game or adjust options
2. **Character Select**: Choose your character class
3. **Level Select**: Choose difficulty level
4. **Gameplay**: Navigate the grid, defeat enemies
5. **Level Up**: Choose upgrades between levels

## Customization

### Adding a Custom Icon

To add a custom application icon:

1. Create a 512x512 PNG icon file
2. Save it as `assets/icon.png`
3. Update `package.json` build config to include:
   ```json
   "win": {
     "target": ["nsis"],
     "icon": "assets/icon.png"
   }
   ```

If no custom icon is provided, the default Electron icon will be used.

## Project Structure

```
src/
├── main.ts              # Electron main process
├── game.ts              # Main game controller
├── types.ts             # TypeScript type definitions
├── input.ts             # Input handling system
├── renderer.ts          # Canvas rendering system
├── gameData.ts          # Game data (characters, items, upgrades)
├── index.html           # Game HTML container
└── screens/             # Game screen implementations
    ├── menuScreen.ts
    ├── characterSelectScreen.ts
    ├── levelSelectScreen.ts
    ├── gameScreen.ts
    ├── levelUpScreen.ts
    └── gameOverScreen.ts
```

## License

MIT
