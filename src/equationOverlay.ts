// Equation Editor Overlay - Shows as HUD overlay and popup editor

import { Player, MathConstant, MathOperator, WeaponInstance, EquationComponent, Equation } from './types.js';
import { InputManager } from './input.js';
import { evaluateEquation, determineWeaponType, createWeaponFromEquation } from './equationSystem.js';
import { WEAPON_COLORS } from './weaponColors.js';

export class EquationOverlay {
  private isEditorOpen = false;
  private selectedSlot: number = -1; // Which weapon slot is being edited
  private draggedItem: EquationComponent | null = null;
  private dragPosition: { x: number; y: number } | null = null;
  private hoverSlot: number = -1;
  private slotHoverItem: number = -1; // Which item in the slot is hovered
  private constantsScroll: number = 0; // Scroll offset for constants
  private operatorsScroll: number = 0; // Scroll offset for operators
  private readonly itemsPerPage = 10; // Max items visible at once
  private readonly maxConstants = 20; // Max capacity
  private readonly maxOperators = 20; // Max capacity

  constructor() {}

  toggleEditor(): void {
    this.isEditorOpen = !this.isEditorOpen;
    if (this.isEditorOpen && this.selectedSlot === -1) {
      // Open first editable slot by default (slot 1, since slot 0 is locked)
      this.selectedSlot = 1;
    }
  }

  isOpen(): boolean {
    return this.isEditorOpen;
  }

  update(input: InputManager, player: Player): void {
    if (!this.isEditorOpen) return;

    // Handle slot selection with number keys
    // Slot 0 is locked (starting weapon), keys 1-6 select slots 1-6
    const totalSlots = 1 + player.inventory.equalSigns;
    if (input.isKeyJustPressed('Digit1') && totalSlots >= 2) this.selectedSlot = 1;
    if (input.isKeyJustPressed('Digit2') && totalSlots >= 3) this.selectedSlot = 2;
    if (input.isKeyJustPressed('Digit3') && totalSlots >= 4) this.selectedSlot = 3;
    if (input.isKeyJustPressed('Digit4') && totalSlots >= 5) this.selectedSlot = 4;
    if (input.isKeyJustPressed('Digit5') && totalSlots >= 6) this.selectedSlot = 5;
    if (input.isKeyJustPressed('Digit6') && totalSlots >= 7) this.selectedSlot = 6;

    // Clamp to available slots (slot 1 to totalSlots-1, never slot 0)
    const maxSlot = totalSlots - 1;
    if (this.selectedSlot > maxSlot) {
      this.selectedSlot = Math.max(1, maxSlot);
    }
    if (this.selectedSlot < 1) {
      this.selectedSlot = 1;
    }

    // Handle mouse for drag & drop
    const mousePos = input.getMousePosition();
    if (mousePos) {
      this.handleMouse(mousePos.x, mousePos.y, input, player);
    }

    // Close with Escape only (Tab/E handled by gameScreen)
    if (input.isKeyJustPressed('Escape')) {
      this.isEditorOpen = false;
    }
  }

  private handleMouse(x: number, y: number, input: InputManager, player: Player): void {
    // Update drag position if dragging
    if (this.draggedItem) {
      this.dragPosition = { x, y };

      if (input.isMouseJustReleased()) {
        // Try to drop item
        this.tryDropItem(x, y, player);
        this.draggedItem = null;
        this.dragPosition = null;
      }
      return;
    }

    // Check if clicking on inventory item to start drag
    if (input.isMouseJustPressed()) {
      const item = this.getInventoryItemAt(x, y, player);
      if (item) {
        this.draggedItem = item;
        this.dragPosition = { x, y };
      } else {
        // Check if clicking on slot item to remove it
        const slotItem = this.getSlotItemAt(x, y, player);
        if (slotItem) {
          this.removeItemFromSlot(slotItem.slotIndex, slotItem.itemIndex, player);
        }
      }
    }
  }

  private getInventoryItemAt(x: number, y: number, player: Player): EquationComponent | null {
    const inventoryY = 100;
    const constantsStartX = 50;
    const operatorsStartX = 400;
    const itemSize = 35;
    const spacing = 5;
    const gridCols = 5;
    const gridRows = 4;

    // Check constants grid
    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        const index = row * gridCols + col;
        const itemX = constantsStartX + col * (itemSize + spacing);
        const itemY = inventoryY + row * (itemSize + spacing);

        if (x >= itemX && x <= itemX + itemSize && y >= itemY && y <= itemY + itemSize) {
          if (index < player.inventory.constants.length) {
            return player.inventory.constants[index];
          }
        }
      }
    }

    // Check operators grid
    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        const index = row * gridCols + col;
        const itemX = operatorsStartX + col * (itemSize + spacing);
        const itemY = inventoryY + row * (itemSize + spacing);

        if (x >= itemX && x <= itemX + itemSize && y >= itemY && y <= itemY + itemSize) {
          if (index < player.inventory.operators.length) {
            return player.inventory.operators[index];
          }
        }
      }
    }

    return null;
  }

  private getSlotItemAt(x: number, y: number, player: Player): { slotIndex: number; itemIndex: number } | null {
    const slotsY = 200;
    const slotWidth = 600;
    const slotHeight = 60;
    const slotSpacing = 10;
    const slotX = 50;

    for (let i = 0; i < Math.min(player.currentWeapons.length, player.inventory.equalSigns); i++) {
      const sy = slotsY + i * (slotHeight + slotSpacing);
      if (y >= sy && y <= sy + slotHeight && x >= slotX && x <= slotX + slotWidth) {
        const weapon = player.currentWeapons[i];
        // Check which item in the equation
        const itemStartX = slotX + 10;
        const itemSize = 35;
        const itemSpacing = 5;

        for (let j = 0; j < weapon.equation.components.length; j++) {
          const itemX = itemStartX + j * (itemSize + itemSpacing);
          if (x >= itemX && x <= itemX + itemSize) {
            return { slotIndex: i, itemIndex: j };
          }
        }
      }
    }

    return null;
  }

  private tryDropItem(x: number, y: number, player: Player): void {
    if (!this.draggedItem) return;

    const slotsY = 200;
    const slotWidth = 600;
    const slotHeight = 60;
    const slotSpacing = 10;
    const slotX = 50;

    // Check if dropping on a weapon slot
    for (let i = 0; i < player.inventory.equalSigns; i++) {
      const sy = slotsY + i * (slotHeight + slotSpacing);
      if (y >= sy && y <= sy + slotHeight && x >= slotX && x <= slotX + slotWidth) {
        // Add to this slot's equation
        this.addItemToSlot(i, this.draggedItem, player);
        return;
      }
    }
  }

  private addItemToSlot(slotIndex: number, item: EquationComponent, player: Player): void {
    // Slot 0 is reserved for starting weapon - cannot be modified
    if (slotIndex === 0) {
      return;
    }

    // Ensure weapon exists
    while (player.currentWeapons.length <= slotIndex) {
      const newWeapon: WeaponInstance = {
        id: `weapon_${Date.now()}_${Math.random()}`,
        type: 'one',
        equation: { components: [], evaluatedValue: 0 },
        level: 1,
        baseDamage: 10,
        cooldown: 800,
        cooldownTimer: 0
      };
      player.currentWeapons.push(newWeapon);
    }

    const weapon = player.currentWeapons[slotIndex];

    // Add component to equation
    weapon.equation.components.push(item);

    // Remove from inventory (check which type it is)
    if ('value' in item && typeof item.value === 'number') {
      // It's a MathConstant
      const constant = item as MathConstant;
      const idx = player.inventory.constants.findIndex(c => c.id === constant.id);
      if (idx >= 0) player.inventory.constants.splice(idx, 1);
    } else if ('symbol' in item) {
      // It's a MathOperator
      const operator = item as MathOperator;
      const idx = player.inventory.operators.findIndex(o => o.id === operator.id);
      if (idx >= 0) player.inventory.operators.splice(idx, 1);
    }

    // Evaluate equation
    weapon.equation.evaluatedValue = evaluateEquation(weapon.equation.components);

    // Determine weapon type and recreate
    const weaponType = determineWeaponType(weapon.equation.evaluatedValue) || 'one';
    const newWeapon = createWeaponFromEquation(weapon.equation, weaponType);
    player.currentWeapons[slotIndex] = newWeapon;
  }

  private removeItemFromSlot(slotIndex: number, itemIndex: number, player: Player): void {
    // Slot 0 is reserved for starting weapon - cannot be modified
    if (slotIndex === 0) {
      return;
    }
    if (slotIndex >= player.currentWeapons.length) return;

    const weapon = player.currentWeapons[slotIndex];
    const item = weapon.equation.components[itemIndex];

    // Return to inventory (check which type it is)
    if ('value' in item && typeof item.value === 'number') {
      // It's a MathConstant
      player.inventory.constants.push(item as MathConstant);
    } else if ('symbol' in item) {
      // It's a MathOperator
      player.inventory.operators.push(item as MathOperator);
    }

    // Remove from equation
    weapon.equation.components.splice(itemIndex, 1);

    // Evaluate equation
    weapon.equation.evaluatedValue = evaluateEquation(weapon.equation.components);

    // Determine weapon type and recreate
    const weaponType = determineWeaponType(weapon.equation.evaluatedValue) || 'one';
    const newWeapon = createWeaponFromEquation(weapon.equation, weaponType);
    player.currentWeapons[slotIndex] = newWeapon;
  }

  renderHUDWeaponSlots(ctx: CanvasRenderingContext2D, player: Player, canvasWidth: number, canvasHeight: number, flashTimer: number = 0): void {
    // Show weapon slots in top-right corner
    const slotWidth = 150;
    const slotHeight = 30;
    const slotSpacing = 5;
    const startX = canvasWidth - slotWidth - 10;
    const startY = 50;

    ctx.save();
    ctx.font = '12px monospace';

    // Total slots: slot 0 (locked starting weapon) + equalSigns additional slots
    const totalSlots = 1 + player.inventory.equalSigns;

    // Draw flash effect if timer is active
    if (flashTimer > 0) {
      const alpha = Math.min(0.5, flashTimer / 1000 * 0.5);
      const pulse = Math.sin(flashTimer * 0.01) * 0.3 + 0.7;
      ctx.fillStyle = `rgba(255, 255, 0, ${alpha * pulse})`;
      ctx.fillRect(startX - 10, startY - 10, slotWidth + 20, (totalSlots * (slotHeight + slotSpacing)) + 10);

      ctx.strokeStyle = `rgba(255, 255, 0, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.strokeRect(startX - 10, startY - 10, slotWidth + 20, (totalSlots * (slotHeight + slotSpacing)) + 10);
    }

    for (let i = 0; i < totalSlots; i++) {
      const y = startY + i * (slotHeight + slotSpacing);
      const isLocked = (i === 0); // Slot 0 is locked

      // Draw slot background
      ctx.fillStyle = isLocked ? 'rgba(40, 40, 40, 0.7)' : 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(startX, y, slotWidth, slotHeight);

      if (i < player.currentWeapons.length) {
        const weapon = player.currentWeapons[i];
        const color = WEAPON_COLORS[weapon.type] || '#fff';

        // Draw colored border
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(startX, y, slotWidth, slotHeight);

        // Draw lock icon for slot 0
        if (isLocked) {
          ctx.fillStyle = '#888';
          ctx.font = '14px monospace';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText('🔒', startX + 5, y + slotHeight / 2);
        }

        // Draw equation result
        ctx.fillStyle = color;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        const resultText = `= ${Math.floor(weapon.equation.evaluatedValue)}`;
        ctx.fillText(resultText, startX + (isLocked ? 25 : 5), y + slotHeight / 2);

        // Draw weapon type
        ctx.fillStyle = '#aaa';
        ctx.textAlign = 'right';
        const typeText = weapon.type.toUpperCase();
        ctx.fillText(typeText, startX + slotWidth - 5, y + slotHeight / 2);
      } else {
        // Empty slot
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        ctx.strokeRect(startX, y, slotWidth, slotHeight);

        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Empty', startX + slotWidth / 2, y + slotHeight / 2);
      }
    }

    ctx.restore();
  }

  render(ctx: CanvasRenderingContext2D, player: Player, canvasWidth: number, canvasHeight: number): void {
    if (!this.isEditorOpen) return;

    ctx.save();

    // Darken background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Title
    ctx.font = 'bold 24px monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText('Equation Builder', canvasWidth / 2, 40);

    ctx.font = '14px monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Drag items to weapon slots • Click items in slots to remove • 1-6: Select slot • Slot 0 is locked', canvasWidth / 2, 70);

    // Inventory section
    this.renderInventory(ctx, player);

    // Weapon slots section
    this.renderWeaponSlots(ctx, player);

    // Dragged item
    if (this.draggedItem && this.dragPosition) {
      this.renderDraggedItem(ctx, this.draggedItem, this.dragPosition.x, this.dragPosition.y);
    }

    ctx.restore();
  }

  private renderInventory(ctx: CanvasRenderingContext2D, player: Player): void {
    const inventoryY = 100;
    const constantsStartX = 50;
    const operatorsStartX = 400;
    const itemSize = 35;
    const spacing = 5;
    const gridCols = 5;
    const gridRows = 4;

    // Constants label with capacity
    ctx.font = '14px monospace';
    const atCapacity = player.inventory.constants.length >= this.maxConstants;
    ctx.fillStyle = atCapacity ? '#f44' : '#8f8';
    ctx.textAlign = 'left';
    ctx.fillText(`Numbers: ${player.inventory.constants.length}/${this.maxConstants}`, constantsStartX, inventoryY - 10);

    // Draw constants in 5x4 grid
    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        const index = row * gridCols + col;
        const x = constantsStartX + col * (itemSize + spacing);
        const y = inventoryY + row * (itemSize + spacing);

        if (index < player.inventory.constants.length) {
          const constant = player.inventory.constants[index];
          this.renderInventoryItem(ctx, constant.symbol, constant.color, x, y, itemSize);
        } else {
          // Empty slot
          this.renderEmptySlot(ctx, x, y, itemSize, '#8f8');
        }
      }
    }

    // Operators label with capacity
    const atOpCapacity = player.inventory.operators.length >= this.maxOperators;
    ctx.fillStyle = atOpCapacity ? '#f44' : '#88f';
    ctx.fillText(`Operators: ${player.inventory.operators.length}/${this.maxOperators}`, operatorsStartX, inventoryY - 10);

    // Draw operators in 5x4 grid
    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        const index = row * gridCols + col;
        const x = operatorsStartX + col * (itemSize + spacing);
        const y = inventoryY + row * (itemSize + spacing);

        if (index < player.inventory.operators.length) {
          const operator = player.inventory.operators[index];
          this.renderInventoryItem(ctx, operator.symbol, operator.color, x, y, itemSize);
        } else {
          // Empty slot
          this.renderEmptySlot(ctx, x, y, itemSize, '#88f');
        }
      }
    }

    // Equal signs
    ctx.fillStyle = '#ff0';
    ctx.fillText(`Equal Signs: ${player.inventory.equalSigns}`, 50, inventoryY + (gridRows * (itemSize + spacing)) + 20);

    // Instructions
    ctx.fillStyle = '#666';
    ctx.font = '12px monospace';
    ctx.fillText('Click items to drag • Click slots to remove • Numbers hotkeys 1-6', 50, inventoryY + (gridRows * (itemSize + spacing)) + 45);
  }

  private renderEmptySlot(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string): void {
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(x, y, size, size);

    // Border
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;
    ctx.strokeRect(x, y, size, size);
    ctx.globalAlpha = 1.0;
  }

  private renderInventoryItem(ctx: CanvasRenderingContext2D, symbol: string, color: string, x: number, y: number, size: number): void {
    // Background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(x, y, size, size);

    // Border
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, size, size);

    // Symbol
    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbol, x + size / 2, y + size / 2);
  }

  private renderWeaponSlots(ctx: CanvasRenderingContext2D, player: Player): void {
    const slotsY = 320;  // Moved down from 200 to avoid inventory overlap
    const slotWidth = 600;
    const slotHeight = 60;
    const slotSpacing = 10;
    const slotX = 50;

    ctx.font = '16px monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText('Weapon Slots:', slotX, slotsY - 15);

    // Total slots: slot 0 (locked starting weapon) + equalSigns additional slots
    const totalSlots = 1 + player.inventory.equalSigns;

    for (let i = 0; i < totalSlots; i++) {
      const y = slotsY + i * (slotHeight + slotSpacing);
      const isLocked = (i === 0); // Slot 0 is locked

      // Slot background (dimmed if locked)
      if (isLocked) {
        ctx.fillStyle = 'rgba(60, 60, 40, 0.5)';
      } else {
        ctx.fillStyle = i === this.selectedSlot ? 'rgba(100, 100, 100, 0.5)' : 'rgba(50, 50, 50, 0.5)';
      }
      ctx.fillRect(slotX, y, slotWidth, slotHeight);

      if (i < player.currentWeapons.length) {
        const weapon = player.currentWeapons[i];
        const color = WEAPON_COLORS[weapon.type] || '#fff';

        // Colored border
        ctx.strokeStyle = isLocked ? '#886' : color;
        ctx.lineWidth = 3;
        ctx.strokeRect(slotX, y, slotWidth, slotHeight);

        // Draw lock icon for slot 0
        if (isLocked) {
          ctx.font = '20px monospace';
          ctx.fillStyle = '#888';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText('🔒', slotX + 10, y + slotHeight / 2);

          // Add "LOCKED" text
          ctx.font = '12px monospace';
          ctx.fillStyle = '#888';
          ctx.textAlign = 'left';
          ctx.fillText('LOCKED', slotX + 35, y + slotHeight / 2);
        }

        // Draw equation components
        const itemStartX = slotX + 10;
        const itemSize = 35;
        const itemSpacing = 5;

        weapon.equation.components.forEach((comp, j) => {
          const itemX = itemStartX + j * (itemSize + itemSpacing);
          const itemY = y + 10;

          if ('value' in comp && typeof comp.value === 'number') {
            // It's a MathConstant
            const constant = comp as MathConstant;
            this.renderSlotItem(ctx, constant.symbol, constant.color, itemX, itemY, itemSize);
          } else if ('symbol' in comp) {
            // It's a MathOperator
            const operator = comp as MathOperator;
            this.renderSlotItem(ctx, operator.symbol, operator.color, itemX, itemY, itemSize);
          }
        });

        // Draw result
        ctx.font = 'bold 20px monospace';
        ctx.fillStyle = color;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        const resultText = `= ${Math.floor(weapon.equation.evaluatedValue)}`;
        ctx.fillText(resultText, slotX + slotWidth - 120, y + slotHeight / 2);

        // Draw weapon type
        ctx.font = '12px monospace';
        ctx.fillStyle = '#aaa';
        const typeText = weapon.type.toUpperCase();
        ctx.fillText(typeText, slotX + slotWidth - 10, y + slotHeight / 2);
      } else {
        // Empty slot
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        ctx.strokeRect(slotX, y, slotWidth, slotHeight);

        ctx.font = '16px monospace';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Drag items here to build weapon', slotX + slotWidth / 2, y + slotHeight / 2);
      }

      // Slot number (or lock indicator)
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = isLocked ? '#886' : '#888';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      if (isLocked) {
        ctx.fillText('🔒 0', slotX + 5, y + 5);
      } else {
        ctx.fillText(`${i + 1}`, slotX + 5, y + 5);
      }
    }
  }

  private renderSlotItem(ctx: CanvasRenderingContext2D, symbol: string, color: string, x: number, y: number, size: number): void {
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(x, y, size, size);

    // Border
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, size, size);

    // Symbol
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbol, x + size / 2, y + size / 2);
  }

  private renderDraggedItem(ctx: CanvasRenderingContext2D, item: EquationComponent, x: number, y: number): void {
    const size = 40;
    const halfSize = size / 2;

    ctx.save();
    ctx.globalAlpha = 0.8;

    if ('value' in item && typeof item.value === 'number') {
      // It's a MathConstant
      const constant = item as MathConstant;
      this.renderInventoryItem(ctx, constant.symbol, constant.color, x - halfSize, y - halfSize, size);
    } else if ('symbol' in item) {
      // It's a MathOperator
      const operator = item as MathOperator;
      this.renderInventoryItem(ctx, operator.symbol, operator.color, x - halfSize, y - halfSize, size);
    }

    ctx.restore();
  }
}
