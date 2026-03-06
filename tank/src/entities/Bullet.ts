import { Entity } from './Entity';
import { Tank } from './Tank';
import { Direction, TankFaction } from '../types';
import { BULLET_SIZE, BATTLE_AREA_X, BATTLE_AREA_Y, BATTLE_AREA_W, BATTLE_AREA_H } from '../constants';
import { GameManager } from '../engine/GameManager';

export class Bullet extends Entity {
    public owner: Tank;
    public direction: Direction;
    public speed: number;
    public power: number;

    constructor(gameManager: GameManager, owner: Tank) {
        super(gameManager, BULLET_SIZE, BULLET_SIZE);
        this.owner = owner;
        this.direction = owner.direction;
        this.speed = owner.bulletSpeed;
        this.power = owner.bulletPower;
    }

    public update(dt: number) {
        if (this.isDead) return;

        let dx = 0; let dy = 0;
        if (this.direction === Direction.UP) dy = -this.speed;
        else if (this.direction === Direction.DOWN) dy = this.speed;
        else if (this.direction === Direction.LEFT) dx = -this.speed;
        else if (this.direction === Direction.RIGHT) dx = this.speed;

        this.x += dx * dt;
        this.y += dy * dt;

        // Collision priority 1: Boundary
        if (this.x < 0 || this.x + this.w > BATTLE_AREA_W || this.y < 0 || this.y + this.h > BATTLE_AREA_H) {
            this.isDead = true;
            return;
        }

        // Call external collision logic for base, bricks, steel, entities.
        // Return early if bullet was destroyed
        this.gameManager.getCollisionSystem().processBullet(this);
    }

    public render(ctx: CanvasRenderingContext2D) {
        if (this.isDead) return;
        const screenX = this.x + BATTLE_AREA_X;
        const screenY = this.y + BATTLE_AREA_Y;
        const cx = screenX + this.w / 2;
        const cy = screenY + this.h / 2;

        const isPlayer = this.owner.faction === TankFaction.PLAYER;
        const color = isPlayer ? '#00d4ff' : '#ff3333';

        // Glow effect
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(this.w, this.h) / 2 + 1, 0, Math.PI * 2);
        ctx.fill();
        // Bright core
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(this.w, this.h) / 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}
