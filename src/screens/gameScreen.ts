// Main gameplay screen - Math-themed bullet hell

import { Renderer } from '../renderer.js';
import { InputManager } from '../input.js';
import { GameScreen as GameScreenType, Player, LetterEnemy, Projectile, Position, WorldItem, MathConstant, MathOperator, EnemyStyle, Obstacle } from '../types.js';
import { MATH_CONSTANTS, OPERATORS, DROP_RATES, FONT_LEVELS } from '../gameData.js';
import { getWeaponBehavior } from '../weapons.js';
import { Camera } from '../camera.js';
import { ChunkSystem } from '../chunkSystem.js';
import { DamageTooltipManager } from '../damageTooltip.js';
import { AudioManager } from '../audio.js';
import { Minimap } from '../minimap.js';
import { PickupNotificationManager } from '../pickupNotification.js';
import { EquationOverlay } from '../equationOverlay.js';

export class GameplayScreen {
  private player: Player;
  private enemies: LetterEnemy[] = [];
  private projectiles: Projectile[] = [];
  private worldItems: WorldItem[] = []; // Items dropped by enemies (not chunk-generated)
  private chunkSystem: ChunkSystem;
  private camera: Camera;
  private damageTooltips: DamageTooltipManager;
  private audioManager: AudioManager;
  private minimap: Minimap;
  private pickupNotifications: PickupNotificationManager;
  private equationOverlay: EquationOverlay;

  // Evolution system
  private evolutionTimer = 0;
  private evolutionInterval = 30000; // 30 seconds
  private currentLetterStage = 0; // 0='a', 1='b', 2='c'...
  private maxEvolutions = 5; // Complete after 5 evolution cycles

  private enemySpawnTimer = 0;
  private enemySpawnInterval = 2000; // Spawn every 2 seconds (was 3)
  private hasDroppedFirstEqualSign = false;
  private fontLevelIndex: number;
  private needsLevelUpScreen = false;
  private equalSignFlashTimer = 0; // Flash effect when picking up equal sign
  private totalPlaytime = 0; // Track total playtime for progressive drops

  constructor(player: Player, fontLevelIndex: number) {
    this.player = this.initializePlayerPhysics(player);
    this.fontLevelIndex = fontLevelIndex;

    // Create infinite chunk system
    this.chunkSystem = new ChunkSystem();

    // Create camera (viewport is 1280x704, NO BOUNDS for infinite world)
    this.camera = new Camera(1280, 704, Infinity, Infinity);

    // Initialize damage tooltips
    this.damageTooltips = new DamageTooltipManager();

    // Initialize audio
    this.audioManager = new AudioManager();

    // Initialize minimap (large world for display)
    this.minimap = new Minimap(10000, 10000);

    // Initialize pickup notifications
    this.pickupNotifications = new PickupNotificationManager();

    // Initialize equation overlay
    this.equationOverlay = new EquationOverlay();

    // Generate initial chunks around player
    this.chunkSystem.updateChunks(this.player.position.x, this.player.position.y);

    // Spawn initial enemies around player
    this.spawnInitialEnemies();
  }

  private initializePlayerPhysics(player: Player): Player {
    return {
      ...player,
      position: { x: 0, y: 0 }, // Start at origin in infinite world
      velocity: { x: 0, y: 0 },
      radius: 16
    };
  }

  private spawnInitialEnemies(): void {
    const count = 20 + this.fontLevelIndex * 5; // Start with 20-25+ enemies
    for (let i = 0; i < count; i++) {
      this.spawnLetterEnemy();
    }
  }

  private spawnLetterEnemy(): void {
    const letter = String.fromCharCode(97 + this.currentLetterStage); // 'a' + stage
    const fontLevel = FONT_LEVELS[this.fontLevelIndex];

    // 30% chance for elite
    const isElite = Math.random() < 0.30;
    const styles: EnemyStyle[] = ['bold', 'underlined', 'italic'];
    const style: EnemyStyle = isElite ? styles[Math.floor(Math.random() * styles.length)] : 'normal';

    const baseHealth = 30 * fontLevel.enemyHealthMultiplier;
    const baseDamage = 10 * fontLevel.enemyDamageMultiplier;

    // Spawn around player using chunk system (infinite world, no bounds!)
    const spawnPos = this.chunkSystem.getEnemySpawnPosition(
      this.player.position.x,
      this.player.position.y
    );
    const x = spawnPos.x;
    const y = spawnPos.y;

    const enemy: LetterEnemy = {
      id: `enemy_${Date.now()}_${Math.random()}`,
      position: { x, y },
      velocity: { x: 0, y: 0 },
      sprite: letter,
      color: isElite ? '#f0f' : '#f88',
      radius: 16,
      health: baseHealth * (isElite ? 2 : 1),
      maxHealth: baseHealth * (isElite ? 2 : 1),
      damage: baseDamage,
      experienceReward: 20 * (isElite ? 2 : 1),
      letter,
      evolutionStage: this.currentLetterStage,
      style,
      isElite,
      attackTimer: 0, // For attack cooldowns
      behaviorTimer: 0 // For behavior changes
    };

    this.enemies.push(enemy);
  }

  private spawnWorldItem(type: 'constant' | 'operator' | 'equalSign' | 'lootBox', position: Position, data: MathConstant | MathOperator | null = null): void {
    // Spawn near the given position (slightly offset)
    const offsetX = (Math.random() - 0.5) * 100;
    const offsetY = (Math.random() - 0.5) * 100;
    const x = position.x + offsetX;
    const y = position.y + offsetY;

    let sprite = '?';
    let color = '#fff';
    let radius = 12;

    if (type === 'lootBox') {
      sprite = '📦';
      color = '#fa0';
      radius = 20;
    } else if (type === 'equalSign') {
      sprite = '=';
      color = '#ff0';
    } else if (data) {
      sprite = (data as any).symbol;
      color = (data as any).color;
    }

    const item: WorldItem = {
      id: `item_${Date.now()}_${Math.random()}`,
      position: { x, y },
      velocity: { x: 0, y: 0 },
      sprite,
      color,
      radius,
      itemType: type,
      data,
      opened: false
    };

    this.worldItems.push(item);
  }

  update(input: InputManager, deltaTime: number): GameScreenType | null {
    const dt = deltaTime / 1000;

    // Check for level-up screen trigger
    if (this.needsLevelUpScreen) {
      this.needsLevelUpScreen = false;
      return 'levelUp';
    }

    // Toggle equation editor overlay (E or Tab key)
    if (input.isKeyJustPressed('KeyE') || input.isKeyJustPressed('Tab')) {
      this.equationOverlay.toggleEditor();
    }

    // Update equation overlay
    this.equationOverlay.update(input, this.player);

    // Track total playtime for progressive drops (only when not paused)
    if (!this.equationOverlay.isOpen()) {
      this.totalPlaytime += deltaTime;
    }

    // If equation editor is open, pause the game (only update flash timer)
    if (this.equationOverlay.isOpen()) {
      // Update equal sign flash timer even when paused
      if (this.equalSignFlashTimer > 0) {
        this.equalSignFlashTimer = Math.max(0, this.equalSignFlashTimer - deltaTime);
      }
      return null; // Don't update game logic
    }

    // Return to main menu with Escape (when editor is closed)
    if (input.isKeyJustPressed('Escape')) {
      return 'menu';
    }

    // Update evolution timer
    this.evolutionTimer += deltaTime;
    if (this.evolutionTimer >= this.evolutionInterval) {
      this.evolveEnemies();
      this.evolutionTimer = 0;
      this.currentLetterStage++;

      // Check level completion
      if (this.currentLetterStage >= this.maxEvolutions) {
        return 'levelUp';
      }
    }

    // Spawn more enemies
    this.enemySpawnTimer += deltaTime;
    if (this.enemySpawnTimer >= this.enemySpawnInterval && this.enemies.length < 30) {
      this.spawnLetterEnemy();
      this.enemySpawnTimer = 0;
    }

    // Player movement
    this.updatePlayerMovement(input, dt);

    // Update chunks based on player position (infinite world generation!)
    this.chunkSystem.updateChunks(this.player.position.x, this.player.position.y);

    // Multi-weapon firing
    this.updatePlayerWeapons(deltaTime);

    // Enemy AI
    this.updateEnemies(dt);

    // Projectiles
    this.updateProjectiles(dt, deltaTime);

    // Collisions
    this.checkCollisions();

    // Item collection
    this.checkItemCollection();

    // Update damage tooltips
    this.damageTooltips.update(deltaTime);

    // Update pickup notifications
    this.pickupNotifications.update(deltaTime);

    // Game over
    if (this.player.health <= 0) {
      return 'gameOver';
    }

    return null;
  }

  private evolveEnemies(): void {
    for (const enemy of this.enemies) {
      enemy.evolutionStage++;
      enemy.letter = String.fromCharCode(97 + enemy.evolutionStage);
      enemy.sprite = enemy.letter;

      // Increase stats
      enemy.maxHealth *= 1.2;
      enemy.health = enemy.maxHealth;
      enemy.damage *= 1.15;

      // Slightly larger
      enemy.radius *= 1.05;
    }
  }

  private updatePlayerMovement(input: InputManager, dt: number): void {
    const maxSpeed = this.player.speed;
    const acceleration = 800;
    const friction = 0.85;

    let ax = 0, ay = 0;
    if (input.isKeyDown('KeyA') || input.isKeyDown('ArrowLeft')) ax -= 1;
    if (input.isKeyDown('KeyD') || input.isKeyDown('ArrowRight')) ax += 1;
    if (input.isKeyDown('KeyW') || input.isKeyDown('ArrowUp')) ay -= 1;
    if (input.isKeyDown('KeyS') || input.isKeyDown('ArrowDown')) ay += 1;

    if (ax !== 0 && ay !== 0) {
      ax *= 0.707;
      ay *= 0.707;
    }

    this.player.velocity.x += ax * acceleration * dt;
    this.player.velocity.y += ay * acceleration * dt;

    if (ax === 0) this.player.velocity.x *= friction;
    if (ay === 0) this.player.velocity.y *= friction;

    const speed = Math.sqrt(this.player.velocity.x ** 2 + this.player.velocity.y ** 2);
    if (speed > maxSpeed) {
      this.player.velocity.x = (this.player.velocity.x / speed) * maxSpeed;
      this.player.velocity.y = (this.player.velocity.y / speed) * maxSpeed;
    }

    // Store old position
    const oldX = this.player.position.x;
    const oldY = this.player.position.y;

    // Try to move
    this.player.position.x += this.player.velocity.x * dt;
    this.player.position.y += this.player.velocity.y * dt;

    // Check collision with obstacles
    if (this.isCollidingWithObstacles(this.player.position, this.player.radius)) {
      // Revert movement
      this.player.position.x = oldX;
      this.player.position.y = oldY;
      // Stop velocity
      this.player.velocity.x = 0;
      this.player.velocity.y = 0;
    }

    // No bounds in infinite world! Player can move anywhere
  }

  private isCollidingWithObstacles(pos: Position, radius: number): boolean {
    // Get obstacles from chunk system (infinite world!)
    const obstacles = this.chunkSystem.getObstacles();

    for (const obstacle of obstacles) {
      if (obstacle.shape === 'circle' && obstacle.radius) {
        const dist = this.distance(pos, obstacle.position);
        if (dist < radius + obstacle.radius) {
          return true;
        }
      } else if (obstacle.shape === 'rectangle') {
        // AABB collision with circle
        const halfW = obstacle.width / 2;
        const halfH = obstacle.height / 2;

        const closestX = Math.max(obstacle.position.x - halfW, Math.min(pos.x, obstacle.position.x + halfW));
        const closestY = Math.max(obstacle.position.y - halfH, Math.min(pos.y, obstacle.position.y + halfH));

        const dist = this.distance(pos, { x: closestX, y: closestY });
        if (dist < radius) {
          return true;
        }
      }
    }
    return false;
  }

  private updatePlayerWeapons(deltaTime: number): void {
    for (const weapon of this.player.currentWeapons) {
      weapon.cooldownTimer -= deltaTime;

      if (weapon.cooldownTimer <= 0) {
        const behavior = getWeaponBehavior(weapon.type);

        // Fire weapon
        if (behavior.fire) {
          behavior.fire(this.player, weapon, this.enemies, this.projectiles);
        }

        // Continuous update (e.g., aura)
        if (behavior.update) {
          behavior.update(this.player, weapon, this.enemies, deltaTime);
        }

        weapon.cooldownTimer = weapon.cooldown;
      }
    }
  }

  private updateEnemies(dt: number): void {
    for (const enemy of this.enemies) {
      // Initialize timers if not set
      if (enemy.attackTimer === undefined) enemy.attackTimer = 0;
      if (enemy.behaviorTimer === undefined) enemy.behaviorTimer = 0;

      // Update timers
      enemy.attackTimer += dt;
      enemy.behaviorTimer += dt;

      // Letter-specific behavior
      const letterCode = enemy.letter.charCodeAt(0) - 97; // 0 for 'a', 1 for 'b', etc.
      this.updateEnemyBehavior(enemy, letterCode, dt);

      enemy.position.x += enemy.velocity.x * dt;
      enemy.position.y += enemy.velocity.y * dt;

      // No bounds in infinite world!
    }
  }

  private updateEnemyBehavior(enemy: LetterEnemy, letterCode: number, dt: number): void {
    // Normal direction for infinite world (no wraparound needed)
    const dx = this.player.position.x - enemy.position.x;
    const dy = this.player.position.y - enemy.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const dir = { x: dx, y: dy };

    const behaviorType = letterCode % 5; // 5 different behavior patterns

    switch (behaviorType) {
      case 0: // 'a', 'f', 'k', etc. - Basic chaser
        if (dist > 0) {
          const speed = 80;
          enemy.velocity.x = (dir.x / dist) * speed;
          enemy.velocity.y = (dir.y / dist) * speed;
        }
        break;

      case 1: // 'b', 'g', 'l', etc. - Shoot projectiles
        if (dist > 0) {
          const speed = 60; // Slower movement
          enemy.velocity.x = (dir.x / dist) * speed;
          enemy.velocity.y = (dir.y / dist) * speed;
        }

        // Shoot at player every 2 seconds
        if (enemy.attackTimer! >= 2.0 && dist < 600) {
          this.spawnEnemyProjectile(enemy, dir, dist);
          enemy.attackTimer = 0;
        }
        break;

      case 2: // 'c', 'h', 'm', etc. - Charge attack
        if (enemy.behaviorTimer! < 2.0) {
          // Move slowly toward player
          if (dist > 0) {
            const speed = 40;
            enemy.velocity.x = (dir.x / dist) * speed;
            enemy.velocity.y = (dir.y / dist) * speed;
          }
        } else if (enemy.behaviorTimer! < 2.5) {
          // Charge!
          if (dist > 0) {
            const speed = 250;
            enemy.velocity.x = (dir.x / dist) * speed;
            enemy.velocity.y = (dir.y / dist) * speed;
          }
        } else {
          enemy.behaviorTimer = 0; // Reset
        }
        break;

      case 3: // 'd', 'i', 'n', etc. - Circle player
        if (dist > 0) {
          const orbitRadius = 200;
          const orbitSpeed = 2.0; // radians per second

          // Move toward orbit radius
          const targetDist = orbitRadius;
          const distanceToTarget = dist - targetDist;

          // Perpendicular direction for orbiting
          const perpX = -dir.y;
          const perpY = dir.x;

          const radialSpeed = Math.sign(distanceToTarget) * 50;
          const tangentialSpeed = 100;

          enemy.velocity.x = (dir.x / dist) * radialSpeed + perpX / dist * tangentialSpeed;
          enemy.velocity.y = (dir.y / dist) * radialSpeed + perpY / dist * tangentialSpeed;
        }
        break;

      case 4: // 'e', 'j', 'o', etc. - Erratic movement with dash
        if (enemy.behaviorTimer! < 1.5) {
          // Random wandering
          if (enemy.behaviorTimer! % 0.5 < dt) {
            const angle = Math.random() * Math.PI * 2;
            enemy.velocity.x = Math.cos(angle) * 60;
            enemy.velocity.y = Math.sin(angle) * 60;
          }
        } else if (enemy.behaviorTimer! < 2.0) {
          // Dash toward player
          if (dist > 0) {
            const speed = 200;
            enemy.velocity.x = (dir.x / dist) * speed;
            enemy.velocity.y = (dir.y / dist) * speed;
          }
        } else {
          enemy.behaviorTimer = 0; // Reset
        }
        break;
    }
  }

  private spawnEnemyProjectile(enemy: LetterEnemy, direction: { x: number; y: number }, distance: number): void {
    const speed = 200;
    const dx = direction.x / distance;
    const dy = direction.y / distance;

    const projectile: Projectile = {
      id: `proj_enemy_${Date.now()}_${Math.random()}`,
      position: { x: enemy.position.x, y: enemy.position.y },
      velocity: { x: dx * speed, y: dy * speed },
      damage: enemy.damage * 0.5, // Half enemy's contact damage
      owner: 'enemy',
      sprite: enemy.letter,
      color: '#f44',
      lifetime: 3000,
      radius: 8
    };

    this.projectiles.push(projectile);
  }

  private updateProjectiles(dt: number, deltaTime: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];

      proj.position.x += proj.velocity.x * dt;
      proj.position.y += proj.velocity.y * dt;
      proj.lifetime -= deltaTime;

      // Infinite world - projectiles just keep going until lifetime expires
      if (proj.lifetime <= 0) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  private checkCollisions(): void {
    // Enemy projectiles vs player
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      if (proj.owner === 'enemy') {
        const dist = this.distance(proj.position, this.player.position);
        if (dist < proj.radius + this.player.radius) {
          this.player.health -= proj.damage;
          this.projectiles.splice(i, 1);
          continue;
        }
      }
    }

    // Player projectiles vs enemies
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      if (proj.owner !== 'player') continue;

      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const enemy = this.enemies[j];
        const dist = this.distance(proj.position, enemy.position);

        if (dist < proj.radius + enemy.radius) {
          // Damage enemy
          enemy.health -= proj.damage;

          // Spawn damage tooltip
          this.damageTooltips.spawn(enemy.position, proj.damage, enemy.isElite ? '#f0f' : '#ff0');

          // Play hit sound
          this.audioManager.playHit(0.3);

          // Explosion damage
          if (proj.explosionRadius) {
            this.audioManager.playExplosion(0.4);
            for (const otherEnemy of this.enemies) {
              const explosionDist = this.distance(proj.position, otherEnemy.position);
              if (explosionDist < proj.explosionRadius) {
                const explosionDamage = proj.damage * 0.5;
                otherEnemy.health -= explosionDamage;
                this.damageTooltips.spawn(otherEnemy.position, explosionDamage, '#f80');
              }
            }
          }

          // Remove projectile unless piercing
          if (!proj.piercing) {
            this.projectiles.splice(i, 1);
            break;
          }
        }
      }
    }

    // Remove dead enemies and drop items
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (enemy.health <= 0) {
        this.player.experience += enemy.experienceReward;

        // Check level up
        if (this.player.experience >= this.player.experienceToNextLevel) {
          this.player.level++;
          this.player.experience -= this.player.experienceToNextLevel;
          this.player.experienceToNextLevel = Math.floor(this.player.experienceToNextLevel * 1.5);

          // Trigger level-up screen
          this.needsLevelUpScreen = true;
        }

        // Drop first equal sign
        if (!this.hasDroppedFirstEqualSign) {
          this.spawnWorldItem('equalSign', enemy.position, null);
          this.hasDroppedFirstEqualSign = true;
        }

        // Elites drop better loot but not too much (progressive unlock)
        if (enemy.isElite) {
          // 1-2 operators from elites (progressive unlock)
          const opCount = 1 + Math.floor(Math.random() * 2);
          const availableOperators = this.getAvailableOperators();
          for (let j = 0; j < opCount; j++) {
            if (availableOperators.length > 0) {
              const operator = availableOperators[Math.floor(Math.random() * availableOperators.length)];
              this.spawnWorldItem('operator', enemy.position, operator);
            }
          }

          // 1 constant from elite (higher values preferred if available)
          const availableConstants = this.getAvailableConstants();
          if (availableConstants.length > 0) {
            // Prefer higher values
            const sortedConstants = [...availableConstants].sort((a, b) => b.value - a.value);
            const topHalf = sortedConstants.slice(0, Math.ceil(sortedConstants.length / 2));
            const constant = topHalf[Math.floor(Math.random() * topHalf.length)];
            this.spawnWorldItem('constant', enemy.position, constant);
          }

          // 30% chance for equal sign from elite
          if (Math.random() < 0.3) {
            this.spawnWorldItem('equalSign', enemy.position, null);
          }
        }

        // Drop constant
        const rand = Math.random();
        let constant: MathConstant | null = null;
        if (rand < DROP_RATES.constant.common) {
          const commons = MATH_CONSTANTS.filter(c => c.rarity === 'common');
          constant = commons[Math.floor(Math.random() * commons.length)];
        } else if (rand < DROP_RATES.constant.common + DROP_RATES.constant.uncommon) {
          const uncommons = MATH_CONSTANTS.filter(c => c.rarity === 'uncommon');
          constant = uncommons[Math.floor(Math.random() * uncommons.length)];
        } else if (rand < DROP_RATES.constant.common + DROP_RATES.constant.uncommon + DROP_RATES.constant.rare) {
          const rares = MATH_CONSTANTS.filter(c => c.rarity === 'rare');
          constant = rares[Math.floor(Math.random() * rares.length)];
        }

        if (constant) {
          this.spawnWorldItem('constant', enemy.position, constant);
        }

        this.enemies.splice(i, 1);
      }
    }

    // Enemies damage player on contact
    for (const enemy of this.enemies) {
      const dist = this.distance(this.player.position, enemy.position);
      if (dist < this.player.radius + enemy.radius) {
        this.player.health -= enemy.damage * 0.016; // Damage per frame
      }
    }
  }

  private checkItemCollection(): void {
    // Check dropped items (from enemies, loot boxes, etc.)
    for (let i = this.worldItems.length - 1; i >= 0; i--) {
      const item = this.worldItems[i];
      const dist = this.distance(this.player.position, item.position);

      if (dist < this.player.radius + item.radius + 10) {
        this.collectItem(item);
        this.worldItems.splice(i, 1);
      }
    }

    // Check chunk items (loot boxes only)
    const chunkItems = this.chunkSystem.getItems();
    for (const item of chunkItems) {
      if (item.itemType === 'lootBox' && !item.opened) {
        const dist = this.distance(this.player.position, item.position);
        if (dist < this.player.radius + item.radius + 10) {
          this.openLootBox(item);
          item.opened = true;
        }
      }
    }
  }

  private collectItem(item: WorldItem): void {
    let pickupText = '';
    let pickupColor = '#0ff';

    if (item.itemType === 'constant' && item.data) {
      const constant = item.data as MathConstant;
      this.player.inventory.constants.push(constant);
      pickupText = `+${constant.symbol} ${constant.name}`;

      // Color by rarity
      const rarityColors: Record<string, string> = {
        'common': '#8f8',
        'uncommon': '#8ff',
        'rare': '#f8f',
        'legendary': '#fa0'
      };
      pickupColor = rarityColors[constant.rarity] || '#0ff';
    } else if (item.itemType === 'operator' && item.data) {
      const operator = item.data as MathOperator;
      this.player.inventory.operators.push(operator);
      pickupText = `+${operator.symbol} ${operator.name}`;
      pickupColor = '#88f';
    } else if (item.itemType === 'equalSign') {
      this.player.inventory.equalSigns++;
      pickupText = '+= Equal Sign';
      pickupColor = '#ff0';
      // Trigger flash effect
      this.equalSignFlashTimer = 1000; // Flash for 1 second
    }

    // Show pickup notification
    this.pickupNotifications.spawn(item.position, pickupText, pickupColor);

    // Play collect sound
    this.audioManager.playCollect(0.5);
  }

  private openLootBox(lootBox: WorldItem): void {
    // Spawn 2-3 items around the loot box (reduced from 3-5)
    const itemCount = 2 + Math.floor(Math.random() * 2);

    for (let i = 0; i < itemCount; i++) {
      const angle = (Math.PI * 2 * i) / itemCount;
      const distance = 40 + Math.random() * 20;
      const x = lootBox.position.x + Math.cos(angle) * distance;
      const y = lootBox.position.y + Math.sin(angle) * distance;

      // Random item type - weighted
      const roll = Math.random();
      if (roll < 0.5) {
        // 50% chance for constant (progressive unlock)
        const availableConstants = this.getAvailableConstants();
        if (availableConstants.length === 0) continue; // Skip if no constants available yet
        const constant = availableConstants[Math.floor(Math.random() * availableConstants.length)];
        const item: WorldItem = {
          id: `item_${Date.now()}_${Math.random()}`,
          position: { x, y },
          velocity: { x: 0, y: 0 },
          sprite: constant.symbol,
          color: constant.color,
          radius: 12,
          itemType: 'constant',
          data: constant
        };
        this.worldItems.push(item);
      } else if (roll < 0.9) {
        // 40% chance for operator (progressive unlock)
        const availableOperators = this.getAvailableOperators();
        if (availableOperators.length === 0) continue; // Skip if no operators available yet
        const operator = availableOperators[Math.floor(Math.random() * availableOperators.length)];

        const item: WorldItem = {
          id: `item_${Date.now()}_${Math.random()}`,
          position: { x, y },
          velocity: { x: 0, y: 0 },
          sprite: operator.symbol,
          color: operator.color,
          radius: 12,
          itemType: 'operator',
          data: operator
        };
        this.worldItems.push(item);
      } else {
        // 10% chance for equal sign
        const item: WorldItem = {
          id: `item_${Date.now()}_${Math.random()}`,
          position: { x, y },
          velocity: { x: 0, y: 0 },
          sprite: '=',
          color: '#ff0',
          radius: 12,
          itemType: 'equalSign',
          data: null
        };
        this.worldItems.push(item);
      }
    }

    // Change loot box appearance
    lootBox.sprite = '📭'; // Open box
    lootBox.color = '#666';

    // Show notification
    this.pickupNotifications.spawn(lootBox.position, 'Loot Box Opened!', '#fa0');
    this.audioManager.playCollect(0.8);
  }

  private distance(a: Position, b: Position): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  }


  render(renderer: Renderer): void {
    // Update camera to follow player
    this.camera.follow(this.player.position);
    renderer.setCamera(this.camera);

    renderer.clear('#0a0a0a');

    // Draw obstacles from chunk system (infinite world!)
    const obstacles = this.chunkSystem.getObstacles();
    for (const obstacle of obstacles) {
      if (this.camera.isVisible(obstacle.position.x, obstacle.position.y, Math.max(obstacle.width, obstacle.height, obstacle.radius || 0))) {
        renderer.drawObstacle(
          obstacle.position.x,
          obstacle.position.y,
          obstacle.width,
          obstacle.height,
          obstacle.color,
          obstacle.shape,
          obstacle.radius
        );
      }
    }

    // World items from chunk system (only visible)
    const chunkItems = this.chunkSystem.getItems();
    for (const item of chunkItems) {
      if (this.camera.isVisible(item.position.x, item.position.y, item.radius)) {
        renderer.drawEntity(item.position.x, item.position.y, item.radius, item.sprite, item.color);
      }
    }

    // Dropped items (from enemies, opened loot boxes)
    for (const item of this.worldItems) {
      if (this.camera.isVisible(item.position.x, item.position.y, item.radius)) {
        renderer.drawEntity(item.position.x, item.position.y, item.radius, item.sprite, item.color);
      }
    }

    // Player (with glow effect for "1")
    renderer.drawEntity(
      this.player.position.x,
      this.player.position.y,
      this.player.radius,
      this.player.sprite,
      this.player.color,
      { glow: true, bold: true }
    );

    // Enemies (only visible)
    for (const enemy of this.enemies) {
      if (this.camera.isVisible(enemy.position.x, enemy.position.y, enemy.radius)) {
        renderer.drawEntity(
          enemy.position.x,
          enemy.position.y,
          enemy.radius,
          enemy.sprite,
          enemy.color,
          {
            bold: enemy.style === 'bold',
            italic: enemy.style === 'italic',
            underline: enemy.style === 'underlined',
            glow: enemy.isElite
          }
        );

        // Health bar
        const hpBarWidth = 40;
        const hpBarHeight = 4;
        const hpBarX = enemy.position.x - hpBarWidth / 2;
        const hpBarY = enemy.position.y - enemy.radius - 10;
        renderer.drawHealthBar(hpBarX, hpBarY, hpBarWidth, hpBarHeight, enemy.health, enemy.maxHealth);
      }
    }

    // Projectiles (only visible)
    for (const proj of this.projectiles) {
      if (this.camera.isVisible(proj.position.x, proj.position.y, proj.radius)) {
        renderer.drawEntity(proj.position.x, proj.position.y, proj.radius, proj.sprite, proj.color);
      }
    }

    // Draw auras for prime weapons
    for (const weapon of this.player.currentWeapons) {
      if (weapon.type === 'primes') {
        renderer.drawAura(this.player.position.x, this.player.position.y, 150, '#ff0', 0.2);
      }
    }

    // Damage tooltips
    for (const tooltip of this.damageTooltips.getTooltips()) {
      if (this.camera.isVisible(tooltip.position.x, tooltip.position.y, 20)) {
        renderer.drawDamageTooltip(
          tooltip.position.x,
          tooltip.position.y,
          tooltip.damage,
          tooltip.color,
          tooltip.alpha
        );
      }
    }

    // Pickup notifications
    for (const notif of this.pickupNotifications.getNotifications()) {
      if (this.camera.isVisible(notif.position.x, notif.position.y, 30)) {
        renderer.drawPickupNotification(
          notif.position.x,
          notif.position.y,
          notif.text,
          notif.color,
          notif.alpha,
          notif.scale
        );
      }
    }

    // HUD (UI space, not world space)
    renderer.setCamera(null); // Disable camera for HUD
    this.renderHUD(renderer);

    // Minimap (UI space)
    const allWorldItems = [...this.chunkSystem.getItems(), ...this.worldItems];
    this.minimap.render(
      renderer.ctx,
      renderer.canvas.width,
      renderer.canvas.height,
      this.player.position,
      this.enemies,
      allWorldItems
    );

    // Weapon slots HUD (always visible)
    this.equationOverlay.renderHUDWeaponSlots(
      renderer.ctx,
      this.player,
      renderer.canvas.width,
      renderer.canvas.height,
      this.equalSignFlashTimer
    );

    // Equation editor overlay (when E is pressed)
    this.equationOverlay.render(
      renderer.ctx,
      this.player,
      renderer.canvas.width,
      renderer.canvas.height
    );
  }

  private renderHUD(renderer: Renderer): void {
    // Health bar
    renderer.drawHealthBar(10, 10, 200, 20, this.player.health, this.player.maxHealth);
    renderer.drawText(`HP: ${Math.floor(this.player.health)}/${this.player.maxHealth}`, 15, 0.3, '#fff', 16);

    // Level and XP
    renderer.drawText(`Level: ${this.player.level}`, 220, 0.3, '#fff', 16);
    renderer.drawText(`XP: ${this.player.experience}/${this.player.experienceToNextLevel}`, 220, 0.9, '#aaa', 14);

    // Evolution timer
    const timeToEvolution = (this.evolutionInterval - this.evolutionTimer) / 1000;
    renderer.drawText(`Next Evolution: ${Math.ceil(timeToEvolution)}s`, renderer.canvas.width / 2 - 100, 0.3, '#ff0', 20);
    renderer.drawText(`Stage: ${this.currentLetterStage + 1}/${this.maxEvolutions}`, renderer.canvas.width / 2 - 60, 0.9, '#aaa', 16);

    // Inventory
    renderer.drawText(`Constants: ${this.player.inventory.constants.length}`, renderer.canvas.width - 150, 0.3, '#8f8', 14);
    renderer.drawText(`Operators: ${this.player.inventory.operators.length}`, renderer.canvas.width - 150, 0.7, '#88f', 14);
    renderer.drawText(`= Signs: ${this.player.inventory.equalSigns}`, renderer.canvas.width - 150, 1.1, '#ff0', 14);

    // Weapons
    renderer.drawText(`Weapons: ${this.player.currentWeapons.length}`, renderer.canvas.width - 150, 1.7, '#0ff', 14);

    // Instructions
    renderer.drawText('WASD: Move | E: Equation Builder', renderer.canvas.width / 2 - 150, renderer.canvas.height - 40, '#666', 14);

    // Debug info - Show position and chunks (infinite world!)
    renderer.drawText(
      `Position: (${Math.floor(this.player.position.x)}, ${Math.floor(this.player.position.y)})`,
      10,
      renderer.canvas.height - 40,
      16,
      '#666'
    );
    renderer.drawText(
      `Chunks Loaded: ${this.chunkSystem.getLoadedChunkCount()}`,
      10,
      renderer.canvas.height - 20,
      16,
      '#666'
    );
  }

  // Progressive drop system - unlock better items over time
  private getAvailableConstants(): MathConstant[] {
    const playtimeMinutes = this.totalPlaytime / 60000;

    if (playtimeMinutes < 2) {
      // 0-2 minutes: Only 2 and 3
      return MATH_CONSTANTS.filter(c => c.value === 2 || c.value === 3);
    } else if (playtimeMinutes < 4) {
      // 2-4 minutes: Add 4 and 5
      return MATH_CONSTANTS.filter(c => c.value >= 2 && c.value <= 5);
    } else if (playtimeMinutes < 6) {
      // 4-6 minutes: Add 6-10
      return MATH_CONSTANTS.filter(c => c.value >= 2 && c.value <= 10);
    } else if (playtimeMinutes < 10) {
      // 6-10 minutes: Add 11-20
      return MATH_CONSTANTS.filter(c => c.value >= 2 && c.value <= 20);
    } else {
      // 10+ minutes: Everything
      return MATH_CONSTANTS;
    }
  }

  private getAvailableOperators(): MathOperator[] {
    const playtimeMinutes = this.totalPlaytime / 60000;

    if (playtimeMinutes < 2) {
      // 0-2 minutes: Only + and ×
      return OPERATORS.filter(op => op.symbol === '+' || op.symbol === '×');
    } else if (playtimeMinutes < 4) {
      // 2-4 minutes: Add -
      return OPERATORS.filter(op => op.symbol === '+' || op.symbol === '×' || op.symbol === '-');
    } else if (playtimeMinutes < 7) {
      // 4-7 minutes: Add /
      return OPERATORS.filter(op => op.symbol !== '^');
    } else {
      // 7+ minutes: Everything
      return OPERATORS;
    }
  }

  getPlayer(): Player {
    return this.player;
  }

  setPlayer(player: Player): void {
    this.player = player;
  }
}
