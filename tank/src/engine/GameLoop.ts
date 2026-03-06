import { MS_PER_UPDATE } from '../constants';

export class GameLoop {
    private updateFn: (dt: number) => void;
    private renderFn: () => void;

    private lastTime = 0;
    private accumulator = 0;
    private frameId: number | null = null;
    private isRunning = false;

    constructor(updateFn: (dt: number) => void, renderFn: () => void) {
        this.updateFn = updateFn;
        this.renderFn = renderFn;
    }

    public start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = performance.now();
        this.frameId = requestAnimationFrame(this.loop);
    }

    public stop() {
        this.isRunning = false;
        if (this.frameId !== null) {
            cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }
    }

    private loop = (currentTime: number) => {
        if (!this.isRunning) return;

        let dt = currentTime - this.lastTime;
        this.lastTime = currentTime;

        // Prevent spiral of death if tab is inactive
        if (dt > 250) {
            dt = 250;
        }

        this.accumulator += dt;

        while (this.accumulator >= MS_PER_UPDATE) {
            this.updateFn(1); // 1 frame logic
            this.accumulator -= MS_PER_UPDATE;
        }

        this.renderFn();

        this.frameId = requestAnimationFrame(this.loop);
    };
}
