import { CELL_SIZE } from '../constants';


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

    private lifespan: number = 600; // 10 seconds at 60fps

    constructor(x: number, y: number, type: PowerUpType) {
        this.x = x;
        this.y = y;
        this.type = type;

        // Ensure aligned to grid mostly, or just drop where enemy died?
        // PRD says drops at enemy death location. 
        // Snap strictly to 2x2 grid for typical retro feel
        this.x = Math.floor(x / CELL_SIZE) * CELL_SIZE;
        this.y = Math.floor(y / CELL_SIZE) * CELL_SIZE;
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
        ctx.translate(this.x + this.w / 2, this.y + this.h / 2);

        // Draw a base box
        ctx.fillStyle = '#fff';
        ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '20px Arial';
        ctx.fillStyle = '#f0f';

        switch (this.type) {
            case PowerUpType.HELMET: ctx.fillText('H', 0, 0); break;
            case PowerUpType.CLOCK: ctx.fillText('C', 0, 0); break;
            case PowerUpType.SHOVEL: ctx.fillText('S', 0, 0); break;
            case PowerUpType.BOMB: ctx.fillText('B', 0, 0); break;
            case PowerUpType.STAR: ctx.fillText('★', 0, 0); break;
            case PowerUpType.TANK: ctx.fillText('1U', 0, 0); break;
            case PowerUpType.GUN: ctx.fillText('G', 0, 0); break;
        }

        ctx.restore();
    }
}
