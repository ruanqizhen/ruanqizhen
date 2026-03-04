// ============================================================
// effects.js - Particle, Trail, PowerUp 类 + 离屏预渲染
// ============================================================

class Particle {
    constructor(x, y, color, scale = 1) {
        this.reset(x, y, color, scale);
    }

    reset(x, y, color, scale = 1) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = (Math.random() * 3 + 1) * scale;
        this.speedX = (Math.random() - 0.5) * PARTICLE_BASE_SPEED * scale;
        this.speedY = (Math.random() - 0.5) * PARTICLE_BASE_SPEED * scale;
        this.life = 1.0;
    }

    update(dt) {
        this.x += this.speedX * dt;
        this.y += this.speedY * dt;
        this.life -= PARTICLE_BASE_LIFE_DECAY * dt;
    }

    draw() {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

class Trail {
    constructor(x, y, color, size) {
        this.reset(x, y, color, size);
    }

    reset(x, y, color, size) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = size;
        this.alpha = 0.5;
    }

    update(dt) {
        this.size *= (1 - TRAIL_BASE_SIZE_DECAY * dt);
        this.alpha -= TRAIL_BASE_ALPHA_DECAY * dt;
    }

    draw() {
        if (this.alpha <= 0) return;
        const prevAlpha = ctx.globalAlpha;
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = prevAlpha;
    }
}

// Pre-render PowerUps to Offscreen Canvases for O(1) drawing
const powerUpSprites = {
    'D': document.createElement('canvas'),
    'S': document.createElement('canvas'),
    'R': document.createElement('canvas')
};

const PU_RENDER_PADDING = 20;
const PU_RENDER_SIZE = POWERUP_WIDTH + PU_RENDER_PADDING * 2;

['D', 'S', 'R'].forEach(type => {
    const pCanvas = powerUpSprites[type];
    pCanvas.width = PU_RENDER_SIZE;
    pCanvas.height = PU_RENDER_SIZE;
    const pCtx = pCanvas.getContext('2d');

    pCtx.shadowBlur = 15;
    pCtx.shadowColor = type === 'D' ? '#00ff00' : (type === 'S' ? '#00d4ff' : '#ff00ff');
    pCtx.fillStyle = '#fff';
    pCtx.font = 'bold 20px Inter';
    pCtx.textAlign = 'center';
    pCtx.textBaseline = 'middle';

    pCtx.strokeStyle = pCtx.shadowColor;
    pCtx.lineWidth = 2;
    pCtx.beginPath();
    pCtx.arc(PU_RENDER_SIZE / 2, PU_RENDER_SIZE / 2, POWERUP_WIDTH / 2, 0, Math.PI * 2);
    pCtx.stroke();

    pCtx.fillText(type, PU_RENDER_SIZE / 2, PU_RENDER_SIZE / 2);
});

class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'D': Dual, 'S': Shield, 'R': Rapid
        this.width = POWERUP_WIDTH;
        this.height = POWERUP_HEIGHT;
        this.speed = POWERUP_SPEED;
    }

    draw() {
        ctx.drawImage(powerUpSprites[this.type], this.x - PU_RENDER_PADDING, this.y - PU_RENDER_PADDING);
    }

    update(dt) {
        this.y += this.speed * dt;
    }
}
