// New Equation Builder with Drag & Drop and Multiple Weapon Slots

import { Renderer } from '../renderer.js';
import { InputManager } from '../input.js';
import { Player, GameScreen, EquationComponent, MathConstant, MathOperator, WeaponInstance } from '../types.js';
import { evaluateEquation, determineWeaponType, createWeaponFromEquation } from '../equationSystem.js';
import { getWeaponColor } from '../weaponColors.js';

interface DragState {
  isDragging: boolean;
  item: EquationComponent | null;
  itemIndex: number;
  itemType: 'constant' | 'operator';
  startX: number;
  startY: number;
}

interface WeaponSlot {
  id: number;
  equation: EquationComponent[];
  weapon: WeaponInstance | null;
}

export class EquationBuilderScreenNew {
  private weaponSlots: WeaponSlot[] = [];
  private maxSlots = 6;
  private dragState: DragState = {
    isDragging: false,
    item: null,
    itemIndex: -1,
    itemType: 'constant',
    startX: 0,
    startY: 0
  };
  private message: string = '';
  private messageTimer = 0;
  private hoveredSlot: number = -1;

  constructor(private player: Player) {
    // Initialize weapon slots
    for (let i = 0; i < this.maxSlots; i++) {
      this.weaponSlots.push({
        id: i,
        equation: [],
        weapon: null
      });
    }

    // Load existing weapons into slots
    for (let i = 0; i < this.player.currentWeapons.length && i < this.maxSlots; i++) {
      this.weaponSlots[i].weapon = this.player.currentWeapons[i];
      // Note: We don't have the original equation, so weapon stays but equation is empty
    }
  }

  update(input: InputManager): GameScreen | null {
    this.messageTimer = Math.max(0, this.messageTimer - 16);

    // Escape to return to game
    if (input.isKeyJustPressed('Escape')) {
      this.saveWeaponsToPlayer();
      return 'game';
    }

    const mouse = input.getMousePosition();

    // Clear button (Delete key)
    if (input.isKeyJustPressed('Delete') || input.isKeyJustPressed('KeyC')) {
      const slotIdx = this.hoveredSlot;
      if (slotIdx >= 0) {
        this.clearSlot(slotIdx);
      }
    }

    // Start drag
    if (input.isMouseJustPressed() && !this.dragState.isDragging) {
      this.tryStartDrag(mouse.x, mouse.y);
    }

    // End drag
    if (input.isMouseJustReleased() && this.dragState.isDragging) {
      this.tryEndDrag(mouse.x, mouse.y);
    }

    // Update hovered slot
    this.hoveredSlot = this.getSlotAtPosition(mouse.x, mouse.y);

    return null;
  }

  private clearSlot(slotIdx: number): void {
    const slot = this.weaponSlots[slotIdx];

    // Return all items to inventory
    for (const component of slot.equation) {
      if ('value' in component) {
        this.player.inventory.constants.push(component as MathConstant);
      } else {
        this.player.inventory.operators.push(component as MathOperator);
      }
    }

    // Return equal sign if weapon was created
    if (slot.weapon) {
      this.player.inventory.equalSigns++;
    }

    // Clear slot
    slot.equation = [];
    slot.weapon = null;

    this.showMessage(`Slot ${slotIdx + 1} cleared`);
  }

  private tryStartDrag(x: number, y: number): void {
    // Check if clicking on inventory item
    const inventoryY = 500;
    const inventoryX = 50;

    // Check constants
    for (let i = 0; i < this.player.inventory.constants.length; i++) {
      const itemY = inventoryY + i * 30;
      if (x >= inventoryX && x <= inventoryX + 400 && y >= itemY && y <= itemY + 25) {
        this.dragState = {
          isDragging: true,
          item: this.player.inventory.constants[i],
          itemIndex: i,
          itemType: 'constant',
          startX: x,
          startY: y
        };
        return;
      }
    }

    // Check operators
    const operatorX = 500;
    for (let i = 0; i < this.player.inventory.operators.length; i++) {
      const itemY = inventoryY + i * 30;
      if (x >= operatorX && x <= operatorX + 400 && y >= itemY && y <= itemY + 25) {
        this.dragState = {
          isDragging: true,
          item: this.player.inventory.operators[i],
          itemIndex: i,
          itemType: 'operator',
          startX: x,
          startY: y
        };
        return;
      }
    }

    // Check weapon slot items (for removing)
    const slotY = 150;
    const slotHeight = 50;
    for (let slotIdx = 0; slotIdx < this.weaponSlots.length; slotIdx++) {
      const slot = this.weaponSlots[slotIdx];
      const slotX = 50 + (slotIdx % 3) * 400;
      const slotYPos = slotY + Math.floor(slotIdx / 3) * 120;

      // Check each item in equation
      for (let i = 0; i < slot.equation.length; i++) {
        const itemX = slotX + 10 + i * 35;
        if (x >= itemX && x <= itemX + 30 && y >= slotYPos + 25 && y <= slotYPos + 50) {
          // Remove from slot and start dragging
          const item = slot.equation[i];
          slot.equation.splice(i, 1);
          this.updateWeaponForSlot(slotIdx);

          this.dragState = {
            isDragging: true,
            item: item,
            itemIndex: -1, // Not from inventory
            itemType: 'value' in item ? 'constant' : 'operator',
            startX: x,
            startY: y
          };
          return;
        }
      }
    }
  }

  private tryEndDrag(x: number, y: number): void {
    if (!this.dragState.item) {
      this.dragState.isDragging = false;
      return;
    }

    const slotIdx = this.getSlotAtPosition(x, y);

    if (slotIdx >= 0) {
      // Drop into weapon slot
      const slot = this.weaponSlots[slotIdx];
      slot.equation.push(this.dragState.item);

      // Remove from inventory if it was from inventory
      if (this.dragState.itemIndex >= 0) {
        if (this.dragState.itemType === 'constant') {
          this.player.inventory.constants.splice(this.dragState.itemIndex, 1);
        } else {
          this.player.inventory.operators.splice(this.dragState.itemIndex, 1);
        }
      }

      this.updateWeaponForSlot(slotIdx);
      this.showMessage('Added to slot ' + (slotIdx + 1));
    } else {
      // Return to inventory if dragged from inventory
      if (this.dragState.itemIndex >= 0) {
        // Do nothing, it's still in inventory
      } else {
        // Return to inventory if removed from slot
        if (this.dragState.itemType === 'constant') {
          this.player.inventory.constants.push(this.dragState.item as MathConstant);
        } else {
          this.player.inventory.operators.push(this.dragState.item as MathOperator);
        }
      }
      this.showMessage('Returned to inventory');
    }

    this.dragState.isDragging = false;
    this.dragState.item = null;
  }

  private getSlotAtPosition(x: number, y: number): number {
    const slotY = 150;
    const slotHeight = 50;
    const slotSpacing = 120;

    for (let i = 0; i < this.weaponSlots.length; i++) {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const slotX = 50 + col * 400;
      const slotYPos = slotY + row * slotSpacing;

      if (x >= slotX && x <= slotX + 380 && y >= slotYPos && y <= slotYPos + slotHeight) {
        return i;
      }
    }
    return -1;
  }

  private updateWeaponForSlot(slotIdx: number): void {
    const slot = this.weaponSlots[slotIdx];

    if (slot.equation.length === 0) {
      slot.weapon = null;
      return;
    }

    const evaluated = evaluateEquation(slot.equation);
    const weaponType = determineWeaponType(evaluated);

    if (weaponType && this.player.inventory.equalSigns > 0) {
      // Create or update weapon
      const equation = {
        components: [...slot.equation],
        evaluatedValue: evaluated
      };

      if (!slot.weapon) {
        // New weapon - consume equal sign
        this.player.inventory.equalSigns--;
        slot.weapon = createWeaponFromEquation(equation, weaponType);
        this.showMessage(`Created ${weaponType} weapon!`);
      } else {
        // Update existing weapon
        slot.weapon.equation = equation;
        slot.weapon.type = weaponType;
        slot.weapon.baseDamage = Math.floor(evaluated * 2);
      }
    }
  }

  private saveWeaponsToPlayer(): void {
    this.player.currentWeapons = this.weaponSlots
      .filter(slot => slot.weapon !== null)
      .map(slot => slot.weapon!);
  }

  private showMessage(msg: string): void {
    this.message = msg;
    this.messageTimer = 2000;
  }

  render(renderer: Renderer): void {
    renderer.clear('#111');

    const centerX = renderer.canvas.width / 2;

    // Title
    renderer.ctx.save();
    renderer.ctx.fillStyle = '#0ff';
    renderer.ctx.font = 'bold 40px monospace';
    renderer.ctx.textAlign = 'center';
    renderer.ctx.shadowBlur = 15;
    renderer.ctx.shadowColor = '#0ff';
    renderer.ctx.fillText('WEAPON FORGE', centerX, 40);
    renderer.ctx.restore();

    // Instructions
    renderer.ctx.save();
    renderer.ctx.fillStyle = '#888';
    renderer.ctx.font = '14px monospace';
    renderer.ctx.textAlign = 'center';
    renderer.ctx.fillText('Drag items to weapon slots | Hover + DELETE/C to clear slot | ESC to save & return', centerX, 70);
    renderer.ctx.restore();

    // Equal signs
    renderer.ctx.save();
    renderer.ctx.fillStyle = '#ff0';
    renderer.ctx.font = 'bold 18px monospace';
    renderer.ctx.textAlign = 'center';
    renderer.ctx.fillText(`Equal Signs: ${this.player.inventory.equalSigns}`, centerX, 100);
    renderer.ctx.restore();

    // Weapon slots
    this.renderWeaponSlots(renderer);

    // Inventory
    this.renderInventory(renderer);

    // Dragged item
    if (this.dragState.isDragging && this.dragState.item) {
      const mouse = renderer.ctx.canvas;
      this.renderDraggedItem(renderer);
    }

    // Message
    if (this.messageTimer > 0) {
      renderer.ctx.save();
      renderer.ctx.fillStyle = '#ff0';
      renderer.ctx.font = 'bold 20px monospace';
      renderer.ctx.textAlign = 'center';
      renderer.ctx.fillText(this.message, centerX, renderer.canvas.height - 30);
      renderer.ctx.restore();
    }
  }

  private renderWeaponSlots(renderer: Renderer): void {
    const slotY = 150;
    const slotWidth = 380;
    const slotHeight = 50;

    for (let i = 0; i < this.weaponSlots.length; i++) {
      const slot = this.weaponSlots[i];
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 50 + col * 400;
      const y = slotY + row * 120;

      const isHovered = this.hoveredSlot === i;

      // Slot background
      renderer.ctx.save();
      renderer.ctx.fillStyle = isHovered ? 'rgba(0, 255, 255, 0.1)' : 'rgba(100, 100, 100, 0.2)';
      renderer.ctx.fillRect(x, y, slotWidth, slotHeight);
      renderer.ctx.strokeStyle = isHovered ? '#0ff' : '#666';
      renderer.ctx.lineWidth = 2;
      renderer.ctx.strokeRect(x, y, slotWidth, slotHeight);
      renderer.ctx.restore();

      // Slot number
      renderer.ctx.save();
      renderer.ctx.fillStyle = '#888';
      renderer.ctx.font = 'bold 14px monospace';
      renderer.ctx.textAlign = 'left';
      renderer.ctx.fillText(`#${i + 1}`, x + 5, y + 15);
      renderer.ctx.restore();

      // Equation components
      for (let j = 0; j < slot.equation.length; j++) {
        const component = slot.equation[j];
        const itemX = x + 10 + j * 35;
        const itemY = y + 25;

        renderer.ctx.save();
        renderer.ctx.fillStyle = '#444';
        renderer.ctx.fillRect(itemX, itemY, 30, 25);
        renderer.ctx.strokeStyle = '#888';
        renderer.ctx.strokeRect(itemX, itemY, 30, 25);

        renderer.ctx.fillStyle = (component as any).color || '#fff';
        renderer.ctx.font = 'bold 16px monospace';
        renderer.ctx.textAlign = 'center';
        renderer.ctx.textBaseline = 'middle';
        renderer.ctx.fillText((component as any).symbol, itemX + 15, itemY + 12);
        renderer.ctx.restore();
      }

      // Equation output - more prominent
      if (slot.equation.length > 0) {
        const evaluated = evaluateEquation(slot.equation);
        const weaponType = determineWeaponType(evaluated);

        // Output box
        renderer.ctx.save();
        renderer.ctx.fillStyle = weaponType ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 100, 100, 0.1)';
        renderer.ctx.fillRect(x + 5, y + slotHeight + 5, 120, 25);
        renderer.ctx.strokeStyle = weaponType ? '#0f0' : '#f88';
        renderer.ctx.lineWidth = 2;
        renderer.ctx.strokeRect(x + 5, y + slotHeight + 5, 120, 25);

        // Equals and result
        renderer.ctx.fillStyle = weaponType ? '#0f0' : '#f88';
        renderer.ctx.font = 'bold 18px monospace';
        renderer.ctx.textAlign = 'center';
        renderer.ctx.fillText(`= ${evaluated}`, x + 65, y + slotHeight + 22);
        renderer.ctx.restore();

        // Weapon info if valid
        if (slot.weapon) {
          const weaponColor = getWeaponColor(slot.weapon.type);
          renderer.ctx.save();
          renderer.ctx.fillStyle = weaponColor;
          renderer.ctx.font = 'bold 12px monospace';
          renderer.ctx.textAlign = 'left';
          renderer.ctx.fillText(
            `${slot.weapon.type} | Lv${slot.weapon.level} | ${slot.weapon.baseDamage} DMG`,
            x + 130,
            y + slotHeight + 22
          );
          renderer.ctx.restore();
        } else if (weaponType) {
          renderer.ctx.save();
          renderer.ctx.fillStyle = getWeaponColor(weaponType);
          renderer.ctx.font = '12px monospace';
          renderer.ctx.textAlign = 'left';
          renderer.ctx.fillText(`(${weaponType} - need =)`, x + 130, y + slotHeight + 22);
          renderer.ctx.restore();
        }
      }
    }
  }

  private renderInventory(renderer: Renderer): void {
    const inventoryY = 420;

    // Section title
    renderer.ctx.save();
    renderer.ctx.fillStyle = '#0ff';
    renderer.ctx.font = 'bold 20px monospace';
    renderer.ctx.textAlign = 'left';
    renderer.ctx.fillText('INVENTORY - Drag to Weapon Slots', 50, inventoryY);
    renderer.ctx.restore();

    const listY = inventoryY + 40;

    // Constants
    renderer.ctx.save();
    renderer.ctx.fillStyle = '#8f8';
    renderer.ctx.font = 'bold 16px monospace';
    renderer.ctx.textAlign = 'left';
    renderer.ctx.fillText('Constants:', 50, listY);
    renderer.ctx.restore();

    for (let i = 0; i < Math.min(this.player.inventory.constants.length, 8); i++) {
      const constant = this.player.inventory.constants[i];
      const y = listY + 25 + i * 30;

      if (this.dragState.isDragging && this.dragState.itemIndex === i && this.dragState.itemType === 'constant') {
        continue; // Skip rendering if being dragged
      }

      renderer.ctx.save();
      renderer.ctx.fillStyle = 'rgba(100, 100, 100, 0.3)';
      renderer.ctx.fillRect(50, y - 20, 400, 25);
      renderer.ctx.strokeStyle = '#666';
      renderer.ctx.strokeRect(50, y - 20, 400, 25);

      renderer.ctx.fillStyle = constant.color;
      renderer.ctx.font = '14px monospace';
      renderer.ctx.textAlign = 'left';
      renderer.ctx.fillText(`${constant.symbol} (${constant.name}) = ${constant.value.toFixed(2)}`, 60, y);
      renderer.ctx.restore();
    }

    // Operators
    renderer.ctx.save();
    renderer.ctx.fillStyle = '#88f';
    renderer.ctx.font = 'bold 16px monospace';
    renderer.ctx.textAlign = 'left';
    renderer.ctx.fillText('Operators:', 500, listY);
    renderer.ctx.restore();

    for (let i = 0; i < Math.min(this.player.inventory.operators.length, 8); i++) {
      const operator = this.player.inventory.operators[i];
      const y = listY + 25 + i * 30;

      if (this.dragState.isDragging && this.dragState.itemIndex === i && this.dragState.itemType === 'operator') {
        continue; // Skip rendering if being dragged
      }

      renderer.ctx.save();
      renderer.ctx.fillStyle = 'rgba(100, 100, 100, 0.3)';
      renderer.ctx.fillRect(500, y - 20, 400, 25);
      renderer.ctx.strokeStyle = '#666';
      renderer.ctx.strokeRect(500, y - 20, 400, 25);

      renderer.ctx.fillStyle = operator.color;
      renderer.ctx.font = '14px monospace';
      renderer.ctx.textAlign = 'left';
      renderer.ctx.fillText(`${operator.symbol} (${operator.name})`, 510, y);
      renderer.ctx.restore();
    }
  }

  private renderDraggedItem(renderer: Renderer): void {
    if (!this.dragState.item) return;

    // Get current mouse position from canvas event
    const rect = renderer.canvas.getBoundingClientRect();
    const mouseX = (renderer.ctx.canvas as any).mouseX || 0;
    const mouseY = (renderer.ctx.canvas as any).mouseY || 0;

    // Use last known position - we'll update this via input manager
    const input = (window as any).inputManager as InputManager;
    if (!input) return;

    const mouse = input.getMousePosition();

    renderer.ctx.save();
    renderer.ctx.globalAlpha = 0.8;

    // Shadow box
    renderer.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    renderer.ctx.fillRect(mouse.x - 25, mouse.y - 15, 50, 30);

    // Item
    renderer.ctx.fillStyle = '#222';
    renderer.ctx.fillRect(mouse.x - 20, mouse.y - 12, 40, 25);
    renderer.ctx.strokeStyle = '#0ff';
    renderer.ctx.lineWidth = 2;
    renderer.ctx.strokeRect(mouse.x - 20, mouse.y - 12, 40, 25);

    renderer.ctx.fillStyle = (this.dragState.item as any).color || '#fff';
    renderer.ctx.font = 'bold 16px monospace';
    renderer.ctx.textAlign = 'center';
    renderer.ctx.textBaseline = 'middle';
    renderer.ctx.fillText((this.dragState.item as any).symbol, mouse.x, mouse.y);

    renderer.ctx.restore();
  }
}
