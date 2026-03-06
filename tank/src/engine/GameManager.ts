import { GameLoop } from './GameLoop';
import { InputManager } from './InputManager';
import { MapTerrain } from '../world/Map';
import { CollisionSystem } from '../systems/CollisionSystem';
import { SpawnSystem } from '../systems/SpawnSystem';
import { PowerUpSystem } from '../systems/PowerUpSystem';
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

    private map: MapTerrain;
    private collisionSystem: CollisionSystem;
    private spawnSystem: SpawnSystem;
    private powerUpSystem: PowerUpSystem;
    private player: PlayerTank;
    private enemies: EnemyTank[] = [];
    private bullets: Bullet[] = [];

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.inputManager = new InputManager(canvas);

        this.map = new MapTerrain();
        this.collisionSystem = new CollisionSystem(this, this.map);
        this.spawnSystem = new SpawnSystem(this);
        this.powerUpSystem = new PowerUpSystem(this);
        this.player = new PlayerTank(this);
        this.map.loadLevel(LEVELS[this.currentStageIdx]);
        this.spawnSystem.loadLevelConfig(LEVELS[this.currentStageIdx]);

        // Pass references to this.update and this.render
        this.gameLoop = new GameLoop(this.update.bind(this), this.render.bind(this));

        // Init state
        this.switchState(GameState.MAIN_MENU);

        // UI events
        const startBtn = document.getElementById('start-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                if (this.state === GameState.MAIN_MENU) {
                    this.switchState(GameState.PLAYING);
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

    public triggerGameOver() { this.switchState(GameState.GAME_OVER); }
    public schedulePlayerRespawn() { this.player.respawn(); }

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
        this.stateTimer += dt; // time measured in logical frames (1 frame = 1 / 60s)

        switch (this.state) {
            case GameState.MAIN_MENU:
                if (action.confirm) {
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
                    if (action.confirm) {
                        this.switchState(GameState.MAIN_MENU);
                    }
                }
                break;

            case GameState.STAGE_CLEAR:
                if (this.stateTimer > 180) {
                    this.switchState(GameState.SCORE_TALLY);
                }
                break;

            case GameState.SCORE_TALLY:
                if (this.stateTimer > 180 || action.confirm) {
                    this.currentStageIdx++;
                    const nextLvl = LEVELS[this.currentStageIdx % LEVELS.length];
                    this.map.loadLevel(nextLvl);
                    this.spawnSystem.loadLevelConfig(nextLvl);
                    this.bullets = [];
                    this.enemies = [];
                    // Reset player position but preserve lives/grade
                    this.player.respawn();
                    this.switchState(GameState.STAGE_INTRO);
                }
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
                this.ctx.font = '16px Arial';
                this.ctx.textAlign = 'left';
                this.ctx.fillText(`SCORE: ${this.player.score} `, 90, 25);
                this.ctx.fillText(`♥️x${this.player.lives} `, 370, 25);
                this.ctx.fillText(`STG ${String(this.currentStageIdx + 1).padStart(2, '0')}`, 490, 25);

                if (this.state === GameState.PAUSED) {
                    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                    this.ctx.fillStyle = '#fff';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2);
                }
                break;

            case GameState.GAME_OVER:
                this.ctx.fillStyle = 'red';
                this.ctx.textAlign = 'center';
                this.ctx.font = '40px Arial';
                this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2);
                break;

            case GameState.STAGE_CLEAR:
            case GameState.SCORE_TALLY:
                this.ctx.fillStyle = '#fff';
                this.ctx.textAlign = 'center';
                this.ctx.font = '30px Arial';
                this.ctx.fillText('STAGE CLEAR', this.canvas.width / 2, this.canvas.height / 2 - 50);

                if (this.state === GameState.SCORE_TALLY) {
                    this.ctx.font = '20px Arial';
                    this.ctx.fillText(`SCORE: ${this.player.score}`, this.canvas.width / 2, this.canvas.height / 2 + 20);
                }
                break;
        }
    }
}
