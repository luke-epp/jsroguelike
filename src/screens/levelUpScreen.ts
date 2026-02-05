// Level up screen - number-based weapon upgrade system

import { Renderer } from '../renderer.js';
import { InputManager } from '../input.js';
import { GameScreen, Player, LevelUpOption, WeaponType } from '../types.js';
import { getRandomLevelUpOptions } from '../gameData.js';
import { getWeaponColor } from '../weaponColors.js';

export class LevelUpScreen {
  private options: LevelUpOption[];
  private selectedOption = 0;
  private player: Player;

  constructor(player: Player) {
    this.player = player;
    this.options = getRandomLevelUpOptions(3);
  }

  update(input: InputManager): { screen: GameScreen | null; applied: boolean } {
    if (input.isKeyJustPressed('ArrowLeft') || input.isKeyJustPressed('KeyA')) {
      this.selectedOption = Math.max(0, this.selectedOption - 1);
    }
    if (input.isKeyJustPressed('ArrowRight') || input.isKeyJustPressed('KeyD')) {
      this.selectedOption = Math.min(this.options.length - 1, this.selectedOption + 1);
    }
    if (input.isKeyJustPressed('Enter')) {
      this.applyNumberUpgrade(this.options[this.selectedOption]);
      return { screen: 'game', applied: true };
    }
    return { screen: null, applied: false };
  }

  private applyNumberUpgrade(option: LevelUpOption): void {
    const { properties, damageMultiplier } = option;

    // Buff all weapons that match any of the properties
    let buffedCount = 0;
    for (const weapon of this.player.currentWeapons) {
      if (properties.includes(weapon.type)) {
        weapon.level++;
        weapon.baseDamage = Math.floor(weapon.baseDamage * 1.15 * damageMultiplier);
        weapon.cooldown = Math.max(50, Math.floor(weapon.cooldown * 0.95));
        buffedCount++;
      }
    }

    // Always heal a bit
    this.player.health = Math.min(this.player.maxHealth, this.player.health + 20);
  }

  render(renderer: Renderer): void {
    renderer.clear('#000');

    const centerX = renderer.canvas.width / 2;

    // Title
    renderer.ctx.save();
    renderer.ctx.fillStyle = '#0f0';
    renderer.ctx.font = 'bold 48px monospace';
    renderer.ctx.textAlign = 'center';
    renderer.ctx.shadowBlur = 15;
    renderer.ctx.shadowColor = '#0f0';
    renderer.ctx.fillText('LEVEL UP!', centerX, 50);
    renderer.ctx.restore();

    renderer.ctx.save();
    renderer.ctx.fillStyle = '#fff';
    renderer.ctx.font = '16px monospace';
    renderer.ctx.textAlign = 'center';
    renderer.ctx.fillText('Choose a number to power up matching weapons', centerX, 80);
    renderer.ctx.restore();

    // Options displayed horizontally with better spacing
    const optionWidth = 320;
    const totalWidth = this.options.length * optionWidth;
    const startX = (renderer.canvas.width - totalWidth) / 2;

    this.options.forEach((option, index) => {
      const x = startX + index * optionWidth + optionWidth / 2;
      const y = 140;
      const isSelected = index === this.selectedOption;

      // Box background
      renderer.ctx.save();
      renderer.ctx.fillStyle = isSelected ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 255, 255, 0.05)';
      renderer.ctx.fillRect(startX + index * optionWidth + 10, y - 20, optionWidth - 20, 180);
      renderer.ctx.strokeStyle = isSelected ? '#0f0' : '#666';
      renderer.ctx.lineWidth = 2;
      renderer.ctx.strokeRect(startX + index * optionWidth + 10, y - 20, optionWidth - 20, 180);
      renderer.ctx.restore();

      // Number and properties
      renderer.ctx.save();
      renderer.ctx.fillStyle = isSelected ? '#0f0' : '#fff';
      renderer.ctx.font = isSelected ? 'bold 36px monospace' : 'bold 32px monospace';
      renderer.ctx.textAlign = 'center';
      if (isSelected) {
        renderer.ctx.shadowBlur = 10;
        renderer.ctx.shadowColor = '#0f0';
      }
      renderer.ctx.fillText(option.displayText, x, y);
      renderer.ctx.restore();

      // Show which weapons will be buffed
      const matchingWeapons = this.player.currentWeapons.filter(w =>
        option.properties.includes(w.type)
      );

      let currentY = y + 30;

      if (matchingWeapons.length > 0) {
        renderer.ctx.save();
        renderer.ctx.fillStyle = '#0ff';
        renderer.ctx.font = '13px monospace';
        renderer.ctx.textAlign = 'center';
        renderer.ctx.fillText(`Buffs ${matchingWeapons.length} weapon(s)`, x, currentY);
        renderer.ctx.restore();
        currentY += 18;

        matchingWeapons.forEach((weapon) => {
          renderer.ctx.save();
          renderer.ctx.fillStyle = getWeaponColor(weapon.type);
          renderer.ctx.font = '11px monospace';
          renderer.ctx.textAlign = 'center';
          renderer.ctx.fillText(`${weapon.type} Lv${weapon.level}`, x, currentY);
          renderer.ctx.restore();
          currentY += 16;
        });
      } else {
        renderer.ctx.save();
        renderer.ctx.fillStyle = '#888';
        renderer.ctx.font = '13px monospace';
        renderer.ctx.textAlign = 'center';
        renderer.ctx.fillText('No matching weapons', x, currentY);
        renderer.ctx.restore();
      }

      // Damage multiplier bonus
      if (option.damageMultiplier > 1.0) {
        renderer.ctx.save();
        renderer.ctx.fillStyle = '#ff0';
        renderer.ctx.font = 'bold 12px monospace';
        renderer.ctx.textAlign = 'center';
        renderer.ctx.fillText(`×${option.damageMultiplier.toFixed(1)} BONUS`, x, y + 130);
        renderer.ctx.restore();
      }
    });

    // Player stats at bottom
    const statsY = renderer.canvas.height - 120;

    renderer.ctx.save();
    renderer.ctx.fillStyle = '#ff0';
    renderer.ctx.font = 'bold 16px monospace';
    renderer.ctx.textAlign = 'left';
    renderer.ctx.fillText('Current Weapons:', 30, statsY);
    renderer.ctx.restore();

    let weaponY = statsY + 20;
    this.player.currentWeapons.forEach((weapon) => {
      renderer.ctx.save();
      renderer.ctx.fillStyle = getWeaponColor(weapon.type);
      renderer.ctx.font = '13px monospace';
      renderer.ctx.textAlign = 'left';
      renderer.ctx.fillText(
        `${weapon.type} Lv${weapon.level} | ${weapon.baseDamage} DMG`,
        40,
        weaponY
      );
      renderer.ctx.restore();
      weaponY += 16;
    });

    renderer.ctx.save();
    renderer.ctx.fillStyle = '#8f8';
    renderer.ctx.font = '14px monospace';
    renderer.ctx.textAlign = 'left';
    renderer.ctx.fillText(
      `HP: ${Math.floor(this.player.health)}/${this.player.maxHealth} | Level: ${this.player.level}`,
      30,
      renderer.canvas.height - 35
    );
    renderer.ctx.restore();

    // Instructions
    renderer.ctx.save();
    renderer.ctx.fillStyle = '#666';
    renderer.ctx.font = '12px monospace';
    renderer.ctx.textAlign = 'center';
    renderer.ctx.fillText(
      'A/D or Arrows: Select | Enter: Confirm | +20 HP on selection',
      centerX,
      renderer.canvas.height - 12
    );
    renderer.ctx.restore();
  }
}
