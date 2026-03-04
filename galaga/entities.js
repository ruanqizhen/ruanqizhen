// ============================================================
// entities.js - 游戏实体类 (Player, Projectile, Enemy, Boss)
// ============================================================

class Player {
    constructor() {
        this.width = 50;
        this.height = 50;
        this.x = CANVAS_WIDTH / 2 - this.width / 2;
        this.y = CANVAS_HEIGHT - 80;
        this.speed = PLAYER_SPEED;
        this.dx = 0;

        // Power-up states
        this.shieldActive = false;
        this.dualShotTimer = 0;
        this.rapidFireTimer = 0;
    }

    draw() {
        ctx.save();

        if (playerImg.complete) {
            ctx.drawImage(playerImg, this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = '#00d4ff';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }

        // Shield Effect
        if (this.shieldActive) {
            ctx.strokeStyle = '#00d4ff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width * 0.8, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }

    fire(now) {
        const cooldown = this.rapidFireTimer > now ? RAPID_FIRE_COOLDOWN : FIRE_COOLDOWN;
        if (now - lastFireTime >= cooldown) {
            if (this.dualShotTimer > now) {
                projectiles.push(getProjectile(this.x + DUAL_SHOT_OFFSET_X_LEFT, this.y));
                projectiles.push(getProjectile(this.x + this.width - DUAL_SHOT_OFFSET_X_RIGHT, this.y));
            } else {
                projectiles.push(getProjectile(this.x + this.width / 2 - SINGLE_SHOT_OFFSET_X, this.y + SINGLE_SHOT_OFFSET_Y));
            }
            playSound('shoot');
            lastFireTime = now;
        }
    }

    update(dt) {
        this.x += this.dx * dt;
        // Boundary constraints
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > CANVAS_WIDTH) this.x = CANVAS_WIDTH - this.width;

        // Create trail
        if (Math.random() < PLAYER_TRAIL_CHANCE * dt) {
            trails.push(getTrail(this.x + this.width / 2, this.y + this.height - 10, '#00d4ff', 3));
        }
    }
}

class Projectile {
    constructor(x, y) {
        this.reset(x, y);
    }

    reset(x, y) {
        this.x = x;
        this.y = y;
        this.width = PROJECTILE_WIDTH;
        this.height = PROJECTILE_HEIGHT;
        this.speed = PROJECTILE_SPEED;
    }

    draw() {
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    update(dt) {
        this.y -= this.speed * dt;
    }
}

class EnemyProjectile {
    constructor(x, y) {
        this.reset(x, y);
    }

    reset(x, y) {
        this.x = x;
        this.y = y;
        this.width = ENEMY_PROJECTILE_WIDTH;
        this.height = ENEMY_PROJECTILE_HEIGHT;
        this.speed = ENEMY_PROJECTILE_SPEED;
        this.speedX = 0;
    }

    draw() {
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    update(dt) {
        this.y += this.speed * dt;
        this.x += this.speedX * dt;
    }
}

class TrackingMissile extends EnemyProjectile {
    reset(x, y) {
        super.reset(x, y);
        this.width = TRACKING_MISSILE_WIDTH;
        this.height = TRACKING_MISSILE_HEIGHT;
        // Tracking missiles need an initial velocity vector to not stall (speed = dy, speedX = dx)
        this.speed = TRACKING_MISSILE_SPEED; // initial dy
        this.speedX = 0;                     // initial dx (will be set by Enemy)
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

        // Calculate angle based on velocity
        const angle = Math.atan2(this.speed, this.speedX) - Math.PI / 2;
        ctx.rotate(angle);

        ctx.fillStyle = '#ff8800'; // Orange missile
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

        // Thruster glow
        ctx.fillStyle = '#ffddaa';
        ctx.fillRect(-this.width / 4, -this.height / 2 - 4, this.width / 2, 4);
        ctx.restore();
    }

    update(dt) {
        // Find target vector
        const targetX = player.x + player.width / 2;
        const targetY = player.y + player.height / 2;

        const dx = targetX - (this.x + this.width / 2);
        const dy = targetY - (this.y + this.height / 2);

        // Current angle
        const currentAngle = Math.atan2(this.speed, this.speedX);

        // Target angle
        let targetAngle = Math.atan2(dy, dx);

        // Steer towards target
        let angleDiff = targetAngle - currentAngle;

        // Normalize angle difference to [-PI, PI]
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        const turnStep = TRACKING_MISSILE_TURN_RATE * dt;

        let newAngle = currentAngle;
        if (Math.abs(angleDiff) < turnStep) {
            newAngle = targetAngle;
        } else {
            newAngle += Math.sign(angleDiff) * turnStep;
        }

        // Clamp angle to strictly downward within a 45-degree cone (+/- PI/4 from PI/2)
        let diffFromDown = newAngle - Math.PI / 2;
        while (diffFromDown > Math.PI) diffFromDown -= Math.PI * 2;
        while (diffFromDown < -Math.PI) diffFromDown += Math.PI * 2;

        const MAX_WANDERING = Math.PI / 4; // 45 degrees
        if (diffFromDown > MAX_WANDERING) diffFromDown = MAX_WANDERING;
        if (diffFromDown < -MAX_WANDERING) diffFromDown = -MAX_WANDERING;

        newAngle = Math.PI / 2 + diffFromDown;

        // Apply new velocity components using the constant tracking speed magnitude
        this.speedX = Math.cos(newAngle) * TRACKING_MISSILE_SPEED;
        this.speed = Math.sin(newAngle) * TRACKING_MISSILE_SPEED;

        this.x += this.speedX * dt;
        this.y += this.speed * dt;

        // Missile trail
        if (Math.random() < 0.5 * dt) {
            trails.push(getTrail(this.x + this.width / 2, this.y, '#ff8800', 2));
        }
    }
}

class Enemy {
    constructor(x, y, type = 1) {
        this.x = x;
        this.y = y;
        this.width = ENEMY_WIDTH;
        this.height = ENEMY_HEIGHT;
        this.speed = 2;
        this.type = type; // 1: Drone, 2: Interceptor, 3: Commander
        this.direction = 1;
        this.state = 'formation';
        this.diveSpeedX = 0;
        this.diveSpeedY = 5;

        const config = ENEMY_CONFIG[this.type] || ENEMY_CONFIG[1];
        this.health = config.health;
        this.shield = config.shield || 0;
        this.maxShield = this.shield;
        this.points = config.points;
        this.diveSpeedY = config.diveSpeedY;
        this.maxHealth = this.health;

        if (type === 2) this.zigzagTimer = 0;
        if (type === 3) this.angle = 0;
        if (type === 4) this.diveProb = 0.00005; // Elite dives less

        // New properties for updated enemy behavior
        this.isDiving = false;
        this.startX = x;
        this.startY = y;
        this.zigzagOffset = 0;
        this.radius = 0;
        this.diveProb = (BASE_DIVE_PROB + (this.type === 2 ? INTERCEPTOR_DIVE_BONUS : 0)) * level;
        this.bombProb = BASE_BOMB_PROB + (level * BOMB_PROB_PER_LEVEL) + (this.type === 3 ? COMMANDER_BOMB_BONUS : 0);

        // Entry path properties
        this.entryTimer = 0;
        this.spawnX = 0;
        this.spawnY = 0;
        this.entryDelay = 0;
        this.markedForDeletion = false;
        this.hitFlashTimer = 0;
    }

    draw() {
        ctx.save();
        const config = ENEMY_CONFIG[this.type] || ENEMY_CONFIG[1];
        const img = config.img;

        // Position context at the center of the enemy to rotate
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(Math.PI); // Rotate 180 degrees (head down)

        if (img.complete) {
            ctx.drawImage(img, -this.width / 2, -this.height / 2, this.width, this.height);
        } else {
            ctx.fillStyle = config.color;
            ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        }

        // Hit flash overlay
        if (this.hitFlashTimer > 0) {
            ctx.globalAlpha = this.hitFlashTimer / 100;
            ctx.fillStyle = '#fff';
            ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
            ctx.globalAlpha = 1;
        }

        ctx.restore();

        // Health bar for Commander or Elite (drawn above in world space)
        if ((this.type === 3 || this.type === 4) && (this.health < this.maxHealth || this.shield < this.maxShield)) {
            ctx.save();
            ctx.fillStyle = '#ff0000'; // Base health red
            ctx.fillRect(this.x, this.y - 12, this.width, 4);
            ctx.fillStyle = '#00ff00'; // Current health green
            ctx.fillRect(this.x, this.y - 12, this.width * (this.health / this.maxHealth), 4);

            if (this.maxShield > 0) {
                // Shield bar (blue) just below health bar
                ctx.fillStyle = '#000088';
                ctx.fillRect(this.x, this.y - 6, this.width, 3);
                ctx.fillStyle = '#00d4ff';
                ctx.fillRect(this.x, this.y - 6, this.width * (this.shield / this.maxShield), 3);
            }
            ctx.restore();
        }

        // Draw active shield sphere for Elites
        if (this.shield > 0) {
            ctx.save();
            ctx.strokeStyle = `rgba(0, 212, 255, ${0.5 + Math.sin(gameTime / 100) * 0.3})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width * 0.7, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }

    update(dt) {
        if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt * 16.67;
        if (this.entryDelay > 0) {
            this.entryDelay -= dt * 16.67;
            return; // Wait offscreen
        }

        if (this.state === 'entering') {
            this.entryTimer += ENEMY_ENTRY_SPEED_FACTOR * dt;
            const t = Math.min(this.entryTimer, 1);

            const sx = this.spawnX, sy = this.spawnY;
            const dir = sx < CANVAS_WIDTH / 2 ? 1 : -1;
            const cx1 = sx + dir * 100, cy1 = sy - 100;
            const cx2 = this.startX + formationOffsetX - dir * 50, cy2 = this.startY + 150;
            const tx = this.startX + formationOffsetX, ty = this.startY;

            const mt = 1 - t;
            this.x = mt * mt * mt * sx + 3 * mt * mt * t * cx1 + 3 * mt * t * t * cx2 + t * t * t * tx;
            this.y = mt * mt * mt * sy + 3 * mt * mt * t * cy1 + 3 * mt * t * t * cy2 + t * t * t * ty;

            if (t >= 1) {
                this.state = 'formation';
                this.x = tx;
                this.y = ty;
            }
        } else if (this.state === 'challenge_flyby') {
            this.entryTimer += CHALLENGE_FLYBY_SPEED_FACTOR * dt;
            const t = this.entryTimer;

            const sx = this.spawnX, sy = this.spawnY;
            const dir = sx < CANVAS_WIDTH / 2 ? 1 : -1;

            const cx1 = CANVAS_WIDTH / 2 + dir * 150, cy1 = CANVAS_HEIGHT / 2 - 100;
            const cx2 = CANVAS_WIDTH / 2 - dir * 150, cy2 = CANVAS_HEIGHT / 2 + 300;
            const tx = sx < CANVAS_WIDTH / 2 ? CANVAS_WIDTH + 100 : -100;
            const ty = -100;

            const clampedT = Math.min(t, 1);
            const mct = 1 - clampedT;

            this.x = mct * mct * mct * sx + 3 * mct * mct * clampedT * cx1 + 3 * mct * clampedT * clampedT * cx2 + clampedT * clampedT * clampedT * tx;
            this.y = mct * mct * mct * sy + 3 * mct * mct * clampedT * cy1 + 3 * mct * clampedT * clampedT * cy2 + clampedT * clampedT * clampedT * ty;

            if (t >= 1.2 || this.y < -50 || this.y > CANVAS_HEIGHT + 50 || this.x < -100 || this.x > CANVAS_WIDTH + 100) {
                this.markedForDeletion = true;
            }
        } else if (this.state === 'formation') {
            if (this.isDiving) {
                if (this.type === 2) { // ZZ dive
                    this.zigzagOffset += 0.1 * dt;
                    this.x += Math.sin(this.zigzagOffset) * 4 * dt;
                    this.y += this.diveSpeedY * dt;
                } else if (this.type === 3) { // Spiral dive
                    this.angle += 0.05 * dt;
                    this.radius += 0.5 * dt;
                    this.x += Math.cos(this.angle) * 3 * dt;
                    this.y += this.diveSpeedY * dt;
                } else {
                    this.y += (this.diveSpeedY) * dt;
                }

                if (this.y > CANVAS_HEIGHT) {
                    this.isDiving = false;
                    this.y = -50;
                    this.x = this.startX + formationOffsetX;
                }
            } else {
                this.x = this.startX + formationOffsetX;
                this.y = this.startY + Math.sin(gameTime / ENEMY_FORMATION_WAVE_FREQUENCY + this.startX / 100) * ENEMY_FORMATION_WAVE_AMPLITUDE;

                if (Math.random() < this.diveProb) this.isDiving = true;
                if (Math.random() < this.bombProb) {
                    if (this.type === 4) {
                        // Elite fires tracking missiles
                        let missile = new TrackingMissile(this.x + this.width / 2, this.y + this.height);
                        missile.speedX = (Math.random() - 0.5) * 2; // Initial horizontal spread
                        enemyProjectiles.push(missile);
                    } else {
                        enemyProjectiles.push(getEnemyProjectile(this.x + this.width / 2, this.y + this.height));
                    }
                }
            }
        }

        // Trail for diving or entering enemies
        if ((this.state === 'entering' || this.state === 'challenge_flyby' || this.isDiving) && Math.random() < 0.3 * dt) {
            trails.push(getTrail(this.x + this.width / 2, this.y + 10, this.type === 2 ? '#00d4ff' : '#ff0055', 4));
        }
    }
}

class Boss {
    constructor() {
        this.x = CANVAS_WIDTH / 2;
        this.y = 150;
        this.width = BOSS_WIDTH;
        this.height = BOSS_HEIGHT;
        this.state = 'entering';
        this.yOffset = BOSS_Y_OFFSET_START;

        this.attackTimer = BOSS_ATTACK_COOLDOWN_BASE;
        this.attackState = 0; // 0: spread, 1: double aimed, 2: semi-circle

        this.parts = [
            { id: 'left_wing', offsetX: -BOSS_PART_WING_OFFSET_X, offsetY: BOSS_PART_WING_OFFSET_Y, width: BOSS_PART_WING_WIDTH, height: BOSS_PART_WING_HEIGHT, health: BOSS_PART_WING_HEALTH_BASE + level * 5, maxHealth: BOSS_PART_WING_HEALTH_BASE + level * 5, active: true },
            { id: 'right_wing', offsetX: BOSS_PART_WING_OFFSET_X, offsetY: BOSS_PART_WING_OFFSET_Y, width: BOSS_PART_WING_WIDTH, height: BOSS_PART_WING_HEIGHT, health: BOSS_PART_WING_HEALTH_BASE + level * 5, maxHealth: BOSS_PART_WING_HEALTH_BASE + level * 5, active: true },
            { id: 'core', offsetX: BOSS_PART_CORE_OFFSET_X, offsetY: BOSS_PART_CORE_OFFSET_Y, width: BOSS_PART_CORE_WIDTH, height: BOSS_PART_CORE_HEIGHT, health: BOSS_PART_CORE_HEALTH_BASE + level * 10, maxHealth: BOSS_PART_CORE_HEALTH_BASE + level * 10, active: true }
        ];

        this.hasDroppedPowerup = false;
        this.moveTimer = 0;
        this.targetX = this.x;
        this.deathTimer = 0;
        this.pendingActions = []; // Frame-based action queue replaces setTimeout
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y + this.yOffset);

        // Draw giant Boss Image
        if (enemyBossImg.complete) {
            // Slight pulsing glow for the boss
            ctx.shadowBlur = 30;
            ctx.shadowColor = `rgba(255, 0, 0, ${0.5 + Math.sin(gameTime / 200) * 0.5})`;
            ctx.drawImage(enemyBossImg, -this.width / 2, -this.height / 2, this.width, this.height);
            ctx.shadowColor = 'transparent';
        }

        // Draw Health Bars over Parts
        this.parts.forEach(p => {
            ctx.save();
            ctx.translate(p.offsetX, p.offsetY);

            if (!p.active) {
                // Draw damage indication if part is destroyed (simulated smoke/fire)
                ctx.fillStyle = `rgba(50, 50, 50, ${Math.random() * 0.5 + 0.5})`;
                ctx.beginPath();
                ctx.arc(0, 0, 20, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Health Bar
                const barWidth = p.id === 'core' ? p.width : p.width * 0.8;
                const yPos = p.id === 'core' ? this.height / 2 + 10 : p.height / 2 + 5;

                ctx.fillStyle = '#ff0000';
                ctx.fillRect(-barWidth / 2, yPos, barWidth, 6);

                ctx.fillStyle = '#00ff00';
                ctx.fillRect(-barWidth / 2, yPos, barWidth * (p.health / p.maxHealth), 6);
            }
            ctx.restore();
        });

        ctx.restore();
    }

    update(dt) {
        if (this.state === 'entering') {
            this.yOffset += 1.5 * dt;
            if (this.yOffset >= 0) {
                this.yOffset = 0;
                this.state = 'active';
            }
            return;
        }

        if (this.state === 'dying') {
            this.deathTimer -= dt;
            if (Math.random() < 0.2 * dt) {
                const ex = this.x + (Math.random() - 0.5) * this.width;
                const ey = this.y + (Math.random() - 0.5) * this.height;
                createExplosion(ex, ey, '#ffaa00', 2);
                playSound('explosion');
            }
            if (this.deathTimer <= 0) {
                this.state = 'dead';
            }
            return;
        }

        // Movement
        this.moveTimer -= dt;
        if (this.moveTimer <= 0) {
            this.targetX = Math.random() * (CANVAS_WIDTH - this.width) + this.width / 2;
            this.moveTimer = BOSS_MOVE_TIMER_MIN + Math.random() * (BOSS_MOVE_TIMER_MAX - BOSS_MOVE_TIMER_MIN);
        }
        this.x += (this.targetX - this.x) * BOSS_MOVE_SPEED_FACTOR * dt;

        // Mid-fight Powerup Drop
        const core = this.parts.find(p => p.id === 'core');
        if (core && !this.hasDroppedPowerup && core.health <= core.maxHealth * BOSS_MID_HEALTH_POWERUP_THRESHOLD) {
            this.hasDroppedPowerup = true;
            const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
            powerUps.push(new PowerUp(this.x, this.y, type));
            playSound('shoot'); // Ping sound to alert player
        }

        // Attack
        this.attackTimer -= dt;
        if (this.attackTimer <= 0) {
            this.firePattern();
        }

        // Process pending actions queue (replaces setTimeout)
        for (let i = this.pendingActions.length - 1; i >= 0; i--) {
            this.pendingActions[i].delay -= dt * 16.67;
            if (this.pendingActions[i].delay <= 0) {
                if (this.state === 'active') {
                    this.pendingActions[i].action();
                }
                this.pendingActions.splice(i, 1);
            }
        }
    }

    firePattern() {
        this.attackState = (this.attackState + 1) % 3;
        this.attackTimer = BOSS_ATTACK_COOLDOWN_BASE - Math.min(level * BOSS_ATTACK_COOLDOWN_LEVEL_REDUCTION, 60);

        const core = this.parts.find(p => p.id === 'core');
        const lw = this.parts.find(p => p.id === 'left_wing');
        const rw = this.parts.find(p => p.id === 'right_wing');

        if (this.attackState === 0 && core.active) {
            // Spread (Dense Double Wave)
            const numBullets = BOSS_ATTACK_SPREAD_BULLETS;
            for (let w = 0; w < 2; w++) { // Two waves
                for (let i = 0; i < numBullets; i++) {
                    const delay = w * BOSS_ATTACK_SPREAD_WAVE_DELAY * 16.67;
                    const waveIdx = w;
                    const bulletIdx = i;
                    this.pendingActions.push({
                        delay, action: () => {
                            let ep = getEnemyProjectile(this.x, this.y + 20);
                            const maxSpread = BOSS_ATTACK_SPREAD_MAX_SPREAD + level * 0.1;
                            ep.speedX = -maxSpread + (bulletIdx * (maxSpread * 2 / (numBullets - 1)));
                            ep.speed = BOSS_ATTACK_SPREAD_BULLET_SPEED_BASE + waveIdx * BOSS_ATTACK_SPREAD_BULLET_SPEED_WAVE_BONUS; // Second wave is slightly faster
                            enemyProjectiles.push(ep);
                        }
                    });
                }
            }
        } else if (this.attackState === 1) {
            // Aimed from wings (5-shot Burst)
            [lw, rw].forEach(w => {
                if (w && w.active) {
                    for (let i = 0; i < BOSS_ATTACK_AIMED_BULLETS_PER_WING; i++) { // 5 shots
                        const delay = i * BOSS_ATTACK_AIMED_BULLET_DELAY;
                        const wingRef = w;
                        this.pendingActions.push({
                            delay, action: () => {
                                let ep = getEnemyProjectile(this.x + wingRef.offsetX, this.y + wingRef.offsetY);
                                const predX = player.x + player.width / 2 + (player.dx * 10);
                                const dx = predX - ep.x;
                                const dy = player.y - ep.y;
                                const dist = Math.sqrt(dx * dx + dy * dy);
                                const inaccuracy = (Math.random() - 0.5) * BOSS_ATTACK_AIMED_INACCURACY;
                                ep.speedX = (dx / dist) * BOSS_ATTACK_AIMED_BULLET_SPEED + inaccuracy;
                                ep.speed = (dy / dist) * BOSS_ATTACK_AIMED_BULLET_SPEED;
                                enemyProjectiles.push(ep);
                            }
                        });
                    }
                }
            });
        } else if (this.attackState === 2 && core.active) {
            // Circle Wave (Dense 360) and Spawn Minions
            const bullets = BOSS_ATTACK_CIRCLE_BULLETS;
            for (let i = 0; i < bullets; i++) {
                let ep = getEnemyProjectile(this.x, this.y + 20);
                const angle = (Math.PI * 2 / bullets) * i + (Math.random() * 0.2);
                ep.speedX = Math.cos(angle) * BOSS_ATTACK_CIRCLE_BULLET_SPEED;
                ep.speed = Math.sin(angle) * BOSS_ATTACK_CIRCLE_BULLET_SPEED;
                enemyProjectiles.push(ep);
            }

            // Spawn 2-3 small enemies
            const numMinions = Math.floor(Math.random() * (BOSS_ATTACK_MINION_COUNT_MAX - BOSS_ATTACK_MINION_COUNT_MIN + 1)) + BOSS_ATTACK_MINION_COUNT_MIN;
            for (let i = 0; i < numMinions; i++) {
                const delay = i * BOSS_ATTACK_MINION_DELAY;
                this.pendingActions.push({
                    delay, action: () => {
                        const rand = Math.random();
                        let minionType = 1;
                        if (rand > 0.9) minionType = 3;
                        else if (rand > 0.6) minionType = 2;
                        let minion = new Enemy(this.x + (Math.random() - 0.5) * this.width, this.y + this.height, minionType);
                        minion.state = 'formation';
                        minion.isDiving = true;
                        enemies.push(minion);
                    }
                });
            }
        }
    }
}
