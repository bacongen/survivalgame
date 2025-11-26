// FILE: globals.js

// 1. CONFIGURATION
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Kích thước màn hình (Viewport)
const WIDTH = canvas.width;
const HEIGHT = canvas.height;

// Kích thước bản đồ (Map) - PHẢI CÓ
const MAP_WIDTH = 4000;
const MAP_HEIGHT = 4000;

// Camera - PHẢI CÓ
const camera = { x: 0, y: 0 };

// Physics
const FRICTION = 0.90;
const ELASTICITY = 0.5;
const ACCELERATION = 0.3;
const KNOCKBACK_FORCE = 10; 

// 2. GLOBAL ARRAYS
let objects = [];
let squares = [];
let resources = [];
let player;

// --- NEW: QUẢN LÝ HOTBAR ---
// 0: Sword (Mặc định), 1: Wall
let activeSlot = 0;

// 3. VECTOR CLASS
class Vector {
    constructor(x, y) { this.x = x; this.y = y; }
    add(v) { return new Vector(this.x + v.x, this.y + v.y); }
    sub(v) { return new Vector(this.x - v.x, this.y - v.y); }
    mult(n) { return new Vector(this.x * n, this.y * n); }
    mag() { return Math.sqrt(this.x * this.x + this.y * this.y); }
    normalize() { const m = this.mag(); return m === 0 ? new Vector(0,0) : new Vector(this.x/m, this.y/m); }
    dot(v) { return this.x * v.x + this.y * v.y; }
}

// 4. INPUTS
const keys = { w: false, a: false, s: false, d: false, e: false, ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };
const mouse = { x: WIDTH / 2, y: HEIGHT / 2, isDown: false };

window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key) || keys.hasOwnProperty(e.key.toLowerCase())) {
        keys[e.key] = true;
        keys[e.key.toLowerCase()] = true;
    }
});
window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key) || keys.hasOwnProperty(e.key.toLowerCase())) {
        keys[e.key] = false;
        keys[e.key.toLowerCase()] = false;
    }
});
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
});
canvas.addEventListener('mousedown', () => mouse.isDown = true);
canvas.addEventListener('mouseup', () => mouse.isDown = false);