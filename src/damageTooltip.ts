// Damage tooltip system for visual feedback

import { Position } from './types.js';

export interface DamageTooltip {
  id: string;
  position: Position;
  velocity: { x: number; y: number };
  damage: number;
  color: string;
  lifetime: number;
  maxLifetime: number;
  alpha: number;
}

export class DamageTooltipManager {
  private tooltips: DamageTooltip[] = [];
  private nextId = 0;
  private maxTooltips = 50; // Cap to prevent performance issues

  spawn(position: Position, damage: number, color: string = '#ff0'): void {
    // Remove oldest if at cap
    if (this.tooltips.length >= this.maxTooltips) {
      this.tooltips.shift();
    }

    const tooltip: DamageTooltip = {
      id: `tooltip_${this.nextId++}`,
      position: { x: position.x, y: position.y },
      velocity: {
        x: (Math.random() - 0.5) * 20, // Small horizontal variance
        y: -80 // Float upward
      },
      damage: Math.round(damage),
      color,
      lifetime: 1000, // 1 second
      maxLifetime: 1000,
      alpha: 1.0
    };

    this.tooltips.push(tooltip);
  }

  update(deltaTime: number): void {
    const dt = deltaTime / 1000;

    for (let i = this.tooltips.length - 1; i >= 0; i--) {
      const tooltip = this.tooltips[i];

      // Update position
      tooltip.position.x += tooltip.velocity.x * dt;
      tooltip.position.y += tooltip.velocity.y * dt;

      // Update lifetime and alpha
      tooltip.lifetime -= deltaTime;
      tooltip.alpha = Math.max(0, tooltip.lifetime / tooltip.maxLifetime);

      // Remove if dead
      if (tooltip.lifetime <= 0) {
        this.tooltips.splice(i, 1);
      }
    }
  }

  getTooltips(): DamageTooltip[] {
    return this.tooltips;
  }

  clear(): void {
    this.tooltips = [];
  }
}
