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
const stickImage = new Image();
stickImage.src = "Sword_1.png"; 

class Ball {
    constructor(x, y, r, color, isPlayer = false) {
        this.pos = new Vector(x, y);
        this.vel = new Vector(0, 0);
        this.r = r;
        this.color = color;
        this.mass = r;
        this.isPlayer = isPlayer;
        this.flashTimer = 0;
        
        // Stats chung cho cả Player và Zombie
        this.health = 100;
        this.maxHealth = 100;
        
        // Tài nguyên (chỉ Player dùng, nhưng để đây cũng không sao)
        this.wood = 0;
        this.stone = 0;

        // Combat Stats (Cả Player và Zombie đều cần)
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

        // --- 1. LOGIC NGƯỜI CHƠI (PLAYER) ---
        if (this.isPlayer) {
            // UI Update
            const hpEl = document.getElementById('health-bar');
            const woodEl = document.getElementById('ui-wood-count'); 
            const stoneEl = document.getElementById('ui-stone-count');
            
            if(hpEl) hpEl.style.width = (this.health / this.maxHealth * 100) + "%";
            if(woodEl) woodEl.innerText = this.wood;
            if(stoneEl) stoneEl.innerText = this.stone;

            // Move
            if (keys.w || keys.ArrowUp) this.vel.y -= ACCELERATION;
            if (keys.s || keys.ArrowDown) this.vel.y += ACCELERATION;
            if (keys.a || keys.ArrowLeft) this.vel.x -= ACCELERATION;
            if (keys.d || keys.ArrowRight) this.vel.x += ACCELERATION;

            // Rotate theo chuột
            const mouseWorldX = mouse.x + camera.x;
            const mouseWorldY = mouse.y + camera.y;
            const dx = mouseWorldX - this.pos.x;
            const dy = mouseWorldY - this.pos.y;
            this.baseAngle = Math.atan2(dy, dx);

            // Attack Input (Chuột trái)
            if (this.cooldownTimer > 0) this.cooldownTimer--;
            
            // Chỉ đánh được khi đang cầm kiếm (activeSlot === 0)
            if (typeof activeSlot !== 'undefined' && activeSlot === 0 && mouse.isDown && !this.isSwinging && !this.isReturning && this.cooldownTimer === 0) {
                this.isSwinging = true; this.swingTimer = 0; this.hitTargets = [];
            }
        } 
        // --- 2. LOGIC ZOMBIE (AI) ---
        else if (player) { // Nếu không phải player thì là Zombie, và Player phải đang sống
            // Tính toán khoảng cách tới Player
            const dx = player.pos.x - this.pos.x;
            const dy = player.pos.y - this.pos.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            // Xoay mặt về phía Player
            this.baseAngle = Math.atan2(dy, dx);

            // Di chuyển: Đuổi theo Player
            // Chỉ đuổi nếu khoảng cách > 100 (để không bị dính chặt vào người chơi)
            // Tốc độ chậm hơn Player một chút (ACCELERATION * 0.6) để Player có cơ hội chạy
            if (dist > 80) {
                const moveDir = new Vector(dx, dy).normalize();
                this.vel = this.vel.add(moveDir.mult(ACCELERATION * 0.6));
            }

            // Tấn công: Nếu đủ gần (< 180) và hồi chiêu xong thì chém
            if (this.cooldownTimer > 0) this.cooldownTimer--;
            
            if (dist < 180 && !this.isSwinging && !this.isReturning && this.cooldownTimer === 0) {
                this.isSwinging = true; 
                this.swingTimer = 0; 
                this.hitTargets = [];
            }
        }

        // --- 3. XỬ LÝ HOẠT ẢNH CHÉM (CHUNG CHO CẢ 2) ---
        if (this.isSwinging) {
            this.swingTimer += SWING_SPEED;
            if (this.swingTimer >= Math.PI) { this.swingTimer = Math.PI; this.isSwinging = false; this.isReturning = true; }
        } else if (this.isReturning) {
            this.swingTimer -= RETURN_SPEED;
            if (this.swingTimer <= 0) { this.swingTimer = 0; this.isReturning = false; this.cooldownTimer = SWING_COOLDOWN; }
        }
        
        // Cập nhật góc kiếm
        // Nếu là Player và đang cầm tường (Slot 1) thì giấu kiếm
        if (this.isPlayer && typeof activeSlot !== 'undefined' && activeSlot !== 0) {
            this.swingOffset = -Math.PI / 3;
        } else {
            this.swingOffset = (this.isSwinging || this.isReturning) ? -Math.cos(this.swingTimer) * (Math.PI / 3) : -Math.PI / 3;
        }

        // --- 4. VẬT LÝ CƠ BẢN ---
        this.pos = this.pos.add(this.vel);
        this.vel = this.vel.mult(FRICTION);

        // Map Boundaries
        if (this.pos.x + this.r > MAP_WIDTH) { this.pos.x = MAP_WIDTH - this.r; this.vel.x *= -ELASTICITY; }
        else if (this.pos.x - this.r < 0) { this.pos.x = this.r; this.vel.x *= -ELASTICITY; }
        
        if (this.pos.y + this.r > MAP_HEIGHT) { this.pos.y = MAP_HEIGHT - this.r; this.vel.y *= -ELASTICITY; }
        else if (this.pos.y - this.r < 0) { this.pos.y = this.r; this.vel.y *= -ELASTICITY; }
    }

    checkStickHit(target, type = "enemy") {
        if (type === "resource" && !target.active) return;
        if (!this.isSwinging || this.hitTargets.includes(target)) return;

        const currentStickAngle = this.baseAngle + this.swingOffset;
        const dx = target.pos ? target.pos.x - this.pos.x : target.x + target.w/2 - this.pos.x;
        const dy = target.pos ? target.pos.y - this.pos.y : target.y + target.h/2 - this.pos.y;

        const dist = Math.sqrt(dx*dx + dy*dy);
        const reach = STICK_LENGTH + this.r + (target.r || target.w/2);

        const angleToTarget = Math.atan2(dy, dx);
        let angleDiff = angleToTarget - currentStickAngle;
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        if (dist < reach && Math.abs(angleDiff) < 1.0) {
            this.hitTargets.push(target);
            target.flashTimer = 5;
            
            // Sát thương: Player đánh thì 25, Zombie đánh thì 10
            const damage = this.isPlayer ? 25 : 10;
            target.health -= damage; 

            if (type === "resource" && this.isPlayer) {
                if (target.type === "wood") this.wood += 5;
                if (target.type === "stone") this.stone += 3;
            } else if (type === "enemy" || type === "player") {
                const knockbackDir = new Vector(Math.cos(currentStickAngle), Math.sin(currentStickAngle));
                target.vel = target.vel.add(knockbackDir.mult(KNOCKBACK_FORCE));
            }
        }
    }
    
    // checkWallHit giữ nguyên
    checkWallHit(wall) {
         if (!this.isSwinging || this.hitTargets.includes(wall)) return;
         const centerX = wall.x + wall.w/2;
         const centerY = wall.y + wall.h/2;
         const dist = Math.sqrt((centerX - this.pos.x)**2 + (centerY - this.pos.y)**2);
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
        // --- VẼ KIẾM (CHO CẢ PLAYER VÀ ZOMBIE) ---
        // Chỉ vẽ nếu không phải Player (Zombie luôn cầm kiếm) HOẶC là Player đang cầm kiếm (Slot 0)
        const shouldDrawSword = !this.isPlayer || (this.isPlayer && activeSlot === 0);

        if (shouldDrawSword) {
            ctx.save();
            ctx.translate(this.pos.x, this.pos.y);
            ctx.rotate(this.baseAngle + this.swingOffset);
            
            const startX = this.r - STICK_ANCHOR_POINT;
            ctx.drawImage(stickImage, startX, STICK_ANCHOR_Y, STICK_LENGTH, STICK_WIDTH);
            
            // Vẽ tay
            ctx.fillStyle = HAND_COLOR;
            ctx.beginPath(); ctx.arc(startX + 15, 30, HAND_RADIUS, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(startX + 55, 30, HAND_RADIUS, 0, Math.PI*2); ctx.fill();
            
            ctx.restore();
        }

        // Vẽ thân mình
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.r, 0, Math.PI * 2);
        
        if (this.flashTimer > 0) ctx.fillStyle = "#fff";
        else ctx.fillStyle = this.color;
        
        ctx.fill();
        ctx.strokeStyle = "#333";
        ctx.stroke();

        // --- THANH MÁU CHO ZOMBIE ---
        // Player có thanh máu UI riêng, còn Zombie cần thanh máu trên đầu
        if (!this.isPlayer && this.health < this.maxHealth) {
            ctx.fillStyle = "red";
            ctx.fillRect(this.pos.x - 20, this.pos.y - this.r - 15, 40, 5);
            ctx.fillStyle = "#00ff00";
            ctx.fillRect(this.pos.x - 20, this.pos.y - this.r - 15, 40 * (this.health / this.maxHealth), 5);
        }
    }
}