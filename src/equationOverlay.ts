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

  constructor() {}

  toggleEditor(): void {
    this.isEditorOpen = !this.isEditorOpen;
    if (this.isEditorOpen && this.selectedSlot === -1) {
      // Open first available slot by default
      this.selectedSlot = 0;
    }
  }

  isOpen(): boolean {
    return this.isEditorOpen;
  }

  update(input: InputManager, player: Player): void {
    if (!this.isEditorOpen) return;

    // Handle slot selection with number keys
    if (input.isKeyJustPressed('Digit1')) this.selectedSlot = 0;
    if (input.isKeyJustPressed('Digit2')) this.selectedSlot = 1;
    if (input.isKeyJustPressed('Digit3')) this.selectedSlot = 2;
    if (input.isKeyJustPressed('Digit4')) this.selectedSlot = 3;
    if (input.isKeyJustPressed('Digit5')) this.selectedSlot = 4;
    if (input.isKeyJustPressed('Digit6')) this.selectedSlot = 5;

    // Clamp to available slots
    const maxSlots = player.inventory.equalSigns;
    if (this.selectedSlot >= maxSlots) {
      this.selectedSlot = Math.max(0, maxSlots - 1);
    }

    // Scroll inventory with arrow keys (Left/Right for constants, Up/Down for operators)
    if (input.isKeyJustPressed('ArrowLeft')) {
      this.constantsScroll = Math.max(0, this.constantsScroll - 1);
    }
    if (input.isKeyJustPressed('ArrowRight')) {
      this.constantsScroll = Math.min(
        Math.max(0, player.inventory.constants.length - this.itemsPerPage),
        this.constantsScroll + 1
      );
    }
    if (input.isKeyJustPressed('ArrowUp')) {
      this.operatorsScroll = Math.max(0, this.operatorsScroll - 1);
    }
    if (input.isKeyJustPressed('ArrowDown')) {
      this.operatorsScroll = Math.min(
        Math.max(0, player.inventory.operators.length - this.itemsPerPage),
        this.operatorsScroll + 1
      );
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
    const itemSize = 40;
    const spacing = 10;

    // Check visible constants (accounting for scroll)
    const visibleConstants = player.inventory.constants.slice(
      this.constantsScroll,
      this.constantsScroll + this.itemsPerPage
    );
    for (let i = 0; i < visibleConstants.length; i++) {
      const itemX = constantsStartX + i * (itemSize + spacing);
      if (x >= itemX && x <= itemX + itemSize && y >= inventoryY && y <= inventoryY + itemSize) {
        return visibleConstants[i]; // Return the constant directly
      }
    }

    // Check visible operators (accounting for scroll)
    const visibleOperators = player.inventory.operators.slice(
      this.operatorsScroll,
      this.operatorsScroll + this.itemsPerPage
    );
    for (let i = 0; i < visibleOperators.length; i++) {
      const itemX = operatorsStartX + i * (itemSize + spacing);
      if (x >= itemX && x <= itemX + itemSize && y >= inventoryY && y <= inventoryY + itemSize) {
        return visibleOperators[i]; // Return the operator directly
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

    // Draw flash effect if timer is active
    if (flashTimer > 0) {
      const alpha = Math.min(0.5, flashTimer / 1000 * 0.5);
      const pulse = Math.sin(flashTimer * 0.01) * 0.3 + 0.7;
      ctx.fillStyle = `rgba(255, 255, 0, ${alpha * pulse})`;
      ctx.fillRect(startX - 10, startY - 10, slotWidth + 20, (player.inventory.equalSigns * (slotHeight + slotSpacing)) + 10);

      ctx.strokeStyle = `rgba(255, 255, 0, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.strokeRect(startX - 10, startY - 10, slotWidth + 20, (player.inventory.equalSigns * (slotHeight + slotSpacing)) + 10);
    }

    for (let i = 0; i < player.inventory.equalSigns; i++) {
      const y = startY + i * (slotHeight + slotSpacing);

      // Draw slot background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(startX, y, slotWidth, slotHeight);

      if (i < player.currentWeapons.length) {
        const weapon = player.currentWeapons[i];
        const color = WEAPON_COLORS[weapon.type] || '#fff';

        // Draw colored border
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(startX, y, slotWidth, slotHeight);

        // Draw equation result
        ctx.fillStyle = color;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        const resultText = `= ${Math.floor(weapon.equation.evaluatedValue)}`;
        ctx.fillText(resultText, startX + 5, y + slotHeight / 2);

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
    ctx.fillText('Drag items to weapon slots • Click items in slots to remove • 1-6: Select slot', canvasWidth / 2, 70);

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
    const itemSize = 40;
    const spacing = 10;

    // Constants label and scroll info
    ctx.font = '14px monospace';
    ctx.fillStyle = '#8f8';
    ctx.textAlign = 'left';
    const constantsText = `Numbers: ${this.constantsScroll + 1}-${Math.min(this.constantsScroll + this.itemsPerPage, player.inventory.constants.length)} of ${player.inventory.constants.length}`;
    ctx.fillText(constantsText, constantsStartX, inventoryY - 10);

    // Scroll arrows for constants
    if (this.constantsScroll > 0) {
      ctx.fillStyle = '#ff0';
      ctx.fillText('◀', constantsStartX - 20, inventoryY + itemSize / 2);
    }
    if (this.constantsScroll + this.itemsPerPage < player.inventory.constants.length) {
      ctx.fillStyle = '#ff0';
      ctx.fillText('▶', constantsStartX + this.itemsPerPage * (itemSize + spacing), inventoryY + itemSize / 2);
    }

    // Draw visible constants
    const visibleConstants = player.inventory.constants.slice(
      this.constantsScroll,
      this.constantsScroll + this.itemsPerPage
    );
    visibleConstants.forEach((constant, i) => {
      const x = constantsStartX + i * (itemSize + spacing);
      this.renderInventoryItem(ctx, constant.symbol, constant.color, x, inventoryY, itemSize);
    });

    // Operators label and scroll info
    ctx.fillStyle = '#88f';
    const operatorsText = `Operators: ${this.operatorsScroll + 1}-${Math.min(this.operatorsScroll + this.itemsPerPage, player.inventory.operators.length)} of ${player.inventory.operators.length}`;
    ctx.fillText(operatorsText, operatorsStartX, inventoryY - 10);

    // Scroll arrows for operators
    if (this.operatorsScroll > 0) {
      ctx.fillStyle = '#ff0';
      ctx.fillText('◀', operatorsStartX - 20, inventoryY + itemSize / 2);
    }
    if (this.operatorsScroll + this.itemsPerPage < player.inventory.operators.length) {
      ctx.fillStyle = '#ff0';
      ctx.fillText('▶', operatorsStartX + this.itemsPerPage * (itemSize + spacing), inventoryY + itemSize / 2);
    }

    // Draw visible operators
    const visibleOperators = player.inventory.operators.slice(
      this.operatorsScroll,
      this.operatorsScroll + this.itemsPerPage
    );
    visibleOperators.forEach((operator, i) => {
      const x = operatorsStartX + i * (itemSize + spacing);
      this.renderInventoryItem(ctx, operator.symbol, operator.color, x, inventoryY, itemSize);
    });

    // Equal signs
    ctx.fillStyle = '#ff0';
    ctx.fillText(`Equal Signs: ${player.inventory.equalSigns}`, 50, inventoryY + 70);

    // Instructions
    ctx.fillStyle = '#666';
    ctx.font = '12px monospace';
    ctx.fillText('← → : Scroll numbers  |  ↑ ↓ : Scroll operators', 50, inventoryY + 95);
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
    const slotsY = 200;
    const slotWidth = 600;
    const slotHeight = 60;
    const slotSpacing = 10;
    const slotX = 50;

    ctx.font = '16px monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText('Weapon Slots:', slotX, slotsY - 15);

    for (let i = 0; i < player.inventory.equalSigns; i++) {
      const y = slotsY + i * (slotHeight + slotSpacing);

      // Slot background
      ctx.fillStyle = i === this.selectedSlot ? 'rgba(100, 100, 100, 0.5)' : 'rgba(50, 50, 50, 0.5)';
      ctx.fillRect(slotX, y, slotWidth, slotHeight);

      if (i < player.currentWeapons.length) {
        const weapon = player.currentWeapons[i];
        const color = WEAPON_COLORS[weapon.type] || '#fff';

        // Colored border
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(slotX, y, slotWidth, slotHeight);

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

      // Slot number
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = '#888';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`${i + 1}`, slotX + 5, y + 5);
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
