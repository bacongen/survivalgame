// --- MAP GENERATION ---

function initMap() {
    // Tạo 50 cây ngẫu nhiên
    for(let i=0; i<50; i++) {
        resources.push(new Resource(
            Math.random() * (MAP_WIDTH - 200) + 100,
            Math.random() * (MAP_HEIGHT - 200) + 100,
            // Radius cũ: 30-40. Radius mới: 60-80 (Gấp đôi kích thước -> Gấp 4 diện tích)
            60 + Math.random() * 20, 
            "wood"
        ));
    }

    // Tạo 30 cục đá ngẫu nhiên
    for(let i=0; i<30; i++) {
        resources.push(new Resource(
            Math.random() * (MAP_WIDTH - 200) + 100,
            Math.random() * (MAP_HEIGHT - 200) + 100,
            // Radius cũ: 25-40. Radius mới: 50-80
            50 + Math.random() * 30,
            "stone"
        ));
    }
    
    return { resources, squares };
}
    
    // Tạo biên giới (Tường bao quanh map) để người chơi biết giới hạn
    // Vẽ tường ảo bằng Logic va chạm ở file characterlogic thì tốt hơn, 
    // ở đây ta chỉ sinh resource thôi.
