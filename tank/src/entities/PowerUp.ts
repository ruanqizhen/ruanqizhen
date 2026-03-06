import { CELL_SIZE, BATTLE_AREA_X, BATTLE_AREA_Y } from '../constants';


export enum PowerUpType {
    HELMET,
    CLOCK,
    SHOVEL,
    BOMB,
    STAR,
    TANK,
    GUN
}

export class PowerUp {
    public x: number;
    public y: number;
    public w: number = CELL_SIZE * 2;
    public h: number = CELL_SIZE * 2;
    public type: PowerUpType;
    public isDead: boolean = false;

    private lifespan: number = 1000; // 10 seconds at 60fps

    constructor(x: number, y: number, type: PowerUpType) {
        this.x = x;
        this.y = y;
        this.type = type;

        // Coordinates are pre-snapped and collision-checked by PowerUpSystem
    }

    public update() {
        if (this.isDead) return;

        this.lifespan--;
        if (this.lifespan <= 0) {
            this.isDead = true;
        }
    }

    public render(ctx: CanvasRenderingContext2D) {
        if (this.isDead) return;

        // Blinking logic during the last 3 seconds (180 frames)
        if (this.lifespan <= 180) {
            if (Math.floor(this.lifespan / 8) % 2 === 0) {
                return; // skip render to blink
            }
        }

        // Simple placeholder rendering for each powerup type
        ctx.save();
        ctx.translate(this.x + this.w / 2 + BATTLE_AREA_X, this.y + this.h / 2 + BATTLE_AREA_Y);

        // Draw a base box
        ctx.fillStyle = '#000';
        ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);

        // Draw white border for visibility
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(-this.w / 2, -this.h / 2, this.w, this.h);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '20px Arial';
        ctx.fillStyle = '#f0f';

        switch (this.type) {
            case PowerUpType.HELMET: ctx.fillText('🛡️', 0, 0); break;
            case PowerUpType.CLOCK: ctx.fillText('⏰', 0, 0); break;
            case PowerUpType.SHOVEL: ctx.fillText('⛏️', 0, 0); break;
            case PowerUpType.BOMB: ctx.fillText('💣', 0, 0); break;
            case PowerUpType.STAR: ctx.fillText('⭐', 0, 0); break;
            case PowerUpType.TANK: ctx.fillText('🚜', 0, 0); break;
            case PowerUpType.GUN: ctx.fillText('🔫', 0, 0); break;
        }

        ctx.restore();
    }
}
