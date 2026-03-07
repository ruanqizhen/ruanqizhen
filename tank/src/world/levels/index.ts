import level01Map from './level01.txt?raw';
import level02Map from './level02.txt?raw';
import level03Map from './level03.txt?raw';
import level04Map from './level04.txt?raw';
import level05Map from './level05.txt?raw';

export interface LevelConfig {
    stageNumber: number;
    totalEnemies: number;
    spawnInterval: number;
    maxOnScreen: number;
    enemyDistribution: {
        basic: number;
        fast: number;
        power: number;
        armor: number;
    };
    flashingEnemyIndices: number[];
    mapData: number[][];
}

const parseMap = (mapStr: string): number[][] => {
    return mapStr.trim().split('\n').map(r => r.trim().split('').map(n => parseInt(n, 10)));
};

export const LEVEL_01: LevelConfig = {
    stageNumber: 1,
    totalEnemies: 2,
    spawnInterval: 200,
    maxOnScreen: 4,
    enemyDistribution: { basic: 20, fast: 0, power: 0, armor: 0 },
    flashingEnemyIndices: [3, 10, 17],
    mapData: parseMap(level01Map)
};

export const LEVEL_02: LevelConfig = {
    stageNumber: 2,
    totalEnemies: 2,
    spawnInterval: 180,
    maxOnScreen: 5,
    enemyDistribution: { basic: 15, fast: 5, power: 0, armor: 0 },
    flashingEnemyIndices: [3, 10, 17],
    mapData: parseMap(level02Map)
};

export const LEVEL_03: LevelConfig = {
    stageNumber: 3,
    totalEnemies: 2,
    spawnInterval: 160,
    maxOnScreen: 6,
    enemyDistribution: { basic: 10, fast: 5, power: 3, armor: 2 },
    flashingEnemyIndices: [3, 10, 17],
    mapData: parseMap(level03Map)
};

export const LEVEL_04: LevelConfig = {
    stageNumber: 4,
    totalEnemies: 2,
    spawnInterval: 140,
    maxOnScreen: 7,
    enemyDistribution: { basic: 5, fast: 5, power: 5, armor: 5 },
    flashingEnemyIndices: [3, 10, 17],
    mapData: parseMap(level04Map)
};

export const LEVEL_05: LevelConfig = {
    stageNumber: 5,
    totalEnemies: 20,
    spawnInterval: 120,
    maxOnScreen: 8,
    enemyDistribution: { basic: 2, fast: 3, power: 7, armor: 8 },
    flashingEnemyIndices: [3, 10, 17],
    mapData: parseMap(level05Map)
};

export const LEVELS: LevelConfig[] = [
    LEVEL_01,
    LEVEL_02,
    LEVEL_03,
    LEVEL_04,
    LEVEL_05
];
