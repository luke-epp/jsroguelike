// Game data - characters, level up options, items

import { Player, LevelUpOption, Item, PlayerStats } from './types.js';

export const CHARACTERS: Array<{
  name: string;
  stats: PlayerStats;
  sprite: string;
  color: string;
  shootCooldown: number;
  projectileDamage: number;
}> = [
  {
    name: 'Warrior',
    sprite: '⚔',
    color: '#f44',
    stats: { strength: 5, defense: 3, speed: 2 },
    shootCooldown: 500,
    projectileDamage: 15
  },
  {
    name: 'Rogue',
    sprite: '🗡',
    color: '#4f4',
    stats: { strength: 3, defense: 2, speed: 5 },
    shootCooldown: 300,
    projectileDamage: 10
  },
  {
    name: 'Tank',
    sprite: '🛡',
    color: '#44f',
    stats: { strength: 2, defense: 5, speed: 3 },
    shootCooldown: 700,
    projectileDamage: 12
  }
];

export function createPlayer(characterIndex: number): Player {
  const char = CHARACTERS[characterIndex];
  return {
    id: 'player',
    position: { x: 640, y: 352 },
    velocity: { x: 0, y: 0 },
    sprite: char.sprite,
    color: char.color,
    radius: 16,
    health: 100,
    maxHealth: 100,
    level: 1,
    experience: 0,
    experienceToNextLevel: 100,
    stats: { ...char.stats },
    shootCooldown: char.shootCooldown,
    shootTimer: 0,
    projectileSpeed: 600,
    projectileDamage: char.projectileDamage
  };
}

export const LEVEL_UP_OPTIONS: LevelUpOption[] = [
  {
    name: 'Increase Max Health',
    description: '+20 Max Health',
    apply: (player: Player) => {
      player.maxHealth += 20;
      player.health = player.maxHealth;
    }
  },
  {
    name: 'Boost Strength',
    description: '+2 Strength (more projectile damage)',
    apply: (player: Player) => {
      player.stats.strength += 2;
      player.projectileDamage += 3;
    }
  },
  {
    name: 'Boost Defense',
    description: '+2 Defense',
    apply: (player: Player) => {
      player.stats.defense += 2;
    }
  },
  {
    name: 'Boost Speed',
    description: '+2 Speed (faster movement)',
    apply: (player: Player) => {
      player.stats.speed += 2;
    }
  },
  {
    name: 'Full Heal',
    description: 'Restore all health',
    apply: (player: Player) => {
      player.health = player.maxHealth;
    }
  },
  {
    name: 'Faster Shooting',
    description: 'Reduce shoot cooldown by 100ms',
    apply: (player: Player) => {
      player.shootCooldown = Math.max(100, player.shootCooldown - 100);
    }
  },
  {
    name: 'Increased Projectile Damage',
    description: '+5 Projectile Damage',
    apply: (player: Player) => {
      player.projectileDamage += 5;
    }
  },
  {
    name: 'Faster Projectiles',
    description: '+100 Projectile Speed',
    apply: (player: Player) => {
      player.projectileSpeed += 100;
    }
  }
];

export function getRandomLevelUpOptions(count: number = 3): LevelUpOption[] {
  const shuffled = [...LEVEL_UP_OPTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export const ITEM_DROPS: Item[] = [
  {
    id: 'health_potion',
    name: 'Health Potion',
    description: 'Restores 30 health',
    rarity: 'common',
    apply: (player: Player) => {
      player.health = Math.min(player.maxHealth, player.health + 30);
    }
  },
  {
    id: 'strength_tome',
    name: 'Strength Tome',
    description: '+1 Strength',
    rarity: 'uncommon',
    apply: (player: Player) => {
      player.stats.strength += 1;
    }
  },
  {
    id: 'legendary_artifact',
    name: 'Legendary Artifact',
    description: '+3 to all stats',
    rarity: 'legendary',
    apply: (player: Player) => {
      player.stats.strength += 3;
      player.stats.defense += 3;
      player.stats.speed += 3;
    }
  }
];
