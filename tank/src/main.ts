import { GameManager } from './engine/GameManager';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;

const gameManager = new GameManager(canvas);
gameManager.start();

console.log('GameManager started.');
