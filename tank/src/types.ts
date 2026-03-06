export enum Direction {
    UP = 0,
    DOWN = 1,
    LEFT = 2,
    RIGHT = 3
}

export enum TankFaction {
    PLAYER,
    ENEMY
}

export enum TankGrade {
    BASIC = 1,
    FAST = 2,
    POWER = 3,
    ARMOR = 4
}

export interface AABB {
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface ActionState {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
    shoot: boolean;
    pause: boolean;
    confirm: boolean;
}
