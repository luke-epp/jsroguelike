// Chunk-based infinite world generation system

import { Obstacle, WorldItem, MathConstant, MathOperator } from './types.js';
import { MATH_CONSTANTS, OPERATORS } from './gameData.js';

export interface Chunk {
  x: number; // Chunk coordinates (not pixel coordinates)
  y: number;
  id: string;
  obstacles: Obstacle[];
  items: WorldItem[];
  generated: boolean;
}

export class ChunkSystem {
  private chunks: Map<string, Chunk> = new Map();
  private chunkSize = 1000; // Size of each chunk in pixels
  private loadRadius = 2; // Load chunks within 2 chunk radius
  private seed: number;

  constructor(seed: number = Date.now()) {
    this.seed = seed;
  }

  // Get chunk ID from chunk coordinates
  private getChunkId(chunkX: number, chunkY: number): string {
    return `${chunkX},${chunkY}`;
  }

  // Convert world position to chunk coordinates
  private worldToChunk(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: Math.floor(worldX / this.chunkSize),
      y: Math.floor(worldY / this.chunkSize)
    };
  }

  // Seeded random number generator
  private seededRandom(x: number, y: number, offset: number = 0): number {
    const n = Math.sin(x * 12.9898 + y * 78.233 + offset + this.seed) * 43758.5453123;
    return n - Math.floor(n);
  }

  // Generate chunk content
  private generateChunk(chunkX: number, chunkY: number): Chunk {
    const id = this.getChunkId(chunkX, chunkY);
    const chunk: Chunk = {
      x: chunkX,
      y: chunkY,
      id,
      obstacles: [],
      items: [],
      generated: true
    };

    // Base position of this chunk in world coordinates
    const baseX = chunkX * this.chunkSize;
    const baseY = chunkY * this.chunkSize;

    // Generate obstacles (3-6 per chunk)
    const obstacleCount = Math.floor(this.seededRandom(chunkX, chunkY, 1) * 4) + 3;
    for (let i = 0; i < obstacleCount; i++) {
      const x = baseX + this.seededRandom(chunkX, chunkY, i * 10) * this.chunkSize;
      const y = baseY + this.seededRandom(chunkX, chunkY, i * 10 + 1) * this.chunkSize;

      const isCircle = this.seededRandom(chunkX, chunkY, i * 10 + 2) > 0.5;

      if (isCircle) {
        const radius = 30 + this.seededRandom(chunkX, chunkY, i * 10 + 3) * 40;
        chunk.obstacles.push({
          id: `obs_${id}_${i}`,
          position: { x, y },
          width: radius * 2,
          height: radius * 2,
          color: '#333',
          shape: 'circle',
          radius
        });
      } else {
        const width = 40 + this.seededRandom(chunkX, chunkY, i * 10 + 4) * 80;
        const height = 40 + this.seededRandom(chunkX, chunkY, i * 10 + 5) * 80;
        chunk.obstacles.push({
          id: `obs_${id}_${i}`,
          position: { x, y },
          width,
          height,
          color: '#333',
          shape: 'rectangle'
        });
      }
    }

    // Generate loot boxes (0-1 per chunk, rare)
    if (this.seededRandom(chunkX, chunkY, 100) < 0.3) {
      const x = baseX + this.seededRandom(chunkX, chunkY, 101) * this.chunkSize;
      const y = baseY + this.seededRandom(chunkX, chunkY, 102) * this.chunkSize;
      chunk.items.push({
        id: `lootbox_${id}`,
        position: { x, y },
        velocity: { x: 0, y: 0 },
        sprite: '📦',
        color: '#fa0',
        radius: 20,
        itemType: 'lootBox',
        data: null,
        opened: false
      });
    }

    return chunk;
  }

  // Update loaded chunks based on player position
  updateChunks(playerX: number, playerY: number): void {
    const playerChunk = this.worldToChunk(playerX, playerY);
    const newChunks = new Set<string>();

    // Load chunks around player
    for (let dx = -this.loadRadius; dx <= this.loadRadius; dx++) {
      for (let dy = -this.loadRadius; dy <= this.loadRadius; dy++) {
        const chunkX = playerChunk.x + dx;
        const chunkY = playerChunk.y + dy;
        const id = this.getChunkId(chunkX, chunkY);

        newChunks.add(id);

        // Generate chunk if not exists
        if (!this.chunks.has(id)) {
          const chunk = this.generateChunk(chunkX, chunkY);
          this.chunks.set(id, chunk);
        }
      }
    }

    // Unload far chunks (keep some extra for smooth transitions)
    const unloadRadius = this.loadRadius + 2;
    const toRemove: string[] = [];

    for (const [id, chunk] of this.chunks) {
      const dx = Math.abs(chunk.x - playerChunk.x);
      const dy = Math.abs(chunk.y - playerChunk.y);
      if (dx > unloadRadius || dy > unloadRadius) {
        toRemove.push(id);
      }
    }

    toRemove.forEach(id => this.chunks.delete(id));
  }

  // Get all loaded obstacles
  getObstacles(): Obstacle[] {
    const obstacles: Obstacle[] = [];
    for (const chunk of this.chunks.values()) {
      obstacles.push(...chunk.obstacles);
    }
    return obstacles;
  }

  // Get all loaded items
  getItems(): WorldItem[] {
    const items: WorldItem[] = [];
    for (const chunk of this.chunks.values()) {
      items.push(...chunk.items);
    }
    return items;
  }

  // Get loaded chunk count (for debug)
  getLoadedChunkCount(): number {
    return this.chunks.size;
  }

  // Get spawn position for enemies (around player, but not too close)
  getEnemySpawnPosition(playerX: number, playerY: number): { x: number; y: number } {
    const angle = Math.random() * Math.PI * 2;
    const distance = 600 + Math.random() * 400; // 600-1000 pixels away

    return {
      x: playerX + Math.cos(angle) * distance,
      y: playerY + Math.sin(angle) * distance
    };
  }
}
