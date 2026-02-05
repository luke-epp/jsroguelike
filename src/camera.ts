// Camera system for following the player

import { Position } from './types.js';

export class Camera {
  public x: number = 0;
  public y: number = 0;
  private viewportWidth: number;
  private viewportHeight: number;
  private worldWidth: number;
  private worldHeight: number;

  constructor(viewportWidth: number, viewportHeight: number, worldWidth: number, worldHeight: number) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
  }

  // Update camera to follow target (player)
  follow(target: Position): void {
    // Center camera on target (no clamping for wraparound world)
    this.x = target.x - this.viewportWidth / 2;
    this.y = target.y - this.viewportHeight / 2;
  }

  // Convert world coordinates to screen coordinates
  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: worldX - this.x,
      y: worldY - this.y
    };
  }

  // Convert screen coordinates to world coordinates
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: screenX + this.x,
      y: screenY + this.y
    };
  }

  // Check if a world position is visible on screen
  isVisible(worldX: number, worldY: number, radius: number = 0): boolean {
    return (
      worldX + radius >= this.x &&
      worldX - radius <= this.x + this.viewportWidth &&
      worldY + radius >= this.y &&
      worldY - radius <= this.y + this.viewportHeight
    );
  }
}
