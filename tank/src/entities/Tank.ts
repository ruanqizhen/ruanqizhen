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
        this.gameManager.getSoundManager().playShoot();
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

        // Draw Shield (glowing energy bubble)
        if (this.hasShield) {
            const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 100);
            const shieldAlpha = 0.15 + 0.15 * pulse;
            const radius = this.w * 0.7 + 2 * pulse;
            const cx = screenX + this.w / 2;
            const cy = screenY + this.h / 2;

            ctx.save();
            ctx.shadowColor = '#00d4ff';
            ctx.shadowBlur = 12 + 6 * pulse;
            ctx.strokeStyle = `rgba(0, 212, 255, ${0.4 + 0.3 * pulse})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = `rgba(0, 212, 255, ${shieldAlpha})`;
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.restore();
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
            if (this.hp >= 4) { hullColor = '#118811'; hullDetailColor = '#22aa22'; turretColor = '#228822'; }
            else if (this.hp === 3) { hullColor = '#cc6600'; hullDetailColor = '#ff8800'; turretColor = '#dd8800'; }
            else if (this.hp === 2) { hullColor = '#cc1111'; hullDetailColor = '#ff2222'; turretColor = '#dd2222'; }
            else { hullColor = '#aaaaaa'; hullDetailColor = '#ffffff'; turretColor = '#cccccc'; }
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

        // Base dark tracks
        ctx.fillStyle = '#222222';
        ctx.fillRect(trackL, trackY, trackW, h);
        ctx.fillRect(trackR, trackY, trackW, h);

        // Tint tracks with tank color (transparent overlay)
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = hullColor;
        ctx.fillRect(trackL, trackY, trackW, h);
        ctx.fillRect(trackR, trackY, trackW, h);
        ctx.globalAlpha = 1.0;

        // Track treads (horizontal lines)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        for (let i = 2; i < h; i += 6) {
            ctx.fillRect(trackL, trackY + i, trackW, 2);
            ctx.fillRect(trackR, trackY + i, trackW, 2);
        }

        let lEdge = 'rgba(255, 255, 255, 0.2)';
        let rEdge = 'rgba(0, 0, 0, 0.5)';
        let tEdge = 'rgba(255, 255, 255, 0.6)';
        let bEdge = 'rgba(0, 0, 0, 0.5)';
        let tIn = 'rgba(0, 0, 0, 0.3)';
        let bIn = 'rgba(255, 255, 255, 0.4)';
        let bL = 'rgba(255, 255, 255, 0.4)'; // Barrel Left highlight
        let bR = 'rgba(0, 0, 0, 0.5)'; // Barrel Right shadow

        // Adjust shading based on orientation (light from screen Top-Left)
        if (this.direction === Direction.RIGHT) {
            lEdge = 'rgba(255, 255, 255, 0.6)'; // Screen Top
            rEdge = 'rgba(0, 0, 0, 0.5)';       // Screen Bottom
            tEdge = 'rgba(0, 0, 0, 0.5)';       // Screen Right (Shadowed)
            bEdge = 'rgba(255, 255, 255, 0.2)'; // Screen Left
            tIn = 'rgba(255, 255, 255, 0.4)';   // Target Right
            bIn = 'rgba(0, 0, 0, 0.3)';         // Target Left
            bL = 'rgba(255, 255, 255, 0.4)';
            bR = 'rgba(0, 0, 0, 0.5)';
        } else if (this.direction === Direction.DOWN) {
            lEdge = 'rgba(0, 0, 0, 0.5)';       // Screen Right (Shadow)
            rEdge = 'rgba(255, 255, 255, 0.2)'; // Screen Left
            tEdge = 'rgba(0, 0, 0, 0.5)';       // Screen Bottom (Shadow)
            bEdge = 'rgba(255, 255, 255, 0.6)'; // Screen Top
            tIn = 'rgba(255, 255, 255, 0.4)';   // Target Bottom
            bIn = 'rgba(0, 0, 0, 0.3)';         // Target Top
            bL = 'rgba(0, 0, 0, 0.5)';          // Barrel Left side (Actually Screen Right)
            bR = 'rgba(255, 255, 255, 0.4)';    // Barrel Right side (Actually Screen Left)
        } else if (this.direction === Direction.LEFT) {
            lEdge = 'rgba(0, 0, 0, 0.5)';       // Screen Bottom 
            rEdge = 'rgba(255, 255, 255, 0.6)'; // Screen Top
            tEdge = 'rgba(255, 255, 255, 0.2)'; // Screen Left
            bEdge = 'rgba(0, 0, 0, 0.5)';       // Screen Right
            tIn = 'rgba(0, 0, 0, 0.3)';         // Target Left 
            bIn = 'rgba(255, 255, 255, 0.4)';   // Target Right
            bL = 'rgba(0, 0, 0, 0.5)';          // Barrel Left (Screen Bottom)
            bR = 'rgba(255, 255, 255, 0.4)';    // Barrel Right (Screen Top)
        }

        // Track outer bevels (3D effect)
        ctx.fillStyle = lEdge;
        ctx.fillRect(trackL, trackY, 2, h); // Left highlight
        ctx.fillRect(trackR, trackY, 2, h);
        ctx.fillStyle = rEdge;
        ctx.fillRect(trackL + trackW - 2, trackY, 2, h); // Right shadow
        ctx.fillRect(trackR + trackW - 2, trackY, 2, h);

        // 2. Draw Hull
        const hullW = w * 0.54;
        const hullH = h * 0.75;
        const hullX = -hullW / 2;
        const hullY = -hullH / 2 + (h * 0.1);

        // Main hull color
        ctx.fillStyle = hullColor;
        ctx.fillRect(hullX, hullY, hullW, hullH);

        // 3D Shading for Hull edges (Bevel)
        ctx.fillStyle = tEdge; // Top highlight
        ctx.fillRect(hullX, hullY, hullW, 3);
        ctx.fillStyle = lEdge; // Left highlight
        ctx.fillRect(hullX, hullY, 3, hullH);

        ctx.fillStyle = bEdge; // Bottom shadow
        ctx.fillRect(hullX, hullY + hullH - 3, hullW, 3);
        ctx.fillStyle = rEdge; // Right shadow
        ctx.fillRect(hullX + hullW - 3, hullY, 3, hullH);

        // Inner hull detail (raised panel)
        ctx.fillStyle = hullDetailColor;
        ctx.fillRect(hullX + 4, hullY + 6, hullW - 8, hullH - 14);

        // Relief for inner panel
        ctx.fillStyle = tIn; // Top inner shadow
        ctx.fillRect(hullX + 4, hullY + 6, hullW - 8, 2);
        ctx.fillStyle = bIn; // Bottom inner highlight
        ctx.fillRect(hullX + 4, hullY + hullH - 10, hullW - 8, 2);

        // 3. Draw Barrel array (drawn before turret so it's underneath)
        const barrelW = w * 0.16;
        const barrelH = h * 0.55;
        const barrelX = -barrelW / 2;
        const barrelY = -h / 2 - 6;

        // Barrel base
        ctx.fillStyle = '#667';
        ctx.fillRect(barrelX, barrelY, barrelW, barrelH);

        // Barrel cylindrical shading
        ctx.fillStyle = bL; // Left barrel highlight
        ctx.fillRect(barrelX, barrelY, barrelW * 0.3, barrelH);
        ctx.fillStyle = bR; // Right barrel shadow
        ctx.fillRect(barrelX + barrelW * 0.7, barrelY, barrelW * 0.3, barrelH);

        // Muzzle brake
        ctx.fillStyle = '#445';
        ctx.fillRect(barrelX - 2, barrelY, barrelW + 4, 5);
        ctx.fillStyle = bL;
        ctx.fillRect(barrelX - 2, barrelY, (barrelW + 4) * 0.3, 5);
        ctx.fillStyle = bR;
        ctx.fillRect(barrelX - 2 + (barrelW + 4) * 0.7, barrelY, (barrelW + 4) * 0.3, 5);

        // 4. Draw Turret
        const turretRadius = w * 0.28;

        let sx = 2; let sy = 4;
        let hx = -turretRadius * 0.3; let hy = -turretRadius * 0.3;

        if (this.direction === Direction.RIGHT) {
            sx = 4; sy = -2;
            hx = -turretRadius * 0.3; hy = turretRadius * 0.3;
        } else if (this.direction === Direction.DOWN) {
            sx = -2; sy = -4;
            hx = turretRadius * 0.3; hy = turretRadius * 0.3;
        } else if (this.direction === Direction.LEFT) {
            sx = -4; sy = 2;
            hx = turretRadius * 0.3; hy = -turretRadius * 0.3;
        }

        // Draw cast shadow of turret onto hull
        ctx.beginPath();
        ctx.arc(sx, sy, turretRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fill();

        // Turret base
        ctx.beginPath();
        ctx.arc(0, 0, turretRadius, 0, Math.PI * 2);
        ctx.fillStyle = turretColor;
        ctx.fill();

        // Turret 3D dome gradient
        const grad = ctx.createRadialGradient(hx, hy, turretRadius * 0.1, 0, 0, turretRadius);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
        grad.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, turretRadius, 0, Math.PI * 2);
        ctx.fill();

        // Turret outline
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Turret hatch
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(sx / 2, sy / 2, turretRadius * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
    }
}
