import { GameLoop } from './GameLoop';
import { InputManager } from './InputManager';
import { MapTerrain } from '../world/Map';
import { CollisionSystem } from '../systems/CollisionSystem';
import { SpawnSystem } from '../systems/SpawnSystem';
import { PowerUpSystem } from '../systems/PowerUpSystem';
import { ParticleSystem } from '../systems/ParticleSystem';
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

    private map!: MapTerrain;
    private collisionSystem!: CollisionSystem;
    private spawnSystem!: SpawnSystem;
    private powerUpSystem!: PowerUpSystem;
    private particleSystem!: ParticleSystem;
    private player!: PlayerTank;
    private enemies: EnemyTank[] = [];
    private bullets: Bullet[] = [];

    private confirmReleased: boolean = true;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.inputManager = new InputManager(canvas);

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
        const startBtn = document.getElementById('start-btn');
        if (startBtn) startBtn.innerText = '重新开始';
    }

    public schedulePlayerRespawn() { this.player.respawn(); }

    public resetGame() {
        this.currentStageIdx = 0;
        this.map = new MapTerrain();
        this.collisionSystem = new CollisionSystem(this, this.map);
        this.spawnSystem = new SpawnSystem(this);
        this.powerUpSystem = new PowerUpSystem(this);
        this.particleSystem = new ParticleSystem(this);
        this.player = new PlayerTank(this);
        this.map.loadLevel(LEVELS[this.currentStageIdx]);
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
        // Clear whole screen
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        switch (this.state) {
            case GameState.BOOT:
            case GameState.MAIN_MENU:
                // HTML Overlay handles the UI
                break;

            case GameState.STAGE_INTRO:
                this.ctx.fillStyle = '#111';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.fillStyle = '#fff';
                this.ctx.font = 'bold 30px system-ui, sans-serif';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(`第 ${this.currentStageIdx + 1} 关`, this.canvas.width / 2, this.canvas.height / 2 - 20);
                break;

            case GameState.PLAYING:
            case GameState.PAUSED:
                this.map.draw(this.ctx, 'below');

                this.player.render(this.ctx);
                this.enemies.forEach(e => e.render(this.ctx));
                this.bullets.forEach(b => b.render(this.ctx));
                this.powerUpSystem.render(this.ctx);

                this.map.draw(this.ctx, 'above');

                // Render battle area border
                this.ctx.strokeStyle = '#555';
                this.ctx.lineWidth = 4;
                this.ctx.strokeRect(2, 42, this.canvas.width - 4, this.canvas.height - 44);

                this.ctx.strokeStyle = '#aaa';
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(6, 46, this.canvas.width - 12, this.canvas.height - 52);

                // Render HUD (Layer 8)
                this.ctx.fillStyle = '#333';
                this.ctx.fillRect(0, 0, this.canvas.width, 40);
                this.ctx.fillStyle = '#fff';
                this.ctx.font = 'bold 16px system-ui, sans-serif';
                this.ctx.textAlign = 'left';
                this.ctx.fillText(`分数: ${this.player.score} `, 90, 25);
                this.ctx.fillText(`♥️x${this.player.lives} `, 370, 25);
                this.ctx.fillText(`第 ${String(this.currentStageIdx + 1).padStart(2, '0')} 关`, 490, 25);

                if (this.state === GameState.PAUSED) {
                    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                    this.ctx.fillStyle = '#fff';
                    this.ctx.textAlign = 'center';
                    this.ctx.font = 'bold 30px system-ui, sans-serif';
                    this.ctx.fillText('已暂停', this.canvas.width / 2, this.canvas.height / 2);
                }
                break;

            case GameState.GAME_OVER:
                this.ctx.fillStyle = 'red';
                this.ctx.textAlign = 'center';
                this.ctx.font = 'bold 40px system-ui, sans-serif';
                this.ctx.fillText('游戏结束', this.canvas.width / 2, this.canvas.height / 2);
                break;

            case GameState.STAGE_CLEAR:
            case GameState.SCORE_TALLY:
                // Draw the underlying game state first
                this.map.draw(this.ctx, 'below');
                this.player.render(this.ctx);
                this.enemies.forEach(e => e.render(this.ctx));
                this.bullets.forEach(b => b.render(this.ctx));
                this.powerUpSystem.render(this.ctx);
                this.map.draw(this.ctx, 'above');

                // Render particles
                this.particleSystem.render(this.ctx);

                // Render HUD
                this.ctx.fillStyle = '#333';
                this.ctx.fillRect(0, 0, this.canvas.width, 40);
                this.ctx.fillStyle = '#fff';
                this.ctx.font = '16px Arial';
                this.ctx.textAlign = 'left';
                this.ctx.fillText(`SCORE: ${this.player.score} `, 90, 25);
                this.ctx.fillText(`♥️x${this.player.lives} `, 370, 25);
                this.ctx.fillText(`STG ${String(this.currentStageIdx + 1).padStart(2, '0')}`, 490, 25);

                if (this.state === GameState.STAGE_CLEAR) {
                    // Dim background
                    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

                    this.ctx.fillStyle = '#00d4ff'; // Use the primary glow color
                    this.ctx.textAlign = 'center';

                    this.ctx.font = 'bold 50px system-ui, sans-serif';
                    this.ctx.fillText('关卡完成', this.canvas.width / 2, this.canvas.height / 2 - 60);

                    this.ctx.fillStyle = '#fff';
                    this.ctx.font = 'bold 30px system-ui, sans-serif';
                    this.ctx.fillText(`分数: ${this.player.score}`, this.canvas.width / 2, this.canvas.height / 2 + 10);

                    if (this.stateTimer > 60) {
                        // Blink the prompt text
                        if (Math.floor(this.stateTimer / 30) % 2 === 0) {
                            this.ctx.fillStyle = '#ff0055'; // Use the enemy glow color for contrast
                            this.ctx.font = 'bold 20px system-ui, sans-serif';
                            this.ctx.fillText('点击鼠标或空格键进入下一关', this.canvas.width / 2, this.canvas.height / 2 + 80);
                        }
                    }
                }
                break;
        }
    }
}
