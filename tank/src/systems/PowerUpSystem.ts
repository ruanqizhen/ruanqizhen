import { GameManager } from '../engine/GameManager';
import { PowerUp, PowerUpType } from '../entities/PowerUp';
import { TankGrade, TankFaction } from '../types';

export class PowerUpSystem {
    private gameManager: GameManager;
    private powerups: PowerUp[] = [];

    // Global timers for powerups
    public clockTimer: number = 0;
    public shovelTimer: number = 0;

    constructor(gameManager: GameManager) {
        this.gameManager = gameManager;
    }

    public spawnPowerUp(x: number, y: number) {
        // Find nearest valid empty spot if on water or out of bounds
        // For MVP, just dropping at x, y snapped to grid is fine unless we add a strict bounds check

        // Random type
        const types = [
            PowerUpType.HELMET, PowerUpType.CLOCK, PowerUpType.SHOVEL,
            PowerUpType.BOMB, PowerUpType.STAR, PowerUpType.TANK, PowerUpType.GUN
        ];
        const type = types[Math.floor(Math.random() * types.length)];

        const pu = new PowerUp(x, y, type);
        this.powerups.push(pu);
    }

    public update() {
        if (this.clockTimer > 0) this.clockTimer--;

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
                if (this.gameManager.getCollisionSystem().isIntersecting(pBox, puBox)) {
                    this.collectPowerUp(pu);
                }
            }
        });

        this.powerups = this.powerups.filter(p => !p.isDead);
    }

    private collectPowerUp(pu: PowerUp) {
        pu.isDead = true;
        const player = this.gameManager.getPlayer();

        // this.gameManager.addScore(500); // PRD score for powerups usually 500

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
                const enemies = this.gameManager.getEntities().filter(e => e.faction === TankFaction.ENEMY);
                enemies.forEach(e => {
                    // Trigger explosion effects
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

    public render(ctx: CanvasRenderingContext2D) {
        this.powerups.forEach(pu => pu.render(ctx));
    }

    private applyBaseReinforcement(type: number) {
        const map = this.gameManager.getMap();
        // Base is at 35, 14 and 35, 15 and 36, 14 and 36, 15 (2x2)
        // Surrounding tiles:
        const coords = [
            [34, 13], [34, 14], [34, 15], [34, 16],
            [35, 13], [35, 16],
            [36, 13], [36, 16]
        ];

        coords.forEach(([r, c]) => {
            if (map.terrain[r] && map.terrain[r][c] !== undefined) {
                // only replace if it's empty, brick, or steel. Don't replace water if standard design, but retro usually replaces all.
                map.terrain[r][c] = type;
                if (type === 1) map.brickMasks.set(`${c},${r}`, 0b1111);
                else map.brickMasks.delete(`${c},${r}`);
            }
        });
    }

    private revertBaseReinforcement() {
        this.applyBaseReinforcement(1); // revert to full brick
    }
}
