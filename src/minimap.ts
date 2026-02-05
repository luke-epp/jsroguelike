// Minimap system for navigation

import { Position, LetterEnemy, WorldItem, MathConstant } from './types.js';

export class Minimap {
  private width = 150;
  private height = 150;
  private worldWidth: number;
  private worldHeight: number;
  private padding = 10;

  constructor(worldWidth: number, worldHeight: number) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
  }

  render(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    playerPos: Position,
    enemies: LetterEnemy[],
    items: WorldItem[]
  ): void {
    const x = canvasWidth - this.width - this.padding;
    const y = this.padding;

    ctx.save();

    // Background - much darker and more opaque for better contrast
    ctx.fillStyle = 'rgba(10, 10, 20, 0.95)';
    ctx.fillRect(x, y, this.width, this.height);

    // Inner shadow for depth
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 2, y + 2, this.width - 4, this.height - 4);

    // Bright border
    ctx.strokeStyle = '#4af';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, this.width, this.height);

    // Scale factor
    const scaleX = this.width / this.worldWidth;
    const scaleY = this.height / this.worldHeight;

    // Draw items - larger and brighter
    for (const item of items) {
      const dotX = x + item.position.x * scaleX;
      const dotY = y + item.position.y * scaleY;

      const color = this.getItemColor(item);

      // Glow effect
      ctx.shadowBlur = 4;
      ctx.shadowColor = color;
      ctx.fillStyle = color;
      ctx.fillRect(dotX - 2, dotY - 2, 4, 4);
      ctx.shadowBlur = 0;
    }

    // Draw enemies - larger and more visible
    for (const enemy of enemies) {
      const dotX = x + enemy.position.x * scaleX;
      const dotY = y + enemy.position.y * scaleY;

      const color = enemy.isElite ? '#f4f' : '#f66';

      // Glow effect
      ctx.shadowBlur = 3;
      ctx.shadowColor = color;
      ctx.fillStyle = color;
      ctx.fillRect(dotX - 1.5, dotY - 1.5, 3, 3);
      ctx.shadowBlur = 0;
    }

    // Draw player - very bright and prominent
    const playerX = x + playerPos.x * scaleX;
    const playerY = y + playerPos.y * scaleY;

    // Outer glow
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#0ff';

    ctx.fillStyle = '#0ff';
    ctx.beginPath();
    ctx.arc(playerX, playerY, 5, 0, Math.PI * 2);
    ctx.fill();

    // White center for extra visibility
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(playerX, playerY, 2, 0, Math.PI * 2);
    ctx.fill();

    // Label
    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MAP', x + this.width / 2, y - 2);

    ctx.restore();
  }

  private getItemColor(item: WorldItem): string {
    if (item.itemType === 'equalSign') return '#ff0'; // Bright yellow
    if (item.itemType === 'operator') return '#6af'; // Bright blue
    if (item.itemType === 'lootBox') return '#fa4'; // Bright orange

    // Constants by rarity - brighter colors
    const constant = item.data as MathConstant;
    if (!constant) return '#fff';

    const rarityColors: Record<string, string> = {
      'common': '#4f4',      // Bright green
      'uncommon': '#4ff',    // Bright cyan
      'rare': '#f4f',        // Bright magenta
      'legendary': '#fa4'    // Bright orange-gold
    };
    return rarityColors[constant.rarity] || '#fff';
  }
}
