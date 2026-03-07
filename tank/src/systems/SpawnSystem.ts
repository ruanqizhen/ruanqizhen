import { GameManager } from '../engine/GameManager';
import { EnemyTank } from '../entities/EnemyTank';
import { TankGrade } from '../types';

export class SpawnSystem {
    private gameManager: GameManager;

    private totalEnemiesToSpawn: number = 0;
    private enemiesSpawned: number = 0;
    private maxOnScreen: number = 4;
    private spawnInterval: number = 180;
    private spawnTimer: number = 0;

    private spawnQueue: TankGrade[] = [];
    private flashingIndices: Set<number> = new Set();

    constructor(gameManager: GameManager) {
        this.gameManager = gameManager;
    }

    public loadLevelConfig(config: any) {
        this.totalEnemiesToSpawn = config.totalEnemies;
        this.enemiesSpawned = 0;
        this.maxOnScreen = config.maxOnScreen || 4;
        this.spawnInterval = config.spawnInterval || 180;
        this.spawnTimer = 60; // Initial delay

        this.flashingIndices = new Set(config.flashingEnemyIndices || []);

        // Build spawn queue based on distribution
        this.spawnQueue = [];
        const dist = config.enemyDistribution || { basic: 20, fast: 0, power: 0, armor: 0 };

        for (let i = 0; i < dist.basic; i++) this.spawnQueue.push(TankGrade.BASIC);
        for (let i = 0; i < dist.fast; i++) this.spawnQueue.push(TankGrade.FAST);
        for (let i = 0; i < dist.power; i++) this.spawnQueue.push(TankGrade.POWER);
        for (let i = 0; i < dist.armor; i++) this.spawnQueue.push(TankGrade.ARMOR);

        // Optional: shuffle queue to mix enemy types, or preserve order. 
        // Real game usually preserves a specific order or shuffles. We'll shuffle for now.
        for (let i = this.spawnQueue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.spawnQueue[i], this.spawnQueue[j]] = [this.spawnQueue[j], this.spawnQueue[i]];
        }

        // Ensure total queue matches totalEnemies
        while (this.spawnQueue.length > this.totalEnemiesToSpawn) this.spawnQueue.pop();
        while (this.spawnQueue.length < this.totalEnemiesToSpawn) this.spawnQueue.push(TankGrade.BASIC);
    }

    public isFinished(): boolean {
        return this.enemiesSpawned >= this.totalEnemiesToSpawn;
    }

    public getRemainingToSpawn(): number {
        return this.totalEnemiesToSpawn - this.enemiesSpawned;
    }

    public update() {
        if (this.enemiesSpawned >= this.totalEnemiesToSpawn) return;

        // Check active enemy count
        const activeEnemies = this.gameManager.getEntities().filter(e => e instanceof EnemyTank).length;
        if (activeEnemies >= this.maxOnScreen) return;

        this.spawnTimer--;
        if (this.spawnTimer <= 0) {
            this.trySpawn();
        }
    }

    private trySpawn() {
        const point = this.gameManager.getMap().getEnemySpawn(this.gameManager.getEntities());

        if (point) {
            // Spawn!
            const grade = this.spawnQueue.pop() || TankGrade.BASIC;
            const isFlashing = this.flashingIndices.has(this.enemiesSpawned);

            const enemy = new EnemyTank(this.gameManager, point.c, point.r, grade, isFlashing);
            this.gameManager.addEntity(enemy);

            this.enemiesSpawned++;
            this.spawnTimer = this.spawnInterval;
        } else {
            // if failed (e.g., no valid spot), will try next frame
            this.spawnTimer = 10; // short retry delay
        }
    }
}
