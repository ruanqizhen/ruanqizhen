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
    private lastX: number = 0;
    private lastY: number = 0;
    private positionQuietFrames: number = 0;

    public holdsPowerUp: boolean = false;
    private flashTimer: number = 0; // for hit flashing or powerup flashing
    private hitFlashActive: boolean = false;

    constructor(gameManager: GameManager, x: number, y: number, grade: TankGrade, holdsPowerUp: boolean = false) {
        super(gameManager);
        this.x = x * CELL_SIZE;
        this.y = y * CELL_SIZE;
        this.lastX = this.x;
        this.lastY = this.y;
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
        const mx = Math.abs(this.x % CELL_SIZE);
        const my = Math.abs(this.y % CELL_SIZE);
        // Use a stricter threshold (0.2px) to prevent premature turning
        const alignedX = mx < 0.2 || mx > CELL_SIZE - 0.2;
        const alignedY = my < 0.2 || my > CELL_SIZE - 0.2;
        return alignedX && alignedY;
    }

    private snapToGrid() {
        this.x = Math.round(this.x / CELL_SIZE) * CELL_SIZE;
        this.y = Math.round(this.y / CELL_SIZE) * CELL_SIZE;
    }

    private getLineOfSightDirection(): Direction | null {
        const player = this.gameManager.getPlayer();
        if (!player || player.isDead) return null;

        const map = this.gameManager.getMap();

        // Strictly use snapped grid coordinates for the 2-cell check
        const col = Math.round(this.x / CELL_SIZE);
        const row = Math.round(this.y / CELL_SIZE);
        const pCol = Math.round(player.x / CELL_SIZE);
        const pRow = Math.round(player.y / CELL_SIZE);

        if (col === pCol) {
            // Check BOTH columns of the 2-cell width path
            const minY = Math.min(this.y, player.y);
            const maxY = Math.max(this.y, player.y);
            const minR = Math.floor(minY / CELL_SIZE);
            const maxR = Math.floor(maxY / CELL_SIZE);

            let blocked = false;
            for (let r = minR; r <= maxR; r++) {
                const t1 = map.getTerrainType(r, col);
                const t2 = map.getTerrainType(r, col + 1);
                // Obstacles: brick(1), steel(2), or base(6)
                if ([1, 2, 6].includes(t1) || [1, 2, 6].includes(t2)) {
                    blocked = true;
                    break;
                }
            }
            if (!blocked) {
                return (player.y < this.y) ? Direction.UP : Direction.DOWN;
            }
        } else if (row === pRow) {
            // Check BOTH rows of the 2-cell height path
            const minX = Math.min(this.x, player.x);
            const maxX = Math.max(this.x, player.x);
            const minC = Math.floor(minX / CELL_SIZE);
            const maxC = Math.floor(maxX / CELL_SIZE);

            let blocked = false;
            for (let c = minC; c <= maxC; c++) {
                const t1 = map.getTerrainType(row, c);
                const t2 = map.getTerrainType(row + 1, c);
                if ([1, 2, 6].includes(t1) || [1, 2, 6].includes(t2)) {
                    blocked = true;
                    break;
                }
            }
            if (!blocked) {
                return (player.x < this.x) ? Direction.LEFT : Direction.RIGHT;
            }
        }
        return null;
    }

    /** Returns the best axis-aligned direction to move toward a target pixel position, filtered by passable dirs */
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

    /** Check if a direction is passable for a 2-cell-wide tank */
    private canMoveInDirection(dir: Direction): boolean {
        const map = this.gameManager.getMap();
        // Since we snapToGrid before calling this at junctions, x and y should be multiples of CELL_SIZE
        const col = Math.round(this.x / CELL_SIZE);
        const row = Math.round(this.y / CELL_SIZE);

        // Helper: check if a specific cell is passable
        const ok = (r: number, c: number) => {
            const t = map.getTerrainType(r, c);
            return t === 0 || t === 3 || t === 5; // empty, forest, ice
        };

        if (dir === Direction.UP) {
            return ok(row - 1, col) && ok(row - 1, col + 1);
        } else if (dir === Direction.DOWN) {
            return ok(row + 2, col) && ok(row + 2, col + 1);
        } else if (dir === Direction.LEFT) {
            return ok(row, col - 1) && ok(row + 1, col - 1);
        } else { // RIGHT
            return ok(row, col + 2) && ok(row + 1, col + 2);
        }
    }

    /** Check if the obstacle ahead is destructible (brick) */
    private isBrickAhead(): boolean {
        const map = this.gameManager.getMap();
        const col = Math.round(this.x / CELL_SIZE);
        const row = Math.round(this.y / CELL_SIZE);
        const isBrick = (r: number, c: number) => map.getTerrainType(r, c) === 1;

        if (this.direction === Direction.UP) {
            return isBrick(row - 1, col) || isBrick(row - 1, col + 1);
        } else if (this.direction === Direction.DOWN) {
            return isBrick(row + 2, col) || isBrick(row + 2, col + 1);
        } else if (this.direction === Direction.LEFT) {
            return isBrick(row, col - 1) || isBrick(row + 1, col - 1);
        } else {
            return isBrick(row, col + 2) || isBrick(row + 1, col + 2);
        }
    }

    /** Get all passable directions */
    private getPassableDirections(): Direction[] {
        return [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT]
            .filter(d => this.canMoveInDirection(d));
    }

    /** Get the opposite direction */
    private getOpposite(dir: Direction): Direction {
        if (dir === Direction.UP) return Direction.DOWN;
        if (dir === Direction.DOWN) return Direction.UP;
        if (dir === Direction.LEFT) return Direction.RIGHT;
        return Direction.LEFT;
    }

    /** Pick the best direction from a list, biased toward a target */
    private pickBestDirection(candidates: Direction[], targetDir: Direction): Direction {
        // If target direction is in candidates, pick it with 60% chance
        if (candidates.includes(targetDir) && Math.random() < 0.6) {
            return targetDir;
        }
        // Otherwise pick a random candidate
        return candidates[Math.floor(Math.random() * candidates.length)];
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
            const d = Math.abs(pu.x - cx) + Math.abs(pu.y - cy);
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
            return Direction.DOWN;
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
        // ── Stuck Detection ──
        const distSq = (this.x - this.lastX) ** 2 + (this.y - this.lastY) ** 2;
        if (distSq < 0.01) { // Practically stationary
            this.positionQuietFrames++;
        } else {
            this.positionQuietFrames = 0;
        }
        this.lastX = this.x;
        this.lastY = this.y;

        // If physically stuck or positionally stuck (30 frames = 0.5s)
        if (this.stuckFrames > 30 || this.positionQuietFrames > 30) {
            this.recoverFromStuck();
            return;
        }

        const aligned = this.isAlignedToGrid();
        if (aligned) {
            this.snapToGrid();
        }
        const losDir = this.getLineOfSightDirection();

        // ── Priority 1: Player in line of sight — shoot or turn to shoot ──
        if (losDir !== null) {
            if (this.direction === losDir) {
                if (aligned) {
                    this.shoot();
                }
            } else if (aligned) {
                // Only turn if it's a passable 2-cell wide path
                if (this.canMoveInDirection(losDir)) {
                    this.snapToGrid();
                    this.direction = losDir;
                    this.stuckFrames = 0;
                }
            }
        }
        // ── Priority 2: Player nearby (~200px) — chase the player ──
        else if (this.isPlayerNearby(200) && aligned) {
            const player = this.gameManager.getPlayer();
            const chaseDir = this.getDirectionToward(
                player.x + player.w / 2, player.y + player.h / 2
            );
            // Only chase in that direction if it's passable
            if (this.canMoveInDirection(chaseDir)) {
                if (this.direction !== chaseDir) {
                    this.snapToGrid();
                    this.direction = chaseDir;
                    this.stuckFrames = 0;
                }
            }
        }
        // ── Priority 3: Power-up on map — go pick it up ──
        else if (aligned && this.getPowerUpDirection() !== null) {
            const puDir = this.getPowerUpDirection()!;
            if (this.canMoveInDirection(puDir) && this.direction !== puDir) {
                this.snapToGrid();
                this.direction = puDir;
                this.stuckFrames = 0;
            }
        }
        // ── Priority 4: Navigate toward the base with smart pathfinding ──
        else if (aligned) {
            const canMoveFwd = this.canMoveInDirection(this.direction);
            const brickAhead = !canMoveFwd && this.isBrickAhead();

            if (canMoveFwd) {
                // Path is clear — occasionally consider turning at junctions
                this.randomTurnTimer--;
                if (this.randomTurnTimer <= 0) {
                    this.randomTurnTimer = 120 + Math.floor(Math.random() * 120);
                    // Only turn if there's actually a side path available (real junction)
                    const passable = this.getPassableDirections();
                    const sideDirs = passable.filter(d => d !== this.direction && d !== this.getOpposite(this.direction));
                    if (sideDirs.length > 0) {
                        // 50% chance to take a side path at a junction, biased toward base
                        if (Math.random() < 0.5) {
                            const baseDir = this.getBaseDirection();
                            this.snapToGrid();
                            this.direction = this.pickBestDirection(sideDirs, baseDir);
                            this.stuckFrames = 0;
                        }
                    }
                }
            } else if (brickAhead) {
                // Brick wall ahead — shoot through it!
                this.shoot();
                // After a few frames of shooting, consider a side path
                if (this.stuckFrames >= 8) {
                    const passable = this.getPassableDirections();
                    const sideDirs = passable.filter(d => d !== this.getOpposite(this.direction));
                    if (sideDirs.length > 0) {
                        this.snapToGrid();
                        this.direction = this.pickBestDirection(sideDirs, this.getBaseDirection());
                        this.stuckFrames = 0;
                    }
                }
            } else {
                // Impassable obstacle (steel, water, map edge) — turn immediately
                this.snapToGrid();
                const passable = this.getPassableDirections();
                // Strongly avoid U-turns: filter out the reverse direction
                const noReverse = passable.filter(d => d !== this.getOpposite(this.direction));
                const candidates = noReverse.length > 0 ? noReverse : passable;

                if (candidates.length > 0) {
                    this.direction = this.pickBestDirection(candidates, this.getBaseDirection());
                } else {
                    // Absolutely no way out — U-turn as last resort
                    this.direction = this.getOpposite(this.direction);
                }
                this.stuckFrames = 0;
            }

            // Long-term stuck detection: if stuck for too long, force a new direction
            if (this.stuckFrames >= 20) {
                this.snapToGrid();
                const passable = this.getPassableDirections();
                const noReverse = passable.filter(d => d !== this.direction && d !== this.getOpposite(this.direction));
                if (noReverse.length > 0) {
                    this.direction = noReverse[Math.floor(Math.random() * noReverse.length)];
                } else if (passable.length > 0) {
                    this.direction = passable[Math.floor(Math.random() * passable.length)];
                }
                this.stuckFrames = 0;
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

        // Shooting when no line of sight to player
        if (aligned) {
            // Check what's ahead in the facing direction
            const map = this.gameManager.getMap();
            const col = Math.floor((this.x + this.w / 2) / CELL_SIZE);
            const row = Math.floor((this.y + this.h / 2) / CELL_SIZE);
            let hasWallOrBaseAhead = false;

            // Scan a few cells ahead for walls (1, 2) or base (6)
            for (let step = 1; step <= 5; step++) {
                let checkR = row, checkC = col;
                if (this.direction === Direction.UP) checkR = row - step;
                else if (this.direction === Direction.DOWN) checkR = row + step;
                else if (this.direction === Direction.LEFT) checkC = col - step;
                else if (this.direction === Direction.RIGHT) checkC = col + step;

                const type = map.getTerrainType(checkR, checkC);
                if (type === 1 || type === 2 || type === 6) {
                    hasWallOrBaseAhead = true;
                    break;
                }
            }

            // Shoot much more often if facing a wall/base, otherwise rarely
            const shootChance = hasWallOrBaseAhead ? 0.08 : 0.015;
            if (Math.random() < shootChance) {
                this.shoot();
            }
        }
    }

    private recoverFromStuck() {
        this.snapToGrid();
        // 1. Try to blast through whatever might be in the way
        this.shoot();

        // 2. Pick a new random passable direction that isn't the current one or its opposite
        const passable = this.getPassableDirections();
        const choices = passable.filter(d => d !== this.direction && d !== this.getOpposite(this.direction));

        if (choices.length > 0) {
            this.direction = choices[Math.floor(Math.random() * choices.length)];
        } else if (passable.length > 0) {
            this.direction = passable[Math.floor(Math.random() * passable.length)];
        } else {
            // Absolute last resort: just flip around
            this.direction = this.getOpposite(this.direction);
        }

        this.stuckFrames = 0;
        this.positionQuietFrames = 0;
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
