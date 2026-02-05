// Rendering system

import { Camera } from './camera.js';

export class Renderer {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  public readonly tileSize = 32;
  public readonly width: number;
  public readonly height: number;
  public camera: Camera | null = null;

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    console.log('Renderer constructor called', { canvas, width, height });
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = width;
    this.height = height;

    this.canvas.width = width * this.tileSize;
    this.canvas.height = height * this.tileSize;
    console.log('Canvas sized to:', this.canvas.width, 'x', this.canvas.height);
  }

  setCamera(camera: Camera | null): void {
    this.camera = camera;
  }

  clear(color: string = '#000'): void {
    console.log('Renderer.clear() called');
    // Background gradient
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#0a0a15');
    gradient.addColorStop(1, '#050508');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Subtle grid pattern
    if (this.camera) {
      this.ctx.save();
      this.ctx.strokeStyle = 'rgba(100, 100, 150, 0.05)';
      this.ctx.lineWidth = 1;

      const gridSize = 100;
      const offsetX = -this.camera.x % gridSize;
      const offsetY = -this.camera.y % gridSize;

      // Vertical lines
      for (let x = offsetX; x < this.canvas.width; x += gridSize) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, this.canvas.height);
        this.ctx.stroke();
      }

      // Horizontal lines
      for (let y = offsetY; y < this.canvas.height; y += gridSize) {
        this.ctx.beginPath();
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(this.canvas.width, y);
        this.ctx.stroke();
      }

      this.ctx.restore();
    }

    // Starfield effect
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(200, 200, 255, 0.6)';
    for (let i = 0; i < 50; i++) {
      const x = (i * 137.5) % this.canvas.width;
      const y = (i * 241.3) % this.canvas.height;
      const size = (i % 3) + 1;
      this.ctx.fillRect(x, y, size, size);
    }
    this.ctx.restore();
  }

  drawTile(x: number, y: number, sprite: string, color: string): void {
    const pixelX = x * this.tileSize;
    const pixelY = y * this.tileSize;

    this.ctx.fillStyle = color;
    this.ctx.fillRect(pixelX, pixelY, this.tileSize, this.tileSize);

    this.ctx.fillStyle = '#fff';
    this.ctx.font = `${this.tileSize - 4}px monospace`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(sprite, pixelX + this.tileSize / 2, pixelY + this.tileSize / 2);
  }

  // Unified drawText with overloaded signatures
  drawText(text: string, x: number, y: number, sizeOrColor: number | string = 24, colorOrSize: string | number = '#fff', align: CanvasTextAlign = 'left'): void {
    let size: number;
    let color: string;
    let pixelY: number;

    // Determine which signature is being used
    if (typeof sizeOrColor === 'number') {
      // Old signature: (text, x, y, size, color, align)
      size = sizeOrColor;
      color = colorOrSize as string;
      pixelY = y; // y is already in pixels
    } else {
      // New signature: (text, x, y, color, size, align)
      color = sizeOrColor;
      size = colorOrSize as number;
      pixelY = y * this.tileSize; // y is in tile rows
    }

    this.ctx.fillStyle = color;
    this.ctx.font = `${size}px monospace`;
    this.ctx.textAlign = align;
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(text, x, pixelY);
  }

  drawStyledText(text: string, x: number, y: number, style: 'normal' | 'bold' | 'underlined' | 'italic', color: string, size: number = 24): void {
    const pixelY = y * this.tileSize;
    this.ctx.fillStyle = color;

    let fontStyle = '';
    if (style === 'bold') fontStyle = 'bold ';
    if (style === 'italic') fontStyle = 'italic ';

    this.ctx.font = `${fontStyle}${size}px monospace`;
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(text, x, pixelY);

    if (style === 'underlined') {
      const metrics = this.ctx.measureText(text);
      this.ctx.beginPath();
      this.ctx.moveTo(x, pixelY + size / 2);
      this.ctx.lineTo(x + metrics.width, pixelY + size / 2);
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }
  }

  drawAura(x: number, y: number, radius: number, color: string, alpha: number): void {
    const screen = this.worldToScreen(x, y);

    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  drawLaser(x1: number, y1: number, x2: number, y2: number, width: number, color: string): void {
    const screen1 = this.worldToScreen(x1, y1);
    const screen2 = this.worldToScreen(x2, y2);

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width;
    this.ctx.beginPath();
    this.ctx.moveTo(screen1.x, screen1.y);
    this.ctx.lineTo(screen2.x, screen2.y);
    this.ctx.stroke();
  }

  drawExplosion(x: number, y: number, radius: number, color: string): void {
    const screen = this.worldToScreen(x, y);

    // Draw explosion as expanding circle with gradient
    this.ctx.save();
    const gradient = this.ctx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  drawRect(x: number, y: number, width: number, height: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, width, height);
  }

  drawRectOutline(x: number, y: number, width: number, height: number, color: string, lineWidth: number = 2): void {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.strokeRect(x, y, width, height);
  }

  drawHealthBar(x: number, y: number, width: number, height: number, current: number, max: number): void {
    // Apply camera transform if camera is active
    let screenX = x;
    let screenY = y;
    if (this.camera) {
      const screen = this.camera.worldToScreen(x, y);
      screenX = screen.x;
      screenY = screen.y;
    }

    // Background
    this.ctx.fillStyle = '#333';
    this.ctx.fillRect(screenX, screenY, width, height);

    // Health
    const healthWidth = (current / max) * width;
    this.ctx.fillStyle = '#0f0';
    this.ctx.fillRect(screenX, screenY, healthWidth, height);

    // Border
    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(screenX, screenY, width, height);
  }

  // Apply camera transform to world coordinates
  private worldToScreen(x: number, y: number): { x: number; y: number } {
    if (this.camera) {
      return this.camera.worldToScreen(x, y);
    }
    return { x, y };
  }

  drawEntity(
    x: number,
    y: number,
    radius: number,
    sprite: string,
    color: string,
    options?: {
      bold?: boolean;
      italic?: boolean;
      underline?: boolean;
      glow?: boolean;
    }
  ): void {
    const screen = this.worldToScreen(x, y);

    this.ctx.save();

    // Enhanced glow effect for special entities
    if (options?.glow) {
      this.ctx.shadowBlur = 30;
      this.ctx.shadowColor = color;

      // Double glow layer
      this.ctx.fillStyle = color;
      this.ctx.globalAlpha = 0.3;
      this.ctx.beginPath();
      this.ctx.arc(screen.x, screen.y, radius * 1.5, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.globalAlpha = 1.0;
    }

    // Draw filled circle background
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
    this.ctx.fill();

    // Add outer ring for styled enemies
    if (options?.bold || options?.italic || options?.underline) {
      this.ctx.strokeStyle = '#fff';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(screen.x, screen.y, radius + 3, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    // Build font string with styles - larger for styled enemies
    let fontStyle = '';
    if (options?.bold) fontStyle += 'bold ';
    if (options?.italic) fontStyle += 'italic ';
    const fontSize = (options?.bold || options?.italic || options?.underline)
      ? radius * 1.8
      : radius * 1.5;
    this.ctx.font = `${fontStyle}${fontSize}px monospace`;

    // Enhanced drop shadow for text
    this.ctx.shadowBlur = 6;
    this.ctx.shadowColor = '#000';
    this.ctx.shadowOffsetX = 3;
    this.ctx.shadowOffsetY = 3;

    // Draw sprite centered
    this.ctx.fillStyle = '#fff';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(sprite, screen.x, screen.y);

    // Enhanced underline effect
    if (options?.underline) {
      const metrics = this.ctx.measureText(sprite);
      this.ctx.shadowBlur = 0; // Disable shadow for underline
      this.ctx.strokeStyle = '#fff';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      const underlineY = screen.y + radius * 0.7;
      this.ctx.moveTo(screen.x - metrics.width / 2 - 5, underlineY);
      this.ctx.lineTo(screen.x + metrics.width / 2 + 5, underlineY);
      this.ctx.stroke();

      // Double underline for extra emphasis
      this.ctx.beginPath();
      this.ctx.moveTo(screen.x - metrics.width / 2 - 5, underlineY + 4);
      this.ctx.lineTo(screen.x + metrics.width / 2 + 5, underlineY + 4);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  drawProjectile(x: number, y: number, radius: number, color: string): void {
    const screen = this.worldToScreen(x, y);

    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
    this.ctx.fill();

    // Add glow effect for bullet-hell feel
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  drawObstacle(x: number, y: number, width: number, height: number, color: string, shape: 'rectangle' | 'circle', radius?: number): void {
    const screen = this.worldToScreen(x, y);

    this.ctx.fillStyle = color;

    if (shape === 'circle' && radius) {
      this.ctx.beginPath();
      this.ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
      this.ctx.fill();
      // Add border
      this.ctx.strokeStyle = '#666';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    } else {
      this.ctx.fillRect(screen.x - width / 2, screen.y - height / 2, width, height);
      // Add border
      this.ctx.strokeStyle = '#666';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(screen.x - width / 2, screen.y - height / 2, width, height);
    }
  }

  drawWaveTimer(timeRemaining: number, x: number, y: number): void {
    const seconds = Math.ceil(timeRemaining / 1000);
    const color = seconds <= 5 ? '#f00' : '#fff';
    this.ctx.fillStyle = color;
    this.ctx.font = '32px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(`${seconds}s`, x, y);
  }

  drawDamageTooltip(x: number, y: number, damage: number, color: string, alpha: number): void {
    const screen = this.worldToScreen(x, y);

    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = color;
    this.ctx.font = 'bold 20px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    // Text outline for visibility
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 3;
    this.ctx.strokeText(damage.toString(), screen.x, screen.y);
    this.ctx.fillText(damage.toString(), screen.x, screen.y);

    this.ctx.restore();
  }

  drawPickupNotification(x: number, y: number, text: string, color: string, alpha: number, scale: number): void {
    const screen = this.worldToScreen(x, y);

    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = color;

    const fontSize = Math.floor(18 * scale);
    this.ctx.font = `bold ${fontSize}px monospace`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    // Glow effect
    this.ctx.shadowBlur = 10 * scale;
    this.ctx.shadowColor = color;

    // Text outline for visibility
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 3;
    this.ctx.strokeText(text, screen.x, screen.y);
    this.ctx.fillText(text, screen.x, screen.y);

    this.ctx.restore();
  }
}
