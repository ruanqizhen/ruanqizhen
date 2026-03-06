import { CELL_SIZE, GRID_COLS, GRID_ROWS, BATTLE_AREA_X, BATTLE_AREA_Y } from '../constants';
import { LevelConfig } from './levels/index';

export type BrickMask = number; // bit0=TL, bit1=TR, bit2=BL, bit3=BR

export class MapTerrain {
    public terrain: number[][] = [];
    public brickMasks: Map<string, BrickMask> = new Map();

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

        // Force base at (14, 35) (2x2)
        this.terrain[35][14] = 6;
        this.terrain[35][15] = 6;
        this.terrain[36][14] = 6;
        this.terrain[36][15] = 6;
    }

    public getTerrainType(r: number, c: number): number {
        return this.terrain[r]?.[c] || 0;
    }

    public draw(ctx: CanvasRenderingContext2D, layer: 'below' | 'above') {
        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                const type = this.terrain[r][c];
                if (type === 0) continue;

                const x = BATTLE_AREA_X + c * CELL_SIZE;
                const y = BATTLE_AREA_Y + r * CELL_SIZE;

                if (layer === 'below') {
                    if (type === 4) { // 水面
                        ctx.fillStyle = '#46f';
                        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                    } else if (type === 5) { // 冰面
                        ctx.fillStyle = '#aef';
                        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                    }
                } else if (layer === 'above') {
                    if (type === 1) { // 砖墙
                        const mask = this.brickMasks.get(`${c},${r}`) || 0;
                        if (mask > 0) {
                            ctx.fillStyle = '#c84';
                            const half = CELL_SIZE / 2;
                            if (mask & 0b0001) ctx.fillRect(x, y, half, half);               // TL
                            if (mask & 0b0010) ctx.fillRect(x + half, y, half, half);        // TR
                            if (mask & 0b0100) ctx.fillRect(x, y + half, half, half);        // BL
                            if (mask & 0b1000) ctx.fillRect(x + half, y + half, half, half); // BR

                            // Draw light mortar lines for brick texture
                            ctx.strokeStyle = '#eca';
                            ctx.lineWidth = 1;
                            ctx.beginPath();
                            // A very simple texture representing bricks
                            ctx.moveTo(x, y + half); ctx.lineTo(x + CELL_SIZE, y + half);
                            ctx.moveTo(x + half, y); ctx.lineTo(x + half, y + CELL_SIZE);
                            ctx.stroke();
                        }
                    } else if (type === 2) { // 钢墙
                        ctx.fillStyle = '#888';
                        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                        ctx.fillStyle = '#ddd';
                        ctx.fillRect(x + 4, y + 4, CELL_SIZE - 8, CELL_SIZE - 8);
                    } else if (type === 3) { // 森林
                        ctx.fillStyle = '#282';
                        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                        ctx.fillStyle = '#151';
                        ctx.fillRect(x + 5, y + 5, CELL_SIZE - 10, CELL_SIZE - 10);
                    } else if (type === 6) { // 基地
                        ctx.fillStyle = '#ff0';
                        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                        ctx.fillStyle = '#c84';
                        ctx.beginPath();
                        ctx.arc(x + CELL_SIZE / 2, y + CELL_SIZE / 2, CELL_SIZE / 3, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
        }
    }
}
