// Main gameplay screen - Bullet Hell Auto-Battler

import { Renderer } from '../renderer.js';
import { InputManager } from '../input.js';
import { GameScreen as GameScreenType, Player, Enemy, Projectile, Position } from '../types.js';

export class GameplayScreen {
  private player: Player;
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private worldWidth = 1280;
  private worldHeight = 704;
  private waveTimer: number;
  private waveDuration = 30000; // 30 seconds
  private enemySpawnTimer = 0;
  private enemySpawnInterval = 2000; // spawn every 2 seconds

  constructor(player: Player, wave: number) {
    this.player = this.initializePlayerPhysics(player);
    this.waveTimer = this.waveDuration;
    this.waveDuration = 30000 + (wave - 1) * 15000; // 30s, 45s, 60s
    this.waveTimer = this.waveDuration;
    this.enemySpawnInterval = Math.max(1000, 2000 - (wave - 1) * 200); // faster spawns per wave
  }

  private initializePlayerPhysics(player: Player): Player {
    return {
      ...player,
      position: { x: this.worldWidth / 2, y: this.worldHeight / 2 },
      velocity: { x: 0, y: 0 },
      radius: 16
    };
  }

  update(input: InputManager, deltaTime: number): GameScreenType | null {
    const dt = deltaTime / 1000; // convert to seconds for physics

    // 1. Update wave timer
    this.waveTimer -= deltaTime;
    if (this.waveTimer <= 0) {
      return 'levelUp'; // wave complete!
    }

    // 2. Spawn enemies continuously
    this.updateEnemySpawning(deltaTime);

    // 3. Player movement
    this.updatePlayerMovement(input, dt);

    // 4. Player auto-shooting
    this.updatePlayerShooting(deltaTime);

    // 5. Enemy movement + shooting
    this.updateEnemies(dt, deltaTime);

    // 6. Update projectiles
    this.updateProjectiles(dt, deltaTime);

    // 7. Collision detection
    this.checkCollisions();

    // 8. Check game over
    if (this.player.health <= 0) {
      return 'gameOver';
    }

    return null;
  }

  private updatePlayerMovement(input: InputManager, dt: number): void {
    const maxSpeed = 100 + this.player.stats.speed * 20;
    const acceleration = 800;
    const friction = 0.85;

    let ax = 0, ay = 0;
    if (input.isKeyDown('a') || input.isKeyDown('ArrowLeft')) ax -= 1;
    if (input.isKeyDown('d') || input.isKeyDown('ArrowRight')) ax += 1;
    if (input.isKeyDown('w') || input.isKeyDown('ArrowUp')) ay -= 1;
    if (input.isKeyDown('s') || input.isKeyDown('ArrowDown')) ay += 1;

    // Normalize diagonal movement
    if (ax !== 0 && ay !== 0) {
      ax *= 0.707;
      ay *= 0.707;
    }

    // Apply acceleration
    this.player.velocity.x += ax * acceleration * dt;
    this.player.velocity.y += ay * acceleration * dt;

    // Apply friction when no input
    if (ax === 0) this.player.velocity.x *= friction;
    if (ay === 0) this.player.velocity.y *= friction;

    // Clamp to max speed
    const speed = Math.sqrt(
      this.player.velocity.x ** 2 + this.player.velocity.y ** 2
    );
    if (speed > maxSpeed) {
      this.player.velocity.x = (this.player.velocity.x / speed) * maxSpeed;
      this.player.velocity.y = (this.player.velocity.y / speed) * maxSpeed;
    }

    // Update position
    this.player.position.x += this.player.velocity.x * dt;
    this.player.position.y += this.player.velocity.y * dt;

    // Clamp to world bounds
    this.player.position.x = Math.max(
      this.player.radius,
      Math.min(this.worldWidth - this.player.radius, this.player.position.x)
    );
    this.player.position.y = Math.max(
      this.player.radius,
      Math.min(this.worldHeight - this.player.radius, this.player.position.y)
    );
  }

  private updatePlayerShooting(deltaTime: number): void {
    this.player.shootTimer -= deltaTime;

    if (this.player.shootTimer <= 0 && this.enemies.length > 0) {
      const target = this.findNearestEnemy();
      if (target) {
        this.fireProjectile(
          this.player.position,
          target.position,
          this.player.projectileSpeed,
          this.player.projectileDamage,
          'player',
          '•',
          '#0ff'
        );
        this.player.shootTimer = this.player.shootCooldown;
      }
    }
  }

  private findNearestEnemy(): Enemy | null {
    if (this.enemies.length === 0) return null;

    let nearest = this.enemies[0];
    let minDist = this.distance(this.player.position, nearest.position);

    for (const enemy of this.enemies) {
      const dist = this.distance(this.player.position, enemy.position);
      if (dist < minDist) {
        minDist = dist;
        nearest = enemy;
      }
    }
    return nearest;
  }

  private fireProjectile(
    from: Position,
    to: Position,
    speed: number,
    damage: number,
    owner: 'player' | 'enemy',
    sprite: string,
    color: string
  ): void {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist === 0) return;

    const vx = (dx / dist) * speed;
    const vy = (dy / dist) * speed;

    const projectile: Projectile = {
      id: `proj_${Date.now()}_${Math.random()}`,
      position: { x: from.x, y: from.y },
      velocity: { x: vx, y: vy },
      damage,
      owner,
      sprite,
      color,
      lifetime: 3000,
      radius: 4
    };

    this.projectiles.push(projectile);
  }

  private distance(a: Position, b: Position): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  private updateEnemySpawning(deltaTime: number): void {
    this.enemySpawnTimer += deltaTime;

    if (this.enemySpawnTimer >= this.enemySpawnInterval) {
      this.enemySpawnTimer = 0;
      this.spawnEnemy();
    }
  }

  private spawnEnemy(): void {
    const edge = Math.floor(Math.random() * 4);
    let x = 0, y = 0;

    switch (edge) {
      case 0: // top
        x = Math.random() * this.worldWidth;
        y = 0;
        break;
      case 1: // right
        x = this.worldWidth;
        y = Math.random() * this.worldHeight;
        break;
      case 2: // bottom
        x = Math.random() * this.worldWidth;
        y = this.worldHeight;
        break;
      case 3: // left
        x = 0;
        y = Math.random() * this.worldHeight;
        break;
    }

    const aiTypes: ('chaser' | 'shooter' | 'circler')[] = ['chaser', 'shooter', 'circler'];
    const aiType = aiTypes[Math.floor(Math.random() * aiTypes.length)];

    const enemy: Enemy = {
      id: `enemy_${Date.now()}_${Math.random()}`,
      position: { x, y },
      velocity: { x: 0, y: 0 },
      sprite: aiType === 'shooter' ? '🎯' : aiType === 'circler' ? '🌀' : '👾',
      color: '#f44',
      radius: 16,
      health: 30,
      maxHealth: 30,
      damage: 5,
      experienceReward: 10,
      shootCooldown: aiType === 'shooter' ? 1500 : 3000,
      shootTimer: Math.random() * 1000, // random initial delay
      projectileSpeed: 400,
      aiType
    };

    this.enemies.push(enemy);
  }

  private updateEnemies(dt: number, deltaTime: number): void {
    this.enemies.forEach(enemy => {
      enemy.shootTimer -= deltaTime;

      switch (enemy.aiType) {
        case 'chaser':
          this.updateChaserAI(enemy, dt);
          break;
        case 'shooter':
          this.updateShooterAI(enemy, dt, deltaTime);
          break;
        case 'circler':
          this.updateCirclerAI(enemy, dt);
          break;
      }

      // Update position
      enemy.position.x += enemy.velocity.x * dt;
      enemy.position.y += enemy.velocity.y * dt;

      // Clamp to bounds
      enemy.position.x = Math.max(enemy.radius, Math.min(this.worldWidth - enemy.radius, enemy.position.x));
      enemy.position.y = Math.max(enemy.radius, Math.min(this.worldHeight - enemy.radius, enemy.position.y));
    });
  }

  private updateChaserAI(enemy: Enemy, dt: number): void {
    const dx = this.player.position.x - enemy.position.x;
    const dy = this.player.position.y - enemy.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
      const speed = 80;
      enemy.velocity.x = (dx / dist) * speed;
      enemy.velocity.y = (dy / dist) * speed;
    }
  }

  private updateShooterAI(enemy: Enemy, dt: number, deltaTime: number): void {
    const dx = this.player.position.x - enemy.position.x;
    const dy = this.player.position.y - enemy.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const preferredDist = 300;
    const speed = 100;

    if (dist < preferredDist && dist > 0) {
      // Move away
      enemy.velocity.x = -(dx / dist) * speed;
      enemy.velocity.y = -(dy / dist) * speed;
    } else if (dist > preferredDist + 50) {
      // Move closer
      enemy.velocity.x = (dx / dist) * speed * 0.5;
      enemy.velocity.y = (dy / dist) * speed * 0.5;
    } else {
      // Maintain position
      enemy.velocity.x *= 0.9;
      enemy.velocity.y *= 0.9;
    }

    // Shoot at player
    if (enemy.shootTimer <= 0) {
      this.fireProjectile(
        enemy.position,
        this.player.position,
        400,
        enemy.damage,
        'enemy',
        '•',
        '#f44'
      );
      enemy.shootTimer = enemy.shootCooldown;
    }
  }

  private updateCirclerAI(enemy: Enemy, dt: number): void {
    const dx = this.player.position.x - enemy.position.x;
    const dy = this.player.position.y - enemy.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
      const speed = 120;
      const orbitRadius = 200;

      // Tangent vector for circular motion
      const tangentX = -dy / dist;
      const tangentY = dx / dist;

      // Radial correction
      const radialX = dx / dist;
      const radialY = dy / dist;
      const distError = dist - orbitRadius;

      enemy.velocity.x = tangentX * speed + radialX * distError * 0.5;
      enemy.velocity.y = tangentY * speed + radialY * distError * 0.5;
    }
  }

  private updateProjectiles(dt: number, deltaTime: number): void {
    this.projectiles = this.projectiles.filter(proj => {
      // Update position
      proj.position.x += proj.velocity.x * dt;
      proj.position.y += proj.velocity.y * dt;

      // Update lifetime
      proj.lifetime -= deltaTime;

      // Remove if out of bounds or expired
      return proj.lifetime > 0 &&
             proj.position.x >= 0 && proj.position.x <= this.worldWidth &&
             proj.position.y >= 0 && proj.position.y <= this.worldHeight;
    });
  }

  private checkCollisions(): void {
    // Projectile vs entity collisions
    this.projectiles = this.projectiles.filter(proj => {
      if (proj.owner === 'player') {
        // Check against enemies
        for (const enemy of this.enemies) {
          if (this.circleCollision(proj.position, proj.radius, enemy.position, enemy.radius)) {
            enemy.health -= proj.damage;
            if (enemy.health <= 0) {
              this.onEnemyKilled(enemy);
            }
            return false; // remove projectile
          }
        }
      } else {
        // Check against player
        if (this.circleCollision(proj.position, proj.radius, this.player.position, this.player.radius)) {
          const damage = Math.max(1, proj.damage - this.player.stats.defense);
          this.player.health -= damage;
          return false; // remove projectile
        }
      }
      return true; // keep projectile
    });

    // Remove dead enemies
    this.enemies = this.enemies.filter(e => e.health > 0);
  }

  private circleCollision(
    pos1: Position, r1: number,
    pos2: Position, r2: number
  ): boolean {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const distSq = dx * dx + dy * dy;
    const radiusSum = r1 + r2;
    return distSq < radiusSum * radiusSum;
  }

  private onEnemyKilled(enemy: Enemy): void {
    this.player.experience += enemy.experienceReward;

    // Level up logic
    if (this.player.experience >= this.player.experienceToNextLevel) {
      this.player.level++;
      this.player.experience -= this.player.experienceToNextLevel;
      this.player.experienceToNextLevel = Math.floor(this.player.experienceToNextLevel * 1.5);
    }
  }

  render(renderer: Renderer): void {
    renderer.clear();

    // Draw projectiles
    this.projectiles.forEach(proj => {
      renderer.drawProjectile(proj.position.x, proj.position.y, proj.radius, proj.color);
    });

    // Draw enemies
    this.enemies.forEach(enemy => {
      renderer.drawEntity(
        enemy.position.x,
        enemy.position.y,
        enemy.radius,
        enemy.sprite,
        enemy.color
      );
      // Draw enemy health bar above them
      const barWidth = 30;
      const barHeight = 4;
      renderer.drawHealthBar(
        enemy.position.x - barWidth / 2,
        enemy.position.y - enemy.radius - 10,
        barWidth,
        barHeight,
        enemy.health,
        enemy.maxHealth
      );
    });

    // Draw player
    renderer.drawEntity(
      this.player.position.x,
      this.player.position.y,
      this.player.radius,
      this.player.sprite,
      this.player.color
    );

    // UI - Wave timer (centered top)
    renderer.drawText('WAVE TIMER:', renderer.canvas.width / 2 - 100, 20, 24, '#fff');
    renderer.drawWaveTimer(this.waveTimer, renderer.canvas.width / 2 + 100, 20);

    // UI - Bottom bar
    const uiY = renderer.canvas.height - 60;
    renderer.drawText(`Level: ${this.player.level}`, 10, uiY, 20, '#fff');
    renderer.drawText(`Enemies: ${this.enemies.length}`, 200, uiY, 20, '#fff');

    renderer.drawText('Health:', 400, uiY, 20, '#fff');
    renderer.drawHealthBar(500, uiY, 200, 20, this.player.health, this.player.maxHealth);
    renderer.drawText(`${this.player.health}/${this.player.maxHealth}`, 720, uiY, 16, '#fff');

    // Stats
    renderer.drawText(
      `STR: ${this.player.stats.strength} | DEF: ${this.player.stats.defense} | SPD: ${this.player.stats.speed}`,
      10,
      uiY + 30,
      16,
      '#aaa'
    );
  }

  getPlayer(): Player {
    return this.player;
  }
}
