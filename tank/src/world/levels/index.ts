import level01Map from './level01.txt?raw';
import level02Map from './level02.txt?raw';
import level03Map from './level03.txt?raw';
import level04Map from './level04.txt?raw';
import level05Map from './level05.txt?raw';
import level06Map from './level06.txt?raw';
import level07Map from './level07.txt?raw';
import level08Map from './level08.txt?raw';
import level09Map from './level09.txt?raw';
import level10Map from './level10.txt?raw';
import level11Map from './level11.txt?raw';
import level12Map from './level12.txt?raw';
import level13Map from './level13.txt?raw';
import level14Map from './level14.txt?raw';
import level15Map from './level15.txt?raw';
import level16Map from './level16.txt?raw';
import level17Map from './level17.txt?raw';
import level18Map from './level18.txt?raw';
import level19Map from './level19.txt?raw';
import level20Map from './level20.txt?raw';

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
    flashingEnemyIndices: [3, 7, 11],
    mapData: parseMap(level01Map)
};

export const LEVEL_02: LevelConfig = {
    stageNumber: 2,
    totalEnemies: 2,
    spawnInterval: 180,
    maxOnScreen: 5,
    enemyDistribution: { basic: 15, fast: 5, power: 0, armor: 0 },
    flashingEnemyIndices: [3, 7, 11],
    mapData: parseMap(level02Map)
};

export const LEVEL_03: LevelConfig = {
    stageNumber: 3,
    totalEnemies: 2,
    spawnInterval: 160,
    maxOnScreen: 6,
    enemyDistribution: { basic: 10, fast: 5, power: 3, armor: 2 },
    flashingEnemyIndices: [3, 7, 11],
    mapData: parseMap(level03Map)
};

export const LEVEL_04: LevelConfig = {
    stageNumber: 4,
    totalEnemies: 2,
    spawnInterval: 140,
    maxOnScreen: 7,
    enemyDistribution: { basic: 5, fast: 5, power: 5, armor: 5 },
    flashingEnemyIndices: [3, 7, 11],
    mapData: parseMap(level04Map)
};

export const LEVEL_05: LevelConfig = {
    stageNumber: 5,
    totalEnemies: 20,
    spawnInterval: 120,
    maxOnScreen: 8,
    enemyDistribution: { basic: 2, fast: 3, power: 7, armor: 8 },
    flashingEnemyIndices: [3, 7, 11, 15],
    mapData: parseMap(level05Map)
};

export const LEVEL_06: LevelConfig = {
    stageNumber: 6,
    totalEnemies: 21,
    spawnInterval: 150,
    maxOnScreen: 7,
    enemyDistribution: { basic: 3, fast: 4, power: 6, armor: 8 },
    flashingEnemyIndices: [3, 7, 11, 15],
    mapData: parseMap(level06Map)
};

export const LEVEL_07: LevelConfig = {
    stageNumber: 7,
    totalEnemies: 22,
    spawnInterval: 140,
    maxOnScreen: 7,
    enemyDistribution: { basic: 4, fast: 4, power: 6, armor: 8 },
    flashingEnemyIndices: [3, 7, 11, 15],
    mapData: parseMap(level07Map)
};

export const LEVEL_08: LevelConfig = {
    stageNumber: 8,
    totalEnemies: 23,
    spawnInterval: 130,
    maxOnScreen: 8,
    enemyDistribution: { basic: 4, fast: 4, power: 6, armor: 9 },
    flashingEnemyIndices: [3, 7, 11, 15],
    mapData: parseMap(level08Map)
};

export const LEVEL_09: LevelConfig = {
    stageNumber: 9,
    totalEnemies: 24,
    spawnInterval: 120,
    maxOnScreen: 8,
    enemyDistribution: { basic: 4, fast: 4, power: 7, armor: 9 },
    flashingEnemyIndices: [3, 7, 11, 15],
    mapData: parseMap(level09Map)
};

export const LEVEL_10: LevelConfig = {
    stageNumber: 10,
    totalEnemies: 25,
    spawnInterval: 110,
    maxOnScreen: 9,
    enemyDistribution: { basic: 3, fast: 3, power: 7, armor: 12 },
    flashingEnemyIndices: [3, 7, 11, 15, 19],
    mapData: parseMap(level10Map)
};

export const LEVEL_11: LevelConfig = {
    stageNumber: 11,
    totalEnemies: 26,
    spawnInterval: 100,
    maxOnScreen: 9,
    enemyDistribution: { basic: 3, fast: 3, power: 7, armor: 13 },
    flashingEnemyIndices: [3, 7, 11, 15, 19],
    mapData: parseMap(level11Map)
};

export const LEVEL_12: LevelConfig = {
    stageNumber: 12,
    totalEnemies: 27,
    spawnInterval: 90,
    maxOnScreen: 10,
    enemyDistribution: { basic: 2, fast: 4, power: 8, armor: 13 },
    flashingEnemyIndices: [3, 7, 11, 15, 19],
    mapData: parseMap(level12Map)
};

export const LEVEL_13: LevelConfig = {
    stageNumber: 13,
    totalEnemies: 28,
    spawnInterval: 80,
    maxOnScreen: 10,
    enemyDistribution: { basic: 2, fast: 4, power: 8, armor: 14 },
    flashingEnemyIndices: [3, 7, 11, 15, 19],
    mapData: parseMap(level13Map)
};

export const LEVEL_14: LevelConfig = {
    stageNumber: 14,
    totalEnemies: 29,
    spawnInterval: 70,
    maxOnScreen: 11,
    enemyDistribution: { basic: 3, fast: 4, power: 8, armor: 14 },
    flashingEnemyIndices: [3, 7, 11, 15, 19],
    mapData: parseMap(level14Map)
};

export const LEVEL_15: LevelConfig = {
    stageNumber: 15,
    totalEnemies: 30,
    spawnInterval: 60,
    maxOnScreen: 11,
    enemyDistribution: { basic: 0, fast: 3, power: 9, armor: 18 },
    flashingEnemyIndices: [3, 7, 11, 15, 19, 23],
    mapData: parseMap(level15Map)
};

export const LEVEL_16: LevelConfig = {
    stageNumber: 16,
    totalEnemies: 31,
    spawnInterval: 60,
    maxOnScreen: 12,
    enemyDistribution: { basic: 1, fast: 3, power: 9, armor: 18 },
    flashingEnemyIndices: [3, 7, 11, 15, 19, 23],
    mapData: parseMap(level16Map)
};

export const LEVEL_17: LevelConfig = {
    stageNumber: 17,
    totalEnemies: 32,
    spawnInterval: 60,
    maxOnScreen: 12,
    enemyDistribution: { basic: 1, fast: 3, power: 9, armor: 19 },
    flashingEnemyIndices: [3, 7, 11, 15, 19, 23],
    mapData: parseMap(level17Map)
};

export const LEVEL_18: LevelConfig = {
    stageNumber: 18,
    totalEnemies: 33,
    spawnInterval: 60,
    maxOnScreen: 13,
    enemyDistribution: { basic: 2, fast: 3, power: 9, armor: 19 },
    flashingEnemyIndices: [3, 7, 11, 15, 19, 23],
    mapData: parseMap(level18Map)
};

export const LEVEL_19: LevelConfig = {
    stageNumber: 19,
    totalEnemies: 34,
    spawnInterval: 60,
    maxOnScreen: 13,
    enemyDistribution: { basic: 1, fast: 3, power: 10, armor: 20 },
    flashingEnemyIndices: [3, 7, 11, 15, 19, 23],
    mapData: parseMap(level19Map)
};

export const LEVEL_20: LevelConfig = {
    stageNumber: 20,
    totalEnemies: 35,
    spawnInterval: 60,
    maxOnScreen: 14,
    enemyDistribution: { basic: 1, fast: 3, power: 10, armor: 21 },
    flashingEnemyIndices: [3, 7, 11, 15, 19, 23, 27],
    mapData: parseMap(level20Map)
};

export const LEVELS: LevelConfig[] = [
    LEVEL_01,
    LEVEL_02,
    LEVEL_03,
    LEVEL_04,
    LEVEL_05,
    LEVEL_06,
    LEVEL_07,
    LEVEL_08,
    LEVEL_09,
    LEVEL_10,
    LEVEL_11,
    LEVEL_12,
    LEVEL_13,
    LEVEL_14,
    LEVEL_15,
    LEVEL_16,
    LEVEL_17,
    LEVEL_18,
    LEVEL_19,
    LEVEL_20
];
