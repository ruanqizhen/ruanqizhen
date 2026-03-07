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

// All map data indexed by stage (0-based)
const MAP_DATA: string[] = [
    level01Map, level02Map, level03Map, level04Map, level05Map,
    level06Map, level07Map, level08Map, level09Map, level10Map,
    level11Map, level12Map, level13Map, level14Map, level15Map,
    level16Map, level17Map, level18Map, level19Map, level20Map,
];

/**
 * Dynamically generate a LevelConfig from the stage number (1-based).
 *
 * - totalEnemies:  linearly increases from  5 (stage 1)  to  30 (stage 20), clamped [5, 30]
 * - maxOnScreen:   linearly increases from  3 (stage 1)  to  15 (stage 20), clamped [3, 15]
 * - spawnInterval: linearly decreases from 200 (stage 1) to  60 (stage 20), clamped [60, 200]
 * - enemyDistribution: armor & power ratios grow with stage, basic shrinks
 * - flashingEnemyIndices: randomly generated, count grows with stage
 */
function generateLevelConfig(stage: number, mapStr: string): LevelConfig {
    // ── clamp helper ──
    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

    // ── progress ratio 0..1 across 20 stages ──
    const t = clamp((stage - 1) / 19, 0, 1);

    // ── core scalars ──
    const totalEnemies = clamp(Math.round(5 + t * 25), 5, 30);
    const maxOnScreen = clamp(Math.round(3 + t * 12), 3, 15);
    const spawnInterval = clamp(Math.round(200 - t * 140), 60, 200);

    // ── enemy distribution (ratios shift toward harder types) ──
    //  basic:  60% → 5%   fast: 20% → 10%   power: 15% → 30%   armor: 5% → 55%
    const basicRatio = 0.60 - t * 0.55;   // 0.60 → 0.05
    const fastRatio = 0.20 - t * 0.10;   // 0.20 → 0.10
    const powerRatio = 0.15 + t * 0.15;   // 0.15 → 0.30
    // armor gets the remainder

    const basic = Math.max(0, Math.round(totalEnemies * basicRatio));
    const fast = Math.max(0, Math.round(totalEnemies * fastRatio));
    const power = Math.max(0, Math.round(totalEnemies * powerRatio));
    const armor = Math.max(0, totalEnemies - basic - fast - power);

    // ── flashing enemy indices (random, count grows with stage) ──
    const flashCount = clamp(Math.floor(2 + t * 6), 2, 8);
    const flashSet = new Set<number>();
    let attempts = 0;
    while (flashSet.size < flashCount && attempts < 100) {
        // Pick a random index in [1, totalEnemies-1] — avoid index 0 (first spawn)
        flashSet.add(1 + Math.floor(Math.random() * (totalEnemies - 1)));
        attempts++;
    }
    const flashingEnemyIndices = Array.from(flashSet).sort((a, b) => a - b);

    return {
        stageNumber: stage,
        totalEnemies,
        spawnInterval,
        maxOnScreen,
        enemyDistribution: { basic, fast, power, armor },
        flashingEnemyIndices,
        mapData: parseMap(mapStr),
    };
}

// Build all 20 levels
export const LEVELS: LevelConfig[] = MAP_DATA.map((mapStr, i) =>
    generateLevelConfig(i + 1, mapStr)
);
