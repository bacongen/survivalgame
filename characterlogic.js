// --- CHARACTER & PHYSICS CONFIGURATION ---

const STICK_LENGTH = 160;
const STICK_WIDTH = 60;
const STICK_ANCHOR_POINT = 60;
const STICK_ANCHOR_Y = 0;
const HAND_RADIUS = 12;
const HAND_COLOR = "#b48145ff";
const SWING_SPEED = 0.25;
const RETURN_SPEED = 0.1;
const SWING_COOLDOWN = 30;
// Hình ảnh Gậy
const stickImage = new Image();
stickImage.src = "Sword_1.png";

class Ball {
    constructor(x, y, r, color, isPlayer = false) {
        // ... (Constructor giữ nguyên) ...
        this.pos = new Vector(x, y);
        this.vel = new Vector(0, 0);
        this.r = r;
        this.color = color;
        this.mass = r;
        this.isPlayer = isPlayer;
        this.flashTimer = 0;

        // Stats
        this.health = 100;
        this.maxHealth = 100;
        this.wood = 0;
        this.stone = 0;

        // Player Specifics
        this.baseAngle = 0;
        this.swingOffset = -Math.PI / 3;
        this.isSwinging = false;
        this.isReturning = false;
        this.swingTimer = 0;
        this.cooldownTimer = 0;
        this.hitTargets = [];
    }
    update() {
        if (this.flashTimer > 0) this.flashTimer--;

        if (this.isPlayer) {
            // --- UI Update (ĐÃ SỬA ID) ---
            const hpEl = document.getElementById('health-bar');
            // ID mới trong hotbar
            const woodEl = document.getElementById('ui-wood-count');
            const stoneEl = document.getElementById('ui-stone-count');

            if (hpEl) hpEl.style.width = (this.health / this.maxHealth * 100) + "%";
            if (woodEl) woodEl.innerText = this.wood;
            if (stoneEl) stoneEl.innerText = this.stone;

            // Move
            if (keys.w || keys.ArrowUp) this.vel.y -= ACCELERATION;
            if (keys.s || keys.ArrowDown) this.vel.y += ACCELERATION;
            if (keys.a || keys.ArrowLeft) this.vel.x -= ACCELERATION;
            if (keys.d || keys.ArrowRight) this.vel.x += ACCELERATION;

            // Rotate
            const mouseWorldX = mouse.x + camera.x;
            const mouseWorldY = mouse.y + camera.y;
            const dx = mouseWorldX - this.pos.x;
            const dy = mouseWorldY - this.pos.y;
            this.baseAngle = Math.atan2(dy, dx);

            // Chỉ tấn công nếu Active Slot là 0 (Kiếm)
            if (this.cooldownTimer > 0) this.cooldownTimer--;

            if (activeSlot === 0 && mouse.isDown && !this.isSwinging && !this.isReturning && this.cooldownTimer === 0) {
                this.isSwinging = true; this.swingTimer = 0; this.hitTargets = [];
            }

            if (this.isSwinging) {
                this.swingTimer += SWING_SPEED;
                if (this.swingTimer >= Math.PI) { this.swingTimer = Math.PI; this.isSwinging = false; this.isReturning = true; }
            } else if (this.isReturning) {
                this.swingTimer -= RETURN_SPEED;
                if (this.swingTimer <= 0) { this.swingTimer = 0; this.isReturning = false; this.cooldownTimer = SWING_COOLDOWN; }
            }
            // Nếu không cầm kiếm thì giấu kiếm đi (hoặc giữ im)
            if (activeSlot !== 0) {
                this.swingOffset = -Math.PI / 3; // Giữ kiếm ở vị trí nghỉ
            } else {
                this.swingOffset = (this.isSwinging || this.isReturning) ? -Math.cos(this.swingTimer) * (Math.PI / 3) : -Math.PI / 3;
            }
        }

        // Vật lý
        this.pos = this.pos.add(this.vel);
        this.vel = this.vel.mult(FRICTION);

        // Giới hạn bản đồ
        if (this.pos.x + this.r > MAP_WIDTH) { this.pos.x = MAP_WIDTH - this.r; this.vel.x *= -ELASTICITY; }
        else if (this.pos.x - this.r < 0) { this.pos.x = this.r; this.vel.x *= -ELASTICITY; }

        if (this.pos.y + this.r > MAP_HEIGHT) { this.pos.y = MAP_HEIGHT - this.r; this.vel.y *= -ELASTICITY; }
        else if (this.pos.y - this.r < 0) { this.pos.y = this.r; this.vel.y *= -ELASTICITY; }
    }
    checkStickHit(target, type = "enemy") {
        // Lưu ý: Chỉ đánh trúng nếu target còn active (đối với resource)
        if (type === "resource" && !target.active) return;

        if (!this.isSwinging || this.hitTargets.includes(target)) return;

        const currentStickAngle = this.baseAngle + this.swingOffset;
        const dx = target.pos ? target.pos.x - this.pos.x : target.x + target.w / 2 - this.pos.x;
        const dy = target.pos ? target.pos.y - this.pos.y : target.y + target.h / 2 - this.pos.y;

        const dist = Math.sqrt(dx * dx + dy * dy);
        const reach = STICK_LENGTH + this.r + (target.r || target.w / 2);

        const angleToTarget = Math.atan2(dy, dx);
        let angleDiff = angleToTarget - currentStickAngle;
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        if (dist < reach && Math.abs(angleDiff) < 1.0) {
            this.hitTargets.push(target);
            target.flashTimer = 5;
            target.health -= 25;

            if (type === "resource") {
                if (target.type === "wood") this.wood += 2;
                if (target.type === "stone") this.stone += 1;
            } else if (type === "enemy") {
                const knockbackDir = new Vector(Math.cos(currentStickAngle), Math.sin(currentStickAngle));
                target.vel = target.vel.add(knockbackDir.mult(KNOCKBACK_FORCE));
            }
        }
    }
    checkWallHit(wall) {
        if (!this.isSwinging || this.hitTargets.includes(wall)) return;
        const centerX = wall.x + wall.w / 2;
        const centerY = wall.y + wall.h / 2;
        const dist = Math.sqrt((centerX - this.pos.x) ** 2 + (centerY - this.pos.y) ** 2);

        const currentStickAngle = this.baseAngle + this.swingOffset;
        const angleToWall = Math.atan2(centerY - this.pos.y, centerX - this.pos.x);
        let angleDiff = angleToWall - currentStickAngle;
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        if (dist < STICK_LENGTH + this.r + 40 && Math.abs(angleDiff) < 1.0) {
            this.hitTargets.push(wall);
            wall.health -= 20;
        }
    }

    draw() {
        if (this.isPlayer) {
            ctx.save();
            ctx.translate(this.pos.x, this.pos.y);
            ctx.rotate(this.baseAngle + this.swingOffset);

            // Vẽ kiếm (Chỉ vẽ nếu đang ở Slot 0)
            if (activeSlot === 0) {
                const startX = this.r - STICK_ANCHOR_POINT;
                ctx.drawImage(stickImage, startX, STICK_ANCHOR_Y, STICK_LENGTH, STICK_WIDTH);
            }

            // Vẽ tay
            const startX = this.r - STICK_ANCHOR_POINT;
            ctx.fillStyle = HAND_COLOR;
            ctx.beginPath(); ctx.arc(startX + 15, 30, HAND_RADIUS, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(startX + 55, 30, HAND_RADIUS, 0, Math.PI * 2); ctx.fill();

            ctx.restore();
        }

        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.r, 0, Math.PI * 2);
        if (this.flashTimer > 0) ctx.fillStyle = "#fff";
        else ctx.fillStyle = this.color;

        ctx.fill();
        ctx.strokeStyle = "#333";
        ctx.stroke();
    }
}

// --- PLAYER ACTIONS (BUILD) ---
// Hàm này giờ được gọi khi click chuột
function placeWallAt(x, y) {
    // SIZE CŨ: 40 -> SIZE MỚI: 80 (Gấp 4 diện tích)
    const size = 80; 
    
    if (player && player.wood >= 5) {
        const exists = squares.some(s => s.x === x && s.y === y);
        // Tăng khoảng cách xây dựng một chút vì tường to hơn
        const dist = Math.sqrt((x + size/2 - player.pos.x)**2 + (y + size/2 - player.pos.y)**2);

        if (!exists && dist < 250) { // Tăng tầm xây dựng lên 250
            squares.push(new Square(x, y, size, size, "#666"));
            player.wood -= 5;
        }
    }
}

// ... (Giữ nguyên các hàm checkBallBall, checkBallSquare, checkBallResource) ...
function checkBallBall(b1, b2) {
    const diff = b1.pos.sub(b2.pos);
    const distSq = diff.x*diff.x + diff.y*diff.y;
    const minDist = b1.r + b2.r;
    if (distSq < minDist*minDist) {
        const dist = Math.sqrt(distSq) || 1;
        const overlap = (minDist - dist) / 2;
        const normal = diff.normalize();
        b1.pos = b1.pos.add(normal.mult(overlap));
        b2.pos = b2.pos.sub(normal.mult(overlap));
    }
}
function checkBallSquare(ball, square) {
    const closestX = Math.max(square.x, Math.min(ball.pos.x, square.x + square.w));
    const closestY = Math.max(square.y, Math.min(ball.pos.y, square.y + square.h));
    const distX = ball.pos.x - closestX;
    const distY = ball.pos.y - closestY;
    if (distX*distX + distY*distY < ball.r*ball.r) {
        const dist = Math.sqrt(distX*distX + distY*distY);
        const normal = dist === 0 ? new Vector(1,0) : new Vector(distX/dist, distY/dist);
        ball.pos = ball.pos.add(normal.mult(ball.r - dist));
    }
}
function checkBallResource(ball, res) {
    if (!res.active) return;
    const diff = ball.pos.sub(res.pos);
    const distSq = diff.x*diff.x + diff.y*diff.y;
    const minDist = ball.r + res.r;
    if (distSq < minDist*minDist) {
        const dist = Math.sqrt(distSq);
        const normal = diff.normalize();
        ball.pos = ball.pos.add(normal.mult(minDist - dist));
    }
}