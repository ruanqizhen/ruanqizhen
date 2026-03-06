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
        this.terrain[36][14] = 6;
        this.terrain[36][15] = 6;
        this.terrain[37][14] = 6;
        this.terrain[37][15] = 6;
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
                        ctx.fillStyle = '#148'; // dark water
                        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        const offset = (Date.now() / 200) % (Math.PI * 2);
                        // Draw some wave ripples
                        for (let i = 1; i <= 3; i++) {
                            const wy = y + i * 5;
                            ctx.moveTo(x, wy);
                            for (let wx = 0; wx <= CELL_SIZE; wx += 5) {
                                ctx.lineTo(x + wx, wy + Math.sin(wx / 5 + offset) * 2);
                            }
                        }
                        ctx.stroke();
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
                    } else if (type === 2) { // 钢墙
                        ctx.fillStyle = '#777';
                        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                        ctx.fillStyle = '#999';
                        ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);

                        // Diagonal struts and highlights
                        ctx.strokeStyle = '#eee';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(x + 3, y + 3);
                        ctx.lineTo(x + CELL_SIZE - 3, y + CELL_SIZE - 3);
                        ctx.moveTo(x + CELL_SIZE - 3, y + 3);
                        ctx.lineTo(x + 3, y + CELL_SIZE - 3);
                        ctx.stroke();

                        ctx.fillStyle = 'rgba(255,255,255,0.6)'; // top-left glow
                        ctx.fillRect(x, y, CELL_SIZE, 2);
                        ctx.fillRect(x, y, 2, CELL_SIZE);
                        ctx.fillStyle = 'rgba(0,0,0,0.4)'; // bottom-right shadow
                        ctx.fillRect(x, y + CELL_SIZE - 2, CELL_SIZE, 2);
                        ctx.fillRect(x + CELL_SIZE - 2, y, 2, CELL_SIZE);
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
                    } else if (type === 6) { // 基地
                        // Fortress base design
                        ctx.fillStyle = '#555'; // Outer steel walls
                        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                        ctx.fillStyle = '#777';
                        ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
                        ctx.fillStyle = '#999';
                        ctx.fillRect(x + 3, y + 3, CELL_SIZE - 6, 2);
                        ctx.fillRect(x + 3, y + 3, 2, CELL_SIZE - 6);

                        // Inner base color
                        ctx.fillStyle = '#111';
                        ctx.fillRect(x + 4, y + 4, CELL_SIZE - 8, CELL_SIZE - 8);

                        // Center Eagle/Star shape
                        ctx.fillStyle = '#e94';
                        ctx.beginPath();
                        ctx.moveTo(x + CELL_SIZE / 2, y + 4);
                        ctx.lineTo(x + CELL_SIZE / 2 + 5, y + CELL_SIZE - 4);
                        ctx.lineTo(x + 4, y + CELL_SIZE / 2 - 2);
                        ctx.lineTo(x + CELL_SIZE - 4, y + CELL_SIZE / 2 - 2);
                        ctx.lineTo(x + CELL_SIZE / 2 - 5, y + CELL_SIZE - 4);
                        ctx.fill();

                        ctx.fillStyle = '#fa6'; // highlight
                        ctx.beginPath();
                        ctx.moveTo(x + CELL_SIZE / 2, y + 4);
                        ctx.lineTo(x + CELL_SIZE / 2 + 2, y + CELL_SIZE / 2);
                        ctx.lineTo(x + CELL_SIZE / 2 - 2, y + CELL_SIZE / 2);
                        ctx.fill();
                    }
                }
            }
        }
    }
}
