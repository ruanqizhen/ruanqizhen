// ===== 画布 =====
export const CANVAS_WIDTH = 600;
export const CANVAS_HEIGHT = 800;

// ===== 战场区域（紧贴 HUD 下方，占满全部宽度）=====
export const CELL_SIZE = 20;      // 每个细格的像素尺寸
export const GRID_COLS = 30;        // 细格列数（宽）
export const GRID_ROWS = 38;        // 细格行数（高）
export const BATTLE_AREA_W = 600;   // = 30 × 20
export const BATTLE_AREA_H = 760;   // = 38 × 20
export const BATTLE_AREA_X = 0;     // 战场左上角 X（紧贴左边）
export const BATTLE_AREA_Y = 40;    // 战场左上角 Y（HUD 高度）

// ===== 实体尺寸 =====
export const TANK_SIZE = 40;      // = 2×2 细格，正方形
export const BULLET_SIZE = 5;       // 子弹宽高
export const POWERUP_SIZE = 20;     // 道具宽高 = 1 细格

// ===== HUD 区域 =====
export const HUD_HEIGHT = 40;       // 顶部状态栏（y: 0~40）

// ===== 关键坐标（细格坐标，战场内部，原点为战场左上角）=====
export const SPAWN_ENEMY_1 = { col: 0, row: 0 };
export const SPAWN_ENEMY_2 = { col: 14, row: 0 };
export const SPAWN_ENEMY_3 = { col: 28, row: 0 };
export const SPAWN_PLAYER = { col: 11, row: 35 };
export const BASE_CELL = { col: 14, row: 35 };

// ===== 帧率 =====
export const FPS_TARGET = 60;
export const MS_PER_UPDATE = 1000 / FPS_TARGET;
