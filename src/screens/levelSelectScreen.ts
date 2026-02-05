// Font level selection screen

import { Renderer } from '../renderer.js';
import { InputManager } from '../input.js';
import { GameScreen } from '../types.js';
import { FONT_LEVELS } from '../gameData.js';

export class LevelSelectScreen {
  private selectedLevel = 0;

  update(input: InputManager): { screen: GameScreen | null; level?: number } {
    if (input.isKeyJustPressed('ArrowUp') || input.isKeyJustPressed('KeyW')) {
      this.selectedLevel = Math.max(0, this.selectedLevel - 1);
    }
    if (input.isKeyJustPressed('ArrowDown') || input.isKeyJustPressed('KeyS')) {
      this.selectedLevel = Math.min(FONT_LEVELS.length - 1, this.selectedLevel + 1);
    }
    if (input.isKeyJustPressed('Enter')) {
      // Only allow selection if unlocked
      if (FONT_LEVELS[this.selectedLevel].unlocked) {
        return { screen: 'game', level: this.selectedLevel };
      }
    }
    if (input.isKeyJustPressed('Escape')) {
      return { screen: 'menu' };
    }
    return { screen: null };
  }

  render(renderer: Renderer): void {
    renderer.clear('#000');

    // Title
    renderer.drawText('SELECT FONT LEVEL', 20, 2, '#0ff', 48);
    renderer.drawText('Fight through alphabet evolution cycles', 20, 4, '#888', 18);

    // Font level options
    const startY = 7;
    FONT_LEVELS.forEach((fontLevel, index) => {
      const y = startY + index * 2;
      const isSelected = index === this.selectedLevel;
      const isUnlocked = fontLevel.unlocked;

      let color = '#888';
      if (isUnlocked) {
        color = isSelected ? '#0ff' : '#fff';
      } else {
        color = '#444';
      }

      const prefix = isSelected ? '> ' : '  ';
      const lockIcon = isUnlocked ? '' : '🔒 ';
      const bossIcon = fontLevel.isBoss ? '👑 ' : '';

      renderer.drawText(
        `${prefix}${lockIcon}${bossIcon}${fontLevel.name}`,
        20,
        y,
        color,
        28
      );

      if (isUnlocked) {
        renderer.drawText(
          `Difficulty: ${fontLevel.difficulty} | HP: ×${fontLevel.enemyHealthMultiplier} | DMG: ×${fontLevel.enemyDamageMultiplier}`,
          25,
          y + 0.8,
          '#aaa',
          16
        );
      } else {
        renderer.drawText(
          'Complete previous level to unlock',
          25,
          y + 0.8,
          '#444',
          16
        );
      }
    });

    // Instructions
    renderer.drawText(
      'Arrow Keys / WASD: Select | Enter: Start | Escape: Back',
      20,
      20.5,
      '#666',
      16
    );
  }
}
