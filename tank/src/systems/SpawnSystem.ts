import { GameManager } from '../engine/GameManager';

import { CELL_SIZE } from '../constants';
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

    // Spawn locations (column, row) - 0, 14, 28 at top row
    private spawnPoints = [
        { c: 0, r: 0 },
        { c: 14, r: 0 },
        { c: 28, r: 0 }
    ];
    private nextSpawnPointIndex = 0;

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
        const point = this.spawnPoints[this.nextSpawnPointIndex];

        // Check if spawn point is occupied
        const spawnAABB = {
            x: point.c * CELL_SIZE,
            y: point.r * CELL_SIZE,
            w: 40, // 2x2 cells
            h: 40
        };

        const occupyingEntities = this.gameManager.getCollisionSystem().queryEntities(spawnAABB);

        if (occupyingEntities.length === 0) {
            // Spawn!
            const grade = this.spawnQueue.pop() || TankGrade.BASIC;
            const isFlashing = this.flashingIndices.has(this.enemiesSpawned);

            const enemy = new EnemyTank(this.gameManager, point.c, point.r, grade, isFlashing);
            this.gameManager.addEntity(enemy);

            this.enemiesSpawned++;
            this.spawnTimer = this.spawnInterval;
        }

        // Always rotate spawn point, even if failed this frame
        this.nextSpawnPointIndex = (this.nextSpawnPointIndex + 1) % this.spawnPoints.length;

        // if failed, will try next frame at next point because spawnTimer is still <= 0 or is reset if spawned
        if (occupyingEntities.length > 0) {
            this.spawnTimer = 10; // short retry delay
        }
    }
}
