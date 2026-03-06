# HTML5 复刻《90 坦克·烟山版》— 产品需求文档

> **面向 AI 编程助理的实现指南**
> 本文档旨在为 Claude Code 等 AI 编程助理提供完整、无歧义的实现规格。
> 所有数值、接口和行为均为**强制约束**，非示例建议。

---

## 0. 快速参考：关键常量表

```
// ===== 画布 =====
CANVAS_WIDTH        = 600px
CANVAS_HEIGHT       = 800px

// ===== 战场区域（紧贴 HUD 下方，占满全部宽度）=====
CELL_SIZE           = 20px      // 每个细格的像素尺寸
GRID_COLS           = 30        // 细格列数（宽）
GRID_ROWS           = 38        // 细格行数（高）
BATTLE_AREA_W       = 600px     // = 30 × 20，等于画布宽度，无左右边距
BATTLE_AREA_H       = 760px     // = 38 × 20
BATTLE_AREA_X       = 0px       // 战场左上角 X（紧贴左边）
BATTLE_AREA_Y       = 40px      // 战场左上角 Y（HUD 高度）

// ===== 实体尺寸 =====
TANK_SIZE           = 40px      // = 2×2 细格，正方形
BULLET_SIZE         = 5px       // 子弹宽高
POWERUP_SIZE        = 20px      // 道具宽高 = 1 细格

// ===== HUD 区域 =====
HUD_HEIGHT          = 40px      // 顶部状态栏（y: 0~40），紧凑单行设计

// ===== 关键坐标（细格坐标，战场内部，原点为战场左上角）=====
SPAWN_ENEMY_1       = (0,  0)   // 敌方出生点 1，左上角
SPAWN_ENEMY_2       = (14, 0)   // 敌方出生点 2，顶部中央
SPAWN_ENEMY_3       = (28, 0)   // 敌方出生点 3，右上角
SPAWN_PLAYER        = (11, 35)  // P1 出生点（老鹰左侧）
BASE_CELL           = (14, 35)  // 老鹰细格坐标（2×2，占 14~15 列，35~36 行）
// 验证：老鹰底边 = 行 36，像素 y = 36×20 = 720px，距战场底部 760-720 = 40px ✓

// ===== 帧率 =====
FPS_TARGET          = 60
```

---

## 1. 布局设计说明

### 与原版的对比

| 指标 | FC 原版 | 本版本 |
|------|---------|--------|
| 画布分辨率 | 256×240（NES） | 600×800 |
| 细格尺寸 | ~16px | 20px |
| 地图细格数 | 26×26 = 676格 | **30×38 = 1140格** |
| 战场面积倍数 | 1× | **1.7×** |
| 坦克像素尺寸 | ~32px | 40px |

### 屏幕布局示意

```
┌──────────────────────────────────────────────┐  y=0
│  HUD: [敌×20] [得分] [最高分] [命×3] [STAGE] │  ← 40px
├──────────────────────────────────────────────┤  y=40
│                                              │
│                                              │
│          战 场 区 域 600×760                  │
│          （30列 × 38行 细格）                  │
│                                              │
│         敌方从顶部三点出生 ↓↓↓               │
│                                              │
│         …更大的地图，更多地形…               │
│                                              │
│                 ★ 老鹰（基地）               │
│   P1出生点 ←  [P1]  [★]                      │
└──────────────────────────────────────────────┘  y=800
```

> **无虚拟控制区**：控制方式为键盘 / 鼠标，手机用户通过触摸屏操作。

---

## 2. 技术栈与项目结构

### 2.1 技术栈

| 层级 | 选型 |
|------|------|
| 语言 | TypeScript 5.x（严格模式） |
| 渲染 | HTML5 Canvas 2D API（单张画布） |
| 构建 | Vite（零配置启动） |
| 测试 | Vitest（单元测试核心逻辑） |
| 资源 | 程序化绘制像素图（无外部图片） |

### 2.2 HTML 配置

```html


  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #111;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    min-height: 100vh;
  }
  #gameCanvas {
    /* 等比缩放，保持 600:800 逻辑分辨率 */
    width: min(100vw, calc(100vh * 0.75));
    height: auto;
    aspect-ratio: 600 / 800;
    display: block;
    touch-action: none;
    cursor: crosshair;
  }

```

**Canvas 缩放策略**：物理 Canvas 始终为 `600×800` 逻辑像素，CSS 负责等比缩放。鼠标/触摸坐标必须通过以下公式转换为逻辑坐标：

```typescript
// InputManager.ts — 所有指针事件坐标必须经此转换
function toLogical(clientX: number, clientY: number): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left) * (canvas.width  / rect.width),
    y: (clientY - rect.top)  * (canvas.height / rect.height),
  };
}
```

### 2.3 目录结构

```
src/
├── main.ts
├── constants.ts            // 第0章所有常量的唯一来源
├── types.ts                // 枚举和接口
├── engine/
│   ├── GameManager.ts      // 游戏状态机
│   ├── GameLoop.ts         // requestAnimationFrame 固定步长循环
│   ├── InputManager.ts     // 键盘 + 鼠标，统一输出 ActionState
│   └── AudioManager.ts     // Web Audio API 程序化音效
├── world/
│   ├── Map.ts              // 地图数据、碰撞查询、地形破坏
│   └── levels/             // level01.ts … level35.ts
├── entities/
│   ├── Entity.ts           // 基类
│   ├── Tank.ts             // 坦克基类
│   ├── PlayerTank.ts
│   ├── EnemyTank.ts        // 含 AI
│   ├── Bullet.ts
│   ├── PowerUp.ts
│   └── Explosion.ts
├── systems/
│   ├── CollisionSystem.ts
│   ├── SpawnSystem.ts
│   ├── PowerUpSystem.ts
│   └── ParticleSystem.ts
└── ui/
    ├── HUD.ts              // 顶部 40px 状态栏
    ├── MenuScreen.ts
    └── GameOverScreen.ts
```

---

## 3. 坐标系约定（全文强制）

- 实体的 `(x, y)` 均为**战场内部像素坐标**，原点 `(0,0)` = 战场左上角（屏幕坐标 `(0, 40)`）。
- **细格坐标** `(col, row)` → 战场像素坐标 `(col × 20, row × 20)`，范围 `col∈[0,29]`，`row∈[0,37]`。
- **所有碰撞检测**在战场坐标系内进行。
- **渲染时**统一加偏移：`screenX = entity.x + BATTLE_AREA_X`（=entity.x），`screenY = entity.y + BATTLE_AREA_Y`（=entity.y + 40）。
- **禁止**在业务逻辑中使用屏幕坐标，防止 HUD 偏移混入碰撞计算。

---

## 4. 地图与碰撞系统

### 4.1 地形编码与行为

| 编码 | 名称 | 渲染色 | 子弹行为 | 坦克通行 | 特殊规则 |
|------|------|--------|---------|---------|---------|
| `0` | 空地 | `#000` | 穿过 | ✓ | — |
| `1` | 砖墙 | `#c84` | 消耗对应子格，子弹消失 | ✗ | TL/TR/BL/BR 四子格独立破坏 |
| `2` | 钢墙 | `#888` | 威力1=消失；威力2=消除整格+消失 | ✗ | — |
| `3` | 森林 | `#282` | 穿过；`hasMower` 时销毁此格 | ✓（坦克被遮挡） | 渲染在 Layer 5，高于坦克 |
| `4` | 水面 | `#46f` | 穿过 | ✗（`hasBoat` 除外） | — |
| `5` | 冰面 | `#aef` | 穿过 | ✓，松键后滑行 30帧 | 速度线性衰减至 0 |
| `6` | 基地 | `#ff0` ★ | 命中即摧毁，触发 GAME OVER | ✗ | 占 2×2 细格；`SHOVEL` 效果：外围 12格变钢墙 |

### 4.2 砖墙子格破坏

```typescript
// bit0=TL, bit1=TR, bit2=BL, bit3=BR，初始 0b1111=15
type BrickMask = number;
const brickMasks = new Map(); // key="${col},${row}"

const DESTROY_MASK: Record = {
  [Direction.RIGHT]: 0b0110, // TR | BR
  [Direction.LEFT]:  0b1001, // TL | BL
  [Direction.DOWN]:  0b1100, // BL | BR
  [Direction.UP]:    0b0011, // TL | TR
};
// 击中后：newMask = oldMask & ~DESTROY_MASK[dir]
// newMask === 0 → 该格变空地，从 brickMasks 删除
```

### 4.3 碰撞检测接口

```typescript
interface AABB { x: number; y: number; w: number; h: number; }

class CollisionSystem {
  queryTerrain(box: AABB, hasBoat: boolean): TerrainHit[];
  queryEntities(box: AABB, filter?: EntityType[]): Entity[];
  resolveMovement(tank: Tank, dx: number, dy: number): { dx: number; dy: number };
}
```

---

## 5. 实体系统

### 5.1 Tank 基类

```typescript
enum Direction { UP=0, DOWN=1, LEFT=2, RIGHT=3 }
enum TankFaction { PLAYER, ENEMY }
enum TankGrade { BASIC=1, FAST=2, POWER=3, ARMOR=4 }

class Tank extends Entity {
  direction: Direction;
  grade: TankGrade;
  faction: TankFaction;
  hp: number;

  hasShield: boolean;
  shieldTimer: number;       // 倒计帧数，600帧=10秒
  hasBoat: boolean;
  hasMower: boolean;

  speed: number;             // px/帧
  iceSlideFrames: number;    // 冰面剩余滑行帧（0=不滑行）
  iceSlideDir: Direction;

  bulletSpeed: number;
  bulletPower: number;       // 1=普通，2=破钢
  maxBulletsOnScreen: number;
  shootCooldown: number;     // 帧
  currentCooldown: number;

  abstract update(dt: number): void;
  shoot(): Bullet | null;
}
```

**各等级参数表：**

| 等级 | 名称 | 移动速度 | 子弹速度 | 最大在场弹 | 子弹威力 | 射击冷却 | HP |
|------|------|---------|---------|----------|---------|--------|----|
| 1 | Basic  | 1.5 px/帧 | 4 px/帧 | 1 | 1 | 20帧 | 1 |
| 2 | Fast   | 2.5 px/帧 | 6 px/帧 | 1 | 1 | 20帧 | 1 |
| 3 | Power  | 1.5 px/帧 | 4 px/帧 | 2 | 2 | 20帧 | 1 |
| 4 | Armor  | 1.5 px/帧 | 4 px/帧 | 1 | 1 | 20帧 | 4 |
| MAX | 手枪 | 2.5 px/帧 | 8 px/帧 | 2 | 2 | 12帧 | — |

> **MAX 级**用 `grade=4` + `isMax=true` 标记，不新增枚举值。

### 5.2 PlayerTank（单人）

```typescript
class PlayerTank extends Tank {
  lives = 3;
  score = 0;
  isMax = false;

  // 受击逻辑：isMax→grade=3,isMax=false | grade>1→grade-- | grade=1→死亡(lives--)
  applyDamage(): void;

  // 复活：在 SPAWN_PLAYER 细格出生，带 180帧（3秒）无敌护盾
  respawn(): void;
}
```

### 5.3 EnemyTank（AI 优先级状态机）

每帧按优先级执行第一条满足的规则：

```
[P1] 与玩家同行/列 且 中间无障碍 且 已面朝玩家 → 射击

[P2] 与玩家同行/列 且 中间无障碍 → 转向面对玩家，移动接近

[P3] 地图上有道具 且 曼哈顿距离 < 8格（烟山版！）
     → 贪心导航：优先消除较大轴向距离，向道具移动

[P4] 当前方向被阻挡（连续 3帧 无法移动）
     → 从其余 3 方向随机选一个

[P5] 默认：沿当前方向移动；每 180帧 有 30% 概率随机换向
```

**敌方类型：**

| 类型 | 颜色 | 等级 | 附加行为 |
|------|------|------|---------|
| 普通 | `#fff` | 1 | — |
| 快速 | `#bbb` | 2 | — |
| 强力 | `#666` | 3 | 优先朝基地方向移动 |
| 重甲 | 见 HP 颜色表 | 4 | HP=4，被击中变色 |

**重甲 HP 颜色序列：** HP4=`#2a2`绿 → HP3=`#f80`橙 → HP2=`#f22`红 → HP1=`#fff`白，每次被击中**闪白 4帧**后恢复对应颜色。

### 5.4 Bullet 类

```typescript
class Bullet extends Entity {
  owner: Tank;
  direction: Direction;
  speed: number;
  power: number; // 1 或 2

  // 每帧移动 → 按优先级碰撞（命中即停）：
  // 1.战场边界 → 消除子弹
  // 2.基地 → 摧毁基地 + GAME OVER
  // 3.钢墙 → power=1:子弹消失; power=2:消除钢墙+消失
  // 4.砖墙 → 消除对应2子格 + 消失
  // 5.敌对坦克 → 造成伤害 + 消失
  // 6.同帧友方子弹重叠 → 双方同时消除
  // 7.森林 → 穿过；hasMower=true 时消除该格，子弹继续飞
  update(): void;
}
```

**子弹与地形速查：**

| 地形 | 威力1 | 威力2 |
|------|-------|-------|
| 砖墙 | 消除方向侧 2 子格，消失 | 同左 |
| 钢墙 | 消失，钢墙保留 | 消除整格，消失 |
| 森林 | 穿过 | 穿过 |
| 水 | 穿过 | 穿过 |
| 冰 | 穿过 | 穿过 |
| 基地 | 摧毁 → GAME OVER | 同左 |
| 边界 | 消失 | 消失 |

---

## 6. 道具系统

### 6.1 生成规则

- 玩家击杀**外观闪烁**的敌方坦克时随机生成 1 个道具。
- 地图上同时最多 **1 个**道具；新道具替换旧道具。
- 生成位置：随机空地格，排除出生点 2格内、基地 3格内。
- 道具存活 **600帧（10秒）**，最后 180帧闪烁。

### 6.2 道具完整定义

| ID | 名称 | 玩家拾取 | **敌方拾取（烟山版）** |
|----|------|---------|----------------------|
| `STAR`   | 星星/手枪 | 升至 MAX 级（已 MAX 则重置冷却） | 玩家降一级；grade=1 时扣 1 条命 |
| `TANK`   | 1UP       | +1 条命（上限 9）              | 玩家扣 1 条命 |
| `SHOVEL` | 铲子      | 基地外围 12格变钢墙，1200帧后复原；重复拾取重置计时 | 基地钢墙立即变回砖墙 |
| `SHIELD` | 头盔      | 无敌护盾 600帧                 | 玩家护盾被强制移除 |
| `CLOCK`  | 时钟      | 所有敌方坦克冻结 600帧         | 玩家坦克冻结 600帧 |
| `GUN`    | 炸弹      | 消灭屏幕上所有敌方坦克         | 玩家扣 1 HP + 清除所有玩家子弹 |
| `BOAT`   | 船        | `hasBoat=true`，持续到关卡结束 | 拾取的敌方坦克获得 `hasBoat=true` |

### 6.3 拾取检测

道具 AABB `20×20px`，与坦克 `40×40px` AABB 重叠即触发，根据 `tank.faction` 调用对应效果。

---

## 7. 输入系统（InputManager）

### 7.1 统一输出接口

```typescript
interface ActionState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  shoot: boolean;
  pause: boolean;
  confirm: boolean;
}
// 键盘和鼠标状态 OR 合并（任一激活则为 true）
```

### 7.2 键盘映射

| 动作 | 主键 | 备用键 |
|------|------|-------|
| 上 | `W` | `ArrowUp` |
| 下 | `S` | `ArrowDown` |
| 左 | `A` | `ArrowLeft` |
| 右 | `D` | `ArrowRight` |
| 射击 | `Space` | `Z` |
| 暂停 | `P` | `Escape` |
| 确认 | `Enter` | `Space` |

### 7.3 鼠标控制

鼠标控制分为拖拽移动和点击射击两种模式。

| 鼠标行为 | 游戏动作 |
|---------|---------|
| 鼠标在坦克区域内**按下左键并拖拽** | 坦克向鼠标拖拽的方向（上下左右）移动，直到释放左键。 |
| 鼠标在坦克区域外**单击左键** | 计算坦克到鼠标的方向：<br>1. 如果炮筒不是朝这个方向，则转至该方向。<br>2. 如果炮筒已经朝向这里，则发射一发炮弹。 |
| 鼠标在坦克区域外**保持按下左键** | 炮筒转向鼠标方向，并连续发射炮弹。 |
| 右键单击或按下保持 | 向当前朝向射击（单次或连续）。 |

**注意：**
- 鼠标**移动**不再自动改变坦克朝向。
- 键盘移动（WASD/方向键）优先级高于鼠标拖拽。


---

## 8. 渲染系统

### 8.1 渲染层级（每帧按序绘制）

```
Layer 0:  纯黑背景（整个 600×800）
Layer 1:  战场底层地形（空地/水面/冰面）
Layer 2:  道具
Layer 3:  坦克（玩家 + 敌方）
Layer 4:  子弹
Layer 5:  森林瓦片（覆盖坦克，实现遮挡！）
Layer 6:  砖墙/钢墙
Layer 7:  爆炸 + 粒子特效
Layer 8:  顶部 HUD（y=0~40）
Layer 9:  全屏遮罩（暂停/过场/GAME OVER）
```

### 8.2 顶部 HUD（600×40px，单行紧凑设计）

```
┌──────┬────────────┬────────────┬────────┬──────────┐
│敌×20 │ SCORE      │ HI-SCORE   │ ♥×3    │ STG 01   │
│图标  │ 000000     │ 000000     │命数图标 │ 关卡号   │
│x:0~90│ x:90~230   │ x:230~370  │x:370~490│ x:490~600│
└──────┴────────────┴────────────┴────────┴──────────┘
高度 40px，字号约 12px，图标约 16px
```

### 8.3 程序化绘制函数签名

```typescript
// 所有绘制函数的 x, y 参数为战场坐标，内部自动加 BATTLE_AREA_Y 偏移后绘制

function drawTank(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  direction: Direction,
  grade: TankGrade,
  isMax: boolean,
  faction: TankFaction,
  shieldVisible: boolean,   // 护盾闪烁：frame % 12 < 6 时为 true
  armorColor: string        // 重甲坦克 HP 颜色；其他类型忽略
): void

function drawTerrain(ctx: CanvasRenderingContext2D, map: GameMap): void
function drawHUD(ctx: CanvasRenderingContext2D, state: GameState): void
function drawBattleBorder(ctx: CanvasRenderingContext2D): void
  // 在战场四周绘制 2px 边框线（颜色 #444），与黑色背景区分
```

---

## 9. 游戏状态机

```
[BOOT]
  ↓
[MAIN_MENU] ←──────────────────────────────────────┐
  ↓ (确认)                                          │
[STAGE_INTRO]  ("STAGE XX" 字幕，2 秒)              │
  ↓                                                 │
[PLAYING] ──→ [PAUSED] ──→ [PLAYING]               │
  │ (全敌消灭)                                       │
  ↓                                                 │
[STAGE_CLEAR] (胜利动画，2 秒)                       │
  ↓                                                 │
[SCORE_TALLY] ──→ (确认/自动) ──→ [STAGE_INTRO] ───┘
  
[PLAYING] ──→ [GAME_OVER] (字幕缓慢下移，3 秒) ──→ [MAIN_MENU]
                (此时写入 localStorage 最高分)
```

**胜利/失败条件：**
- **胜利**：本关预设总敌数全部消灭（含尚未出场的）。
- **失败1**：基地被摧毁 → 立即 GAME OVER（不扣命）。
- **失败2**：`lives < 0` → GAME OVER。

---

## 10. 敌方生成系统

```typescript
interface LevelConfig {
  stageNumber: number;
  totalEnemies: number;       // 通常 20（更大地图可增至 25）
  spawnInterval: number;      // 生成间隔帧，通常 180~240
  maxOnScreen: number;        // 同屏最大敌数，通常 5~7
  enemyDistribution: {
    basic: number;
    fast: number;
    power: number;
    armor: number;
  };
  flashingEnemyIndices: number[]; // 第几辆（0起）携带道具，被击杀时刷新道具
  mapData: number[][];        // 38行 × 30列（注意：行优先，mapData[row][col]）
}
```

**生成逻辑：**
- 从 3 个出生点轮流选择；目标位置被占则跳过，等待下一轮。
- 生成时播放 60帧 闪烁入场动画。
- `flashingEnemyIndices` 中的坦克持续 2帧明/2帧暗 闪烁，被击杀触发道具刷新。

**关卡敌方配置参考（随关卡递进）：**

| 关卡范围 | Basic | Fast | Power | Armor | 同屏数 |
|---------|-------|------|-------|-------|-------|
| 1~2     | 全部  | 0    | 0     | 0     | 4     |
| 3~4    | 多数  | 少量 | 0     | 0     | 5     |
| 5~6   | 减少  | 增加 | 增加  | 少量  | 6     |
| 7~8   | 少    | 中   | 中    | 增加  | 7     |
| 9 及之后   | 少    | 少   | 多    | 多    | 8     |

---

## 11. 音效系统

使用 Web Audio API 程序化合成，零外部文件。首次用户交互时调用 `audioCtx.resume()`。

| 事件 | 合成方式 |
|------|---------|
| 子弹发射 | White noise，decay=0.05s |
| 子弹击砖 | Square 300Hz，decay=0.1s |
| 子弹击钢 | Sawtooth 800Hz + pitch下滑，decay=0.05s |
| 坦克爆炸 | Noise + lowpass 200Hz，duration=0.6s |
| 玩家爆炸 | 同上，音量更大，低频更重 |
| 拾取道具 | Sine 上行 3音符（C→E→G），每符 0.08s |
| 游戏结束 | Sine 下行 5音符，每符 0.12s |

---

## 12. 粒子特效系统

```typescript
class ParticleSystem {
  // 敌方坦克爆炸：16~24粒子，颜色 #f80/#ff0/#f40，生命 20~40帧
  emitTankExplosion(x: number, y: number): void;

  // 玩家坦克爆炸：30~40粒子，更大更持久，生命 40~60帧
  emitPlayerExplosion(x: number, y: number): void;

  // 子弹撞击：4~6粒子，颜色 #fff，生命 8~12帧
  emitBulletImpact(x: number, y: number): void;

  // 道具拾取：12粒子，360°均匀散射，颜色 #ff0，生命 20帧
  emitPowerUpCollect(x: number, y: number): void;

  update(): void;
  render(ctx: CanvasRenderingContext2D): void; // 坐标系为战场坐标，内部加 Y 偏移
}
```

---

## 13. 关卡数据格式

```typescript
// src/world/levels/level01.ts
// 注意地图尺寸从 26×26 扩大为 30列×38行
export const LEVEL_01: LevelConfig = {
  stageNumber: 1,
  totalEnemies: 20,
  spawnInterval: 200,
  maxOnScreen: 4,
  enemyDistribution: { basic: 20, fast: 0, power: 0, armor: 0 },
  flashingEnemyIndices: [3, 10, 17],
  mapData: [
    // [row 0]  地图顶部，30个值
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0,0],
    // ... 共 38 行（row 0 ~ row 37）
    // 第 35~36 行（老鹰区域）由代码强制写入，mapData 此处填 0
  ]
};
```

> **老鹰始终固定在** `(14, 35)`（细格坐标），由 `Map.loadLevel()` 在加载后自动写入，不依赖 `mapData`。

---

## 14. 计分系统

| 消灭目标 | 分值 |
|---------|------|
| 普通坦克 | 100 |
| 快速坦克 | 200 |
| 强力坦克 | 300 |
| 重甲坦克 | 400 |

- 每关结算逐项动画累加：类型 × 数量 × 单价。
- 累计分每超过 20000 奖励 1 条命。
- 最高分写入 `localStorage`，key=`tank90_highscore`，GAME OVER 时更新。

---

## 15. 实现优先级与里程碑

### Phase 1 — 可运行原型（MVP）
- [ ] Canvas 600×800，CSS 缩放适配，HUD 偏移常量
- [ ] 键盘 InputManager，ActionState 输出
- [ ] Map 程序化渲染（30×38 网格，7种地形）
- [ ] 玩家坦克：移动、AABB 碰撞、射击、砖墙子格破坏
- [ ] 基地（固定在 cell(14,35)）摧毁 → GAME OVER

### Phase 2 — 核心玩法完整
- [ ] 敌方坦克生成（3出生点，AI 优先级状态机）
- [ ] 道具系统（7种，玩家拾取效果全部实现）
- [ ] 关卡胜利 + SCORE_TALLY 流程
- [ ] HUD 完整绘制（紧凑单行）
- [ ] 至少 5 关卡数据（适配 30×38）

### Phase 3 — 烟山版特性 + 鼠标控制
- [ ] 敌方拾取道具触发反效果（烟山版核心）
- [ ] 森林割草（`hasMower` 逻辑）
- [ ] 基地铲子加固（1200帧计时 + 最后 300帧闪烁）
- [ ] 鼠标方向吸附 + 左键射击

### Phase 4 — 打磨与完整内容
- [ ] 粒子特效系统（4种触发）
- [ ] Web Audio 音效（7种）
- [ ] 计分存档（localStorage）
- [ ] 完整 35 关卡数据（全部适配 30×38）

---

## 16. 边界情况与注意事项

1. **双子弹碰撞**：同帧两颗子弹 AABB 重叠，无论阵营，双方同时消除。
2. **出生无敌**：出生后 180帧 免疫所有伤害；护盾 `frame % 12 < 6` 时可见（6帧明/6帧暗交替）。
3. **冰面惯性**：松开所有方向键后沿原方向滑行 30帧，速度每帧线性衰减 `1/30`。转向键**立即中断**滑行；射击正常。
4. **铲子计时重置**：重复拾取时计时器重置为 1200帧（不叠加）；倒计时最后 300帧开始闪烁提示。
5. **敌方炸弹效果**（`GUN`）：玩家扣 1 HP（重甲只扣 HP，不立即消灭）+ 清除屏幕上所有玩家子弹。
6. **重甲被击中**：先闪白 4帧，再显示新 HP 对应颜色，非瞬间跳变。
7. **鼠标方向死区**：光标距坦克中心 ≤ 15px 时不更新方向，防抖。
8. **鼠标仅在战场内有效**：逻辑坐标 `y < BATTLE_AREA_Y (40px)` 时，`mousemove` 不触发方向更新。
9. **坐标系一致性**：业务逻辑（碰撞、AI、位移）全程使用战场坐标；只有 `ctx.drawXxx()` 调用前加 `BATTLE_AREA_Y` 偏移；**禁止**在碰撞计算中混用屏幕坐标。
10. **mapData 行列顺序**：`mapData[row][col]`，`row=0` 是地图顶部，`col=0` 是左侧，与战场坐标系一致。
11. **基地固定**：`Map.loadLevel()` 加载完 `mapData` 后，**强制**将 `(14,35)`,`(15,35)`,`(14,36)`,`(15,36)` 四格设为类型 `6`（基地），不依赖 `mapData` 内容。
12. **AudioContext 政策**：首次 `mousedown` / `keydown` 时调用 `audioCtx.resume()`，否则浏览器静音。
13. **战场边框**：在战场区域四周绘制细线（颜色 `#444`），视觉上区分战场与黑色 HTML 背景。

---

## 附录：尺寸速查表

| 对象 | 尺寸（px）| 说明 |
|------|----------|------|
| 画布 | 600×800 | 逻辑分辨率 |
| HUD | 600×40 | y: 0~40 |
| 战场 | 600×760 | y: 40~800 |
| 细格 | 20×20 | 基本网格单位 |
| 坦克 | 40×40 | 2×2 细格 |
| 子弹 | 5×5 | 固定尺寸 |
| 道具 | 20×20 | 1×1 细格 |
| 网格 | 30列×38行 | = 1140细格，原版 1.7× |
| 老鹰 | 40×40 | 2×2 细格，固定在 (14,35) |