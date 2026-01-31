// Game over screen

import { Renderer } from '../renderer.js';
import { InputManager } from '../input.js';
import { GameScreen } from '../types.js';

export class GameOverScreen {
  private score: number;

  constructor(score: number) {
    this.score = score;
  }

  update(input: InputManager): GameScreen | null {
    if (input.wasKeyJustPressed('Enter')) {
      return 'menu';
    }
    return null;
  }

  render(renderer: Renderer): void {
    renderer.clear();

    // Game over text
    renderer.drawText('GAME OVER', renderer.canvas.width / 2, 200, 64, '#f44', 'center');
    renderer.drawText(`Final Score: ${this.score}`, renderer.canvas.width / 2, 300, 32, '#fff', 'center');

    // Instructions
    renderer.drawText('Press Enter to return to menu', renderer.canvas.width / 2, 400, 24, '#888', 'center');
  }
}
