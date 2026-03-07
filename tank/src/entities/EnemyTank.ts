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

    private updateAI() {
        const aligned = this.isAlignedToGrid();
        const losDir = this.getLineOfSightDirection();

        if (losDir !== null) {
            if (this.direction === losDir) {
                // [P1] Line of sight shooting
                if (aligned) {
                    this.shoot();
                }
            } else if (aligned) {
                // [P2] Line of sight moving
                this.snapToGrid();
                this.direction = losDir;
                this.stuckFrames = 0; // reset stuck when locking on player
            }
        } else {
            // [P3] Powerup Targeting (Skipped until Powerups are added)

            // [P4] Stuck navigation & [P5] Default wandering
            this.randomTurnTimer--;
            let shouldTurnRandomly = false;

            if (this.stuckFrames >= 3) {
                // [P4]
                shouldTurnRandomly = true;
            } else if (this.randomTurnTimer <= 0) {
                // [P5]
                this.randomTurnTimer = 180;
                if (Math.random() < 0.3) {
                    shouldTurnRandomly = true;
                }
            }

            if (shouldTurnRandomly) {
                if (aligned) {
                    this.snapToGrid();
                    // Pick a new direction from the remaining 3
                    const dirs = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT]
                        .filter(d => d !== this.direction);
                    this.direction = dirs[Math.floor(Math.random() * dirs.length)];
                    this.stuckFrames = 0;
                } else if (this.stuckFrames > 30) {
                    // if terribly stuck and off-grid (e.g. tank collision), force snap and turn
                    this.snapToGrid();
                    const dirs = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT]
                        .filter(d => d !== this.direction);
                    this.direction = dirs[Math.floor(Math.random() * dirs.length)];
                    this.stuckFrames = 0;
                }
            }
        }

        // We snap to grid only when changing direction, or let collision handle it?
        // Actually it's better to only let them turn smoothly or snap them, but Map handles slip anyway.
        // Wait, collision resolution allows smooth enough turning since tanks are smaller than two cells.

        // Calculate intended movement
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

        // Ensure random shooting happens very rarely if not locked on
        if (aligned && Math.random() < 0.01) {
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
