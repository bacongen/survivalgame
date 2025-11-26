// --- ENTITY LOGIC (Resources & Structures) ---

// 1. Tường / Vật cản (Squares)
class Square {
    constructor(x, y, w, h, color) {
        this.x = x; this.y = y;
        this.w = w; this.h = h;
        this.color = color;
        this.health = 300;
        this.maxHealth = 300;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.w, this.h);
        
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 3;
        ctx.strokeRect(this.x, this.y, this.w, this.h);

        if (this.health < this.maxHealth) {
            ctx.fillStyle = "red";
            ctx.fillRect(this.x, this.y - 10, this.w, 5);
            ctx.fillStyle = "#00ff00";
            ctx.fillRect(this.x, this.y - 10, this.w * (this.health / this.maxHealth), 5);
        }
    }
}

// 2. Tài nguyên (Cây / Đá)
class Resource {
    constructor(x, y, r, type) {
        this.pos = new Vector(x, y);
        this.r = r;
        this.type = type; // "wood" hoặc "stone"
        this.health = type === "wood" ? 160 : 200;
        this.maxHealth = this.health;
        this.flashTimer = 0;
        
        // --- NEW: LOGIC HỒI SINH ---
        this.active = true;
        this.respawnTime = 0;
    }

    update() {
        // Nếu đang chết, kiểm tra thời gian để hồi sinh
        if (!this.active) {
            // 2 phút = 120000 ms
            if (Date.now() > this.respawnTime) {
                this.active = true;
                this.health = this.maxHealth;
            }
            return;
        }

        if (this.flashTimer > 0) this.flashTimer--;
        
        // Logic chết
        if (this.health <= 0) {
            this.active = false;
            this.respawnTime = Date.now() + 120000; // Hẹn giờ hồi sinh sau 2 phút
        }
    }

    draw() {
        if (!this.active) return; // Nếu chết thì không vẽ

        ctx.beginPath();
        if (this.type === "wood") {
            ctx.fillStyle = "#2ecc71";
            ctx.arc(this.pos.x, this.pos.y, this.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#83e85a";
            ctx.beginPath();
            ctx.arc(this.pos.x, this.pos.y, this.r * 0.7, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillStyle = "#95a5a6";
            ctx.arc(this.pos.x, this.pos.y, this.r, 0, Math.PI * 2);
            ctx.fill();
        }

        if (this.flashTimer > 0) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
            ctx.fill();
        }

        ctx.strokeStyle = "#333";
        ctx.lineWidth = 2;
        ctx.stroke();

        if (this.health < this.maxHealth) {
            ctx.fillStyle = "red";
            ctx.fillRect(this.pos.x - 20, this.pos.y + this.r + 5, 40, 5);
            ctx.fillStyle = "#00ff00";
            ctx.fillRect(this.pos.x - 20, this.pos.y + this.r + 5, 40 * (this.health / this.maxHealth), 5);
        }
    }
}