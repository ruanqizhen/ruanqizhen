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

        // Forest mowing: if tank has mower, clear forest tiles it overlaps
        if (!blocking && tank.hasMower) {
            const movedBox: AABB = {
                x: tank.x + newDx,
                y: tank.y + newDy,
                w: tank.w,
                h: tank.h
            };
            const terrainUnder = this.queryTerrain(movedBox);
            for (const cell of terrainUnder) {
                if (cell.type === 3) { // Forest
                    this.map.terrain[cell.r][cell.c] = 0;
                    // Emit green debris particles
                    this.gameManager.getParticleSystem().emitDebris(
                        cell.c * CELL_SIZE + CELL_SIZE / 2,
                        cell.r * CELL_SIZE + CELL_SIZE / 2,
                        6, '#3a2'
                    );
                }
            }
        }

        return { dx: newDx, dy: newDy };
    }

    /** Push apart any overlapping same-faction entities */
    public separateOverlappingEntities() {
        const entities = this.gameManager.getEntities();
        for (let i = 0; i < entities.length; i++) {
            for (let j = i + 1; j < entities.length; j++) {
                const a = entities[i];
                const b = entities[j];
                if (a.isDead || b.isDead) continue;
                // Skip entities still in spawn animation
                if ((a as any).hasSpawned === false || (b as any).hasSpawned === false) continue;

                const aBox: AABB = { x: a.x, y: a.y, w: a.w, h: a.h };
                const bBox: AABB = { x: b.x, y: b.y, w: b.w, h: b.h };

                if (!this.isIntersecting(aBox, bBox)) continue;

                // Calculate overlap amounts
                const overlapX = Math.min(aBox.x + aBox.w - bBox.x, bBox.x + bBox.w - aBox.x);
                const overlapY = Math.min(aBox.y + aBox.h - bBox.y, bBox.y + bBox.h - aBox.y);

                // Push apart along the axis with smaller overlap
                const pushSpeed = 2; // pixels per frame
                if (overlapX < overlapY) {
                    // Push horizontally
                    if (a.x < b.x) {
                        a.x -= Math.min(pushSpeed, overlapX / 2);
                        b.x += Math.min(pushSpeed, overlapX / 2);
                    } else {
                        a.x += Math.min(pushSpeed, overlapX / 2);
                        b.x -= Math.min(pushSpeed, overlapX / 2);
                    }
                } else {
                    // Push vertically
                    if (a.y < b.y) {
                        a.y -= Math.min(pushSpeed, overlapY / 2);
                        b.y += Math.min(pushSpeed, overlapY / 2);
                    } else {
                        a.y += Math.min(pushSpeed, overlapY / 2);
                        b.y -= Math.min(pushSpeed, overlapY / 2);
                    }
                }

                // Clamp to bounds
                a.x = Math.max(0, Math.min(BATTLE_AREA_W - a.w, a.x));
                a.y = Math.max(0, Math.min(BATTLE_AREA_H - a.h, a.y));
                b.x = Math.max(0, Math.min(BATTLE_AREA_W - b.w, b.x));
                b.y = Math.max(0, Math.min(BATTLE_AREA_H - b.h, b.y));
            }
        }
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
            if (entity.isDead) {
                this.gameManager.getSoundManager().playExplosion();
            }
            return;
        }

        const terrainHits = this.queryTerrain(bullet.getAABB());
        for (const cell of terrainHits) {
            if (cell.type === 1) { // Brick
                const mask = this.map.brickMasks.get(`${cell.c},${cell.r}`) || 0;
                if (mask > 0) {
                    const destroyBits = 0b1111;
                    const newMask = mask & ~destroyBits;

                    if (newMask === 0) {
                        this.map.terrain[cell.r][cell.c] = 0;
                        this.map.brickMasks.delete(`${cell.c},${cell.r}`);
                    } else {
                        this.map.brickMasks.set(`${cell.c},${cell.r}`, newMask);
                    }
                    this.gameManager.getParticleSystem().emitDebris(bullet.x + bullet.w / 2, bullet.y + bullet.h / 2, 8, '#c84');
                    this.gameManager.getSoundManager().playHitBrick();
                    bullet.isDead = true;
                    return;
                }
            } else if (cell.type === 2) { // Steel
                if (bullet.power === 2) {
                    this.map.terrain[cell.r][cell.c] = 0;
                    this.gameManager.getParticleSystem().emitDebris(bullet.x + bullet.w / 2, bullet.y + bullet.h / 2, 12, '#aaa');
                } else {
                    this.gameManager.getParticleSystem().emitDebris(bullet.x + bullet.w / 2, bullet.y + bullet.h / 2, 5, '#eee');
                }
                this.gameManager.getSoundManager().playHitSteel();
                bullet.isDead = true;
                return;
            } else if (cell.type === 6) { // Base
                this.map.terrain[cell.r][cell.c] = 0;
                this.gameManager.getParticleSystem().emitExplosion(bullet.x + bullet.w / 2, bullet.y + bullet.h / 2, 60, '#ff4');
                this.gameManager.getSoundManager().playExplosion();
                bullet.isDead = true;
                this.gameManager.triggerGameOver();
                return;
            }
        }
    }
}
