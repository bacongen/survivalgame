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
const KNOCKBACK_FORCE = 5; 

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

// 5. PHYSICS FUNCTIONS (Xử lý va chạm)

function checkBallBall(b1, b2) {
    // Không check nếu trùng nhau hoặc tài nguyên chưa active
    if (b1 === b2) return;
    if (b1.active === false || b2.active === false) return;

    // Tính vector khoảng cách
    let distVec = b1.pos.sub(b2.pos);
    let dist = distVec.mag();
    let minDist = b1.r + b2.r;

    if (dist < minDist) {
        // 1. Đẩy 2 vật ra khỏi nhau (Static Resolution)
        let overlap = minDist - dist;
        let pushDir = distVec.normalize();
        let pushVec = pushDir.mult(overlap / 2); // Chia đều lực đẩy

        b1.pos = b1.pos.add(pushVec);
        b2.pos = b2.pos.sub(pushVec);

        // 2. Phản hồi lực (Dynamic Resolution - Bounce)
        // Đơn giản hóa: Đảo ngược vận tốc theo hướng va chạm
        let vRel = b1.vel.sub(b2.vel);
        let velAlongNormal = vRel.dot(pushDir);

        // Chỉ nảy nếu đang di chuyển về phía nhau
        if (velAlongNormal > 0) return;

        let j = -(1 + ELASTICITY) * velAlongNormal;
        j /= (1/b1.mass + 1/b2.mass); // Công thức va chạm đàn hồi

        let impulse = pushDir.mult(j);
        
        // Cập nhật vận tốc (Giả sử mass = radius)
        b1.vel = b1.vel.add(impulse.mult(1/b1.mass));
        b2.vel = b2.vel.sub(impulse.mult(1/b2.mass));
    }
}

function checkBallResource(ball, res) {
    if (!res.active) return; // Tài nguyên đã bị khai thác thì đi xuyên qua

    let distVec = ball.pos.sub(res.pos);
    let dist = distVec.mag();
    let minDist = ball.r + res.r;

    if (dist < minDist) {
        // Tài nguyên đứng yên (mass vô hạn), chỉ đẩy Ball ra
        let overlap = minDist - dist;
        let pushDir = distVec.normalize();
        
        ball.pos = ball.pos.add(pushDir.mult(overlap));

        // Phản xạ vận tốc của Ball
        let velAlongNormal = ball.vel.dot(pushDir);
        if (velAlongNormal < 0) {
            let j = -(1 + ELASTICITY) * velAlongNormal;
            let impulse = pushDir.mult(j);
            ball.vel = ball.vel.add(impulse);
        }
    }
}

function checkBallSquare(ball, sq) {
    // Tìm điểm gần nhất trên hình chữ nhật tới tâm hình tròn
    // Clamp giá trị x, y của tâm ball vào trong khoảng của Square
    let closestX = Math.max(sq.x, Math.min(ball.pos.x, sq.x + sq.w));
    let closestY = Math.max(sq.y, Math.min(ball.pos.y, sq.y + sq.h));

    let distVec = new Vector(ball.pos.x - closestX, ball.pos.y - closestY);
    let dist = distVec.mag();

    if (dist < ball.r) {
        // Có va chạm
        let overlap = ball.r - dist;
        
        // Nếu tâm ball trùng tâm hình chữ nhật (tránh lỗi chia cho 0)
        let pushDir;
        if (dist === 0) {
            pushDir = new Vector(1, 0); // Đẩy mặc định sang phải
        } else {
            pushDir = distVec.normalize();
        }

        // Đẩy Ball ra
        ball.pos = ball.pos.add(pushDir.mult(overlap));

        // Phản xạ vận tốc
        let velAlongNormal = ball.vel.dot(pushDir);
        if (velAlongNormal < 0) {
            let j = -(1 + ELASTICITY) * velAlongNormal;
            let impulse = pushDir.mult(j);
            ball.vel = ball.vel.add(impulse);
        }
    }
}