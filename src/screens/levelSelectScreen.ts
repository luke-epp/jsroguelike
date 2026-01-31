// Level selection screen

import { Renderer } from '../renderer.js';
import { InputManager } from '../input.js';
import { GameScreen } from '../types.js';

export class LevelSelectScreen {
  private selectedLevel = 0;
  private levels = [
    { name: 'Wave 1', difficulty: 'Easy', duration: '30 seconds' },
    { name: 'Wave 2', difficulty: 'Medium', duration: '45 seconds' },
    { name: 'Wave 3', difficulty: 'Hard', duration: '60 seconds' },
  ];

  update(input: InputManager): { screen: GameScreen | null; level?: number } {
    if (input.wasKeyJustPressed('ArrowUp')) {
      this.selectedLevel = Math.max(0, this.selectedLevel - 1);
    }
    if (input.wasKeyJustPressed('ArrowDown')) {
      this.selectedLevel = Math.min(this.levels.length - 1, this.selectedLevel + 1);
    }
    if (input.wasKeyJustPressed('Enter')) {
      return { screen: 'game', level: this.selectedLevel + 1 };
    }
    if (input.wasKeyJustPressed('Escape')) {
      return { screen: 'characterSelect' };
    }
    return { screen: null };
  }

  render(renderer: Renderer): void {
    renderer.clear();

    // Title
    renderer.drawText('SELECT WAVE', renderer.canvas.width / 2, 100, 36, '#ff0', 'center');

    // Level options
    const startY = 250;
    this.levels.forEach((level, index) => {
      const y = startY + index * 100;
      const isSelected = index === this.selectedLevel;

      if (isSelected) {
        renderer.drawRect(300, y - 10, 680, 80, '#333');
        renderer.drawRectOutline(300, y - 10, 680, 80, '#0ff', 3);
      }

      const prefix = isSelected ? '> ' : '  ';
      renderer.drawText(prefix + level.name, 320, y, 28, isSelected ? '#0ff' : '#fff');
      renderer.drawText(`Difficulty: ${level.difficulty}`, 320, y + 35, 20, '#aaa');
      renderer.drawText(`Duration: ${level.duration}`, 600, y + 35, 20, '#aaa');
    });

    // Instructions
    renderer.drawText('Arrow Keys: Select | Enter: Start | Escape: Back', renderer.canvas.width / 2, renderer.canvas.height - 50, 16, '#888', 'center');
  }
}
