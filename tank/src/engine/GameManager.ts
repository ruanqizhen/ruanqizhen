import { GameLoop } from './GameLoop';
import { InputManager } from './InputManager';
import { MapTerrain } from '../world/Map';
import { CollisionSystem } from '../systems/CollisionSystem';
import { SpawnSystem } from '../systems/SpawnSystem';
import { PowerUpSystem } from '../systems/PowerUpSystem';
import { ParticleSystem } from '../systems/ParticleSystem';
import { SoundManager } from './SoundManager';
import { PlayerTank } from '../entities/PlayerTank';
import { Tank } from '../entities/Tank';
import { EnemyTank } from '../entities/EnemyTank';
import { Bullet } from '../entities/Bullet';
import { LEVELS } from '../world/levels';

export enum GameState {
    BOOT,
    MAIN_MENU,
    STAGE_INTRO,
    PLAYING,
    PAUSED,
    STAGE_CLEAR,
    SCORE_TALLY,
    GAME_OVER
}

export class GameManager {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private inputManager: InputManager;
    private gameLoop: GameLoop;
    private state: GameState = GameState.BOOT;
    private stateTimer: number = 0;
    public currentStageIdx: number = 0;
    public highScore: number = 20000;

    private map!: MapTerrain;
    private collisionSystem!: CollisionSystem;
    private spawnSystem!: SpawnSystem;
    private powerUpSystem!: PowerUpSystem;
    private particleSystem!: ParticleSystem;
    private soundManager: SoundManager;
    private player!: PlayerTank;
    private enemies: EnemyTank[] = [];
    private bullets: Bullet[] = [];

    private confirmReleased: boolean = true;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;

        // Handle High-DPI / Retina displays
        const dpr = window.devicePixelRatio || 1;
        // Keep logical size
        const logicalWidth = 600;
        const logicalHeight = 800;
        // Set actual size in memory (scaled to account for extra pixel density)
        this.canvas.width = logicalWidth * dpr;
        this.canvas.height = logicalHeight * dpr;
        // Force the canvas back to the logical size via CSS
        this.canvas.style.width = `${logicalWidth}px`;
        this.canvas.style.height = `${logicalHeight}px`;
        // Normalize the coordinate system to use css pixels
        this.ctx.scale(dpr, dpr);

        this.inputManager = new InputManager(canvas);
        this.soundManager = new SoundManager();

        // Load High Score
        const savedScore = localStorage.getItem('yanshan_tank_highscore');
        if (savedScore) {
            this.highScore = parseInt(savedScore, 10) || 20000;
        }

        // Initialization done in resetGame
        this.resetGame();

        // Pass references to this.update and this.render
        this.gameLoop = new GameLoop(this.update.bind(this), this.render.bind(this));

        // Init state
        this.switchState(GameState.MAIN_MENU);

        // UI events
        const startBtn = document.getElementById('start-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                if (this.state === GameState.MAIN_MENU) {
                    this.confirmReleased = false;
                    this.resetGame();
                    this.switchState(GameState.STAGE_INTRO);
                }
            });
        }
    }

    public start() {
        this.gameLoop.start();
    }

    public getPlayer() { return this.player; }
    public getMap() { return this.map; }
    public getPowerUpSystem() { return this.powerUpSystem; }
    public getParticleSystem() { return this.particleSystem; }
    public getSoundManager() { return this.soundManager; }

    public getInputManager() { return this.inputManager; }
    public getCollisionSystem() { return this.collisionSystem; }
    public getBullets() { return this.bullets; }
    public getBulletsByOwner(owner: Tank) { return this.bullets.filter(b => b.owner === owner); }
    public addBullet(bullet: Bullet) { this.bullets.push(bullet); }

    public getEntities(): Tank[] { return [this.player, ...this.enemies]; }
    public addEntity(entity: any) {
        if (entity instanceof EnemyTank) {
            this.enemies.push(entity);
        }
    }

    public triggerGameOver() {
        this.switchState(GameState.GAME_OVER);
        this.soundManager.playGameOver();
        const startBtn = document.getElementById('start-btn');
        if (startBtn) startBtn.innerText = '重新开始';
    }

    public addScore(points: number) {
        this.player.score += points;
        if (this.player.score > this.highScore) {
            this.highScore = this.player.score;
            localStorage.setItem('yanshan_tank_highscore', this.highScore.toString());
            const hiScoreEl = document.getElementById('main-high-score-val');
            if (hiScoreEl) {
                hiScoreEl.innerText = this.highScore.toString();
            }
        }
    }

    public schedulePlayerRespawn() { this.player.respawn(); }

    public resetGame() {
        this.currentStageIdx = 0;
        this.map = new MapTerrain();
        this.map.loadLevel(LEVELS[this.currentStageIdx]); // Load level first so base coordinates are populated

        this.collisionSystem = new CollisionSystem(this, this.map);
        this.spawnSystem = new SpawnSystem(this);
        this.powerUpSystem = new PowerUpSystem(this);
        this.particleSystem = new ParticleSystem(this);

        // Player relies on map to find spawn position
        this.player = new PlayerTank(this);

        this.spawnSystem.loadLevelConfig(LEVELS[this.currentStageIdx]);
        this.bullets = [];
        this.enemies = [];
    }

    private switchState(newState: GameState) {
        this.state = newState;
        this.stateTimer = 0;

        const overlay = document.getElementById('overlay');
        if (overlay) {
            if (newState === GameState.MAIN_MENU) {
                overlay.classList.remove('hidden');
            } else {
                overlay.classList.add('hidden');
            }
        }
    }

    private update(dt: number) {
        const action = this.inputManager.getActionState();
        if (!action.confirm) {
            this.confirmReleased = true;
        }
        const isConfirm = action.confirm && this.confirmReleased;

        this.stateTimer += dt; // time measured in logical frames (1 frame = 1 / 60s)

        switch (this.state) {
            case GameState.MAIN_MENU:
                // Require at least brief delay before space works to avoid catching GAME_OVER dismiss inputs
                if (isConfirm && this.stateTimer > 30) {
                    this.confirmReleased = false;
                    this.resetGame();
                    this.switchState(GameState.STAGE_INTRO);
                }
                break;

            case GameState.STAGE_INTRO:
                // Start stage automatically after roughly 2 seconds (120 frames at 60fps)
                if (this.stateTimer > 120) {
                    this.soundManager.playStageStart();
                    this.switchState(GameState.PLAYING);
                }
                break;

            case GameState.PLAYING:
                if (action.pause) {
                    this.switchState(GameState.PAUSED);
                }

                this.player.update(dt);
                this.enemies.forEach(e => e.update(dt));
                this.enemies = this.enemies.filter(e => !e.isDead);

                // Push apart any overlapping tanks
                this.collisionSystem.separateOverlappingEntities();
                // Push out any tanks stuck in walls
                this.collisionSystem.separateFromWalls();

                this.bullets.forEach(b => b.update(dt));
                this.bullets = this.bullets.filter(b => !b.isDead);

                // Run spawn system
                this.spawnSystem.update();

                // Run Powerup system
                this.powerUpSystem.update();

                // Run Particle system
                this.particleSystem.update(dt);

                // Check stage clear
                if (this.spawnSystem.isFinished() && this.enemies.length === 0) {
                    this.switchState(GameState.STAGE_CLEAR);
                }

                break;

            case GameState.PAUSED:
                if (action.pause && this.stateTimer > 30) { // 0.5s debounce roughly
                    this.switchState(GameState.PLAYING);
                }
                break;

            case GameState.GAME_OVER:
                if (this.stateTimer > 180) { // 3 seconds
                    if (isConfirm) {
                        this.confirmReleased = false;
                        this.switchState(GameState.MAIN_MENU);
                    }
                }
                break;

            case GameState.STAGE_CLEAR:
                // Wait for at least 1 second before accepting confirm to prevent accidental skipping
                if (this.stateTimer > 60 && isConfirm) {
                    this.confirmReleased = false;
                    this.switchState(GameState.SCORE_TALLY);
                }
                break;

            case GameState.SCORE_TALLY:
                this.currentStageIdx++;
                const nextLvl = LEVELS[this.currentStageIdx % LEVELS.length];
                this.map.loadLevel(nextLvl);
                this.spawnSystem.loadLevelConfig(nextLvl);
                this.bullets = [];
                this.enemies = [];
                // Reset player position but preserve lives/grade
                this.player.respawn();
                this.switchState(GameState.STAGE_INTRO);
                break;
        }
    }

    private render() {
        const CW = 600;
        const CH = 800;

        // Clear whole screen
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, CW, CH);

        switch (this.state) {
            case GameState.BOOT:
            case GameState.MAIN_MENU:
                // HTML Overlay handles the UI
                break;

            case GameState.STAGE_INTRO: {
                this.drawGameplayScene(CW, CH);

                // Fade out background between frame 60 and 120
                let bgAlpha = 1;
                if (this.stateTimer > 60) {
                    bgAlpha = Math.max(0, 1 - (this.stateTimer - 60) / 60);
                }
                this.ctx.globalAlpha = bgAlpha;

                // Dark background with subtle gradient
                const igr = this.ctx.createLinearGradient(0, 0, 0, CH);
                igr.addColorStop(0, '#080810');
                igr.addColorStop(0.5, '#0c0c1a');
                igr.addColorStop(1, '#080810');
                this.ctx.fillStyle = igr;
                this.ctx.fillRect(0, 0, CW, CH);

                // Animated horizontal line
                const lineY = CH / 2;
                const lineProgress = Math.min(this.stateTimer / 40, 1);
                const lineWidth = CW * 0.6 * lineProgress;

                this.ctx.strokeStyle = '#00d4ff';
                this.ctx.lineWidth = 1;
                this.ctx.shadowColor = '#00d4ff';
                this.ctx.shadowBlur = 15;
                this.ctx.beginPath();
                this.ctx.moveTo(CW / 2 - lineWidth / 2, lineY - 40);
                this.ctx.lineTo(CW / 2 + lineWidth / 2, lineY - 40);
                this.ctx.stroke();
                this.ctx.beginPath();
                this.ctx.moveTo(CW / 2 - lineWidth / 2, lineY + 30);
                this.ctx.lineTo(CW / 2 + lineWidth / 2, lineY + 30);
                this.ctx.stroke();
                this.ctx.shadowBlur = 0;

                // Stage number with glow
                const alpha = bgAlpha * Math.min(this.stateTimer / 30, 1);
                this.ctx.globalAlpha = alpha;
                this.ctx.fillStyle = '#fff';
                this.ctx.font = 'bold 18px "Orbitron", "Noto Sans SC", sans-serif';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('STAGE', CW / 2, lineY - 12);
                this.ctx.fillStyle = '#00d4ff';
                this.ctx.font = 'bold 36px "Orbitron", sans-serif';
                this.ctx.fillText(`${this.currentStageIdx + 1}`, CW / 2, lineY + 22);

                this.ctx.globalAlpha = 1;
                break;
            }

            case GameState.PLAYING:
            case GameState.PAUSED:
                this.drawGameplayScene(CW, CH);

                if (this.state === GameState.PAUSED) {
                    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                    this.ctx.fillRect(0, 0, CW, CH);
                    // Paused badge
                    const pw = 200, ph = 60;
                    const px = (CW - pw) / 2, py = (CH - ph) / 2;
                    this.ctx.fillStyle = 'rgba(15, 15, 25, 0.9)';
                    this.ctx.beginPath();
                    this.ctx.roundRect(px, py, pw, ph, 12);
                    this.ctx.fill();
                    this.ctx.strokeStyle = 'rgba(0, 212, 255, 0.4)';
                    this.ctx.lineWidth = 1;
                    this.ctx.stroke();
                    this.ctx.fillStyle = '#fff';
                    this.ctx.textAlign = 'center';
                    this.ctx.font = 'bold 22px "Orbitron", "Noto Sans SC", sans-serif';
                    this.ctx.fillText('已暂停', CW / 2, CH / 2 + 8);
                }
                break;

            case GameState.GAME_OVER: {
                const goGr = this.ctx.createLinearGradient(0, 0, 0, CH);
                goGr.addColorStop(0, '#0a0005');
                goGr.addColorStop(0.5, '#1a0010');
                goGr.addColorStop(1, '#0a0005');
                this.ctx.fillStyle = goGr;
                this.ctx.fillRect(0, 0, CW, CH);

                this.ctx.shadowColor = '#ff3366';
                this.ctx.shadowBlur = 30;
                this.ctx.fillStyle = '#ff3366';
                this.ctx.textAlign = 'center';
                this.ctx.font = 'bold 42px "Orbitron", "Noto Sans SC", sans-serif';
                this.ctx.fillText('游戏结束', CW / 2, CH / 2 - 20);
                this.ctx.shadowBlur = 0;

                this.ctx.fillStyle = 'rgba(255,255,255,0.5)';
                this.ctx.font = '16px "Noto Sans SC", sans-serif';
                this.ctx.fillText(`最终分数: ${this.player.score}`, CW / 2, CH / 2 + 30);

                if (this.stateTimer > 60 && Math.floor(this.stateTimer / 30) % 2 === 0) {
                    this.ctx.fillStyle = 'rgba(255,255,255,0.4)';
                    this.ctx.font = '14px "Noto Sans SC", sans-serif';
                    this.ctx.fillText('点击鼠标或空格键返回', CW / 2, CH / 2 + 80);
                }
                break;
            }

            case GameState.STAGE_CLEAR:
            case GameState.SCORE_TALLY:
                this.drawGameplayScene(CW, CH);

                if (this.state === GameState.STAGE_CLEAR) {
                    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
                    this.ctx.fillRect(0, 0, CW, CH);

                    // "Stage Clear" with cyan glow
                    this.ctx.shadowColor = '#00d4ff';
                    this.ctx.shadowBlur = 30;
                    this.ctx.fillStyle = '#00d4ff';
                    this.ctx.textAlign = 'center';
                    this.ctx.font = 'bold 44px "Orbitron", "Noto Sans SC", sans-serif';
                    this.ctx.fillText('关卡完成', CW / 2, CH / 2 - 50);
                    this.ctx.shadowBlur = 0;

                    this.ctx.fillStyle = '#fff';
                    this.ctx.font = '20px "Noto Sans SC", sans-serif';
                    this.ctx.fillText(`分数: ${this.player.score}`, CW / 2, CH / 2 + 10);

                    if (this.stateTimer > 60) {
                        if (Math.floor(this.stateTimer / 30) % 2 === 0) {
                            this.ctx.fillStyle = 'rgba(255, 204, 0, 0.8)';
                            this.ctx.font = 'bold 16px "Noto Sans SC", sans-serif';
                            this.ctx.fillText('点击鼠标或空格键进入下一关', CW / 2, CH / 2 + 70);
                        }
                    }
                }
                break;
        }
    }

    private drawGameplayScene(CW: number, CH: number) {
        this.map.draw(this.ctx, 'below');
        this.player.render(this.ctx);
        this.enemies.forEach(e => e.render(this.ctx));
        this.bullets.forEach(b => b.render(this.ctx));
        this.map.draw(this.ctx, 'above');
        this.powerUpSystem.render(this.ctx);
        this.particleSystem.render(this.ctx);

        // ── Battle Area Border: neon glow frame ──
        const bx = 0, by = 40, bw = CW, bh = CH - 40;
        // Outer glow
        this.ctx.shadowColor = '#00d4ff';
        this.ctx.shadowBlur = 12;
        this.ctx.strokeStyle = 'rgba(0, 212, 255, 0.35)';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2);
        this.ctx.shadowBlur = 0;
        // Inner border
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(bx + 3, by + 3, bw - 6, bh - 6);
        // Corner accents (small L-shapes)
        const cl = 12;
        this.ctx.strokeStyle = 'rgba(0, 212, 255, 0.5)';
        this.ctx.lineWidth = 2;
        // Top-left
        this.ctx.beginPath();
        this.ctx.moveTo(bx + 2, by + 2 + cl); this.ctx.lineTo(bx + 2, by + 2); this.ctx.lineTo(bx + 2 + cl, by + 2);
        this.ctx.stroke();
        // Top-right
        this.ctx.beginPath();
        this.ctx.moveTo(bx + bw - 2 - cl, by + 2); this.ctx.lineTo(bx + bw - 2, by + 2); this.ctx.lineTo(bx + bw - 2, by + 2 + cl);
        this.ctx.stroke();
        // Bottom-left
        this.ctx.beginPath();
        this.ctx.moveTo(bx + 2, by + bh - 2 - cl); this.ctx.lineTo(bx + 2, by + bh - 2); this.ctx.lineTo(bx + 2 + cl, by + bh - 2);
        this.ctx.stroke();
        // Bottom-right
        this.ctx.beginPath();
        this.ctx.moveTo(bx + bw - 2 - cl, by + bh - 2); this.ctx.lineTo(bx + bw - 2, by + bh - 2); this.ctx.lineTo(bx + bw - 2, by + bh - 2 - cl);
        this.ctx.stroke();

        // ── Modern HUD Bar ──
        const hudH = 40;
        const hudGr = this.ctx.createLinearGradient(0, 0, 0, hudH);
        hudGr.addColorStop(0, 'rgba(15, 15, 25, 0.95)');
        hudGr.addColorStop(1, 'rgba(10, 10, 18, 0.9)');
        this.ctx.fillStyle = hudGr;
        this.ctx.fillRect(0, 0, CW, hudH);
        // HUD bottom border glow
        this.ctx.strokeStyle = 'rgba(0, 212, 255, 0.25)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(0, hudH);
        this.ctx.lineTo(CW, hudH);
        this.ctx.stroke();

        this.ctx.font = 'bold 13px "Orbitron", "Noto Sans SC", sans-serif';
        this.ctx.textAlign = 'left';
        // High Score
        this.ctx.fillStyle = 'rgba(255,255,255,0.5)';
        this.ctx.fillText('HI', 14, 26);
        this.ctx.fillStyle = '#ffcc00';
        this.ctx.font = 'bold 15px "Orbitron", sans-serif';
        this.ctx.fillText(`${this.highScore}`, 34, 26);
        // Score
        this.ctx.fillStyle = 'rgba(255,255,255,0.5)';
        this.ctx.font = 'bold 13px "Orbitron", "Noto Sans SC", sans-serif';
        this.ctx.fillText('1UP', 110, 26);
        this.ctx.fillStyle = '#00d4ff';
        this.ctx.font = 'bold 15px "Orbitron", sans-serif';
        this.ctx.fillText(`${this.player.score}`, 145, 26);
        // Lives
        this.ctx.fillStyle = 'rgba(255,255,255,0.5)';
        this.ctx.font = 'bold 13px "Orbitron", "Noto Sans SC", sans-serif';
        this.ctx.fillText('生命', 220, 26);
        this.ctx.fillStyle = '#ff3366';
        this.ctx.font = 'bold 15px "Orbitron", sans-serif';
        this.ctx.fillText(`${'♥'.repeat(Math.max(0, this.player.lives))}`, 256, 26);
        // Enemy count
        const enemiesLeft = this.enemies.length;
        this.ctx.fillStyle = 'rgba(255,255,255,0.5)';
        this.ctx.font = 'bold 13px "Orbitron", "Noto Sans SC", sans-serif';
        this.ctx.fillText('敌军', 350, 26);
        this.ctx.fillStyle = '#ffcc00';
        this.ctx.font = 'bold 15px "Orbitron", sans-serif';
        this.ctx.fillText(`${enemiesLeft}`, 386, 26);
        // Stage
        this.ctx.fillStyle = 'rgba(255,255,255,0.5)';
        this.ctx.font = 'bold 13px "Orbitron", "Noto Sans SC", sans-serif';
        this.ctx.fillText('关卡', 480, 26);
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 15px "Orbitron", sans-serif';
        this.ctx.fillText(`${this.currentStageIdx + 1}`, 516, 26);
    }
}
