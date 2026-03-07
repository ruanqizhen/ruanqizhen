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
        // Helper: check if a 2x2 area starting at (r,c) is passable (type 0, 3, or 5)
        const isSpawnable = (r: number, c: number): boolean => {
            if (r < 0 || c < 0 || r + 1 >= GRID_ROWS || c + 1 >= GRID_COLS) return false;
            const ok = (t: number) => t === 0 || t === 3 || t === 5;
            return ok(this.terrain[r][c]) && ok(this.terrain[r][c + 1]) &&
                ok(this.terrain[r + 1][c]) && ok(this.terrain[r + 1][c + 1]);
        };

        // Determine preferred spawn position near the base
        let prefR = 36, prefC = 11; // ultimate fallback
        if (this.baseCoords.length > 0) {
            const minC = Math.min(...this.baseCoords.map(b => b.c));
            const minR = Math.min(...this.baseCoords.map(b => b.r));
            const maxC = Math.max(...this.baseCoords.map(b => b.c));

            if (minC >= 3) { prefR = minR; prefC = minC - 3; }
            else if (maxC <= GRID_COLS - 4) { prefR = minR; prefC = maxC + 2; }
            else if (minR >= 3) { prefR = minR - 3; prefC = minC; }
            else { prefR = minR; prefC = minC; }
        }

        // If preferred position is clear, use it
        if (isSpawnable(prefR, prefC)) {
            return { r: prefR, c: prefC };
        }

        // Otherwise spiral outward to find the nearest clear 2x2 area
        for (let radius = 1; radius < 15; radius++) {
            for (let dr = -radius; dr <= radius; dr++) {
                for (let dc = -radius; dc <= radius; dc++) {
                    if (Math.abs(dr) !== radius && Math.abs(dc) !== radius) continue; // only check perimeter
                    const nr = prefR + dr;
                    const nc = prefC + dc;
                    if (isSpawnable(nr, nc)) {
                        return { r: nr, c: nc };
                    }
                }
            }
        }

        // Absolute fallback — return preferred even if blocked (collision system will push out)
        return { r: prefR, c: prefC };
    }

    public getEnemySpawn(entities: any[]): { r: number, c: number } | null {
        const candidates: { r: number, c: number }[] = [];
        const minBaseDistSq = 400; // 20 cells squared

        for (let r = 0; r <= GRID_ROWS - 2; r++) {
            for (let c = 0; c <= GRID_COLS - 2; c++) {
                // Must be passable 2x2 space (empty, forest, or ice)
                const isPassable = (t: number) => t === 0 || t === 3 || t === 5;
                if (!isPassable(this.terrain[r][c]) || !isPassable(this.terrain[r][c + 1]) ||
                    !isPassable(this.terrain[r + 1][c]) || !isPassable(this.terrain[r + 1][c + 1])) {
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
        // Explicit bounds check: out of bounds is as impassable as steel
        if (r < 0 || r >= GRID_ROWS || c < 0 || c >= GRID_COLS) return 2;
        return this.terrain[r][c];
    }

    private hasSameType(r: number, c: number, type: number, dr: number, dc: number): boolean {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= GRID_ROWS || nc < 0 || nc >= GRID_COLS) return false;
        return this.terrain[nr][nc] === type;
    }

    private getNeighborMask(r: number, c: number, type: number): number {
        let mask = 0;
        if (this.hasSameType(r, c, type, -1, 0)) mask |= 1; // Top
        if (this.hasSameType(r, c, type, 0, 1)) mask |= 2;  // Right
        if (this.hasSameType(r, c, type, 1, 0)) mask |= 4;  // Bottom
        if (this.hasSameType(r, c, type, 0, -1)) mask |= 8; // Left
        return mask;
    }

    public draw(ctx: CanvasRenderingContext2D, layer: 'below' | 'above') {
        const prng = (seed: number) => {
            const s = Math.sin(seed) * 10000;
            return s - Math.floor(s);
        };

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
                    if (type === 4) { // 水面 — continuous richer water
                        // Add an oscillating brightness to the base color, offset by position so it ripples
                        const baseOscillation = Math.sin(Date.now() / 800 + (r * 0.5 + c * 0.3)) * 10;
                        const wR = Math.floor(8 + baseOscillation);
                        const wG = Math.floor(56 + baseOscillation * 1.5);
                        const wB = Math.floor(85 + baseOscillation * 2);
                        ctx.fillStyle = `rgb(${Math.max(0, wR)}, ${Math.max(0, wG)}, ${Math.max(0, wB)})`;

                        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

                        const mask = this.getNeighborMask(r, c, 4);
                        const t = mask & 1, rt = mask & 2, b = mask & 4, l = mask & 8;

                        // Draw slight darker edges for shorelines
                        ctx.fillStyle = 'rgba(0, 20, 40, 0.4)';
                        if (!t) ctx.fillRect(x, y, CELL_SIZE, 3);
                        if (!b) ctx.fillRect(x, y + CELL_SIZE - 3, CELL_SIZE, 3);
                        if (!l) ctx.fillRect(x, y, 3, CELL_SIZE);
                        if (!rt) ctx.fillRect(x + CELL_SIZE - 3, y, 3, CELL_SIZE);

                        // Animated wave highlights across map
                        ctx.strokeStyle = 'rgba(100, 200, 255, 0.25)';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        const offset = (Date.now() / 300) % (Math.PI * 2);
                        // Make wave lines span across cells based on coordinates so they connect
                        for (let wy = y + 5; wy < y + CELL_SIZE; wy += 8) {
                            const globalY = wy;
                            // Only draw bits of waves to look like ripples
                            if ((Math.floor(globalY / 8) + c) % 3 === 0) {
                                ctx.moveTo(x + 2, wy);
                                for (let wx = 2; wx <= CELL_SIZE - 2; wx += 4) {
                                    ctx.lineTo(x + wx, wy + Math.sin((x + wx) / 10 + offset) * 2);
                                }
                            }
                        }
                        ctx.stroke();

                        // Sparkles
                        const sparkle = Math.sin(Date.now() / 400 + c * 4 + r * 5);
                        if (sparkle > 0.8) {
                            ctx.fillStyle = `rgba(200, 255, 255, ${(sparkle - 0.8) * 4})`;
                            ctx.fillRect(x + 5 + (r % 2) * 8, y + 5 + (c % 2) * 8, 2, 2);
                        }
                    } else if (type === 5) { // 冰面 - continuous
                        ctx.fillStyle = '#bdf'; // softer cyan/blue
                        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

                        const mask = this.getNeighborMask(r, c, 5);
                        const t = mask & 1, rt = mask & 2, b = mask & 4, l = mask & 8;

                        // Shoreline bevels for ice
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                        if (!t) ctx.fillRect(x, y, CELL_SIZE, 2);
                        if (!l) ctx.fillRect(x, y, 2, CELL_SIZE);
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
                        if (!b) ctx.fillRect(x, y + CELL_SIZE - 2, CELL_SIZE, 2);
                        if (!rt) ctx.fillRect(x + CELL_SIZE - 2, y, 2, CELL_SIZE);

                        // Sparse large reflection flares that span cells occasionally
                        if ((r + c) % 2 === 0) {
                            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                            ctx.beginPath();
                            ctx.moveTo(x + 5, y + CELL_SIZE);
                            ctx.lineTo(x + 12, y + CELL_SIZE);
                            ctx.lineTo(x + CELL_SIZE, y + 12);
                            ctx.lineTo(x + CELL_SIZE, y + 5);
                            ctx.fill();
                        }

                        // Snow patches
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
                        for (let i = 0; i < 4; i++) {
                            const sx = x + prng(r * 100 + c * 10 + i) * CELL_SIZE;
                            const sy = y + prng(r * 200 + c * 20 + i) * CELL_SIZE;
                            const sr = 1 + prng(r * 300 + c * 30 + i) * 4;
                            ctx.beginPath();
                            ctx.arc(sx, sy, sr, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    }
                } else if (layer === 'above') {
                    if (type === 1) { // 砖墙
                        const mask = this.brickMasks.get(`${c},${r}`) || 0;
                        if (mask > 0) {
                            const half = CELL_SIZE / 2;

                            const drawBrick = (bx: number, by: number, bw: number, bh: number) => {
                                // Add random shade variation to each brick
                                const seed = bx * 13 + by * 17;
                                const rOff = Math.floor(prng(seed) * 30 - 15);
                                const gOff = Math.floor(prng(seed + 1) * 20 - 10);
                                const bOff = Math.floor(prng(seed + 2) * 15 - 7);

                                // Base hex '#b64' is approx RGB(187, 102, 68)
                                const rColor = Math.min(255, Math.max(0, 187 + rOff));
                                const gColor = Math.min(255, Math.max(0, 102 + gOff));
                                const bColor = Math.min(255, Math.max(0, 68 + bOff));

                                ctx.fillStyle = `rgb(${rColor}, ${gColor}, ${bColor})`;
                                ctx.fillRect(bx, by, bw, bh);

                                // Mortar lines to make 20x10 staggered bricks globally aligned
                                ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';

                                // Every 10px block has a horizontal mortar line at its bottom
                                ctx.fillRect(bx, by + bh - 1, bw, 1);

                                // Vertical mortar lines staggered based on global grid position
                                const gridX = Math.round(bx / 10);
                                const gridY = Math.round(by / 10);
                                if ((gridX + gridY) % 2 === 0) {
                                    ctx.fillRect(bx + bw - 1, by, 1, bh); // right edge mortar
                                }

                                // Brick highlight on top edge
                                ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                                ctx.fillRect(bx, by, bw, 1);
                            };

                            if (mask & 0b0001) drawBrick(x, y, half, half);               // TL
                            if (mask & 0b0010) drawBrick(x + half, y, half, half);        // TR
                            if (mask & 0b0100) drawBrick(x, y + half, half, half);        // BL
                            if (mask & 0b1000) drawBrick(x + half, y + half, half, half); // BR
                        }
                    } else if (type === 2) { // 钢墙 — continuous metal plating
                        const mask = this.getNeighborMask(r, c, 2);
                        const t = mask & 1, rt = mask & 2, b = mask & 4, l = mask & 8;

                        // Base steel
                        ctx.fillStyle = '#aaa';
                        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

                        // Unified bevels (only on edges disconnected from other steel)
                        ctx.fillStyle = 'rgba(255,255,255,0.6)';
                        if (!t) ctx.fillRect(x, y, CELL_SIZE, 2);
                        if (!l) ctx.fillRect(x, y, 2, CELL_SIZE);
                        ctx.fillStyle = 'rgba(0,0,0,0.5)';
                        if (!b) ctx.fillRect(x, y + CELL_SIZE - 2, CELL_SIZE, 2);
                        if (!rt) ctx.fillRect(x + CELL_SIZE - 2, y, 2, CELL_SIZE);

                        // Inner plate texture
                        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
                        ctx.lineWidth = 1;
                        if (!t && !l) {
                            ctx.beginPath();
                            ctx.moveTo(x + 4, y + 4);
                            ctx.lineTo(x + CELL_SIZE - 4, y + CELL_SIZE - 4);
                            ctx.stroke();
                        } else if (!b && !rt) {
                            ctx.beginPath();
                            ctx.moveTo(x + CELL_SIZE - 4, y + 4);
                            ctx.lineTo(x + 4, y + CELL_SIZE - 4);
                            ctx.stroke();
                        }

                        // Random scattered rivets plus the disconnected corner rivets
                        const drawRivet = (cx: number, cy: number) => {
                            // Rivet shadow
                            ctx.fillStyle = 'rgba(0,0,0,0.6)';
                            ctx.beginPath();
                            ctx.arc(cx + 1, cy + 1, 2.5, 0, Math.PI * 2);
                            ctx.fill();
                            // Rivet body
                            ctx.fillStyle = '#999';
                            ctx.beginPath();
                            ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
                            ctx.fill();
                            // Rivet highlight
                            ctx.fillStyle = 'rgba(255,255,255,0.8)';
                            ctx.beginPath();
                            ctx.arc(cx - 0.5, cy - 0.5, 1, 0, Math.PI * 2);
                            ctx.fill();
                        };

                        // Draw individual sparse rivets on steel plates
                        // We will place up to 4 rivets in a 2x2 grid, but each only has a ~25% chance to appear
                        if (prng(r * 11 + c * 7) > 0.75) drawRivet(x + CELL_SIZE * 0.3, y + CELL_SIZE * 0.3);
                        if (prng(r * 13 + c * 5) > 0.75) drawRivet(x + CELL_SIZE * 0.7, y + CELL_SIZE * 0.3);
                        if (prng(r * 17 + c * 3) > 0.75) drawRivet(x + CELL_SIZE * 0.3, y + CELL_SIZE * 0.7);
                        if (prng(r * 19 + c * 2) > 0.75) drawRivet(x + CELL_SIZE * 0.7, y + CELL_SIZE * 0.7);

                        // Keep explicit corner rivets if corners are disconnected
                        if (!t && !l) drawRivet(x + 5.5, y + 5.5);
                        if (!t && !rt) drawRivet(x + CELL_SIZE - 5.5, y + 5.5);
                        if (!b && !l) drawRivet(x + 5.5, y + CELL_SIZE - 5.5);
                        if (!b && !rt) drawRivet(x + CELL_SIZE - 5.5, y + CELL_SIZE - 5.5);
                    } else if (type === 3) { // 森林 — cohesive canopy
                        const mask = this.getNeighborMask(r, c, 3);
                        // Draw deep shadow base
                        ctx.fillStyle = '#0f3a0f';
                        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

                        // Draw overlapping canopy shapes organically
                        ctx.fillStyle = '#1e661e';
                        ctx.beginPath();
                        const numLeaves = 8 + Math.floor(prng(r * 15 + c * 25) * 5); // 8-12 leaves
                        for (let i = 0; i < numLeaves; i++) {
                            const cx = x + prng(r * 10 + c * 20 + i) * CELL_SIZE;
                            const cy = y + prng(r * 30 + c * 40 + i) * CELL_SIZE;
                            const cr = 4 + prng(r * 50 + c * 60 + i) * 6; // Radius 4 to 10
                            ctx.arc(cx, cy, cr, 0, Math.PI * 2);
                        }

                        // Fill gaps towards neighbors to connect the canopy
                        if (mask & 1) ctx.arc(x + 10, y, 6, 0, Math.PI * 2);
                        if (mask & 2) ctx.arc(x + CELL_SIZE, y + 10, 6, 0, Math.PI * 2);
                        if (mask & 4) ctx.arc(x + 10, y + CELL_SIZE, 6, 0, Math.PI * 2);
                        if (mask & 8) ctx.arc(x, y + 10, 6, 0, Math.PI * 2);
                        ctx.fill();

                        // Organic highlights
                        ctx.fillStyle = '#33cc33';
                        ctx.beginPath();
                        for (let i = 0; i < 6; i++) {
                            const cx = x + prng(r * 70 + c * 80 + i) * CELL_SIZE;
                            const cy = y + prng(r * 90 + c * 100 + i) * CELL_SIZE;
                            const cr = 2 + prng(r * 110 + c * 120 + i) * 3; // Radius 2 to 5
                            ctx.arc(cx, cy, cr, 0, Math.PI * 2);
                        }
                        ctx.fill();

                    } else if (type === 6) { // 基地 — large 2x2 fortress
                        // We only want to draw the base ONCE for the entire 2x2 area.
                        // We will elect the Top-Left block of any base to do the drawing.
                        let isTopLeftBase = true;
                        if (this.hasSameType(r, c, 6, -1, 0)) isTopLeftBase = false; // There is a base above
                        if (this.hasSameType(r, c, 6, 0, -1)) isTopLeftBase = false; // There is a base left

                        if (isTopLeftBase) {
                            // Find the boundaries of this base (assumes 2x2 but handles dynamically)
                            let w = 1, h = 1;
                            while (this.hasSameType(r, c, 6, 0, w)) w++;
                            while (this.hasSameType(r, c, 6, h, 0)) h++;

                            const bw = w * CELL_SIZE;
                            const bh = h * CELL_SIZE;

                            // Base background platform
                            ctx.fillStyle = '#333';
                            ctx.fillRect(x, y, bw, bh);
                            ctx.fillStyle = '#444';
                            ctx.fillRect(x + 2, y + 2, bw - 4, bh - 4);

                            // Concrete rim
                            ctx.strokeStyle = '#222';
                            ctx.lineWidth = 4;
                            ctx.strokeRect(x + 4, y + 4, bw - 8, bh - 8);

                            // Inner dark zone
                            ctx.fillStyle = '#111';
                            ctx.fillRect(x + 6, y + 6, bw - 12, bh - 12);

                            // Glowing large eagle insignia
                            const cx = x + bw / 2;
                            const cy = y + bh / 2;

                            ctx.shadowColor = '#ffaa00';
                            ctx.shadowBlur = 15;
                            ctx.fillStyle = '#e94';
                            ctx.beginPath();
                            ctx.moveTo(cx, cy - 12);
                            ctx.lineTo(cx + 14, cy + 10);
                            ctx.lineTo(cx + 6, cy + 4);
                            ctx.lineTo(cx + 14, cy - 2);
                            ctx.lineTo(cx + 8, cy - 2);
                            ctx.lineTo(cx, cy + 2);

                            // Mirrored left side
                            ctx.lineTo(cx - 8, cy - 2);
                            ctx.lineTo(cx - 14, cy - 2);
                            ctx.lineTo(cx - 6, cy + 4);
                            ctx.lineTo(cx - 14, cy + 10);
                            ctx.closePath();
                            ctx.fill();
                            ctx.shadowBlur = 0;

                            ctx.fillStyle = '#fa6';
                            ctx.beginPath();
                            ctx.moveTo(cx, cy - 8);
                            ctx.lineTo(cx + 4, cy + 2);
                            ctx.lineTo(cx - 4, cy + 2);
                            ctx.fill();

                            // Border pulse glow
                            const pulse = (Math.sin(Date.now() / 200) + 1) / 2;
                            ctx.strokeStyle = `rgba(255, 170, 0, ${0.2 + pulse * 0.3})`;
                            ctx.lineWidth = 2;
                            ctx.strokeRect(x + 2, y + 2, bw - 4, bh - 4);
                        }
                    }
                }
            }
        }
    }
}
