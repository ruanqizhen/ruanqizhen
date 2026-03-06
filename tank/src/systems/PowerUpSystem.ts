import { GameManager } from '../engine/GameManager';
import { PowerUp, PowerUpType } from '../entities/PowerUp';
import { TankGrade, TankFaction } from '../types';
import { CELL_SIZE, GRID_COLS, GRID_ROWS } from '../constants';

export class PowerUpSystem {
    private gameManager: GameManager;
    private powerups: PowerUp[] = [];

    // Global timers for powerups
    public clockTimer: number = 0;
    public shovelTimer: number = 0;
    public enemySpeedBoostTimer: number = 0;

    constructor(gameManager: GameManager) {
        this.gameManager = gameManager;
    }

    private findValidSpawnPosition(startX: number, startY: number): { x: number, y: number } {
        let finalX = Math.floor(startX / CELL_SIZE) * CELL_SIZE;
        let finalY = Math.floor(startY / CELL_SIZE) * CELL_SIZE;

        const isValid = (testX: number, testY: number) => {
            const hits = this.gameManager.getCollisionSystem().queryTerrain({ x: testX, y: testY, w: CELL_SIZE * 2, h: CELL_SIZE * 2 });
            if (hits.some((c: any) => c.type === 1 || c.type === 2 || c.type === 4 || c.type === 6)) return false;

            const newBox = { x: testX, y: testY, w: CELL_SIZE * 2, h: CELL_SIZE * 2 };
            for (const p of this.powerups) {
                if (!p.isDead) {
                    const pBox = { x: p.x, y: p.y, w: p.w, h: p.h };
                    if (this.gameManager.getCollisionSystem().isIntersecting(newBox, pBox)) {
                        return false;
                    }
                }
            }
            return true;
        };

        let radius = 0;
        let found = false;
        while (radius < 10) {
            for (let dx = -radius; dx <= radius; dx += 2) {
                for (let dy = -radius; dy <= radius; dy += 2) {
                    const testX = finalX + dx * CELL_SIZE;
                    const testY = finalY + dy * CELL_SIZE;
                    if (testX >= 0 && testX <= GRID_COLS * CELL_SIZE - CELL_SIZE * 2 &&
                        testY >= 0 && testY <= GRID_ROWS * CELL_SIZE - CELL_SIZE * 2) {
                        if (isValid(testX, testY)) {
                            finalX = testX;
                            finalY = testY;
                            found = true;
                            break;
                        }
                    }
                }
                if (found) break;
            }
            if (found) break;
            radius++;
        }
        return { x: finalX, y: finalY };
    }

    public spawnPowerUp(x: number, y: number) {
        const pos = this.findValidSpawnPosition(x, y);

        // Random type
        const types = [
            PowerUpType.HELMET, PowerUpType.CLOCK, PowerUpType.SHOVEL,
            PowerUpType.BOMB, PowerUpType.STAR, PowerUpType.TANK, PowerUpType.GUN
        ];
        const type = types[Math.floor(Math.random() * types.length)];

        const pu = new PowerUp(pos.x, pos.y, type);
        this.powerups.push(pu);
    }

    public spawnPowerUpByType(x: number, y: number, type: PowerUpType) {
        const pos = this.findValidSpawnPosition(x, y);
        const pu = new PowerUp(pos.x, pos.y, type);
        this.powerups.push(pu);
    }

    public update() {
        if (this.clockTimer > 0) this.clockTimer--;
        if (this.enemySpeedBoostTimer > 0) this.enemySpeedBoostTimer--;

        if (this.shovelTimer > 0) {
            this.shovelTimer--;
            if (this.shovelTimer === 0) {
                this.revertBaseReinforcement();
            } else if (this.shovelTimer <= 180 && Math.floor(this.shovelTimer / 30) % 2 === 0) {
                // Flash base back to brick for warning
                this.applyBaseReinforcement(1); // 1 is brick
            } else if (this.shovelTimer > 180) {
                this.applyBaseReinforcement(2); // 2 is steel
            }
        }

        const player = this.gameManager.getPlayer();
        if (player.isDead) return;

        const pBox = { x: player.x, y: player.y, w: player.w, h: player.h };

        this.powerups.forEach(pu => {
            pu.update();
            if (!pu.isDead) {
                const puBox = { x: pu.x, y: pu.y, w: pu.w, h: pu.h };
                // Player pickup
                if (this.gameManager.getCollisionSystem().isIntersecting(pBox, puBox)) {
                    this.collectPowerUp(pu);
                    return;
                }
                // Enemy pickup (reverse effects)
                const enemies = this.gameManager.getEntities().filter((e: any) =>
                    e.faction === TankFaction.ENEMY && !e.isDead && (e as any).hasSpawned !== false
                );
                for (const enemy of enemies) {
                    const eBox = { x: enemy.x, y: enemy.y, w: enemy.w, h: enemy.h };
                    if (this.gameManager.getCollisionSystem().isIntersecting(eBox, puBox)) {
                        this.enemyCollectPowerUp(pu);
                        break;
                    }
                }
            }
        });

        this.powerups = this.powerups.filter(p => !p.isDead);
    }

    private collectPowerUp(pu: PowerUp) {
        pu.isDead = true;
        const player = this.gameManager.getPlayer();
        this.gameManager.getSoundManager().playPowerUp();

        this.gameManager.addScore(500);

        switch (pu.type) {
            case PowerUpType.HELMET:
                player.giveShield(600);
                break;
            case PowerUpType.CLOCK:
                this.clockTimer = 600; // freeze enemies for 10s
                break;
            case PowerUpType.SHOVEL:
                this.shovelTimer = 1200; // 20s
                this.applyBaseReinforcement(2); // 2 = STEEL
                break;
            case PowerUpType.BOMB:
                const enemies = this.gameManager.getEntities().filter((e: any) =>
                    e.faction === TankFaction.ENEMY && !e.isDead && (e as any).hasSpawned !== false
                );
                enemies.forEach((e: any) => {
                    // Trigger explosion effects
                    this.gameManager.getParticleSystem().emitExplosion(e.x + e.w / 2, e.y + e.h / 2, 30, '#f55');
                    this.gameManager.getSoundManager().playExplosion();
                    e.isDead = true;
                });
                break;
            case PowerUpType.STAR:
                if (player.grade === TankGrade.BASIC) player.upgrade(TankGrade.FAST);
                else if (player.grade === TankGrade.FAST) player.upgrade(TankGrade.POWER);
                else if (player.grade === TankGrade.POWER) player.upgrade(TankGrade.ARMOR);
                break;
            case PowerUpType.TANK:
                player.lives++;
                break;
            case PowerUpType.GUN:
                player.upgrade(TankGrade.ARMOR);
                break;
        }
    }

    /** Enemy picked up a power-up — reverse/harmful effects on player */
    private enemyCollectPowerUp(pu: PowerUp) {
        pu.isDead = true;
        const player = this.gameManager.getPlayer();
        this.gameManager.getSoundManager().playGameOver(); // ominous sound

        switch (pu.type) {
            case PowerUpType.HELMET:
                // Reverse: Remove player's shield
                player.hasShield = false;
                player.shieldTimer = 0;
                break;
            case PowerUpType.CLOCK:
                // Reverse: Speed up all enemies temporarily (double speed for 10s)
                this.enemySpeedBoostTimer = 600;
                break;
            case PowerUpType.SHOVEL:
                // Reverse: Destroy base reinforcement, turn surrounding to empty
                this.shovelTimer = 0;
                this.destroyBaseWalls();
                break;
            case PowerUpType.BOMB:
                // Reverse: Kill the player!
                player.applyDamage();
                break;
            case PowerUpType.STAR:
                // Reverse: Downgrade the player
                if (player.grade > TankGrade.BASIC) {
                    const newGrade = player.grade - 1;
                    player.upgrade(newGrade);
                }
                break;
            case PowerUpType.TANK:
                // Reverse: Player loses a life
                player.lives--;
                if (player.lives < 0) {
                    this.gameManager.triggerGameOver();
                }
                break;
            case PowerUpType.GUN:
                // Reverse: Upgrade ALL enemies on screen
                const enemies = this.gameManager.getEntities().filter((e: any) => e.faction === TankFaction.ENEMY);
                enemies.forEach((e: any) => {
                    if (e.grade < TankGrade.ARMOR) {
                        const newGrade = e.grade + 1;
                        e.upgrade(newGrade);
                    }
                });
                break;
        }
    }

    public render(ctx: CanvasRenderingContext2D) {
        this.powerups.forEach(pu => pu.render(ctx));
    }

    private applyBaseReinforcement(type: number) {
        const map = this.gameManager.getMap();
        const coordsSet = new Set<string>();

        map.baseCoords.forEach(bc => {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = bc.r + dr;
                    const nc = bc.c + dc;
                    // Ignore tiles that are the base itself
                    if (!map.baseCoords.some(b => b.r === nr && b.c === nc)) {
                        coordsSet.add(`${nr},${nc}`);
                    }
                }
            }
        });

        coordsSet.forEach(coordStr => {
            const [r, c] = coordStr.split(',').map(Number);
            if (map.terrain[r] && map.terrain[r][c] !== undefined) {
                // To avoid breaking water/ice arbitrarily in Yanshan edition, we generally just replace it anyway for reinforcement
                map.terrain[r][c] = type;
                if (type === 1) map.brickMasks.set(`${c},${r}`, 0b1111);
                else map.brickMasks.delete(`${c},${r}`);
            }
        });
    }

    private revertBaseReinforcement() {
        this.applyBaseReinforcement(1); // revert to full brick
    }

    private destroyBaseWalls() {
        const map = this.gameManager.getMap();
        const coordsSet = new Set<string>();

        map.baseCoords.forEach(bc => {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = bc.r + dr;
                    const nc = bc.c + dc;
                    if (!map.baseCoords.some(b => b.r === nr && b.c === nc)) {
                        coordsSet.add(`${nr},${nc}`);
                    }
                }
            }
        });

        coordsSet.forEach(coordStr => {
            const [r, c] = coordStr.split(',').map(Number);
            if (map.terrain[r] && map.terrain[r][c] !== undefined) {
                map.terrain[r][c] = 0; // empty
                map.brickMasks.delete(`${c},${r}`);
            }
        });
    }
}
