// Main menu screen with math-themed story

import { Renderer } from '../renderer.js';
import { InputManager } from '../input.js';
import { GameScreen } from '../types.js';

export class MenuScreen {
  private selectedOption = 0;
  private options = ['Start Game', 'Exit'];

  update(input: InputManager): GameScreen | null {
    if (input.isKeyJustPressed('ArrowUp') || input.isKeyJustPressed('KeyW')) {
      this.selectedOption = Math.max(0, this.selectedOption - 1);
    }
    if (input.isKeyJustPressed('ArrowDown') || input.isKeyJustPressed('KeyS')) {
      this.selectedOption = Math.min(this.options.length - 1, this.selectedOption + 1);
    }
    if (input.isKeyJustPressed('Enter')) {
      if (this.selectedOption === 0) {
        return 'levelSelect'; // Skip character select, go directly to level select
      }
    }
    return null;
  }

  render(renderer: Renderer): void {
    renderer.clear('#0a0a0a');

    const centerX = renderer.canvas.width / 2;

    // Title with decorative elements
    renderer.ctx.save();
    renderer.ctx.fillStyle = '#0ff';
    renderer.ctx.font = 'bold 72px monospace';
    renderer.ctx.textAlign = 'center';
    renderer.ctx.textBaseline = 'middle';

    // Add glow to title
    renderer.ctx.shadowBlur = 20;
    renderer.ctx.shadowColor = '#0ff';
    renderer.ctx.fillText('⚡ MATHEMANCY ⚡', centerX, 150);
    renderer.ctx.restore();

    // Story hook (single line)
    renderer.ctx.save();
    renderer.ctx.fillStyle = '#fff';
    renderer.ctx.font = '24px monospace';
    renderer.ctx.textAlign = 'center';
    renderer.ctx.fillText('"1" lost "2" to the alphabet...', centerX, 240);
    renderer.ctx.restore();

    // Menu options (centered)
    const startY = 350;
    this.options.forEach((option, index) => {
      const y = startY + index * 60;
      const color = index === this.selectedOption ? '#0ff' : '#888';
      const prefix = index === this.selectedOption ? '▸ ' : '  ';

      renderer.ctx.save();
      renderer.ctx.fillStyle = color;
      renderer.ctx.font = index === this.selectedOption ? 'bold 36px monospace' : '32px monospace';
      renderer.ctx.textAlign = 'center';

      // Glow on selected
      if (index === this.selectedOption) {
        renderer.ctx.shadowBlur = 15;
        renderer.ctx.shadowColor = '#0ff';
      }

      renderer.ctx.fillText(prefix + option, centerX, y);
      renderer.ctx.restore();
    });

    // Instructions at bottom
    renderer.ctx.save();
    renderer.ctx.fillStyle = '#444';
    renderer.ctx.font = '16px monospace';
    renderer.ctx.textAlign = 'center';
    renderer.ctx.fillText('[Press Enter to Begin]', centerX, renderer.canvas.height - 40);
    renderer.ctx.restore();

    // Version/credit
    renderer.ctx.save();
    renderer.ctx.fillStyle = '#333';
    renderer.ctx.font = '12px monospace';
    renderer.ctx.textAlign = 'right';
    renderer.ctx.fillText('v1.0.0', renderer.canvas.width - 10, renderer.canvas.height - 10);
    renderer.ctx.restore();
  }
}
