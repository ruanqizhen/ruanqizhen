import { CELL_SIZE, GRID_COLS, GRID_ROWS, BATTLE_AREA_X, BATTLE_AREA_Y } from '../constants';
import { LevelConfig } from './levels/index';

export type BrickMask = number; // bit0=TL, bit1=TR, bit2=BL, bit3=BR

export class MapTerrain {
    public terrain: number[][] = [];
    public brickMasks: Map<string, BrickMask> = new Map();
    public baseCoords: { r: number, c: number }[] = [];

    constructor() {
        this.initEmpty();
    }

    private initEmpty() {
        this.terrain = [];
        for (let r = 0; r < GRID_ROWS; r++) {
            this.terrain[r] = new Array(GRID_COLS).fill(0);
        }
    }

    public loadLevel(level: LevelConfig) {
        this.brickMasks.clear();
        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                const type = level.mapData[r][c] || 0;
                this.terrain[r][c] = type;
                if (type === 1) {
                    this.brickMasks.set(`${c},${r}`, 0b1111);
                }
            }
        }

        this.baseCoords = [];
        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                if (this.terrain[r][c] === 6) {
                    this.baseCoords.push({ r, c });
                }
            }
        }

        // Fallback default base if map lacks one
        if (this.baseCoords.length === 0) {
            this.terrain[36][14] = 6;
            this.terrain[36][15] = 6;
            this.terrain[37][14] = 6;
            this.terrain[37][15] = 6;
            this.baseCoords.push({ r: 36, c: 14 }, { r: 36, c: 15 }, { r: 37, c: 14 }, { r: 37, c: 15 });
        }
    }

    public getPlayerSpawn(): { r: number, c: number } {
        if (this.baseCoords.length > 0) {
            const minC = Math.min(...this.baseCoords.map(b => b.c));
            const minR = Math.min(...this.baseCoords.map(b => b.r));
            const maxC = Math.max(...this.baseCoords.map(b => b.c));

            // Try left side first (3 tiles away)
            if (minC >= 3) {
                return { r: minR, c: minC - 3 };
            }
            // Try right side (2 tiles away from right edge of base)
            if (maxC <= GRID_COLS - 4) {
                return { r: minR, c: maxC + 2 };
            }
            // Try top
            if (minR >= 3) {
                return { r: minR - 3, c: minC };
            }
            return { r: minR, c: minC }; // Fallback
        }
        return { col: 11, row: 36 } as any; // Ultimate fallback
    }

    public getEnemySpawn(entities: any[]): { r: number, c: number } | null {
        const candidates: { r: number, c: number }[] = [];
        const minBaseDistSq = 20 * 20; // At least 20 cells away from any base block

        for (let r = 0; r <= GRID_ROWS - 2; r++) {
            for (let c = 0; c <= GRID_COLS - 2; c++) {
                // Must be purely empty 2x2 space
                if (this.terrain[r][c] !== 0 || this.terrain[r][c + 1] !== 0 ||
                    this.terrain[r + 1][c] !== 0 || this.terrain[r + 1][c + 1] !== 0) {
                    continue;
                }

                // Must be far from base
                let farFromBase = true;
                for (const b of this.baseCoords) {
                    const distSq = (b.r - r) ** 2 + (b.c - c) ** 2;
                    if (distSq < minBaseDistSq) {
                        farFromBase = false;
                        break;
                    }
                }
                if (!farFromBase) continue;

                // Must not be occupied by existing entities
                const spawnX = c * CELL_SIZE;
                const spawnY = r * CELL_SIZE;
                let occupied = false;
                for (const entity of entities) {
                    if (entity.isDead) continue;
                    // Standard AABB intersection check
                    if (spawnX < entity.x + entity.w &&
                        spawnX + CELL_SIZE * 2 > entity.x &&
                        spawnY < entity.y + entity.h &&
                        spawnY + CELL_SIZE * 2 > entity.y) {
                        occupied = true;
                        break;
                    }
                }

                if (!occupied) {
                    candidates.push({ r, c });
                }
            }
        }

        if (candidates.length === 0) return null;

        // Randomly select one candidate
        const idx = Math.floor(Math.random() * candidates.length);
        return candidates[idx];
    }

    public getTerrainType(r: number, c: number): number {
        return this.terrain[r]?.[c] || 0;
    }

    public draw(ctx: CanvasRenderingContext2D, layer: 'below' | 'above') {
        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                const type = this.terrain[r][c];

                const x = BATTLE_AREA_X + c * CELL_SIZE;
                const y = BATTLE_AREA_Y + r * CELL_SIZE;

                // Subtle grid on all tiles (below layer only)
                if (layer === 'below') {
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
                    ctx.lineWidth = 0.5;
                    ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
                }


                if (type === 0) continue;


                if (layer === 'below') {
                    if (type === 4) { // 水面 — richer water
                        const wgr = ctx.createLinearGradient(x, y, x, y + CELL_SIZE);
                        wgr.addColorStop(0, '#0a4a6a');
                        wgr.addColorStop(1, '#062840');
                        ctx.fillStyle = wgr;
                        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                        // Animated wave highlights
                        ctx.strokeStyle = 'rgba(100, 200, 255, 0.3)';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        const offset = (Date.now() / 200) % (Math.PI * 2);
                        for (let i = 1; i <= 3; i++) {
                            const wy = y + i * 5;
                            ctx.moveTo(x, wy);
                            for (let wx = 0; wx <= CELL_SIZE; wx += 4) {
                                ctx.lineTo(x + wx, wy + Math.sin(wx / 4 + offset + i) * 1.5);
                            }
                        }
                        ctx.stroke();
                        // Water sparkle
                        const sparkle = Math.sin(Date.now() / 300 + c * 3 + r * 7);
                        if (sparkle > 0.7) {
                            ctx.fillStyle = `rgba(200, 240, 255, ${(sparkle - 0.7) * 1.5})`;
                            ctx.fillRect(x + 7 + (r % 3) * 3, y + 3 + (c % 2) * 6, 2, 2);
                        }
                    } else if (type === 5) { // 冰面
                        ctx.fillStyle = '#bdf'; // softer cyan/blue
                        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'; // softer reflection
                        // Reflection diagonal flares
                        ctx.beginPath();
                        ctx.moveTo(x + 5, y + CELL_SIZE);
                        ctx.lineTo(x + 12, y + CELL_SIZE);
                        ctx.lineTo(x + CELL_SIZE, y + 12);
                        ctx.lineTo(x + CELL_SIZE, y + 5);
                        ctx.fill();

                        ctx.beginPath();
                        ctx.moveTo(x, y + 10);
                        ctx.lineTo(x + 4, y + 10);
                        ctx.lineTo(x + 10, y + 4);
                        ctx.lineTo(x + 10, y);
                        ctx.lineTo(x + 6, y);
                        ctx.lineTo(x, y + 6);
                        ctx.fill();
                    }
                } else if (layer === 'above') {
                    if (type === 1) { // 砖墙
                        const mask = this.brickMasks.get(`${c},${r}`) || 0;
                        if (mask > 0) {
                            const half = CELL_SIZE / 2;
                            // Helper to draw a staggered 3D brick 10x10 block
                            const drawBrick = (bx: number, by: number, bw: number, bh: number) => {
                                ctx.fillStyle = '#b64'; // slightly softer brick red/brown
                                ctx.fillRect(bx, by, bw, bh);
                                ctx.fillStyle = '#c75'; // softer highlight
                                ctx.fillRect(bx, by, bw, 1); // top highlight
                                ctx.fillStyle = '#943'; // softer shadow
                                ctx.fillRect(bx, by + bh - 1, bw, 1); // bottom shadow

                                // mortar and staggered pattern - lower contrast translucent white
                                ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                                ctx.fillRect(bx, by + bh / 2, bw, 1); // horizontal mortar
                                ctx.fillRect(bx + bw / 2, by, 1, bh / 2); // vertical top
                                ctx.fillRect(bx + bw / 4, by + bh / 2, 1, bh / 2); // vertical bottom staggered
                                ctx.fillRect(bx + bw * 0.75, by + bh / 2, 1, bh / 2); // vertical bottom staggered part 2
                            };

                            if (mask & 0b0001) drawBrick(x, y, half, half);               // TL
                            if (mask & 0b0010) drawBrick(x + half, y, half, half);        // TR
                            if (mask & 0b0100) drawBrick(x, y + half, half, half);        // BL
                            if (mask & 0b1000) drawBrick(x + half, y + half, half, half); // BR
                        }
                    } else if (type === 2) { // 钢墙 — metallic shine
                        // Base steel
                        const sgr = ctx.createLinearGradient(x, y, x + CELL_SIZE, y + CELL_SIZE);
                        sgr.addColorStop(0, '#888');
                        sgr.addColorStop(0.3, '#aaa');
                        sgr.addColorStop(0.5, '#ccc');
                        sgr.addColorStop(0.7, '#aaa');
                        sgr.addColorStop(1, '#777');
                        ctx.fillStyle = sgr;
                        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

                        // Diagonal struts
                        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(x + 3, y + 3);
                        ctx.lineTo(x + CELL_SIZE - 3, y + CELL_SIZE - 3);
                        ctx.moveTo(x + CELL_SIZE - 3, y + 3);
                        ctx.lineTo(x + 3, y + CELL_SIZE - 3);
                        ctx.stroke();

                        // Edge bevels
                        ctx.fillStyle = 'rgba(255,255,255,0.5)';
                        ctx.fillRect(x, y, CELL_SIZE, 1);
                        ctx.fillRect(x, y, 1, CELL_SIZE);
                        ctx.fillStyle = 'rgba(0,0,0,0.4)';
                        ctx.fillRect(x, y + CELL_SIZE - 1, CELL_SIZE, 1);
                        ctx.fillRect(x + CELL_SIZE - 1, y, 1, CELL_SIZE);

                        // Rivet dots (4 corners)
                        ctx.fillStyle = 'rgba(255,255,255,0.6)';
                        ctx.fillRect(x + 3, y + 3, 2, 2);
                        ctx.fillRect(x + CELL_SIZE - 5, y + 3, 2, 2);
                        ctx.fillRect(x + 3, y + CELL_SIZE - 5, 2, 2);
                        ctx.fillRect(x + CELL_SIZE - 5, y + CELL_SIZE - 5, 2, 2);
                    } else if (type === 3) { // 森林
                        ctx.fillStyle = '#141'; // background shadow
                        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                        ctx.fillStyle = '#282'; // trees
                        ctx.beginPath();
                        ctx.arc(x + 5, y + 5, 6, 0, Math.PI * 2);
                        ctx.arc(x + 15, y + 5, 5, 0, Math.PI * 2);
                        ctx.arc(x + 5, y + 15, 5, 0, Math.PI * 2);
                        ctx.arc(x + 15, y + 15, 6, 0, Math.PI * 2);
                        ctx.arc(x + 10, y + 10, 7, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.fillStyle = '#3a3'; // highlights
                        ctx.beginPath();
                        ctx.arc(x + 4, y + 4, 3, 0, Math.PI * 2);
                        ctx.arc(x + 14, y + 4, 3, 0, Math.PI * 2);
                        ctx.arc(x + 4, y + 14, 2, 0, Math.PI * 2);
                        ctx.fill();
                    } else if (type === 6) { // 基地 — glowing eagle
                        // Background
                        ctx.fillStyle = '#333';
                        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                        ctx.fillStyle = '#444';
                        ctx.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
                        ctx.fillStyle = '#111';
                        ctx.fillRect(x + 3, y + 3, CELL_SIZE - 6, CELL_SIZE - 6);

                        // Glowing eagle star
                        ctx.shadowColor = '#ffaa00';
                        ctx.shadowBlur = 6;
                        ctx.fillStyle = '#e94';
                        ctx.beginPath();
                        ctx.moveTo(x + CELL_SIZE / 2, y + 4);
                        ctx.lineTo(x + CELL_SIZE / 2 + 5, y + CELL_SIZE - 4);
                        ctx.lineTo(x + 4, y + CELL_SIZE / 2 - 2);
                        ctx.lineTo(x + CELL_SIZE - 4, y + CELL_SIZE / 2 - 2);
                        ctx.lineTo(x + CELL_SIZE / 2 - 5, y + CELL_SIZE - 4);
                        ctx.fill();
                        ctx.shadowBlur = 0;

                        ctx.fillStyle = '#fa6';
                        ctx.beginPath();
                        ctx.moveTo(x + CELL_SIZE / 2, y + 4);
                        ctx.lineTo(x + CELL_SIZE / 2 + 2, y + CELL_SIZE / 2);
                        ctx.lineTo(x + CELL_SIZE / 2 - 2, y + CELL_SIZE / 2);
                        ctx.fill();

                        // Border glow
                        ctx.strokeStyle = 'rgba(255, 170, 0, 0.3)';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
                    }
                }
            }
        }
    }
}
