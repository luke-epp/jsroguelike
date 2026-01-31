// Level up / build selection screen

import { Renderer } from '../renderer.js';
import { InputManager } from '../input.js';
import { GameScreen, Player, LevelUpOption } from '../types.js';
import { getRandomLevelUpOptions } from '../gameData.js';

export class LevelUpScreen {
  private options: LevelUpOption[];
  private selectedOption = 0;
  private player: Player;

  constructor(player: Player) {
    this.player = player;
    this.options = getRandomLevelUpOptions(3);
  }

  update(input: InputManager): { screen: GameScreen | null; applied: boolean } {
    if (input.wasKeyJustPressed('ArrowLeft')) {
      this.selectedOption = Math.max(0, this.selectedOption - 1);
    }
    if (input.wasKeyJustPressed('ArrowRight')) {
      this.selectedOption = Math.min(this.options.length - 1, this.selectedOption + 1);
    }
    if (input.wasKeyJustPressed('Enter')) {
      this.options[this.selectedOption].apply(this.player);
      return { screen: 'levelSelect', applied: true };
    }
    return { screen: null, applied: false };
  }

  render(renderer: Renderer): void {
    renderer.clear();

    // Title
    renderer.drawText('WAVE COMPLETE!', renderer.canvas.width / 2, 80, 48, '#0f0', 'center');
    renderer.drawText('Choose your reward:', renderer.canvas.width / 2, 140, 24, '#fff', 'center');

    // Options
    const startX = 150;
    const spacing = 350;
    this.options.forEach((option, index) => {
      const x = startX + index * spacing;
      const y = 250;
      const isSelected = index === this.selectedOption;

      // Background
      if (isSelected) {
        renderer.drawRect(x - 10, y - 10, 320, 200, '#333');
        renderer.drawRectOutline(x - 10, y - 10, 320, 200, '#0f0', 4);
      } else {
        renderer.drawRect(x - 10, y - 10, 320, 200, '#1a1a1a');
        renderer.drawRectOutline(x - 10, y - 10, 320, 200, '#555', 2);
      }

      // Option details
      renderer.drawText(option.name, x + 150, y + 20, 20, isSelected ? '#0f0' : '#fff', 'center');
      renderer.drawText(option.description, x + 150, y + 80, 18, '#aaa', 'center');
    });

    // Player stats display
    const statsY = 500;
    renderer.drawText('Current Stats:', renderer.canvas.width / 2, statsY, 24, '#ff0', 'center');
    renderer.drawText(`Level: ${this.player.level}`, renderer.canvas.width / 2 - 200, statsY + 40, 20, '#fff');
    renderer.drawText(`Health: ${this.player.health}/${this.player.maxHealth}`, renderer.canvas.width / 2 - 200, statsY + 70, 20, '#fff');
    renderer.drawText(`STR: ${this.player.stats.strength}`, renderer.canvas.width / 2 + 50, statsY + 40, 20, '#fff');
    renderer.drawText(`DEF: ${this.player.stats.defense}`, renderer.canvas.width / 2 + 50, statsY + 70, 20, '#fff');
    renderer.drawText(`SPD: ${this.player.stats.speed}`, renderer.canvas.width / 2 + 200, statsY + 40, 20, '#fff');

    // Instructions
    renderer.drawText('Arrow Keys: Select | Enter: Confirm', renderer.canvas.width / 2, renderer.canvas.height - 50, 16, '#888', 'center');
  }
}
