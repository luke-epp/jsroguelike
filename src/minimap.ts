// Minimap system for navigation

import { Position, LetterEnemy, WorldItem, MathConstant } from './types.js';

export class Minimap {
  private width = 250;
  private height = 250;
  private padding = 10;
  private viewRadius = 2000; // Show 2000 pixels around player in each direction

  constructor(worldWidth: number, worldHeight: number) {
    // Constructor kept for compatibility, but we use viewRadius instead
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

    // Calculate minimap view (centered on player, showing viewRadius in each direction)
    const viewWidth = this.viewRadius * 2;
    const viewHeight = this.viewRadius * 2;
    const scaleX = this.width / viewWidth;
    const scaleY = this.height / viewHeight;

    // Helper function to convert world position to minimap position
    const worldToMinimap = (worldPos: Position) => {
      const relativeX = worldPos.x - playerPos.x + this.viewRadius; // Center on player
      const relativeY = worldPos.y - playerPos.y + this.viewRadius;
      return {
        x: x + relativeX * scaleX,
        y: y + relativeY * scaleY
      };
    };

    // Draw items - larger and brighter
    for (const item of items) {
      const minimapPos = worldToMinimap(item.position);
      const dotX = minimapPos.x;
      const dotY = minimapPos.y;

      // Skip if outside minimap bounds
      if (dotX < x || dotX > x + this.width || dotY < y || dotY > y + this.height) {
        continue;
      }

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
      const minimapPos = worldToMinimap(enemy.position);
      const dotX = minimapPos.x;
      const dotY = minimapPos.y;

      // Skip if outside minimap bounds
      if (dotX < x || dotX > x + this.width || dotY < y || dotY > y + this.height) {
        continue;
      }

      const color = enemy.isElite ? '#f4f' : '#f66';

      // Glow effect
      ctx.shadowBlur = 3;
      ctx.shadowColor = color;
      ctx.fillStyle = color;
      ctx.fillRect(dotX - 1.5, dotY - 1.5, 3, 3);
      ctx.shadowBlur = 0;
    }

    // Draw player - very bright and prominent (always centered)
    const playerX = x + this.width / 2;
    const playerY = y + this.height / 2;

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
