// --- MAIN GAME LOOP ---

// Xử lý phím Hotbar
window.addEventListener('keydown', (e) => {
    // Bỏ phím E cũ
    if (e.key === '1') activeSlot = 0;
    if (e.key === '2') activeSlot = 1;
    // Có thể thêm 3-9 sau này
});

// Xử lý Click chuột (Tấn công hoặc Xây)
canvas.addEventListener('mousedown', () => {
    mouse.isDown = true;

    // Nếu đang cầm Tường (Slot 1) -> Xây dựng
    if (activeSlot === 1) {
        // Tính toán vị trí xây (Grid 80x80)
        const size = 80;
        const worldX = mouse.x + camera.x;
        const worldY = mouse.y + camera.y;
        const gridX = Math.floor(worldX / size) * size;
        const gridY = Math.floor(worldY / size) * size;
        
        placeWallAt(gridX, gridY);
    }
});
canvas.addEventListener('mouseup', () => mouse.isDown = false);


function init() {
    initMap(); 
    player = new Ball(MAP_WIDTH/2, MAP_HEIGHT/2, 25, "#d3a46cff", true); 
    objects.push(player);
    for (let i = 0; i < 15; i++) {
        objects.push(new Ball(Math.random()*MAP_WIDTH, Math.random()*MAP_HEIGHT, 25, "#FF4136"));
    }
}

// ... (Giữ nguyên drawMinimap) ...
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

function updateHotbarUI() {
    // Xóa class active cũ
    document.querySelectorAll('.slot').forEach(el => el.classList.remove('active'));
    // Thêm class active vào slot hiện tại (cộng 1 vì nth-child đếm từ 1)
    const slotEl = document.querySelector(`.slot:nth-child(${activeSlot + 1})`);
    if (slotEl) slotEl.classList.add('active');
}

function animate() {
    // 0. UPDATE UI
    updateHotbarUI();

    // 1. UPDATE CAMERA
    if (player) {
        camera.x = player.pos.x - WIDTH / 2;
        camera.y = player.pos.y - HEIGHT / 2;
        camera.x = Math.max(0, Math.min(camera.x, MAP_WIDTH - WIDTH));
        camera.y = Math.max(0, Math.min(camera.y, MAP_HEIGHT - HEIGHT));
    }
    canvas.style.backgroundPosition = `${-camera.x}px ${-camera.y}px`;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // 2. WORLD RENDER
    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 10;
    ctx.strokeRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // Draw Entities
    squares.forEach((s, index) => {
        s.draw();
        if(s.health <= 0) squares.splice(index, 1);
    });
    resources.forEach((r) => { r.update(); r.draw(); });
    objects.forEach((obj, index) => {
        obj.update();
        obj.draw();
        if (player && obj !== player) {
            player.checkStickHit(obj, "enemy");
            if (obj.health <= 0) objects.splice(index, 1);
        }
    });

    if(player) {
        resources.forEach(res => player.checkStickHit(res, "resource"));
        squares.forEach(wall => player.checkWallHit(wall));
    }

    // --- NEW: DRAW WALL PREVIEW ---
    // Nếu đang cầm tường (Slot 1) -> Vẽ hình mờ
    if (activeSlot === 1 && player) {
        const size = 80; // Kích thước mới
        const worldX = mouse.x + camera.x;
        const worldY = mouse.y + camera.y;
        
        // Snap to Grid
        const gridX = Math.floor(worldX / size) * size;
        const gridY = Math.floor(worldY / size) * size;

        // Check có đủ gỗ không
        const canBuild = player.wood >= 30;
        
        ctx.globalAlpha = 0.5; // Làm mờ
        ctx.fillStyle = canBuild ? "#00ff00" : "#ff0000"; // Xanh nếu đủ gỗ, Đỏ nếu thiếu
        ctx.fillRect(gridX, gridY, size, size);
        
        // Viền
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.strokeRect(gridX, gridY, size, size);
        
        ctx.globalAlpha = 1.0; // Reset độ mờ
    }

    ctx.restore();

    // 3. UI RENDER
    drawMinimap();

    // Physics Loop
    for (let i = 0; i < objects.length; i++) {
        for (let j = i + 1; j < objects.length; j++) checkBallBall(objects[i], objects[j]);
    }
    objects.forEach(obj => squares.forEach(sq => checkBallSquare(obj, sq)));
    objects.forEach(obj => resources.forEach(res => checkBallResource(obj, res)));

    requestAnimationFrame(animate);
}

init();
animate();