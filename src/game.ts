// Main game controller

import { Renderer } from './renderer.js';
import { InputManager } from './input.js';
import { GameScreen, Player, GameState } from './types.js';
import { createPlayer } from './gameData.js';
import { MenuScreen } from './screens/menuScreen.js';
import { CharacterSelectScreen } from './screens/characterSelectScreen.js';
import { LevelSelectScreen } from './screens/levelSelectScreen.js';
import { GameplayScreen } from './screens/gameScreen.js';
import { LevelUpScreen } from './screens/levelUpScreen.js';
import { GameOverScreen } from './screens/gameOverScreen.js';

export class Game {
  private renderer: Renderer;
  private input: InputManager;
  private currentScreen: GameScreen = 'menu';
  private lastTime = 0;

  // Screen instances
  private menuScreen = new MenuScreen();
  private characterSelectScreen = new CharacterSelectScreen();
  private levelSelectScreen = new LevelSelectScreen();
  private gameplayScreen: GameplayScreen | null = null;
  private levelUpScreen: LevelUpScreen | null = null;
  private gameOverScreen: GameOverScreen | null = null;

  // Game state
  private player: Player | null = null;
  private selectedCharacterIndex = 0;
  private currentWave = 1;

  constructor() {
    console.log('Game constructor called');
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!canvas) {
      console.error('Canvas element not found!');
      throw new Error('Canvas element with id "gameCanvas" not found');
    }
    console.log('Canvas element found:', canvas);
    this.renderer = new Renderer(canvas, 40, 22);
    console.log('Renderer created');
    this.input = new InputManager(canvas);
    console.log('Input manager created');

    console.log('Starting game loop...');
    this.gameLoop(0);
  }

  private gameLoop = (currentTime: number): void => {
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.render();

    this.input.clearJustPressed();
    requestAnimationFrame(this.gameLoop);
  };

  private update(deltaTime: number): void {
    switch (this.currentScreen) {
      case 'menu': {
        const nextScreen = this.menuScreen.update(this.input);
        if (nextScreen) {
          this.currentScreen = nextScreen;
        }
        break;
      }

      case 'characterSelect': {
        const result = this.characterSelectScreen.update(this.input);
        if (result.screen) {
          this.currentScreen = result.screen;
          if (result.characterIndex !== undefined) {
            this.selectedCharacterIndex = result.characterIndex;
          }
        }
        break;
      }

      case 'levelSelect': {
        const result = this.levelSelectScreen.update(this.input);
        if (result.screen) {
          this.currentScreen = result.screen;
          if (result.level !== undefined) {
            this.currentWave = result.level;
            this.startGame();
          }
        }
        break;
      }

      case 'game': {
        if (this.gameplayScreen) {
          const nextScreen = this.gameplayScreen.update(this.input, deltaTime);
          if (nextScreen) {
            this.currentScreen = nextScreen;
            if (nextScreen === 'levelUp') {
              this.player = this.gameplayScreen.getPlayer();
              this.levelUpScreen = new LevelUpScreen(this.player);
            } else if (nextScreen === 'gameOver') {
              this.gameOverScreen = new GameOverScreen(this.player?.level || 0);
            }
          }
        }
        break;
      }

      case 'levelUp': {
        if (this.levelUpScreen && this.player) {
          const result = this.levelUpScreen.update(this.input);
          if (result.screen) {
            this.currentScreen = result.screen;
          }
        }
        break;
      }

      case 'gameOver': {
        if (this.gameOverScreen) {
          const nextScreen = this.gameOverScreen.update(this.input);
          if (nextScreen) {
            this.currentScreen = nextScreen;
            this.player = null;
          }
        }
        break;
      }
    }
  }

  private render(): void {
    switch (this.currentScreen) {
      case 'menu':
        this.menuScreen.render(this.renderer);
        break;
      case 'characterSelect':
        this.characterSelectScreen.render(this.renderer);
        break;
      case 'levelSelect':
        this.levelSelectScreen.render(this.renderer);
        break;
      case 'game':
        if (this.gameplayScreen) {
          this.gameplayScreen.render(this.renderer);
        }
        break;
      case 'levelUp':
        if (this.levelUpScreen) {
          this.levelUpScreen.render(this.renderer);
        }
        break;
      case 'gameOver':
        if (this.gameOverScreen) {
          this.gameOverScreen.render(this.renderer);
        }
        break;
    }
  }

  private startGame(): void {
    this.player = createPlayer(this.selectedCharacterIndex);
    this.gameplayScreen = new GameplayScreen(this.player, this.currentWave);
  }
}

// Start the game when the page loads
console.log('Game script loaded!');
window.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded event fired, creating Game...');
  try {
    new Game();
    console.log('Game instance created successfully!');
  } catch (error) {
    console.error('Error creating Game:', error);
  }
});
