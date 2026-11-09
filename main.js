// FILE: main.js

// --- GLOBAL VARIABLES FOR GAME STATE ---
let isGameOver = false;

// --- INPUT LISTENERS ---
// Xử lý phím Hotbar
window.addEventListener('keydown', (e) => {
    if (e.key === '1') activeSlot = 0;
    if (e.key === '2') activeSlot = 1;
    // E: bật/tắt chế độ xây tường
    if ((e.key === 'e' || e.key === 'E') && !e.repeat) activeSlot = activeSlot === 1 ? 0 : 1;
});

// Xử lý Click chuột (Tấn công hoặc Xây)
canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return; // chỉ chuột trái
    mouse.isDown = true;
    if (isGameOver) return;
    if (activeSlot === 1) {
        const size = 80;
        const worldX = mouse.x + camera.x;
        const worldY = mouse.y + camera.y;
        const gridX = Math.floor(worldX / size) * size;
        const gridY = Math.floor(worldY / size) * size;
        placeWallAt(gridX, gridY);
    }
});
// --- HELPER FUNCTIONS ---

function placeWallAt(x, y) {
    if (!player) return;
    if (player.wood < WALL_COST) return; // Không đủ gỗ
    if (x < 0 || y < 0 || x + 80 > MAP_WIDTH || y + 80 > MAP_HEIGHT) return; // Ngoài bản đồ

    const size = 80;
    const margin = 5;

    // Check trùng tường khác
    for (let s of squares) {
        if (x < s.x + s.w - margin && x + size > s.x + margin &&
            y < s.y + s.h - margin && y + size > s.y + margin) {
            return;
        }
    }

    // Check trùng tài nguyên
    for (let r of resources) {
        if (!r.active) continue;
        let closestX = Math.max(x, Math.min(r.pos.x, x + size));
        let closestY = Math.max(y, Math.min(r.pos.y, y + size));
        let distX = r.pos.x - closestX;
        let distY = r.pos.y - closestY;
        if ((distX * distX + distY * distY) < (r.r * r.r)) return;
    }

    // Check trùng Player
    let closestX = Math.max(x, Math.min(player.pos.x, x + size));
    let closestY = Math.max(y, Math.min(player.pos.y, y + size));
    let distX = player.pos.x - closestX;
    let distY = player.pos.y - closestY;
    if ((distX * distX + distY * distY) < (player.r * player.r)) return;

    // Check trùng Zombie
    for (let o of objects) {
        if (o.isPlayer) continue;
        let cx = Math.max(x, Math.min(o.pos.x, x + size));
        let cy = Math.max(y, Math.min(o.pos.y, y + size));
        if ((o.pos.x - cx) ** 2 + (o.pos.y - cy) ** 2 < o.r * o.r) return;
    }

    // Xây dựng
    player.wood -= WALL_COST;
    squares.push(new Square(x, y, size, size, "#8e44ad"));
}

function getSafeSpawnPosition() {
    let safe = false;
    let newX, newY;
    let attempts = 0;

    while (!safe && attempts < 100) {
        attempts++;
        newX = Math.random() * (MAP_WIDTH - 200) + 100;
        newY = Math.random() * (MAP_HEIGHT - 200) + 100;
        safe = true;
        
        for (let obj of objects) {
            if (!obj.isPlayer) {
                let dx = obj.pos.x - newX;
                let dy = obj.pos.y - newY;
                let dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < 600) { safe = false; break; }
            }
        }
    }
    return new Vector(newX, newY);
}

// Hàm Hồi sinh (Gán vào window để nút HTML gọi được)
window.respawnPlayer = function() {
    const spawnPos = getSafeSpawnPosition();
    player.pos = spawnPos;
    player.health = player.maxHealth;
    player.vel = new Vector(0, 0);
    
    // Ẩn UI chết
    const gameOverScreen = document.getElementById('game-over-screen');
    if (gameOverScreen) gameOverScreen.classList.add('hidden');
    
    player.isSwinging = false;
    player.isReturning = false;
    player.swingTimer = 0;
    mouse.isDown = false;

    isGameOver = false;
    requestAnimationFrame(animate);
};

function updateHotbarUI() {
    document.querySelectorAll('#hotbar .slot').forEach((el, i) => el.classList.toggle('active', i === activeSlot));
}

// Sinh zombie ở xa người chơi để không bị tấn công ngay khi vào game
function spawnZombie() {
    let x, y, tries = 0;
    do {
        x = Math.random() * (MAP_WIDTH - 200) + 100;
        y = Math.random() * (MAP_HEIGHT - 200) + 100;
        tries++;
    } while (player && Math.hypot(x - player.pos.x, y - player.pos.y) < 700 && tries < 50);
    objects.push(new Ball(x, y, 25, "#FF4136"));
}
const MAX_ZOMBIES = 15;
const ZOMBIE_RESPAWN_MS = 5000;
let lastZombieSpawn = Date.now();

function drawMinimap() {
    const mmCanvas = document.getElementById('minimap');
    if(!mmCanvas) return;
    const mmCtx = mmCanvas.getContext('2d');
    mmCtx.clearRect(0, 0, mmCanvas.width, mmCanvas.height);
    const scaleX = mmCanvas.width / MAP_WIDTH;
    const scaleY = mmCanvas.height / MAP_HEIGHT;

    resources.forEach(r => {
        if (!r.active) return;
        mmCtx.fillStyle = r.type === "wood" ? "#2ecc71" : "#7f8c8d";
        mmCtx.beginPath();
        mmCtx.arc(r.pos.x * scaleX, r.pos.y * scaleY, 2, 0, Math.PI*2);
        mmCtx.fill();
    });
    mmCtx.fillStyle = "#555";
    squares.forEach(s => {
        mmCtx.fillRect(s.x * scaleX, s.y * scaleY, s.w * scaleX, s.h * scaleY);
    });
    objects.forEach(obj => {
        mmCtx.fillStyle = obj.isPlayer ? "#3498db" : "#e74c3c";
        mmCtx.beginPath();
        mmCtx.arc(obj.pos.x * scaleX, obj.pos.y * scaleY, obj.isPlayer ? 4:3, 0, Math.PI*2);
        mmCtx.fill();
    });
    mmCtx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    mmCtx.lineWidth = 1;
    mmCtx.strokeRect(camera.x * scaleX, camera.y * scaleY, WIDTH * scaleX, HEIGHT * scaleY);
}

// --- INIT & MAIN LOOP ---

function init() {
    initMap(); 
    player = new Ball(MAP_WIDTH/2, MAP_HEIGHT/2, 25, "#d3a46cff", true); 
    objects.push(player);
    for (let i = 0; i < MAX_ZOMBIES; i++) spawnZombie();
}

function animate() {
    if (isGameOver) return;

    // 1. Update UI & Camera
    updateHotbarUI();
    if (player) {
        camera.x = player.pos.x - WIDTH / 2;
        camera.y = player.pos.y - HEIGHT / 2;
        camera.x = Math.max(0, Math.min(camera.x, MAP_WIDTH - WIDTH));
        camera.y = Math.max(0, Math.min(camera.y, MAP_HEIGHT - HEIGHT));
    }
    canvas.style.backgroundPosition = `${-camera.x}px ${-camera.y}px`;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    // 2. Draw Environment
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 10;
    ctx.strokeRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // Xóa tường bị phá (lọc mảng thay vì splice trong forEach để không bỏ sót phần tử)
    squares = squares.filter(s => s.health > 0);
    squares.forEach(s => s.draw());
    resources.forEach((r) => { r.update(); r.draw(); });

    // 3. Draw & Update Objects (Player & Zombies)
    objects.forEach(obj => {
        obj.update();
        obj.draw();

        if (player && obj !== player) {
            player.checkStickHit(obj, "enemy"); // Player đánh Zombie
            obj.checkStickHit(player, "player"); // Zombie đánh Player
            squares.forEach(wall => obj.checkWallHit(wall)); // Zombie đánh tường
        }
    });

    // Kiểm tra chết (sau khi duyệt xong mới xóa)
    if (player && player.health <= 0) {
        player.health = 0;
        isGameOver = true;
        const gameOverScreen = document.getElementById('game-over-screen');
        if (gameOverScreen) gameOverScreen.classList.remove('hidden');
    }
    objects = objects.filter(o => o.isPlayer || o.health > 0);

    // Hồi sinh zombie dần dần để game không bị trống
    const zombieCount = objects.length - 1;
    if (zombieCount < MAX_ZOMBIES && Date.now() - lastZombieSpawn > ZOMBIE_RESPAWN_MS) {
        spawnZombie();
        lastZombieSpawn = Date.now();
    }

    if(player) {
        resources.forEach(res => player.checkStickHit(res, "resource"));
        squares.forEach(wall => player.checkWallHit(wall));
    }

    // 4. Draw Wall Preview
    if (activeSlot === 1 && player) {
        const size = 80; 
        const worldX = mouse.x + camera.x;
        const worldY = mouse.y + camera.y;
        const gridX = Math.floor(worldX / size) * size;
        const gridY = Math.floor(worldY / size) * size;
        const canBuild = player.wood >= WALL_COST;
        
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = canBuild ? "#00ff00" : "#ff0000"; 
        ctx.fillRect(gridX, gridY, size, size);
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
        ctx.strokeRect(gridX, gridY, size, size);
        ctx.globalAlpha = 1.0; 
    }

    ctx.restore();

    drawMinimap();

    // 5. Physics Collision Loop
    for (let i = 0; i < objects.length; i++) {
        for (let j = i + 1; j < objects.length; j++) checkBallBall(objects[i], objects[j]);
    }
    objects.forEach(obj => squares.forEach(sq => checkBallSquare(obj, sq)));
    objects.forEach(obj => resources.forEach(res => checkBallResource(obj, res)));

    if (!isGameOver) requestAnimationFrame(animate);
}

// Start Game
init();
animate();

