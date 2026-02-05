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

  // Evolution system - Full alphabet progression
  private evolutionTimer = 0;
  private evolutionInterval = 20000; // 20 seconds
  private currentLetterStage = 0; // 0='a', 1='b', 2='c'... up to 25='z'
  private maxEvolutions = 26; // Full alphabet a-z
  private bossStages = [6, 13, 20, 26]; // Boss fights at stages 7(&), 14(@), 21(?), 27(!)

  private enemySpawnTimer = 0;
  private enemySpawnInterval = 1000; // Spawn every 1 second (was 2)
  private hasDroppedFirstEqualSign = false;
  private fontLevelIndex: number;
  private needsLevelUpScreen = false;
  private equalSignFlashTimer = 0; // Flash effect when picking up equal sign
  private totalPlaytime = 0; // Track total playtime for progressive drops
  private isPaused = false; // Pause menu overlay
  private pauseMenuSelection = 0; // 0=Resume, 1=Exit to Menu
  private startTime: number = Date.now(); // Track start time for elapsed timer
  private elapsedTime: number = 0; // Total elapsed time in milliseconds

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
    const letter = String.fromCharCode(97 + this.currentLetterStage); // 'a' + stage (0-25)
    const fontLevel = FONT_LEVELS[this.fontLevelIndex];

    // 30% chance for elite
    const isElite = Math.random() < 0.30;
    const styles: EnemyStyle[] = ['bold', 'underlined', 'italic'];
    const style: EnemyStyle = isElite ? styles[Math.floor(Math.random() * styles.length)] : 'normal';

    // Progressive scaling through alphabet (a is weakest, z is strongest)
    // Much steeper scaling - +35% per letter (was +15%)
    const progressionMultiplier = 1 + (this.currentLetterStage * 0.35);
    // Weaker starting stats (20 health, 6 damage instead of 30/10)
    const baseHealth = 20 * fontLevel.enemyHealthMultiplier * progressionMultiplier;
    const baseDamage = 6 * fontLevel.enemyDamageMultiplier * progressionMultiplier;

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

  private spawnBoss(): void {
    const fontLevel = FONT_LEVELS[this.fontLevelIndex];

    // Determine boss symbol based on stage
    let bossSymbol = '!';
    let bossName = 'FINAL BOSS';
    let colorScheme = '#f00';

    if (this.currentLetterStage === 6) {
      bossSymbol = '&';
      bossName = 'THE CONJUNCTION';
      colorScheme = '#ff0';
    } else if (this.currentLetterStage === 13) {
      bossSymbol = '@';
      bossName = 'THE AT SIGN';
      colorScheme = '#0ff';
    } else if (this.currentLetterStage === 20) {
      bossSymbol = '?';
      bossName = 'THE QUESTION';
      colorScheme = '#f0f';
    } else if (this.currentLetterStage === 26) {
      bossSymbol = '!';
      bossName = 'THE EXCLAMATION';
      colorScheme = '#f00';
    }

    // Bosses are MUCH stronger
    const progressionMultiplier = 1 + (this.currentLetterStage * 0.15);
    const baseHealth = 200 * fontLevel.enemyHealthMultiplier * progressionMultiplier;
    const baseDamage = 25 * fontLevel.enemyDamageMultiplier * progressionMultiplier;

    // Spawn boss near player
    const spawnPos = this.chunkSystem.getEnemySpawnPosition(
      this.player.position.x,
      this.player.position.y
    );

    const boss: LetterEnemy = {
      id: `boss_${Date.now()}`,
      position: spawnPos,
      velocity: { x: 0, y: 0 },
      sprite: bossSymbol,
      color: colorScheme,
      radius: 30, // Larger than normal enemies
      health: baseHealth,
      maxHealth: baseHealth,
      damage: baseDamage,
      experienceReward: 500,
      letter: bossSymbol,
      evolutionStage: this.currentLetterStage,
      style: 'bold',
      isElite: true, // Bosses count as elite
      attackTimer: 0,
      behaviorTimer: 0
    };

    this.enemies.push(boss);

    // Show boss notification
    this.pickupNotifications.spawn(
      { x: this.player.position.x, y: this.player.position.y - 100 },
      `${bossName} APPEARS!`,
      colorScheme
    );
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
      // Update elapsed time
      this.elapsedTime = Date.now() - this.startTime;
    }

    // If equation editor is open, pause the game (only update flash timer)
    if (this.equationOverlay.isOpen()) {
      // Update equal sign flash timer even when paused
      if (this.equalSignFlashTimer > 0) {
        this.equalSignFlashTimer = Math.max(0, this.equalSignFlashTimer - deltaTime);
      }
      return null; // Don't update game logic
    }

    // Handle pause menu with Escape
    if (input.isKeyJustPressed('Escape')) {
      this.isPaused = !this.isPaused;
      if (this.isPaused) {
        this.pauseMenuSelection = 0; // Reset to Resume
      }
    }

    // If paused, handle pause menu
    if (this.isPaused) {
      // Navigate pause menu
      if (input.isKeyJustPressed('ArrowUp') || input.isKeyJustPressed('KeyW')) {
        this.pauseMenuSelection = Math.max(0, this.pauseMenuSelection - 1);
      }
      if (input.isKeyJustPressed('ArrowDown') || input.isKeyJustPressed('KeyS')) {
        this.pauseMenuSelection = Math.min(1, this.pauseMenuSelection + 1);
      }
      // Select option
      if (input.isKeyJustPressed('Enter') || input.isKeyJustPressed('Space')) {
        if (this.pauseMenuSelection === 0) {
          // Resume
          this.isPaused = false;
        } else {
          // Exit to menu
          return 'menu';
        }
      }
      return null; // Don't update game logic while paused
    }

    // Update evolution timer - advance to next letter stage
    this.evolutionTimer += deltaTime;
    if (this.evolutionTimer >= this.evolutionInterval) {
      this.evolutionTimer = 0;
      this.currentLetterStage++;

      // Spawn boss at specific stages
      if (this.bossStages.includes(this.currentLetterStage)) {
        this.spawnBoss();
      }

      // Check level completion (after final boss)
      if (this.currentLetterStage > this.maxEvolutions) {
        return 'levelUp';
      }
    }

    // Spawn more enemies
    this.enemySpawnTimer += deltaTime;
    if (this.enemySpawnTimer >= this.enemySpawnInterval && this.enemies.length < 40) { // More enemies (was 30)
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

  // Enemy evolution removed - now spawns constant waves of current letter
  // Old enemies don't transform, new enemies spawn as current letter

  private updatePlayerMovement(input: InputManager, dt: number): void {
    const maxSpeed = this.player.speed * 1.3; // 30% faster movement
    const acceleration = 1200; // Faster acceleration (was 800)
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
          const speed = 110; // Faster (was 80)
          enemy.velocity.x = (dir.x / dist) * speed;
          enemy.velocity.y = (dir.y / dist) * speed;
        }
        break;

      case 1: // 'b', 'g', 'l', etc. - Shoot projectiles
        if (dist > 0) {
          const speed = 80; // Faster (was 60)
          enemy.velocity.x = (dir.x / dist) * speed;
          enemy.velocity.y = (dir.y / dist) * speed;
        }

        // Shoot at player every 1.5 seconds (was 2)
        if (enemy.attackTimer! >= 1.5 && dist < 600) {
          this.spawnEnemyProjectile(enemy, dir, dist);
          enemy.attackTimer = 0;
        }
        break;

      case 2: // 'c', 'h', 'm', etc. - Charge attack
        if (enemy.behaviorTimer! < 1.5) {
          // Move slowly toward player (faster wind-up)
          if (dist > 0) {
            const speed = 50; // Faster (was 40)
            enemy.velocity.x = (dir.x / dist) * speed;
            enemy.velocity.y = (dir.y / dist) * speed;
          }
        } else if (enemy.behaviorTimer! < 2.0) {
          // Charge! (shorter duration, faster attack)
          if (dist > 0) {
            const speed = 300; // Faster charge (was 250)
            enemy.velocity.x = (dir.x / dist) * speed;
            enemy.velocity.y = (dir.y / dist) * speed;
          }
        } else {
          enemy.behaviorTimer = 0; // Reset
        }
        break;

      case 3: // 'd', 'i', 'n', etc. - Circle player
        if (dist > 0) {
          const orbitRadius = 180; // Closer orbit (was 200)
          const orbitSpeed = 2.5; // Faster orbit (was 2.0)

          // Move toward orbit radius
          const targetDist = orbitRadius;
          const distanceToTarget = dist - targetDist;

          // Perpendicular direction for orbiting
          const perpX = -dir.y;
          const perpY = dir.x;

          const radialSpeed = Math.sign(distanceToTarget) * 70; // Faster (was 50)
          const tangentialSpeed = 130; // Faster (was 100)

          enemy.velocity.x = (dir.x / dist) * radialSpeed + perpX / dist * tangentialSpeed;
          enemy.velocity.y = (dir.y / dist) * radialSpeed + perpY / dist * tangentialSpeed;
        }
        break;

      case 4: // 'e', 'j', 'o', etc. - Erratic movement with dash
        if (enemy.behaviorTimer! < 1.0) {
          // Random wandering (faster pattern)
          if (enemy.behaviorTimer! % 0.4 < dt) {
            const angle = Math.random() * Math.PI * 2;
            enemy.velocity.x = Math.cos(angle) * 80; // Faster (was 60)
            enemy.velocity.y = Math.sin(angle) * 80;
          }
        } else if (enemy.behaviorTimer! < 1.5) {
          // Dash toward player (faster, shorter duration)
          if (dist > 0) {
            const speed = 250; // Faster dash (was 200)
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
    const speed = 250; // Faster projectiles (was 200)
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
          this.audioManager.playHit(0.4); // Hit sound when player is damaged
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
          this.player.experienceToNextLevel = Math.floor(this.player.experienceToNextLevel * 1.8); // Steeper scaling (was 1.5)

          // Trigger level-up screen
          this.needsLevelUpScreen = true;
        }

        // Drop first equal sign
        if (!this.hasDroppedFirstEqualSign) {
          this.spawnWorldItem('equalSign', enemy.position, null);
          this.hasDroppedFirstEqualSign = true;
        }

        // Elites drop better loot but VERY scarce (progressive unlock)
        if (enemy.isElite) {
          // 10% chance for 1 operator (reduced from 50%)
          if (Math.random() < 0.10) {
            const availableOperators = this.getAvailableOperators();
            if (availableOperators.length > 0) {
              const operator = availableOperators[Math.floor(Math.random() * availableOperators.length)];
              this.spawnWorldItem('operator', enemy.position, operator);
            }
          }

          // 12% chance for 1 constant (reduced from 60%)
          if (Math.random() < 0.12) {
            const availableConstants = this.getAvailableConstants();
            if (availableConstants.length > 0) {
              // Prefer higher values
              const sortedConstants = [...availableConstants].sort((a, b) => b.value - a.value);
              const topHalf = sortedConstants.slice(0, Math.ceil(sortedConstants.length / 2));
              const constant = topHalf[Math.floor(Math.random() * topHalf.length)];
              this.spawnWorldItem('constant', enemy.position, constant);
            }
          }

          // 3% chance for equal sign from elite (reduced from 15%)
          if (Math.random() < 0.03) {
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
    const maxConstants = 20;
    const maxOperators = 20;

    if (item.itemType === 'constant' && item.data) {
      const constant = item.data as MathConstant;
      // Check capacity
      if (this.player.inventory.constants.length >= maxConstants) {
        pickupText = 'Inventory Full!';
        pickupColor = '#f44';
        this.pickupNotifications.spawn(item.position, pickupText, pickupColor);
        return; // Don't collect
      }
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
      // Check capacity
      if (this.player.inventory.operators.length >= maxOperators) {
        pickupText = 'Inventory Full!';
        pickupColor = '#f44';
        this.pickupNotifications.spawn(item.position, pickupText, pickupColor);
        return; // Don't collect
      }
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
    // Spawn 1 item around the loot box (very scarce)
    const itemCount = 1;

    for (let i = 0; i < itemCount; i++) {
      const angle = (Math.PI * 2 * i) / itemCount;
      const distance = 40 + Math.random() * 20;
      const x = lootBox.position.x + Math.cos(angle) * distance;
      const y = lootBox.position.y + Math.sin(angle) * distance;

      // Random item type - weighted (adjusted for scarcity)
      const roll = Math.random();
      if (roll < 0.6) {
        // 60% chance for constant (progressive unlock)
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
      } else if (roll < 0.95) {
        // 35% chance for operator (progressive unlock)
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
        // 5% chance for equal sign
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
    this.renderElapsedTimer(renderer);

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

    // Pause menu overlay (when Esc is pressed)
    if (this.isPaused) {
      this.renderPauseMenu(renderer);
    }
  }

  private renderPauseMenu(renderer: Renderer): void {
    const ctx = renderer.ctx;
    const centerX = renderer.canvas.width / 2;
    const centerY = renderer.canvas.height / 2;

    // Semi-transparent dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, renderer.canvas.width, renderer.canvas.height);

    // Title
    ctx.font = 'bold 48px monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', centerX, centerY - 80);

    // Menu options
    const options = ['Resume', 'Exit to Menu'];
    ctx.font = '24px monospace';

    options.forEach((option, i) => {
      const y = centerY + i * 50;
      const isSelected = i === this.pauseMenuSelection;

      // Highlight selected option
      if (isSelected) {
        ctx.fillStyle = '#ff0';
        ctx.fillText('▶ ' + option + ' ◀', centerX, y);
      } else {
        ctx.fillStyle = '#888';
        ctx.fillText(option, centerX, y);
      }
    });

    // Instructions
    ctx.font = '14px monospace';
    ctx.fillStyle = '#666';
    ctx.fillText('↑ ↓ or W S: Navigate | Enter/Space: Select | Esc: Resume', centerX, centerY + 120);
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
    const currentLetter = String.fromCharCode(97 + this.currentLetterStage); // Current letter
    const nextStageIsBoss = this.bossStages.includes(this.currentLetterStage + 1);
    const stageText = nextStageIsBoss ? 'BOSS INCOMING' : `Next: ${currentLetter}→${String.fromCharCode(98 + this.currentLetterStage)}`;

    renderer.drawText(`${stageText} in ${Math.ceil(timeToEvolution)}s`, renderer.canvas.width / 2 - 120, 0.3, nextStageIsBoss ? '#f00' : '#ff0', 20);
    renderer.drawText(`Letter: ${currentLetter.toUpperCase()} (${this.currentLetterStage + 1}/${this.maxEvolutions})`, renderer.canvas.width / 2 - 80, 0.9, '#aaa', 16);

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

  private renderElapsedTimer(renderer: Renderer): void {
    const ctx = renderer.ctx;
    const minutes = Math.floor(this.elapsedTime / 60000);
    const seconds = Math.floor((this.elapsedTime % 60000) / 1000);
    const timeText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.font = '24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(timeText, renderer.canvas.width / 2, 30);
    ctx.restore();
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
