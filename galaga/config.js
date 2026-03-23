// ============================================================
// config.js - 游戏常量、DOM引用、全局状态、资源加载
// ============================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('start-btn');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');

// Configuration
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 800;
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// ====== Game Balance Constants ======
const FIRE_COOLDOWN = 300;           // ms - player normal fire rate
const RAPID_FIRE_COOLDOWN = 100;     // ms - rapid fire power-up rate
const PLAYER_SPEED = 3.5;
const PROJECTILE_SPEED = 10;
const ENEMY_PROJECTILE_SPEED = 4;
const POWERUP_SPEED = 2;

// Scoring
const SCORE_DRONE = 100;
const SCORE_INTERCEPTOR = 150;
const SCORE_COMMANDER = 400;
const SCORE_BOSS_PART = 500;
const SCORE_BOSS_KILL = 5000;
const SCORE_CHALLENGE_PERFECT = 10000;

// Power-up durations (ms)
const DUAL_SHOT_DURATION = 10000;
const RAPID_FIRE_DURATION = 8000;

// Enemy behavior base probabilities
const BASE_DIVE_PROB = 0.0001;
const INTERCEPTOR_DIVE_BONUS = 0.0002;
const BASE_BOMB_PROB = 0.0005;
const BOMB_PROB_PER_LEVEL = 0.0005;
const COMMANDER_BOMB_BONUS = 0.001;

// Power-up drop chance
const POWERUP_DROP_CHANCE = 0.1;
const POWERUP_TYPES = ['D', 'S', 'R'];

// Formation layout
const FORMATION_ROWS = 4;
const FORMATION_COLS = 8;
const FORMATION_SPACING_X = 60;
const FORMATION_SPACING_Y = 50;

// Player shooting offsets
const DUAL_SHOT_OFFSET_X_LEFT = 5;
const DUAL_SHOT_OFFSET_X_RIGHT = 9;
const SINGLE_SHOT_OFFSET_X = 2;
const SINGLE_SHOT_OFFSET_Y = 0;
const PLAYER_TRAIL_CHANCE = 0.5;

// Projectile dimensions
const PROJECTILE_WIDTH = 4;
const PROJECTILE_HEIGHT = 15;
const ENEMY_PROJECTILE_WIDTH = 4;
const ENEMY_PROJECTILE_HEIGHT = 15;
const TRACKING_MISSILE_WIDTH = 6;
const TRACKING_MISSILE_HEIGHT = 20;

// Tracking Missile Properties
const TRACKING_MISSILE_SPEED = 3;
const TRACKING_MISSILE_TURN_RATE = 0.05; // radians per frame

// PowerUp dimensions
const POWERUP_WIDTH = 30;
const POWERUP_HEIGHT = 30;

// Enemy dimensions and health
const ENEMY_WIDTH = 40;
const ENEMY_HEIGHT = 40;

// Enemy images (loaded before ENEMY_CONFIG so they can be referenced)
const enemyImg = new Image();
enemyImg.src = './enemy_drone.png';
const interceptorImg = new Image();
interceptorImg.src = './enemy_interceptor.png';
const commanderImg = new Image();
commanderImg.src = './enemy_commander.png';
const eliteImg = new Image(); // Can reuse commander or have a new one. Recolor fallback handles it if missing.
eliteImg.src = './enemy_elite.png';

// Config mapping for enemy types (data-driven: add new enemy types here)
const ENEMY_CONFIG = {
    1: { health: 1, points: SCORE_DRONE, diveSpeedY: 5, color: '#ffaa00', scale: 1, img: enemyImg },         // Drone
    2: { health: 1, points: SCORE_INTERCEPTOR, diveSpeedY: 7, color: '#00d4ff', scale: 1.5, img: interceptorImg }, // Interceptor
    3: { health: 2, points: SCORE_COMMANDER, diveSpeedY: 4, color: '#a020f0', scale: 2, img: commanderImg },    // Commander
    4: { health: 3, shield: 3, points: 800, diveSpeedY: 3, color: '#ff00ff', scale: 2.5, img: eliteImg }        // Elite (Shielded)
};

const ENEMY_ENTRY_SPEED_FACTOR = 0.015;
const CHALLENGE_FLYBY_SPEED_FACTOR = 0.012;
const ENEMY_FORMATION_WAVE_FREQUENCY = 1000;
const ENEMY_FORMATION_WAVE_AMPLITUDE = 10;
const ENEMY_FORMATION_ROWS = FORMATION_ROWS;
const ENEMY_FORMATION_COLS = FORMATION_COLS;
const ENEMY_FORMATION_SPACING_X = FORMATION_SPACING_X;
const ENEMY_FORMATION_SPACING_Y = FORMATION_SPACING_Y;
const ENEMY_FORMATION_OFFSET_Y_START = 70;
const ENEMY_ENTRY_SPAWN_OFFSET_Y = 50;
const ENEMY_ENTRY_DELAY_BASE = 0;
const ENEMY_ENTRY_DELAY_PAIR_BONUS = 15;
const ENEMY_ENTRY_DELAY_ROW_BONUS = 5;

// Boss configuration
const BOSS_WIDTH = 180;
const BOSS_HEIGHT = 80;
const BOSS_Y_OFFSET_START = -300;
const BOSS_ATTACK_COOLDOWN_BASE = 110;
const BOSS_ATTACK_COOLDOWN_LEVEL_REDUCTION = 2;
const BOSS_PART_WING_OFFSET_X = 60;
const BOSS_PART_WING_OFFSET_Y = -10;
const BOSS_PART_WING_WIDTH = 50;
const BOSS_PART_WING_HEIGHT = 40;
const BOSS_PART_WING_HEALTH_BASE = 40;
const BOSS_PART_CORE_OFFSET_X = 0;
const BOSS_PART_CORE_OFFSET_Y = 0;
const BOSS_PART_CORE_WIDTH = 60;
const BOSS_PART_CORE_HEIGHT = 60;
const BOSS_PART_CORE_HEALTH_BASE = 80;
const BOSS_MOVE_TIMER_MIN = 80;
const BOSS_MOVE_TIMER_MAX = 160;
const BOSS_MOVE_SPEED_FACTOR = 0.015;
const BOSS_MID_HEALTH_POWERUP_THRESHOLD = 0.5;

// Boss attack patterns
const BOSS_ATTACK_SPREAD_BULLETS = 7;
const BOSS_ATTACK_SPREAD_WAVE_DELAY = 10;
const BOSS_ATTACK_SPREAD_MAX_SPREAD = 3;
const BOSS_ATTACK_SPREAD_BULLET_SPEED_BASE = 4;
const BOSS_ATTACK_SPREAD_BULLET_SPEED_WAVE_BONUS = 1;
const BOSS_ATTACK_AIMED_BULLETS_PER_WING = 5;
const BOSS_ATTACK_AIMED_BULLET_DELAY = 150;
const BOSS_ATTACK_AIMED_INACCURACY = 1.5;
const BOSS_ATTACK_AIMED_BULLET_SPEED = 6;
const BOSS_ATTACK_CIRCLE_BULLETS = 16;
const BOSS_ATTACK_CIRCLE_BULLET_SPEED = 3.5;
const BOSS_ATTACK_MINION_COUNT_MIN = 2;
const BOSS_ATTACK_MINION_COUNT_MAX = 3;
const BOSS_ATTACK_MINION_DELAY = 300;

// Particle and Trail
const PARTICLE_BASE_SPEED = 6;
const PARTICLE_BASE_LIFE_DECAY = 0.02;
const TRAIL_BASE_SIZE_DECAY = 0.05;
const TRAIL_BASE_ALPHA_DECAY = 0.05;

// Starfield
const STAR_COUNT = 100;
const STAR_SIZE_MAX = 2;
const STAR_SPEED_MAX = 2;
const LEVEL_COLOR_OFFSET_PER_LEVEL = 20;
// ====================================

// DOM References
const scoreEl = document.getElementById('current-score');
const levelEl = document.getElementById('current-level');
const highScoreEl = document.getElementById('high-score');

// UI Cache to prevent DOM thrashing
const uiCache = {
    score: -1,
    timeDual: -1,
    timeRapid: -1
};

// Buff UI Elements
const buffDualEl = document.getElementById('buff-dual');
const timeDualEl = document.getElementById('time-dual');
const buffRapidEl = document.getElementById('buff-rapid');
const timeRapidEl = document.getElementById('time-rapid');
const buffShieldEl = document.getElementById('buff-shield');
const statusShieldEl = document.getElementById('status-shield');

// Mutable Game State
let score = 0;
let level = 1;
let gameTime = 0; // Unified game time in ms, driven by dt

// Safe localStorage access (handles private browsing mode)
let highScore = 0;
try {
    const stored = localStorage.getItem('galaga-high-score');
    if (stored !== null) {
        highScore = parseInt(stored, 10) || 0;
    }
} catch (e) {
    console.warn('localStorage not available, high score will not persist');
}
highScoreEl.textContent = highScore;

let gameActive = false;
let animationId;
let lastFireTime = 0;
let lastTime = 0; // For delta time
const pressedKeys = {};
let touchX = null;
let isDragging = false;
let shakeDuration = 0;
let shakeMagnitude = 0;
let trails = [];
let levelColorOffset = 0; // For dynamic background

// Assets
const playerImg = new Image();
playerImg.src = './player_ship.png';

// (Enemy images are now loaded above with ENEMY_CONFIG)

const enemyBossImg = new Image();
enemyBossImg.src = 'enemy_boss.png';
