// Weapon behavior system - each weapon type has unique firing patterns

import { Player, LetterEnemy, Projectile, WeaponInstance, Position } from './types.js';

export interface WeaponBehavior {
  fire(player: Player, weapon: WeaponInstance, enemies: LetterEnemy[], projectiles: Projectile[]): void;
  update?(player: Player, weapon: WeaponInstance, enemies: LetterEnemy[], deltaTime: number): void;
  getVisualEffect?(): any;
}

// Helper: Find nearest enemy
function findNearestEnemy(playerPos: Position, enemies: LetterEnemy[]): LetterEnemy | null {
  if (enemies.length === 0) return null;

  let nearest = enemies[0];
  let minDist = getDistance(playerPos, nearest.position);

  for (let i = 1; i < enemies.length; i++) {
    const dist = getDistance(playerPos, enemies[i].position);
    if (dist < minDist) {
      minDist = dist;
      nearest = enemies[i];
    }
  }

  return nearest;
}

function getDistance(a: Position, b: Position): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function normalizeVector(x: number, y: number): { x: number; y: number } {
  const len = Math.sqrt(x * x + y * y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: x / len, y: y / len };
}

function createProjectile(
  position: Position,
  velocity: { x: number; y: number },
  damage: number,
  color: string,
  sprite: string = '•',
  extras: Partial<Projectile> = {}
): Projectile {
  return {
    id: `proj_${Date.now()}_${Math.random()}`,
    position: { ...position },
    velocity,
    damage,
    owner: 'player',
    sprite,
    color,
    lifetime: 3000,
    radius: 8,
    ...extras
  };
}

// 1. OneWeapon - Single projectile at nearest enemy
export class OneWeapon implements WeaponBehavior {
  fire(player: Player, weapon: WeaponInstance, enemies: LetterEnemy[], projectiles: Projectile[]): void {
    const target = findNearestEnemy(player.position, enemies);
    if (!target) return;

    const dx = target.position.x - player.position.x;
    const dy = target.position.y - player.position.y;
    const dir = normalizeVector(dx, dy);

    const speed = 600;
    projectiles.push(createProjectile(
      player.position,
      { x: dir.x * speed, y: dir.y * speed },
      weapon.baseDamage,
      '#0ff',
      '0'
    ));
  }
}

// 2. OddsWeapon - Two projectiles: straight up and straight down
export class OddsWeapon implements WeaponBehavior {
  fire(player: Player, weapon: WeaponInstance, enemies: LetterEnemy[], projectiles: Projectile[]): void {
    const speed = 500;

    // Up
    projectiles.push(createProjectile(
      player.position,
      { x: 0, y: -speed },
      weapon.baseDamage,
      '#f8f',
      '|'
    ));

    // Down
    projectiles.push(createProjectile(
      player.position,
      { x: 0, y: speed },
      weapon.baseDamage,
      '#f8f',
      '|'
    ));
  }
}

// 3. EvensWeapon - Two projectiles: left and right
export class EvensWeapon implements WeaponBehavior {
  fire(player: Player, weapon: WeaponInstance, enemies: LetterEnemy[], projectiles: Projectile[]): void {
    const speed = 500;

    // Left
    projectiles.push(createProjectile(
      player.position,
      { x: -speed, y: 0 },
      weapon.baseDamage,
      '#8f8',
      '—'
    ));

    // Right
    projectiles.push(createProjectile(
      player.position,
      { x: speed, y: 0 },
      weapon.baseDamage,
      '#8f8',
      '—'
    ));
  }
}

// 4. PrimesWeapon - Circular aura (continuous damage)
export class PrimesWeapon implements WeaponBehavior {
  private auraRadius = 150;

  fire(player: Player, weapon: WeaponInstance, enemies: LetterEnemy[], projectiles: Projectile[]): void {
    // Aura is handled in update, not fire
  }

  update(player: Player, weapon: WeaponInstance, enemies: LetterEnemy[], deltaTime: number): void {
    // Damage all enemies within radius
    const damagePerSecond = weapon.baseDamage * 3;
    const damageThisFrame = (damagePerSecond * deltaTime) / 1000;

    for (const enemy of enemies) {
      const dist = getDistance(player.position, enemy.position);
      if (dist <= this.auraRadius) {
        enemy.health -= damageThisFrame;
      }
    }
  }

  getVisualEffect() {
    return { type: 'aura', radius: this.auraRadius, color: '#ff0', alpha: 0.3 };
  }
}

// 5. FibonacciWeapon - Arc of 5-8 projectiles at nearest enemy
export class FibonacciWeapon implements WeaponBehavior {
  fire(player: Player, weapon: WeaponInstance, enemies: LetterEnemy[], projectiles: Projectile[]): void {
    const target = findNearestEnemy(player.position, enemies);
    if (!target) return;

    // Only fire if enemy is close
    const dist = getDistance(player.position, target.position);
    if (dist > 300) return;

    const dx = target.position.x - player.position.x;
    const dy = target.position.y - player.position.y;
    const baseAngle = Math.atan2(dy, dx);

    const count = 8;
    const spreadAngle = Math.PI / 3; // 60 degrees total spread

    for (let i = 0; i < count; i++) {
      const offset = (i / (count - 1)) - 0.5;
      const angle = baseAngle + offset * spreadAngle;

      const speed = 700;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      projectiles.push(createProjectile(
        player.position,
        { x: vx, y: vy },
        weapon.baseDamage * 1.2,
        '#f80',
        '◆'
      ));
    }
  }
}

// 6. FactorialsWeapon - Rapid-fire laser at nearest enemy
export class FactorialsWeapon implements WeaponBehavior {
  fire(player: Player, weapon: WeaponInstance, enemies: LetterEnemy[], projectiles: Projectile[]): void {
    const target = findNearestEnemy(player.position, enemies);
    if (!target) return;

    const dx = target.position.x - player.position.x;
    const dy = target.position.y - player.position.y;
    const dir = normalizeVector(dx, dy);

    const speed = 800;
    projectiles.push(createProjectile(
      player.position,
      { x: dir.x * speed, y: dir.y * speed },
      weapon.baseDamage * 0.6, // Lower damage but fires faster
      '#f00',
      '!'
    ));
  }
}

// 7. SquaresWeapon - Projectile with explosion on impact
export class SquaresWeapon implements WeaponBehavior {
  fire(player: Player, weapon: WeaponInstance, enemies: LetterEnemy[], projectiles: Projectile[]): void {
    const target = findNearestEnemy(player.position, enemies);
    if (!target) return;

    const dx = target.position.x - player.position.x;
    const dy = target.position.y - player.position.y;
    const dir = normalizeVector(dx, dy);

    const speed = 400;
    projectiles.push(createProjectile(
      player.position,
      { x: dir.x * speed, y: dir.y * speed },
      weapon.baseDamage,
      '#f0f',
      '■',
      { explosionRadius: 80 }
    ));
  }
}

// 8. CubesWeapon - Bouncing projectile
export class CubesWeapon implements WeaponBehavior {
  fire(player: Player, weapon: WeaponInstance, enemies: LetterEnemy[], projectiles: Projectile[]): void {
    const target = findNearestEnemy(player.position, enemies);
    if (!target) return;

    const dx = target.position.x - player.position.x;
    const dy = target.position.y - player.position.y;
    const dir = normalizeVector(dx, dy);

    const speed = 500;
    projectiles.push(createProjectile(
      player.position,
      { x: dir.x * speed, y: dir.y * speed },
      weapon.baseDamage * 1.5,
      '#0f8',
      '◇',
      { bounces: 4 }
    ));
  }
}

// 9. BiquadratesWeapon - Slow, thick, piercing beam
export class BiquadratesWeapon implements WeaponBehavior {
  fire(player: Player, weapon: WeaponInstance, enemies: LetterEnemy[], projectiles: Projectile[]): void {
    const target = findNearestEnemy(player.position, enemies);
    if (!target) return;

    const dx = target.position.x - player.position.x;
    const dy = target.position.y - player.position.y;
    const dir = normalizeVector(dx, dy);

    const speed = 300;
    projectiles.push(createProjectile(
      player.position,
      { x: dir.x * speed, y: dir.y * speed },
      weapon.baseDamage * 2,
      '#ff0',
      '▬',
      { piercing: true, radius: 16 }
    ));
  }
}

// Factory to get weapon behavior by type
export function getWeaponBehavior(type: string): WeaponBehavior {
  switch (type) {
    case 'one': return new OneWeapon();
    case 'odds': return new OddsWeapon();
    case 'evens': return new EvensWeapon();
    case 'primes': return new PrimesWeapon();
    case 'fibonacci': return new FibonacciWeapon();
    case 'factorials': return new FactorialsWeapon();
    case 'squares': return new SquaresWeapon();
    case 'cubes': return new CubesWeapon();
    case 'biquadrates': return new BiquadratesWeapon();
    default: return new OneWeapon();
  }
}
