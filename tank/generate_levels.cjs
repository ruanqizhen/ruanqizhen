const fs = require('fs');
const path = require('path');

const LEVELS_DIR = path.join(__dirname, 'src', 'world', 'levels');

// Ensure directory exists
if (!fs.existsSync(LEVELS_DIR)) {
    fs.mkdirSync(LEVELS_DIR, { recursive: true });
}

// Map dimensions
const ROWS = 38;
const COLS = 30;

// Base map template
function createEmptyMap() {
    return Array(ROWS).fill(0).map(() => Array(COLS).fill(0));
}

// Generate a random map based on level
function generateMap(levelIndex) {
    const map = createEmptyMap();

    // Protections for spawns
    const safeZones = [
        { r: 0, c: 0, w: 4, h: 4 },
        { r: 0, c: 14, w: 4, h: 4 },
        { r: 0, c: 26, w: 4, h: 4 },
        { r: 34, c: 10, w: 6, h: 4 }, // player spawn
    ];

    const isSafe = (r, c) => {
        for (const z of safeZones) {
            if (r >= z.r && r < z.r + z.h && c >= z.c && c < z.c + z.w) {
                return true;
            }
        }
        return false;
    };

    // Base definition
    map[36][14] = 6;
    map[36][15] = 6;
    map[37][14] = 6;
    map[37][15] = 6;

    // Base protection (changes based on level)
    const protectionType = levelIndex > 15 ? 2 : 1; // Steel for very high levels
    map[35][13] = protectionType; map[35][14] = protectionType; map[35][15] = protectionType; map[35][16] = protectionType;
    map[36][13] = protectionType; map[37][13] = protectionType;
    map[36][16] = protectionType; map[37][16] = protectionType;

    // Generate terrain
    // 1: brick, 2: steel, 3: forest, 4: water, 5: ice
    const brickChance = 0.2 + (levelIndex % 5) * 0.05;
    const steelChance = 0.02 + Math.floor(levelIndex / 5) * 0.02;
    const forestChance = 0.05 + (levelIndex % 3) * 0.02;
    const waterChance = 0.05 + (levelIndex % 4) * 0.02;
    const iceChance = levelIndex > 10 ? 0.05 : 0;

    for (let r = 0; r < ROWS; r += 2) {
        for (let c = 0; c < COLS; c += 2) {
            if (isSafe(r, c) || (r >= 35 && c >= 13 && c <= 16 && r <= 37)) continue;

            const rand = Math.random();
            let type = 0;
            if (rand < steelChance) type = 2;
            else if (rand < steelChance + waterChance) type = 4;
            else if (rand < steelChance + waterChance + forestChance) type = 3;
            else if (rand < steelChance + waterChance + forestChance + iceChance) type = 5;
            else if (rand < steelChance + waterChance + forestChance + iceChance + brickChance) type = 1;

            if (type !== 0) {
                map[r][c] = type;
                map[r + 1][c] = type;
                map[r][c + 1] = type;
                map[r + 1][c + 1] = type;
            }
        }
    }

    return map.map(row => row.join('')).join('\n');
}

// Generate index.ts
let indexContent = '';

for (let i = 1; i <= 20; i++) {
    const num = i.toString().padStart(2, '0');
    indexContent += `import level${num}Map from './level${num}.txt?raw';\n`;
}

indexContent += `
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
    return mapStr.trim().split('\\n').map(r => r.trim().split('').map(n => parseInt(n, 10)));
};

`;

const levels = [];

for (let i = 1; i <= 20; i++) {
    const num = i.toString().padStart(2, '0');

    if (i > 5) {
        // Generate mapping file for level 6-20
        const mapStr = generateMap(i);
        fs.writeFileSync(path.join(LEVELS_DIR, `level${num}.txt`), mapStr);
    }

    // Scale difficulty
    let spawnInterval = Math.max(60, 200 - (i - 1) * 10);
    let maxOnScreen = Math.min(15, 4 + Math.floor(i / 2));

    let basic = 0, fast = 0, power = 0, armor = 0;
    let totalEnc = 0;
    if (i === 1) { basic = 20; totalEnc = 2; spawnInterval = 200; maxOnScreen = 4; }
    else if (i === 2) { basic = 15; fast = 5; totalEnc = 2; spawnInterval = 180; maxOnScreen = 5; }
    else if (i === 3) { basic = 10; fast = 5; power = 3; armor = 2; totalEnc = 2; spawnInterval = 160; maxOnScreen = 6; }
    else if (i === 4) { basic = 5; fast = 5; power = 5; armor = 5; totalEnc = 2; spawnInterval = 140; maxOnScreen = 7; }
    else if (i === 5) { basic = 2; fast = 3; power = 7; armor = 8; totalEnc = 20; spawnInterval = 120; maxOnScreen = 8; }
    else {
        totalEnc = 20 + (i - 5);
        if (i < 10) {
            armor = Math.floor(totalEnc * 0.4);
            power = Math.floor(totalEnc * 0.3);
            fast = Math.floor(totalEnc * 0.2);
            basic = totalEnc - armor - power - fast;
        } else if (i < 15) {
            armor = Math.floor(totalEnc * 0.5);
            power = Math.floor(totalEnc * 0.3);
            fast = Math.floor(totalEnc * 0.15);
            basic = totalEnc - armor - power - fast;
        } else {
            armor = Math.floor(totalEnc * 0.6);
            power = Math.floor(totalEnc * 0.3);
            fast = Math.floor(totalEnc * 0.1);
            basic = totalEnc - armor - power - fast;
        }
    }

    let flashCount = 3 + Math.floor(i / 5);
    let flashes = [];
    for (let f = 0; f < flashCount; f++) {
        flashes.push(3 + f * 4);
    }

    indexContent += `export const LEVEL_${num}: LevelConfig = {
    stageNumber: ${i},
    totalEnemies: ${i <= 4 ? 2 : totalEnc},
    spawnInterval: ${spawnInterval},
    maxOnScreen: ${maxOnScreen},
    enemyDistribution: { basic: ${basic}, fast: ${fast}, power: ${power}, armor: ${armor} },
    flashingEnemyIndices: [${flashes.join(', ')}],
    mapData: parseMap(level${num}Map)
};

`;
}

indexContent += `export const LEVELS: LevelConfig[] = [\n`;
for (let i = 1; i <= 20; i++) {
    const num = i.toString().padStart(2, '0');
    indexContent += `    LEVEL_${num}${i < 20 ? ',' : ''}\n`;
}
indexContent += `];\n`;

fs.writeFileSync(path.join(LEVELS_DIR, 'index.ts'), indexContent);
console.log('Successfully generated levels 6-20 and updated index.ts');
