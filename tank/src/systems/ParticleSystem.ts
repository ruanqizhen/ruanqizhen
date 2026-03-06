import { GameManager } from '../engine/GameManager';

export interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    color: string;
    size: number;
    alpha: number;
}

export class ParticleSystem {
    private particles: Particle[] = [];

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_gameManager: GameManager) {
        // Kept for consistency with other systems
    }

    public update(dt: number) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= dt;
            p.alpha = Math.max(0, p.life / p.maxLife);

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    public render(ctx: CanvasRenderingContext2D) {
        for (const p of this.particles) {
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
        ctx.globalAlpha = 1.0;
    }

    public emitExplosion(x: number, y: number, count: number, baseColor: string) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3 + 1;
            const size = Math.random() * 4 + 2;
            const life = Math.random() * 20 + 10;

            // Randomize color slightly around explosion colors
            const colors = [baseColor, '#f80', '#ff0', '#fff'];
            const color = colors[Math.floor(Math.random() * colors.length)];

            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life,
                maxLife: life,
                color,
                size,
                alpha: 1.0
            });
        }
    }

    public emitDebris(x: number, y: number, count: number, color: string) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 2;
            const size = Math.random() * 3 + 1;
            const life = Math.random() * 15 + 5;

            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life,
                maxLife: life,
                color,
                size,
                alpha: 1.0
            });
        }
    }
}
