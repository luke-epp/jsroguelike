// Game data - math constants, operators, font levels

import { Player, MathConstant, MathOperator, FontLevel, WeaponInstance } from './types.js';
import { createWeaponFromEquation } from './equationSystem.js';

// Legacy export for old character select screen (unused)
export const CHARACTERS: any[] = [];

// Integer constants (weighted by value - lower numbers more common)
export const MATH_CONSTANTS: MathConstant[] = [
  // Common (2-5)
  { id: '2', symbol: '2', name: 'two', value: 2, rarity: 'common', color: '#88f' },
  { id: '3', symbol: '3', name: 'three', value: 3, rarity: 'common', color: '#88f' },
  { id: '4', symbol: '4', name: 'four', value: 4, rarity: 'common', color: '#88f' },
  { id: '5', symbol: '5', name: 'five', value: 5, rarity: 'common', color: '#88f' },

  // Uncommon (6-10)
  { id: '6', symbol: '6', name: 'six', value: 6, rarity: 'uncommon', color: '#8f8' },
  { id: '7', symbol: '7', name: 'seven', value: 7, rarity: 'uncommon', color: '#8f8' },
  { id: '8', symbol: '8', name: 'eight', value: 8, rarity: 'uncommon', color: '#8f8' },
  { id: '9', symbol: '9', name: 'nine', value: 9, rarity: 'uncommon', color: '#8f8' },
  { id: '10', symbol: '10', name: 'ten', value: 10, rarity: 'uncommon', color: '#8f8' },

  // Rare (11-20)
  { id: '11', symbol: '11', name: 'eleven', value: 11, rarity: 'rare', color: '#f8f' },
  { id: '12', symbol: '12', name: 'twelve', value: 12, rarity: 'rare', color: '#f8f' },
  { id: '15', symbol: '15', name: 'fifteen', value: 15, rarity: 'rare', color: '#f8f' },
  { id: '20', symbol: '20', name: 'twenty', value: 20, rarity: 'rare', color: '#f8f' },

  // Legendary (25+)
  { id: '25', symbol: '25', name: 'twenty-five', value: 25, rarity: 'legendary', color: '#ff0' },
  { id: '30', symbol: '30', name: 'thirty', value: 30, rarity: 'legendary', color: '#ff0' },
  { id: '50', symbol: '50', name: 'fifty', value: 50, rarity: 'legendary', color: '#fa0' }
];

// Math operators
export const OPERATORS: MathOperator[] = [
  { id: 'add', symbol: '+', name: 'addition', color: '#0f0' },
  { id: 'subtract', symbol: '-', name: 'subtraction', color: '#f88' },
  { id: 'multiply', symbol: '×', name: 'multiplication', color: '#88f' },
  { id: 'divide', symbol: '/', name: 'division', color: '#f8f' },
  { id: 'power', symbol: '^', name: 'exponentiation', color: '#ff0' }
];

// Font-based difficulty levels
export const FONT_LEVELS: FontLevel[] = [
  {
    id: 'comic_sans',
    name: 'Comic Sans',
    fontFamily: 'Comic Sans MS, cursive',
    difficulty: 1,
    unlocked: true,
    enemyHealthMultiplier: 1.0,
    enemyDamageMultiplier: 1.0,
    isBoss: false
  },
  {
    id: 'arial',
    name: 'Arial',
    fontFamily: 'Arial, sans-serif',
    difficulty: 2,
    unlocked: false,
    enemyHealthMultiplier: 1.3,
    enemyDamageMultiplier: 1.2,
    isBoss: false
  },
  {
    id: 'times',
    name: 'Times New Roman',
    fontFamily: 'Times New Roman, serif',
    difficulty: 3,
    unlocked: false,
    enemyHealthMultiplier: 1.6,
    enemyDamageMultiplier: 1.4,
    isBoss: false
  },
  {
    id: 'courier',
    name: 'Courier',
    fontFamily: 'Courier New, monospace',
    difficulty: 4,
    unlocked: false,
    enemyHealthMultiplier: 2.0,
    enemyDamageMultiplier: 1.6,
    isBoss: false
  },
  {
    id: 'helvetica',
    name: 'Helvetica',
    fontFamily: 'Helvetica, Arial, sans-serif',
    difficulty: 5,
    unlocked: false,
    enemyHealthMultiplier: 2.5,
    enemyDamageMultiplier: 1.8,
    isBoss: false
  },
  {
    id: 'wingdings',
    name: 'Wingdings / !',
    fontFamily: 'Arial, sans-serif', // Use Arial for the ! boss
    difficulty: 6,
    unlocked: false,
    enemyHealthMultiplier: 3.5,
    enemyDamageMultiplier: 2.5,
    isBoss: true
  }
];

// Drop rate configuration
export const DROP_RATES = {
  constant: {
    common: 0.4,
    uncommon: 0.2,
    rare: 0.08,
    legendary: 0.02
  },
  operator: {
    world: 0.5, // Chance for operators scattered in level
    elite: 1.0  // Elite enemies always drop operators
  },
  equalSign: {
    firstKill: 1.0,
    boss: 1.0,
    normal: 0.05
  }
};

// Create the default "1" player
export function createPlayer(): Player {
  // Create starting weapon: "0" (one type)
  const startingWeapon: WeaponInstance = {
    id: 'weapon_zero',
    type: 'one',
    equation: {
      components: [],
      evaluatedValue: 0
    },
    level: 1,
    baseDamage: 10,
    cooldown: 800,
    cooldownTimer: 0
  };

  return {
    id: 'player',
    position: { x: 640, y: 352 },
    velocity: { x: 0, y: 0 },
    sprite: '1',
    color: '#0ff',
    radius: 16,
    health: 100,
    maxHealth: 100,
    level: 1,
    experience: 0,
    experienceToNextLevel: 100,
    currentWeapons: [startingWeapon],
    inventory: {
      constants: [],
      operators: [],
      equalSigns: 0
    },
    speed: 300
  };
}

// Number-based upgrade system
import { LevelUpOption, WeaponType } from './types.js';
import { getNumberProperties, calculateRarityMultiplier } from './mathUtils.js';

export function generateRandomNumber(): number {
  const rand = Math.random();

  // Weighted random generation
  if (rand < 0.5) {
    // 50%: small numbers (1-10)
    return Math.floor(Math.random() * 10) + 1;
  } else if (rand < 0.8) {
    // 30%: medium numbers (11-50)
    return Math.floor(Math.random() * 40) + 11;
  } else if (rand < 0.95) {
    // 15%: large numbers (51-100)
    return Math.floor(Math.random() * 50) + 51;
  } else {
    // 5%: very large numbers (101-200)
    return Math.floor(Math.random() * 100) + 101;
  }
}

export function getRandomLevelUpOptions(count: number = 3): LevelUpOption[] {
  const options: LevelUpOption[] = [];

  for (let i = 0; i < count; i++) {
    const number = generateRandomNumber();
    const properties = getNumberProperties(number);
    const multiplier = calculateRarityMultiplier(properties);

    const displayText = properties.length > 0
      ? `${number} (${properties.join(', ')})`
      : `${number}`;

    options.push({
      number,
      properties,
      displayText,
      damageMultiplier: multiplier
    });
  }

  return options;
}
