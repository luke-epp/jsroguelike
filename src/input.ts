// Input handling system

export class InputManager {
  private keys: Set<string> = new Set();
  private justPressed: Set<string> = new Set();
  private mousePosition: { x: number; y: number } = { x: 0, y: 0 };
  private mousePressed: boolean = false;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    window.addEventListener('keydown', (e) => {
      if (!this.keys.has(e.key)) {
        this.justPressed.add(e.key);
      }
      this.keys.add(e.key);
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key);
    });

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mousePosition.x = e.clientX - rect.left;
      this.mousePosition.y = e.clientY - rect.top;
    });

    canvas.addEventListener('mousedown', () => {
      this.mousePressed = true;
    });

    canvas.addEventListener('mouseup', () => {
      this.mousePressed = false;
    });
  }

  isKeyDown(key: string): boolean {
    return this.keys.has(key);
  }

  wasKeyJustPressed(key: string): boolean {
    return this.justPressed.has(key);
  }

  clearJustPressed(): void {
    this.justPressed.clear();
  }

  getMousePosition(): { x: number; y: number } {
    return { ...this.mousePosition };
  }

  isMousePressed(): boolean {
    return this.mousePressed;
  }
}
