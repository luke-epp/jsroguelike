// Core game types

export interface Position {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  position: Position;
  velocity: { x: number; y: number };
  sprite: string;
  color: string;
  radius: number;
}

// Math-themed types
export interface MathConstant {
  id: string;
  symbol: string;
  name: string;
  value: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  color: string;
}

export interface MathOperator {
  id: string;
  symbol: string;
  name: string;
  color: string;
}

export type EquationComponent = MathConstant | MathOperator;

export interface Equation {
  components: EquationComponent[];
  evaluatedValue: number;
}

export type WeaponType = 'one' | 'odds' | 'evens' | 'primes' | 'fibonacci' | 'factorials' | 'squares' | 'cubes' | 'biquadrates';

export interface WeaponInstance {
  id: string;
  type: WeaponType;
  equation: Equation;
  level: number;
  baseDamage: number;
  cooldown: number;
  cooldownTimer: number;
}

export interface PlayerInventory {
  constants: MathConstant[];
  operators: MathOperator[];
  equalSigns: number;
}

export interface Player extends Entity {
  health: number;
  maxHealth: number;
  level: number;
  experience: number;
  experienceToNextLevel: number;
  currentWeapons: WeaponInstance[];
  inventory: PlayerInventory;
  speed: number;
}

export type EnemyStyle = 'normal' | 'bold' | 'underlined' | 'italic';

export interface LetterEnemy extends Entity {
  health: number;
  maxHealth: number;
  damage: number;
  experienceReward: number;
  letter: string;
  evolutionStage: number;
  style: EnemyStyle;
  isElite: boolean;
  attackTimer?: number;
  behaviorTimer?: number;
}

export interface WorldItem extends Entity {
  itemType: 'constant' | 'operator' | 'equalSign' | 'lootBox';
  data: MathConstant | MathOperator | null;
  opened?: boolean; // For loot boxes
}

export interface Obstacle {
  id: string;
  position: Position;
  width: number;
  height: number;
  color: string;
  shape: 'rectangle' | 'circle';
  radius?: number; // For circles
}

export interface FontLevel {
  id: string;
  name: string;
  fontFamily: string;
  difficulty: number;
  unlocked: boolean;
  enemyHealthMultiplier: number;
  enemyDamageMultiplier: number;
  isBoss: boolean;
}

export interface LevelUpOption {
  number: number;
  properties: WeaponType[];
  displayText: string;
  damageMultiplier: number;
}

export interface Projectile {
  id: string;
  position: Position;
  velocity: { x: number; y: number };
  damage: number;
  owner: 'player' | 'enemy';
  sprite: string;
  color: string;
  lifetime: number;
  radius: number;
  piercing?: boolean;
  bounces?: number;
  explosionRadius?: number;
}

export type GameScreen = 'menu' | 'levelSelect' | 'game' | 'levelUp' | 'gameOver' | 'equationBuilder';

export interface GameState {
  screen: GameScreen;
  player: Player | null;
  enemies: LetterEnemy[];
  projectiles: Projectile[];
  worldItems: WorldItem[];
  currentFontLevel: number;
  score: number;
  levelUpOptions: LevelUpOption[];
}
