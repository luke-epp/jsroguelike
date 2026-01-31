// Main menu screen

import { Renderer } from '../renderer.js';
import { InputManager } from '../input.js';
import { GameScreen } from '../types.js';

export class MenuScreen {
  private selectedOption = 0;
  private options = ['Start Game', 'Options', 'Exit'];

  update(input: InputManager): GameScreen | null {
    if (input.wasKeyJustPressed('ArrowUp')) {
      this.selectedOption = Math.max(0, this.selectedOption - 1);
    }
    if (input.wasKeyJustPressed('ArrowDown')) {
      this.selectedOption = Math.min(this.options.length - 1, this.selectedOption + 1);
    }
    if (input.wasKeyJustPressed('Enter')) {
      if (this.selectedOption === 0) {
        return 'characterSelect';
      }
    }
    return null;
  }

  render(renderer: Renderer): void {
    console.log('MenuScreen.render() called');
    renderer.clear();

    // Title
    console.log('Drawing title text');
    renderer.drawText('ROGUELIKE ADVENTURE', renderer.canvas.width / 2, 100, 48, '#ff0', 'center');

    // Menu options
    const startY = 300;
    this.options.forEach((option, index) => {
      const y = startY + index * 60;
      const color = index === this.selectedOption ? '#0ff' : '#fff';
      const prefix = index === this.selectedOption ? '> ' : '  ';
      renderer.drawText(prefix + option, renderer.canvas.width / 2, y, 32, color, 'center');
    });

    // Instructions
    renderer.drawText('Use Arrow Keys to navigate, Enter to select', renderer.canvas.width / 2, renderer.canvas.height - 50, 16, '#888', 'center');
  }
}
