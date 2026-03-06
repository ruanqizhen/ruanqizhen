import { Entity } from './Entity';
import { Bullet } from './Bullet';
import { Direction, TankFaction, TankGrade } from '../types';
import { GameManager } from '../engine/GameManager';
import { TANK_SIZE, BATTLE_AREA_X, BATTLE_AREA_Y } from '../constants';

export abstract class Tank extends Entity {
    public direction: Direction = Direction.UP;
    public grade: TankGrade = TankGrade.BASIC;
    public faction: TankFaction = TankFaction.ENEMY;
    public hp: number = 1;

    public hasShield: boolean = false;
    public shieldTimer: number = 0;
    public hasBoat: boolean = false;
    public hasMower: boolean = false;

    public speed: number = 1.5;
    public iceSlideFrames: number = 0;
    public iceSlideDir: Direction = Direction.UP;

    public bulletSpeed: number = 4;
    public bulletPower: number = 1;
    public maxBulletsOnScreen: number = 1;
    public shootCooldown: number = 20;
    public currentCooldown: number = 0;

    protected colorOverride: string = '';

    constructor(gameManager: GameManager) {
        super(gameManager, TANK_SIZE, TANK_SIZE);
    }

    public abstract applyDamage(): void;

    public shoot(): Bullet | null {
        if (this.currentCooldown > 0) return null;

        const activeBullets = this.gameManager.getBulletsByOwner(this);
        if (activeBullets.length >= this.maxBulletsOnScreen) return null;

        this.currentCooldown = this.shootCooldown;
        const bullet = new Bullet(this.gameManager, this);

        // Position bullet based on tank direction
        if (this.direction === Direction.UP) {
            bullet.x = this.x + this.w / 2 - bullet.w / 2;
            bullet.y = this.y - bullet.h;
        } else if (this.direction === Direction.DOWN) {
            bullet.x = this.x + this.w / 2 - bullet.w / 2;
            bullet.y = this.y + this.h;
        } else if (this.direction === Direction.LEFT) {
            bullet.x = this.x - bullet.w;
            bullet.y = this.y + this.h / 2 - bullet.h / 2;
        } else if (this.direction === Direction.RIGHT) {
            bullet.x = this.x + this.w;
            bullet.y = this.y + this.h / 2 - bullet.h / 2;
        }

        this.gameManager.addBullet(bullet);
        return bullet;
    }

    protected updateCooldowns(dt: number) {
        if (this.currentCooldown > 0) {
            this.currentCooldown -= dt; // 1 logical frame = 1 dt
        }
        if (this.shieldTimer > 0) {
            this.shieldTimer -= dt;
            if (this.shieldTimer <= 0) {
                this.hasShield = false;
            }
        }
    }

    public render(ctx: CanvasRenderingContext2D): void {
        if (this.isDead) return;
        const screenX = this.x + BATTLE_AREA_X;
        const screenY = this.y + BATTLE_AREA_Y;

        // Draw Shield (outer box)
        if (this.hasShield && Math.floor(this.shieldTimer / 6) % 2 === 0) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.strokeRect(screenX - 2, screenY - 2, this.w + 4, this.h + 4);
        }

        ctx.save();
        // Translate to center of tank for rotation
        ctx.translate(screenX + this.w / 2, screenY + this.h / 2);

        // Rotate based on direction
        if (this.direction === Direction.RIGHT) ctx.rotate(Math.PI / 2);
        else if (this.direction === Direction.DOWN) ctx.rotate(Math.PI);
        else if (this.direction === Direction.LEFT) ctx.rotate(-Math.PI / 2);

        // Determine Colors
        const isPlayer = this.faction === TankFaction.PLAYER;
        let hullColor = '#d4a017';
        let hullDetailColor = '#fada5e';
        let turretColor = '#eeb022';

        if (!isPlayer) {
            if (this.hp >= 4) { hullColor = '#181'; hullDetailColor = '#2a2'; turretColor = '#282'; }
            else if (this.hp === 3) { hullColor = '#c60'; hullDetailColor = '#f80'; turretColor = '#d80'; }
            else if (this.hp === 2) { hullColor = '#c11'; hullDetailColor = '#f22'; turretColor = '#d22'; }
            else { hullColor = '#aaa'; hullDetailColor = '#fff'; turretColor = '#ccc'; }
        }

        if (this.colorOverride) {
            hullColor = this.colorOverride;
            hullDetailColor = this.colorOverride;
            turretColor = this.colorOverride;
        }

        const w = this.w;
        const h = this.h;

        // 1. Draw Tracks (Left & Right relative to UP)
        const trackW = w * 0.25;
        const trackL = -w / 2;
        const trackR = w / 2 - trackW;
        const trackY = -h / 2;

        ctx.fillStyle = '#222';
        ctx.fillRect(trackL, trackY, trackW, h);
        ctx.fillRect(trackR, trackY, trackW, h);

        // Track treads (horizontal lines)
        ctx.fillStyle = '#444';
        for (let i = 2; i < h; i += 6) {
            ctx.fillRect(trackL, trackY + i, trackW, 2);
            ctx.fillRect(trackR, trackY + i, trackW, 2);
        }

        // 2. Draw Hull
        const hullW = w * 0.5;
        const hullH = h * 0.8;
        const hullX = -hullW / 2;
        const hullY = -hullH / 2 + (h * 0.1); // center slightly downwards

        ctx.fillStyle = hullColor;
        ctx.fillRect(hullX, hullY, hullW, hullH);

        // Hull detailing (inner rectangle)
        ctx.fillStyle = hullDetailColor;
        ctx.fillRect(hullX + 2, hullY + 2, hullW - 4, hullH - 4);

        // 3. Draw Barrel array (drawn before turret so it's underneath)
        const barrelW = w * 0.15;
        const barrelH = h * 0.5;
        const barrelX = -barrelW / 2;
        const barrelY = -h / 2 - 4; // extends past hull front

        ctx.fillStyle = '#99a';
        ctx.fillRect(barrelX, barrelY, barrelW, barrelH);
        // Muzzle brake
        ctx.fillStyle = '#556';
        ctx.fillRect(barrelX - 2, barrelY, barrelW + 4, 4);

        // 4. Draw Turret
        const turretRadius = w * 0.25;
        ctx.fillStyle = turretColor;
        ctx.beginPath();
        ctx.arc(0, 0, turretRadius, 0, Math.PI * 2);
        ctx.fill();
        // Turret outline/shadow
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Turret hatch
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(0, 0, turretRadius * 0.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}
