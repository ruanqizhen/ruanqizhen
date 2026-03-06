import { AABB } from '../types';
import { GameManager } from '../engine/GameManager';

export abstract class Entity {
    public id: string;
    public x: number = 0;
    public y: number = 0;
    public w: number;
    public h: number;
    public isDead: boolean = false;
    public gameManager: GameManager;

    constructor(gameManager: GameManager, w: number, h: number) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.gameManager = gameManager;
        this.w = w;
        this.h = h;
    }

    public getAABB(): AABB {
        return {
            x: this.x,
            y: this.y,
            w: this.w,
            h: this.h
        };
    }

    public abstract update(dt: number): void;
    public abstract render(ctx: CanvasRenderingContext2D): void;
}
