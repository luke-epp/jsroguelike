// Character selection screen

import { Renderer } from '../renderer.js';
import { InputManager } from '../input.js';
import { GameScreen } from '../types.js';
import { CHARACTERS } from '../gameData.js';

export class CharacterSelectScreen {
  private selectedCharacter = 0;

  update(input: InputManager): { screen: GameScreen | null; characterIndex?: number } {
    if (input.wasKeyJustPressed('ArrowLeft')) {
      this.selectedCharacter = Math.max(0, this.selectedCharacter - 1);
    }
    if (input.wasKeyJustPressed('ArrowRight')) {
      this.selectedCharacter = Math.min(CHARACTERS.length - 1, this.selectedCharacter + 1);
    }
    if (input.wasKeyJustPressed('Enter')) {
      return { screen: 'levelSelect', characterIndex: this.selectedCharacter };
    }
    if (input.wasKeyJustPressed('Escape')) {
      return { screen: 'menu' };
    }
    return { screen: null };
  }

  render(renderer: Renderer): void {
    renderer.clear();

    // Title
    renderer.drawText('SELECT YOUR CHARACTER', renderer.canvas.width / 2, 100, 36, '#ff0', 'center');

    // Character options
    const startX = 200;
    const spacing = 300;
    CHARACTERS.forEach((char, index) => {
      const x = startX + index * spacing;
      const y = 250;
      const isSelected = index === this.selectedCharacter;

      // Background
      if (isSelected) {
        renderer.drawRect(x - 10, y - 10, 220, 250, '#333');
        renderer.drawRectOutline(x - 10, y - 10, 220, 250, '#0ff', 3);
      }

      // Character sprite
      renderer.drawText(char.sprite, x + 100, y, 64, char.color, 'center');

      // Character name
      renderer.drawText(char.name, x + 100, y + 80, 24, '#fff', 'center');

      // Stats
      renderer.drawText(`STR: ${char.stats.strength}`, x + 100, y + 120, 16, '#fff', 'center');
      renderer.drawText(`DEF: ${char.stats.defense}`, x + 100, y + 145, 16, '#fff', 'center');
      renderer.drawText(`SPD: ${char.stats.speed}`, x + 100, y + 170, 16, '#fff', 'center');
    });

    // Instructions
    renderer.drawText('Arrow Keys: Select | Enter: Confirm | Escape: Back', renderer.canvas.width / 2, renderer.canvas.height - 50, 16, '#888', 'center');
  }
}
