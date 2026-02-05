// Input handling system

export class InputManager {
  private keys: Set<string> = new Set();
  private keyCodes: Set<string> = new Set();
  private justPressed: Set<string> = new Set();
  private justPressedCodes: Set<string> = new Set();
  private mousePosition: { x: number; y: number } = { x: 0, y: 0 };
  private mousePressed: boolean = false;
  private mouseJustPressed: boolean = false;
  private mouseJustReleased: boolean = false;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    window.addEventListener('keydown', (e) => {
      // Store both key and code
      if (!this.keys.has(e.key)) {
        this.justPressed.add(e.key);
      }
      if (!this.keyCodes.has(e.code)) {
        this.justPressedCodes.add(e.code);
      }
      this.keys.add(e.key);
      this.keyCodes.add(e.code);
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key);
      this.keyCodes.delete(e.code);
    });

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mousePosition.x = e.clientX - rect.left;
      this.mousePosition.y = e.clientY - rect.top;
    });

    canvas.addEventListener('mousedown', () => {
      this.mousePressed = true;
      this.mouseJustPressed = true;
    });

    canvas.addEventListener('mouseup', () => {
      this.mousePressed = false;
      this.mouseJustReleased = true;
    });
  }

  isKeyDown(key: string): boolean {
    return this.keys.has(key) || this.keyCodes.has(key);
  }

  wasKeyJustPressed(key: string): boolean {
    return this.justPressed.has(key) || this.justPressedCodes.has(key);
  }

  // Alias for consistency with new code
  isKeyJustPressed(key: string): boolean {
    return this.justPressed.has(key) || this.justPressedCodes.has(key);
  }

  clearJustPressed(): void {
    this.justPressed.clear();
    this.justPressedCodes.clear();
    this.mouseJustPressed = false;
    this.mouseJustReleased = false;
  }

  getMousePosition(): { x: number; y: number } {
    return { ...this.mousePosition };
  }

  isMousePressed(): boolean {
    return this.mousePressed;
  }

  isMouseJustPressed(): boolean {
    return this.mouseJustPressed;
  }

  isMouseJustReleased(): boolean {
    return this.mouseJustReleased;
  }
}
