import { AABB } from '../types';
import { GameManager } from '../engine/GameManager';
import { MapTerrain } from '../world/Map';
import { Tank } from '../entities/Tank';
import { Bullet } from '../entities/Bullet';
import { CELL_SIZE, BATTLE_AREA_W, BATTLE_AREA_H } from '../constants';

export class CollisionSystem {
    private gameManager: GameManager;
    private map: MapTerrain;

    constructor(gameManager: GameManager, map: MapTerrain) {
        this.gameManager = gameManager;
        this.map = map;
    }

    public isIntersecting(a: AABB, b: AABB): boolean {
        return (
            a.x < b.x + b.w &&
            a.x + a.w > b.x &&
            a.y < b.y + b.h &&
            a.y + a.h > b.y
        );
    }

    public queryTerrain(box: AABB): { r: number, c: number, type: number }[] {
        const hits: { r: number, c: number, type: number }[] = [];
        const minCol = Math.floor(Math.max(0, box.x) / CELL_SIZE);
        const maxCol = Math.floor(Math.min(BATTLE_AREA_W - 1, box.x + box.w - 0.001) / CELL_SIZE);
        const minRow = Math.floor(Math.max(0, box.y) / CELL_SIZE);
        const maxRow = Math.floor(Math.min(BATTLE_AREA_H - 1, box.y + box.h - 0.001) / CELL_SIZE);

        for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
                const type = this.map.terrain[r]?.[c] || 0;
                hits.push({ r, c, type });
            }
        }
        return hits;
    }

    public queryEntities(box: AABB): Tank[] {
        const entities = this.gameManager.getEntities();
        const hits: Tank[] = [];
        for (const entity of entities) {
            if (entity.isDead) continue;
            // Ignore enemies that are still in spawn animation
            if ((entity as any).hasSpawned === false) continue;

            const entityBox: AABB = {
                x: entity.x,
                y: entity.y,
                w: entity.w,
                h: entity.h
            };

            if (this.isIntersecting(box, entityBox)) {
                hits.push(entity);
            }
        }
        return hits;
    }

    public resolveMovement(tank: Tank, dx: number, dy: number): { dx: number, dy: number } {
        let newDx = dx; let newDy = dy;
        let targetBox: AABB = {
            x: tank.x + dx,
            y: tank.y + dy,
            w: tank.w,
            h: tank.h
        };

        if (targetBox.x < 0) { newDx = -tank.x; targetBox.x = 0; }
        if (targetBox.x + targetBox.w > BATTLE_AREA_W) { newDx = BATTLE_AREA_W - targetBox.w - tank.x; targetBox.x = BATTLE_AREA_W - targetBox.w; }
        if (targetBox.y < 0) { newDy = -tank.y; targetBox.y = 0; }
        if (targetBox.y + targetBox.h > BATTLE_AREA_H) { newDy = BATTLE_AREA_H - targetBox.h - tank.y; targetBox.y = BATTLE_AREA_H - targetBox.h; }

        const terrainHits = this.queryTerrain(targetBox);
        let blocking = false;
        for (const cell of terrainHits) {
            if (cell.type === 1 || cell.type === 2 || cell.type === 6 || (cell.type === 4 && !tank.hasBoat)) {
                blocking = true;
                break;
            }
        }

        // Entity overlaps
        if (!blocking) {
            const entityHits = this.queryEntities(targetBox);
            for (const entity of entityHits) {
                if (entity !== tank) {
                    blocking = true;
                    if (tank.faction !== entity.faction) {
                        // Different factions hit each other! Both take damage.
                        tank.applyDamage();
                        entity.applyDamage();
                    }
                    break;
                }
            }
        }

        if (blocking) return { dx: 0, dy: 0 };

        // Snap slightly for corners
        if (Math.abs(dy) > 0 && dx === 0) {
            const remainderX = tank.x % (CELL_SIZE / 2);
            if (remainderX > 0 && remainderX <= 10) newDx = -Math.min(remainderX, Math.abs(dy));
            else if (remainderX > 10 && remainderX < 20) newDx = Math.min(20 - remainderX, Math.abs(dy));
        } else if (Math.abs(dx) > 0 && dy === 0) {
            const remainderY = tank.y % (CELL_SIZE / 2);
            if (remainderY > 0 && remainderY <= 10) newDy = -Math.min(remainderY, Math.abs(dx));
            else if (remainderY > 10 && remainderY < 20) newDy = Math.min(20 - remainderY, Math.abs(dx));
        }

        return { dx: newDx, dy: newDy };
    }

    public processBullet(bullet: Bullet) {
        // 1. Check bullet-bullet collisions first
        const allBullets = this.gameManager.getBullets();
        for (const otherBullet of allBullets) {
            if (otherBullet === bullet || otherBullet.isDead) continue;
            // Only cancel out opposing faction bullets
            if (otherBullet.owner.faction !== bullet.owner.faction) {
                if (this.isIntersecting(bullet.getAABB(), otherBullet.getAABB())) {
                    bullet.isDead = true;
                    otherBullet.isDead = true;
                    return;
                }
            }
        }

        // 2. Check entity collisions
        const hitEntities = this.queryEntities(bullet.getAABB());
        for (const entity of hitEntities) {
            // Ignore own bullets or same faction (typically no friendly fire)
            if (entity === bullet.owner) continue;
            if (entity.faction === bullet.owner.faction) continue;

            entity.applyDamage();
            bullet.isDead = true;
            return;
        }

        const terrainHits = this.queryTerrain(bullet.getAABB());
        for (const cell of terrainHits) {
            if (cell.type === 1) {
                const mask = this.map.brickMasks.get(`${cell.c},${cell.r}`) || 0;
                if (mask > 0) {
                    // DESTROY_MASK no longer used since bricks are completely destroyed at once
                    // The user requested that the entire brick is destroyed instead of part of it.
                    // This means we clear all 4 bits (0b1111).
                    const destroyBits = 0b1111;
                    const newMask = mask & ~destroyBits;

                    if (newMask === 0) {
                        this.map.terrain[cell.r][cell.c] = 0;
                        this.map.brickMasks.delete(`${cell.c},${cell.r}`);
                    } else {
                        this.map.brickMasks.set(`${cell.c},${cell.r}`, newMask);
                    }
                    bullet.isDead = true;
                    return;
                }
            } else if (cell.type === 2) {
                if (bullet.power === 2) this.map.terrain[cell.r][cell.c] = 0;
                bullet.isDead = true;
                return;
            } else if (cell.type === 6) {
                this.map.terrain[cell.r][cell.c] = 0;
                bullet.isDead = true;
                this.gameManager.triggerGameOver();
                return;
            }
        }
    }
}
