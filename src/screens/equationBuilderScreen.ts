// Equation Builder Screen - Full-screen UI for building weapons

import { Renderer } from '../renderer.js';
import { InputManager } from '../input.js';
import { Player, GameScreen, EquationComponent, MathConstant, MathOperator } from '../types.js';
import { evaluateEquation, determineWeaponType, createWeaponFromEquation } from '../equationSystem.js';

type InventorySection = 'constants' | 'operators';

export class EquationBuilderScreen {
  private currentEquation: EquationComponent[] = [];
  private selectedSection: InventorySection = 'constants';
  private selectedIndex = 0;
  private message: string = '';
  private messageTimer = 0;

  constructor(private player: Player) {}

  update(input: InputManager): GameScreen | null {
    this.messageTimer = Math.max(0, this.messageTimer - 16);

    // Escape to return to game
    if (input.isKeyJustPressed('Escape')) {
      return 'game';
    }

    // Tab to switch sections
    if (input.isKeyJustPressed('Tab')) {
      this.selectedSection = this.selectedSection === 'constants' ? 'operators' : 'constants';
      this.selectedIndex = 0;
    }

    // Navigation
    const currentList = this.getCurrentList();
    if (input.isKeyJustPressed('ArrowUp') || input.isKeyJustPressed('KeyW')) {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
    }
    if (input.isKeyJustPressed('ArrowDown') || input.isKeyJustPressed('KeyS')) {
      this.selectedIndex = Math.min(currentList.length - 1, this.selectedIndex + 1);
    }

    // Add selected item to equation (Enter)
    if (input.isKeyJustPressed('Enter')) {
      if (currentList.length > 0 && this.selectedIndex < currentList.length) {
        this.currentEquation.push(currentList[this.selectedIndex]);
        this.showMessage('Added to equation');
      }
    }

    // Remove last item (Backspace)
    if (input.isKeyJustPressed('Backspace')) {
      if (this.currentEquation.length > 0) {
        this.currentEquation.pop();
        this.showMessage('Removed last item');
      }
    }

    // Clear equation (Delete)
    if (input.isKeyJustPressed('Delete')) {
      this.currentEquation = [];
      this.showMessage('Cleared equation');
    }

    // Create weapon (C key)
    if (input.isKeyJustPressed('KeyC')) {
      this.tryCreateWeapon();
    }

    return null;
  }

  render(renderer: Renderer): void {
    renderer.clear('#111');

    const centerX = renderer.canvas.width / 2;

    // Title
    renderer.ctx.save();
    renderer.ctx.fillStyle = '#0ff';
    renderer.ctx.font = 'bold 48px monospace';
    renderer.ctx.textAlign = 'center';
    renderer.ctx.shadowBlur = 15;
    renderer.ctx.shadowColor = '#0ff';
    renderer.ctx.fillText('EQUATION BUILDER', centerX, 50);
    renderer.ctx.restore();

    renderer.ctx.save();
    renderer.ctx.fillStyle = '#888';
    renderer.ctx.font = '18px monospace';
    renderer.ctx.textAlign = 'center';
    renderer.ctx.fillText('Build your weapon by combining constants and operators', centerX, 80);
    renderer.ctx.restore();

    // Instructions
    renderer.ctx.save();
    renderer.ctx.fillStyle = '#666';
    renderer.ctx.font = '14px monospace';
    renderer.ctx.textAlign = 'center';
    renderer.ctx.fillText('Tab: Switch | Arrows: Navigate | Enter: Add | Backspace: Remove | Delete: Clear | C: Create | Esc: Cancel', centerX, 105);
    renderer.ctx.restore();

    // Current Equation Display Box
    const equationBoxY = 130;
    renderer.ctx.save();
    renderer.ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
    renderer.ctx.fillRect(centerX - 400, equationBoxY, 800, 120);
    renderer.ctx.strokeStyle = '#0ff';
    renderer.ctx.lineWidth = 2;
    renderer.ctx.strokeRect(centerX - 400, equationBoxY, 800, 120);
    renderer.ctx.restore();

    renderer.ctx.save();
    renderer.ctx.fillStyle = '#fff';
    renderer.ctx.font = 'bold 20px monospace';
    renderer.ctx.textAlign = 'center';
    renderer.ctx.fillText('Current Equation:', centerX, equationBoxY + 30);
    renderer.ctx.restore();

    const equationStr = this.formatEquation();
    renderer.ctx.save();
    renderer.ctx.fillStyle = '#0ff';
    renderer.ctx.font = 'bold 32px monospace';
    renderer.ctx.textAlign = 'center';
    renderer.ctx.fillText(equationStr || '(empty)', centerX, equationBoxY + 70);
    renderer.ctx.restore();

    // Evaluation Preview
    let previewY = equationBoxY + 105;
    if (this.currentEquation.length > 0) {
      const evaluated = evaluateEquation(this.currentEquation);
      const weaponType = determineWeaponType(evaluated);

      renderer.ctx.save();
      renderer.ctx.fillStyle = '#8f8';
      renderer.ctx.font = 'bold 20px monospace';
      renderer.ctx.textAlign = 'center';
      renderer.ctx.fillText(`= ${evaluated}`, centerX - 150, previewY);
      renderer.ctx.restore();

      if (weaponType) {
        renderer.ctx.save();
        renderer.ctx.fillStyle = '#ff0';
        renderer.ctx.font = 'bold 20px monospace';
        renderer.ctx.textAlign = 'center';
        renderer.ctx.fillText(`Weapon: ${weaponType}`, centerX + 150, previewY);
        renderer.ctx.restore();
      } else {
        renderer.ctx.save();
        renderer.ctx.fillStyle = '#f88';
        renderer.ctx.font = '18px monospace';
        renderer.ctx.textAlign = 'center';
        renderer.ctx.fillText('No weapon type for this value', centerX + 150, previewY);
        renderer.ctx.restore();
      }
    }

    // Equal signs available
    const canCreate = this.player.inventory.equalSigns > 0 && this.currentEquation.length > 0;
    const equalSignText = `Equal Signs Available: ${this.player.inventory.equalSigns}`;
    renderer.ctx.save();
    renderer.ctx.fillStyle = canCreate ? '#0f0' : '#f88';
    renderer.ctx.font = 'bold 18px monospace';
    renderer.ctx.textAlign = 'center';
    renderer.ctx.fillText(equalSignText, centerX, 280);
    renderer.ctx.restore();

    // Inventory sections side by side
    const leftX = 100;
    const rightX = renderer.canvas.width / 2 + 50;
    const inventoryY = 320;

    // Constants section
    const constantsColor = this.selectedSection === 'constants' ? '#0ff' : '#888';
    renderer.ctx.save();
    renderer.ctx.fillStyle = constantsColor;
    renderer.ctx.font = 'bold 24px monospace';
    renderer.ctx.textAlign = 'left';
    renderer.ctx.fillText('CONSTANTS', leftX, inventoryY);
    renderer.ctx.restore();

    renderer.ctx.save();
    renderer.ctx.fillStyle = '#666';
    renderer.ctx.font = '14px monospace';
    renderer.ctx.textAlign = 'left';
    renderer.ctx.fillText('(Tab to switch)', leftX, inventoryY + 20);
    renderer.ctx.restore();

    this.renderInventoryList(renderer, this.player.inventory.constants, leftX, inventoryY + 45, this.selectedSection === 'constants');

    // Operators section
    const operatorsColor = this.selectedSection === 'operators' ? '#0ff' : '#888';
    renderer.ctx.save();
    renderer.ctx.fillStyle = operatorsColor;
    renderer.ctx.font = 'bold 24px monospace';
    renderer.ctx.textAlign = 'left';
    renderer.ctx.fillText('OPERATORS', rightX, inventoryY);
    renderer.ctx.restore();

    renderer.ctx.save();
    renderer.ctx.fillStyle = '#666';
    renderer.ctx.font = '14px monospace';
    renderer.ctx.textAlign = 'left';
    renderer.ctx.fillText('(Tab to switch)', rightX, inventoryY + 20);
    renderer.ctx.restore();

    this.renderInventoryList(renderer, this.player.inventory.operators, rightX, inventoryY + 45, this.selectedSection === 'operators');

    // Message display at bottom
    if (this.messageTimer > 0) {
      renderer.ctx.save();
      renderer.ctx.fillStyle = '#ff0';
      renderer.ctx.font = 'bold 24px monospace';
      renderer.ctx.textAlign = 'center';
      renderer.ctx.fillText(this.message, centerX, renderer.canvas.height - 30);
      renderer.ctx.restore();
    }
  }

  private getCurrentList(): EquationComponent[] {
    if (this.selectedSection === 'constants') {
      return this.player.inventory.constants;
    } else {
      return this.player.inventory.operators;
    }
  }

  private formatEquation(): string {
    return this.currentEquation.map(comp => {
      if ('value' in comp) {
        return (comp as MathConstant).symbol;
      } else {
        return (comp as MathOperator).symbol;
      }
    }).join(' ');
  }

  private renderInventoryList(renderer: Renderer, items: EquationComponent[], x: number, y: number, isSelected: boolean): void {
    if (items.length === 0) {
      renderer.ctx.save();
      renderer.ctx.fillStyle = '#666';
      renderer.ctx.font = '16px monospace';
      renderer.ctx.textAlign = 'left';
      renderer.ctx.fillText('(none)', x, y);
      renderer.ctx.restore();
      return;
    }

    for (let i = 0; i < Math.min(items.length, 10); i++) {
      const item = items[i];
      const isHighlighted = isSelected && i === this.selectedIndex;
      const color = isHighlighted ? '#ff0' : '#fff';
      const prefix = isHighlighted ? '▸ ' : '  ';

      let text = '';
      if ('value' in item) {
        const constant = item as MathConstant;
        text = `${prefix}${constant.symbol} (${constant.name}) = ${constant.value.toFixed(2)}`;
      } else {
        const operator = item as MathOperator;
        text = `${prefix}${operator.symbol} (${operator.name})`;
      }

      renderer.ctx.save();
      renderer.ctx.fillStyle = color;
      renderer.ctx.font = isHighlighted ? 'bold 16px monospace' : '16px monospace';
      renderer.ctx.textAlign = 'left';

      if (isHighlighted) {
        renderer.ctx.shadowBlur = 8;
        renderer.ctx.shadowColor = '#ff0';
      }

      renderer.ctx.fillText(text, x, y + i * 22);
      renderer.ctx.restore();
    }
  }

  private tryCreateWeapon(): void {
    // Validate
    if (this.currentEquation.length === 0) {
      this.showMessage('Equation is empty!');
      return;
    }

    if (this.player.inventory.equalSigns < 1) {
      this.showMessage('Need an equal sign (=) to create weapon!');
      return;
    }

    const evaluated = evaluateEquation(this.currentEquation);
    const weaponType = determineWeaponType(evaluated);

    if (!weaponType) {
      this.showMessage('This number has no weapon type!');
      return;
    }

    // Create weapon
    const equation = {
      components: [...this.currentEquation],
      evaluatedValue: evaluated
    };
    const weapon = createWeaponFromEquation(equation, weaponType);

    // Add to player
    this.player.currentWeapons.push(weapon);
    this.player.inventory.equalSigns--;

    this.showMessage(`Created ${weaponType} weapon! (${evaluated})`);
    this.currentEquation = [];
  }

  private showMessage(msg: string): void {
    this.message = msg;
    this.messageTimer = 2000;
  }
}
