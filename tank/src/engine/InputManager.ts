import { ActionState } from '../types';


export class InputManager {
    private canvas: HTMLCanvasElement;
    private actionState: ActionState = {
        up: false,
        down: false,
        left: false,
        right: false,
        shoot: false,
        pause: false,
        confirm: false,
    };
    private isLeftMouseDown = false;
    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.bindEvents();
    }

    private bindEvents() {
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);

        // Prevent default context menu on canvas
        this.canvas.addEventListener('contextmenu', e => e.preventDefault());

        this.canvas.addEventListener('mousemove', this.handleMouseMove);
        this.canvas.addEventListener('mousedown', this.handleMouseDown);
        this.canvas.addEventListener('mouseup', this.handleMouseUp);
        this.canvas.addEventListener('mouseleave', this.handleMouseLeave);
    }

    private handleKeyDown = (e: KeyboardEvent) => {
        switch (e.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.actionState.up = true;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.actionState.down = true;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.actionState.left = true;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.actionState.right = true;
                break;
            case 'Space':
            case 'KeyZ':
                this.actionState.shoot = true;
                this.actionState.confirm = true;
                break;
            case 'KeyP':
            case 'Escape':
                this.actionState.pause = true;
                break;
            case 'Enter':
                this.actionState.confirm = true;
                break;
        }
    };

    private handleKeyUp = (e: KeyboardEvent) => {
        switch (e.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.actionState.up = false;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.actionState.down = false;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.actionState.left = false;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.actionState.right = false;
                break;
            case 'Space':
            case 'KeyZ':
                this.actionState.shoot = false;
                this.actionState.confirm = false;
                break;
            case 'KeyP':
            case 'Escape':
                this.actionState.pause = false;
                break;
            case 'Enter':
                this.actionState.confirm = false;
                break;
        }
    };

    private toLogical(clientX: number, clientY: number) {
        const rect = this.canvas.getBoundingClientRect();

        // The game's internal logical resolution is fixed
        const logicalWidth = 600;
        const logicalHeight = 800;

        // Handle object-fit: contain scaling and letterbox offsets
        const scaleX = rect.width / logicalWidth;
        const scaleY = rect.height / logicalHeight;
        const scale = Math.min(scaleX, scaleY);

        const drawnWidth = logicalWidth * scale;
        const drawnHeight = logicalHeight * scale;

        const offsetX = (rect.width - drawnWidth) / 2;
        const offsetY = (rect.height - drawnHeight) / 2;

        return {
            x: (clientX - rect.left - offsetX) / scale,
            y: (clientY - rect.top - offsetY) / scale,
        };
    }

    private mouseLogicalPos = { x: 0, y: 0 };

    private handleMouseMove = (e: MouseEvent) => {
        this.mouseLogicalPos = this.toLogical(e.clientX, e.clientY);
    };

    private handleMouseDown = (e: MouseEvent) => {
        this.mouseLogicalPos = this.toLogical(e.clientX, e.clientY);
        // Left click = 0
        if (e.button === 0) {
            this.isLeftMouseDown = true;
            this.actionState.confirm = true;
        }
    };

    private handleMouseUp = (e: MouseEvent) => {
        if (e.button === 0) {
            this.isLeftMouseDown = false;
            this.actionState.confirm = false;
        }
    };

    private handleMouseLeave = () => {
        this.isLeftMouseDown = false;
    };

    public getActionState(): ActionState {
        // The main game logic can check right-click shots separately if needed,
        // but standard shoot applies to left mouse button and space.
        return { ...this.actionState };
    }

    public getMouseLogicalPos() {
        return { ...this.mouseLogicalPos };
    }

    public isLeftClickHeld(): boolean {
        return this.isLeftMouseDown;
    }
}
