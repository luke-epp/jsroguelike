// Procedural world generation

import { Obstacle } from './types.js';

export class WorldGenerator {
  private worldWidth: number;
  private worldHeight: number;

  constructor(worldWidth: number, worldHeight: number) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
  }

  generateObstacles(seed: number = Date.now()): Obstacle[] {
    const obstacles: Obstacle[] = [];
    const random = this.seededRandom(seed);

    // Generate clusters of obstacles
    const numClusters = 30 + Math.floor(random() * 20);

    for (let i = 0; i < numClusters; i++) {
      const clusterX = random() * this.worldWidth;
      const clusterY = random() * this.worldHeight;

      // Skip center area (player spawn)
      const distFromCenter = Math.sqrt(
        Math.pow(clusterX - this.worldWidth / 2, 2) +
        Math.pow(clusterY - this.worldHeight / 2, 2)
      );
      if (distFromCenter < 300) continue;

      // Generate 3-8 obstacles per cluster
      const obstaclesInCluster = 3 + Math.floor(random() * 6);

      for (let j = 0; j < obstaclesInCluster; j++) {
        const offsetX = (random() - 0.5) * 300;
        const offsetY = (random() - 0.5) * 300;

        const x = Math.max(50, Math.min(this.worldWidth - 50, clusterX + offsetX));
        const y = Math.max(50, Math.min(this.worldHeight - 50, clusterY + offsetY));

        const useCircle = random() < 0.4;

        if (useCircle) {
          obstacles.push({
            id: `obstacle_${i}_${j}`,
            position: { x, y },
            width: 0,
            height: 0,
            radius: 20 + random() * 40,
            color: this.getRandomObstacleColor(random),
            shape: 'circle'
          });
        } else {
          obstacles.push({
            id: `obstacle_${i}_${j}`,
            position: { x, y },
            width: 40 + random() * 80,
            height: 40 + random() * 80,
            color: this.getRandomObstacleColor(random),
            shape: 'rectangle'
          });
        }
      }
    }

    return obstacles;
  }

  private getRandomObstacleColor(random: () => number): string {
    const colors = ['#444', '#333', '#555', '#2a2a2a', '#1a1a1a'];
    return colors[Math.floor(random() * colors.length)];
  }

  // Simple seeded random generator
  private seededRandom(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 9301 + 49297) % 233280;
      return state / 233280;
    };
  }
}
