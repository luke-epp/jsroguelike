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

export interface Player extends Entity {
  health: number;
  maxHealth: number;
  level: number;
  experience: number;
  experienceToNextLevel: number;
  stats: PlayerStats;
  shootCooldown: number;
  shootTimer: number;
  projectileSpeed: number;
  projectileDamage: number;
}

export interface PlayerStats {
  strength: number;
  defense: number;
  speed: number;
}

export interface Enemy extends Entity {
  health: number;
  maxHealth: number;
  damage: number;
  experienceReward: number;
  shootCooldown: number;
  shootTimer: number;
  projectileSpeed: number;
  aiType: 'chaser' | 'shooter' | 'circler';
}

export interface Item {
  id: string;
  name: string;
  description: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  apply: (player: Player) => void;
}

export interface LevelUpOption {
  name: string;
  description: string;
  apply: (player: Player) => void;
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
}

export type GameScreen = 'menu' | 'characterSelect' | 'levelSelect' | 'game' | 'levelUp' | 'gameOver';

export interface GameState {
  screen: GameScreen;
  player: Player | null;
  enemies: Enemy[];
  projectiles: Projectile[];
  items: Item[];
  currentLevel: number;
  score: number;
  levelUpOptions: LevelUpOption[];
}
