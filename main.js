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

function placeWallAt(x, y) {
    if (!player) return;

    // 1. Kiểm tra tài nguyên
    if (player.wood < 5) {
        // Có thể thêm hiệu ứng báo lỗi ở đây (console.log hoặc UI)
        console.log("Không đủ gỗ!");
        return;
    }

    // 2. Kiểm tra xem vị trí đó đã có tường chưa
    // Kích thước tường là 80x80
    const size = 80;
    // Giảm hitbox một chút để tránh chặn nhầm (nhỏ hơn size thực)
    const margin = 5; 

    // Kiểm tra trùng với tường khác
    for (let s of squares) {
        if (x < s.x + s.w - margin && x + size > s.x + margin &&
            y < s.y + s.h - margin && y + size > s.y + margin) {
            console.log("Không thể xây đè lên tường khác!");
            return;
        }
    }

    // Kiểm tra trùng với tài nguyên
    for (let r of resources) {
        if (!r.active) continue;
        // Kiểm tra va chạm hình tròn (resource) và hình chữ nhật (tường mới)
        let closestX = Math.max(x, Math.min(r.pos.x, x + size));
        let closestY = Math.max(y, Math.min(r.pos.y, y + size));
        let distX = r.pos.x - closestX;
        let distY = r.pos.y - closestY;
        if ((distX*distX + distY*distY) < (r.r * r.r)) {
            console.log("Vướng tài nguyên!");
            return;
        }
    }

    // Kiểm tra trùng với Player (không cho xây đè lên người)
    let closestX = Math.max(x, Math.min(player.pos.x, x + size));
    let closestY = Math.max(y, Math.min(player.pos.y, y + size));
    let distX = player.pos.x - closestX;
    let distY = player.pos.y - closestY;
    if ((distX*distX + distY*distY) < (player.r * player.r)) {
        console.log("Vướng người chơi!");
        return;
    }

    // 3. Xây dựng
    player.wood -= 5; // Trừ gỗ
    squares.push(new Square(x, y, size, size, "#8e44ad")); // Thêm tường màu tím
}


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

    // Draw Environment
    squares.forEach((s, index) => {
        s.draw();
        if(s.health <= 0) squares.splice(index, 1);
    });
    resources.forEach((r) => { r.update(); r.draw(); });

    // Draw Objects (Player & Zombies)
    objects.forEach((obj, index) => {
        obj.update();
        obj.draw();

        if (player) {
            if (obj !== player) {
                // Player đánh Zombie
                player.checkStickHit(obj, "enemy");
                
                // --- NEW: ZOMBIE ĐÁNH PLAYER ---
                // obj (Zombie) check xem có chém trúng Player không
                obj.checkStickHit(player, "player"); 
                
                // Zombie đánh tường
                squares.forEach(wall => obj.checkWallHit(wall));
            }
        }
        
// 1. Thêm biến trạng thái để biết game có đang dừng chờ hồi sinh không
let isGameOver = false;

// 2. Hàm tìm vị trí an toàn (Cách xa mọi zombie ít nhất 500px)
function getSafeSpawnPosition() {
    let safe = false;
    let newX, newY;
    let attempts = 0;

    // Thử tối đa 100 lần để tìm vị trí, tránh treo máy nếu map quá đông
    while (!safe && attempts < 100) {
        attempts++;
        // Random vị trí trong map (chừa lề 100px)
        newX = Math.random() * (MAP_WIDTH - 200) + 100;
        newY = Math.random() * (MAP_HEIGHT - 200) + 100;

        safe = true;
        
        // Kiểm tra khoảng cách với TẤT CẢ Zombie
        for (let obj of objects) {
            if (!obj.isPlayer) { // Nếu là zombie
                let dx = obj.pos.x - newX;
                let dy = obj.pos.y - newY;
                let dist = Math.sqrt(dx*dx + dy*dy);
                
                // Nếu khoảng cách < 600px thì vị trí này không an toàn -> thử lại
                if (dist < 600) {
                    safe = false;
                    break; 
                }
            }
        }
    }
    
    // Nếu thử 100 lần không được thì spawn đại ở giữa (fallback)
    return new Vector(newX, newY);
}

// 3. Hàm Hồi sinh (Được gọi khi bấm nút)
window.respawnPlayer = function() { // Gán vào window để HTML gọi được
    const spawnPos = getSafeSpawnPosition();
    
    // Reset chỉ số Player
    player.pos = spawnPos;
    player.health = player.maxHealth;
    player.vel = new Vector(0, 0); // Đứng yên
    
    // Ẩn màn hình Game Over
    document.getElementById('game-over-screen').classList.add('hidden');
    
    // Tiếp tục game
    isGameOver = false;
    animate(); // Gọi lại vòng lặp (nếu bạn đã dừng nó)
};

// 4. SỬA VÒNG LẶP ANIMATE (Quan trọng)
// Tìm đoạn code xử lý player chết trong hàm animate() và sửa lại như sau:

function animate() {
    if (isGameOver) return; // Nếu game over thì DỪNG vẽ frame mới (pause game)

    // ... (Phần Update UI, Camera, Render giữ nguyên) ...
    // ... Copy phần đầu hàm animate cũ của bạn vào đây ...
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

    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    
    // Vẽ Tường & Tài nguyên (Giữ nguyên)
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 10;
    ctx.strokeRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
    squares.forEach((s, index) => {
        s.draw();
        if(s.health <= 0) squares.splice(index, 1);
    });
    resources.forEach((r) => { r.update(); r.draw(); });

    // --- SỬA ĐOẠN XỬ LÝ OBJECTS ---
    objects.forEach((obj, index) => {
        obj.update();
        obj.draw();

        if (player) {
            if (obj !== player) {
                // Player đánh Zombie
                player.checkStickHit(obj, "enemy");
                // Zombie đánh Player
                obj.checkStickHit(player, "player"); 
                // Zombie đánh tường
                squares.forEach(wall => obj.checkWallHit(wall));
            }
        }
        
        // KIỂM TRA MÁU <= 0
        if (obj.health <= 0) {
            if (obj.isPlayer) {
                // --- THAY ĐỔI Ở ĐÂY: KHÔNG RELOAD NỮA ---
                isGameOver = true;
                document.getElementById('game-over-screen').classList.remove('hidden');
            } else {
                // Nếu là Zombie chết thì xóa bình thường
                objects.splice(index, 1);
            }
        }
    });
    // ... (Phần còn lại của animate giữ nguyên) ...

    if(player) {
        resources.forEach(res => player.checkStickHit(res, "resource"));
        squares.forEach(wall => player.checkWallHit(wall));
    }

    // Draw Wall Preview (Giữ nguyên)
    if (activeSlot === 1 && player) {
        // ... code cũ ...
         const size = 80; 
        const worldX = mouse.x + camera.x;
        const worldY = mouse.y + camera.y;
        const gridX = Math.floor(worldX / size) * size;
        const gridY = Math.floor(worldY / size) * size;
        const canBuild = player.wood >= 30;
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = canBuild ? "#00ff00" : "#ff0000"; 
        ctx.fillRect(gridX, gridY, size, size);
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
        ctx.strokeRect(gridX, gridY, size, size);
        ctx.globalAlpha = 1.0; 
    }

    ctx.restore();
    drawMinimap();

    // Physics Loop (Giữ nguyên)
    for (let i = 0; i < objects.length; i++) {
        for (let j = i + 1; j < objects.length; j++) checkBallBall(objects[i], objects[j]);
    }
    objects.forEach(obj => squares.forEach(sq => checkBallSquare(obj, sq)));
    objects.forEach(obj => resources.forEach(res => checkBallResource(obj, res)));

    // CHỈ GỌI FRAME TIẾP THEO NẾU CHƯA GAME OVER
    if (!isGameOver) {
        requestAnimationFrame(animate);
    }
}
    });

    if(player) {
        resources.forEach(res => player.checkStickHit(res, "resource"));
        squares.forEach(wall => player.checkWallHit(wall));
    }

    // Draw Wall Preview
    if (activeSlot === 1 && player) {
        const size = 80; 
        const worldX = mouse.x + camera.x;
        const worldY = mouse.y + camera.y;
        
        // Snap to Grid
        const gridX = Math.floor(worldX / size) * size;
        const gridY = Math.floor(worldY / size) * size;

        // Check có đủ gỗ không
        const canBuild = player.wood >= 30;
        
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = canBuild ? "#00ff00" : "#ff0000"; 
        ctx.fillRect(gridX, gridY, size, size);
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
        ctx.strokeRect(gridX, gridY, size, size);
        ctx.globalAlpha = 1.0; 
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

