import { Tank } from './Tank';
import { TankGrade, TankFaction, Direction } from '../types';
import { GameManager } from '../engine/GameManager';
import { CELL_SIZE } from '../constants';

export class EnemyTank extends Tank {
    private spawnTimer: number = 60; // 60 frames flashing spawn animation
    public hasSpawned: boolean = false;

    // AI State
    private stuckFrames: number = 0;
    private randomTurnTimer: number = 180;

    public holdsPowerUp: boolean = false;
    private flashTimer: number = 0; // for hit flashing or powerup flashing
    private hitFlashActive: boolean = false;

    constructor(gameManager: GameManager, x: number, y: number, grade: TankGrade, holdsPowerUp: boolean = false) {
        super(gameManager);
        this.x = x * CELL_SIZE;
        this.y = y * CELL_SIZE;
        this.direction = Direction.DOWN; // Enemies spawn facing down
        this.faction = TankFaction.ENEMY;
        this.grade = grade;
        this.holdsPowerUp = holdsPowerUp;

        switch (grade) {
            case TankGrade.BASIC:
                this.hp = 1;
                this.speed = 1.5;
                this.bulletSpeed = 4;
                this.bulletPower = 1;
                break;
            case TankGrade.FAST:
                this.hp = 1;
                this.speed = 2.5;
                this.bulletSpeed = 6;
                this.bulletPower = 1;
                break;
            case TankGrade.POWER:
                this.hp = 1;
                this.speed = 1.5;
                this.bulletSpeed = 4;
                this.bulletPower = 2;
                break;
            case TankGrade.ARMOR:
                this.hp = 4;
                this.speed = 1.5;
                this.bulletSpeed = 4;
                this.bulletPower = 1;
                break;
        }

        // Initial setup for shoot cooldown (enemies shoot less frequently than players on average, adjust as needed)
        this.shootCooldown = 60;
    }

    public upgrade(newGrade: TankGrade) {
        this.grade = newGrade;
        switch (newGrade) {
            case TankGrade.BASIC:
                this.hp = Math.max(this.hp, 1); this.speed = 1.5; this.bulletSpeed = 4; this.bulletPower = 1; break;
            case TankGrade.FAST:
                this.hp = Math.max(this.hp, 1); this.speed = 2.5; this.bulletSpeed = 6; this.bulletPower = 1; break;
            case TankGrade.POWER:
                this.hp = Math.max(this.hp, 1); this.speed = 1.5; this.bulletSpeed = 4; this.bulletPower = 2; break;
            case TankGrade.ARMOR:
                this.hp = Math.max(this.hp, 4); this.speed = 1.5; this.bulletSpeed = 4; this.bulletPower = 1; break;
        }
    }

    public applyDamage() {
        if (!this.hasSpawned) return;

        this.hp--;

        if (this.hp <= 0) {
            // Drop power-up if this was a flashing enemy
            if (this.holdsPowerUp) {
                this.gameManager.getPowerUpSystem().spawnPowerUp(this.x, this.y);
            }
            this.isDead = true;
            // Reward score based on grade
            let score = 0;
            switch (this.grade) {
                case TankGrade.BASIC: score = 100; break;
                case TankGrade.FAST: score = 200; break;
                case TankGrade.POWER: score = 300; break;
                case TankGrade.ARMOR: score = 400; break;
            }
            // Trigger explosion 
            this.gameManager.getParticleSystem().emitExplosion(this.x + this.w / 2, this.y + this.h / 2, 40, '#f22');
            this.gameManager.addScore(score);
        } else {
            // Armor tank hit flash
            this.hitFlashActive = true;
            this.flashTimer = 4;
            // Emit minor debris
            this.gameManager.getParticleSystem().emitDebris(this.x + this.w / 2, this.y + this.h / 2, 10, '#ddd');
        }
    }

    public update(dt: number) {
        if (this.isDead) return;

        if (this.gameManager.getPowerUpSystem().clockTimer > 0) return;

        if (!this.hasSpawned) {
            this.spawnTimer--;
            if (this.spawnTimer <= 0) {
                this.hasSpawned = true;
            }
            return;
        }

        this.updateCooldowns(dt);

        if (this.hitFlashActive) {
            this.flashTimer--;
            if (this.flashTimer <= 0) {
                this.hitFlashActive = false;
            }
        }

        this.updateAI();
    }

    private isAlignedToGrid(): boolean {
        // Tank is aligned if both x and y are multiples of CELL_SIZE (20)
        // Similar to PlayerTank align logic
        const mx = Math.abs(this.x % CELL_SIZE);
        const my = Math.abs(this.y % CELL_SIZE);
        const alignedX = mx < 0.5 || mx > CELL_SIZE - 0.5;
        const alignedY = my < 0.5 || my > CELL_SIZE - 0.5;
        return alignedX && alignedY;
    }

    private snapToGrid() {
        this.x = Math.round(this.x / CELL_SIZE) * CELL_SIZE;
        this.y = Math.round(this.y / CELL_SIZE) * CELL_SIZE;
    }

    private getLineOfSightDirection(): Direction | null {
        const player = this.gameManager.getPlayer();
        if (!player || player.isDead) return null;

        // Roughly aligned on X axis
        const alignedX = (this.x < player.x + player.w) && (this.x + this.w > player.x);
        // Roughly aligned on Y axis
        const alignedY = (this.y < player.y + player.h) && (this.y + this.h > player.y);

        if (!alignedX && !alignedY) return null;

        const map = this.gameManager.getMap();

        if (alignedX) {
            const minY = Math.min(this.y, player.y);
            const maxY = Math.max(this.y, player.y);
            const minRow = Math.floor(minY / CELL_SIZE);
            const maxRow = Math.floor(maxY / CELL_SIZE);
            const checkCol = Math.floor((this.x + this.w / 2) / CELL_SIZE);

            let blocked = false;
            for (let r = minRow; r <= maxRow; r++) {
                const type = map.getTerrainType(r, checkCol);
                if ([1, 2, 6].includes(type)) { blocked = true; break; }
            }
            if (!blocked) {
                return (player.y < this.y) ? Direction.UP : Direction.DOWN;
            }
        } else if (alignedY) {
            const minX = Math.min(this.x, player.x);
            const maxX = Math.max(this.x, player.x);
            const minCol = Math.floor(minX / CELL_SIZE);
            const maxCol = Math.floor(maxX / CELL_SIZE);
            const checkRow = Math.floor((this.y + this.h / 2) / CELL_SIZE);

            let blocked = false;
            for (let c = minCol; c <= maxCol; c++) {
                const type = map.getTerrainType(checkRow, c);
                if ([1, 2, 6].includes(type)) { blocked = true; break; }
            }
            if (!blocked) {
                return (player.x < this.x) ? Direction.LEFT : Direction.RIGHT;
            }
        }
        return null;
    }

    /** Returns the best axis-aligned direction to move toward a target pixel position */
    private getDirectionToward(targetX: number, targetY: number): Direction {
        const cx = this.x + this.w / 2;
        const cy = this.y + this.h / 2;
        const dx = targetX - cx;
        const dy = targetY - cy;

        // Prefer the axis with the larger delta
        if (Math.abs(dx) > Math.abs(dy)) {
            return dx > 0 ? Direction.RIGHT : Direction.LEFT;
        } else {
            return dy > 0 ? Direction.DOWN : Direction.UP;
        }
    }

    /** Find the closest power-up on the map and return direction toward it, or null */
    private getPowerUpDirection(): Direction | null {
        const powerUps = this.gameManager.getPowerUpSystem().getPowerUps().filter(p => !p.isDead);
        if (powerUps.length === 0) return null;

        const cx = this.x + this.w / 2;
        const cy = this.y + this.h / 2;

        let closest = powerUps[0];
        let closestDist = Infinity;
        for (const pu of powerUps) {
            const d = Math.abs(pu.x - cx) + Math.abs(pu.y - cy); // Manhattan distance
            if (d < closestDist) {
                closestDist = d;
                closest = pu;
            }
        }

        return this.getDirectionToward(closest.x + closest.w / 2, closest.y + closest.h / 2);
    }

    /** Get direction toward the base center */
    private getBaseDirection(): Direction {
        const baseCoords = this.gameManager.getMap().baseCoords;
        if (baseCoords.length === 0) {
            return Direction.DOWN; // fallback
        }
        const avgC = baseCoords.reduce((s, b) => s + b.c, 0) / baseCoords.length;
        const avgR = baseCoords.reduce((s, b) => s + b.r, 0) / baseCoords.length;
        const baseX = (avgC + 0.5) * CELL_SIZE;
        const baseY = (avgR + 0.5) * CELL_SIZE;
        return this.getDirectionToward(baseX, baseY);
    }

    /** Check if the player is within a given pixel distance */
    private isPlayerNearby(range: number): boolean {
        const player = this.gameManager.getPlayer();
        if (!player || player.isDead) return false;
        const dx = (player.x + player.w / 2) - (this.x + this.w / 2);
        const dy = (player.y + player.h / 2) - (this.y + this.h / 2);
        return Math.abs(dx) + Math.abs(dy) < range;
    }

    private updateAI() {
        const aligned = this.isAlignedToGrid();
        const losDir = this.getLineOfSightDirection();

        // ── Priority 1: Player in line of sight — shoot or turn to shoot ──
        if (losDir !== null) {
            if (this.direction === losDir) {
                if (aligned) {
                    this.shoot();
                }
            } else if (aligned) {
                this.snapToGrid();
                this.direction = losDir;
                this.stuckFrames = 0;
            }
        }
        // ── Priority 2: Player nearby (~200px) — chase the player ──
        else if (this.isPlayerNearby(200) && aligned) {
            const player = this.gameManager.getPlayer();
            const chaseDir = this.getDirectionToward(
                player.x + player.w / 2, player.y + player.h / 2
            );
            if (this.direction !== chaseDir) {
                this.snapToGrid();
                this.direction = chaseDir;
                this.stuckFrames = 0;
            }
        }
        // ── Priority 3: Power-up on map — go pick it up ──
        else if (aligned && this.getPowerUpDirection() !== null) {
            const puDir = this.getPowerUpDirection()!;
            if (this.direction !== puDir) {
                this.snapToGrid();
                this.direction = puDir;
                this.stuckFrames = 0;
            }
        }
        // ── Priority 4: Head toward the base ──
        else {
            // Stuck navigation & random wandering
            this.randomTurnTimer--;
            let shouldTurn = false;

            if (this.stuckFrames >= 3) {
                shouldTurn = true;
            } else if (this.randomTurnTimer <= 0) {
                this.randomTurnTimer = 180;
                // 70% chance: head toward base; 30% chance: random turn for variety
                if (Math.random() < 0.7 && aligned) {
                    this.snapToGrid();
                    this.direction = this.getBaseDirection();
                    this.stuckFrames = 0;
                } else if (Math.random() < 0.5) {
                    shouldTurn = true;
                }
            }

            if (shouldTurn) {
                if (aligned) {
                    this.snapToGrid();
                    const dirs = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT]
                        .filter(d => d !== this.direction);
                    // Bias: 50% chance to pick base direction, 50% truly random
                    if (Math.random() < 0.5) {
                        this.direction = this.getBaseDirection();
                    } else {
                        this.direction = dirs[Math.floor(Math.random() * dirs.length)];
                    }
                    this.stuckFrames = 0;
                } else if (this.stuckFrames > 30) {
                    this.snapToGrid();
                    const dirs = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT]
                        .filter(d => d !== this.direction);
                    this.direction = dirs[Math.floor(Math.random() * dirs.length)];
                    this.stuckFrames = 0;
                }
            }
        }

        // ── Movement execution ──
        let dx = 0; let dy = 0;
        let moveSpeed = this.speed;
        // Apply speed boost from reverse Clock power-up
        if (this.gameManager.getPowerUpSystem().enemySpeedBoostTimer > 0) {
            moveSpeed *= 2;
        }
        if (this.direction === Direction.UP) dy = -moveSpeed;
        else if (this.direction === Direction.DOWN) dy = moveSpeed;
        else if (this.direction === Direction.LEFT) dx = -moveSpeed;
        else if (this.direction === Direction.RIGHT) dx = moveSpeed;

        const res = this.gameManager.getCollisionSystem().resolveMovement(this, dx, dy);

        // Track sticking
        if ((dx !== 0 && res.dx === 0) || (dy !== 0 && res.dy === 0)) {
            this.stuckFrames++;
        } else {
            this.stuckFrames = 0;
        }

        this.x += res.dx;
        this.y += res.dy;

        // Random shooting when no line of sight (rare)
        if (aligned && Math.random() < 0.015) {
            this.shoot();
        }
    }

    public render(ctx: CanvasRenderingContext2D) {
        if (!this.hasSpawned) {
            // Draw spawn animation (flashing star)
            ctx.fillStyle = (this.spawnTimer % 8 < 4) ? '#fff' : '#888';
            ctx.fillRect(this.x, this.y, this.w, this.h);
            return;
        }

        // Determine color
        let color = '#fff'; // Basic
        if (this.grade === TankGrade.FAST) color = '#bbb';
        else if (this.grade === TankGrade.POWER) color = '#666';
        else if (this.grade === TankGrade.ARMOR) {
            if (this.hitFlashActive) {
                color = '#fff'; // White flash
            } else {
                if (this.hp === 4) color = '#0066ff'; // Strong blue
                else if (this.hp === 3) color = '#5577bb'; // Muted blue
                else if (this.hp === 2) color = '#888899'; // Very faded blue
                else color = '#aaaaaa'; // Plain gray
            }
        }

        // Flashing if holds powerup
        if (this.holdsPowerUp && Math.floor(Date.now() / 150) % 2 === 0) {
            color = '#f0f'; // Purple or bright color to indicate powerup
        }

        // Rely on base class render with specific color (update Tank.ts to support custom colors)
        this.colorOverride = color;
        super.render(ctx);
    }
}
