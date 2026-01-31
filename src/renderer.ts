// Rendering system

export class Renderer {
  public canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  public readonly tileSize = 32;
  public readonly width: number;
  public readonly height: number;

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

  clear(): void {
    console.log('Renderer.clear() called');
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
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

  drawText(text: string, x: number, y: number, size: number = 24, color: string = '#fff', align: CanvasTextAlign = 'left'): void {
    this.ctx.fillStyle = color;
    this.ctx.font = `${size}px monospace`;
    this.ctx.textAlign = align;
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(text, x, y);
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
    // Background
    this.drawRect(x, y, width, height, '#333');

    // Health
    const healthWidth = (current / max) * width;
    this.drawRect(x, y, healthWidth, height, '#0f0');

    // Border
    this.drawRectOutline(x, y, width, height, '#fff', 1);
  }

  drawEntity(x: number, y: number, radius: number, sprite: string, color: string): void {
    // Draw filled circle background
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();

    // Draw sprite centered
    this.ctx.fillStyle = '#fff';
    this.ctx.font = `${radius * 1.5}px monospace`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(sprite, x, y);
  }

  drawProjectile(x: number, y: number, radius: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();

    // Add glow effect for bullet-hell feel
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
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
}
