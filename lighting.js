// lighting.js - Система освещения

const shadowCanvas = document.createElement('canvas');
const shadowCtx = shadowCanvas.getContext('2d');
let width = 800;
let height = 600;

export function initLighting(w, h) {
    width = w;
    height = h;
    shadowCanvas.width = width;
    shadowCanvas.height = height;
}

export function drawLighting(ctx, dayTime, player, altar, camera, canvasWidth, canvasHeight) {
    // 1. Вычисляем темноту
    let darkness = 0;
    if (dayTime > 0.5 && dayTime < 0.9) darkness = (dayTime - 0.5) * 2.5; 
    else if (dayTime >= 0.9) darkness = 0.95; 
    else if (dayTime < 0.1) darkness = 0.95 - (dayTime * 9.5);
    
    // Если идет дождь (ночью), делаем еще темнее
    if (dayTime > 0.6) darkness += 0.1;

    if (darkness < 0) darkness = 0; 
    if (darkness > 0.98) darkness = 0.98;
    
    // Даже днем рисуем легкую тень для контраста дождя, если нужно
    if (darkness < 0.05) return;

    // 2. Очистка
    shadowCtx.clearRect(0, 0, width, height);
    shadowCtx.fillStyle = `rgba(0, 0, 0, ${darkness})`;
    shadowCtx.fillRect(0, 0, width, height);
    
    // 3. Вырезаем свет
    shadowCtx.globalCompositeOperation = 'destination-out';

    // --- СВЕТ ИГРОКА (С МЕРЦАНИЕМ) ---
    let screenPx = player.x - camera.x;
    let screenPy = player.y - camera.y;
    
    // Случайное мерцание размера (от 155 до 165)
    const flicker = Math.random() * 10;
    const lightRadius = 155 + flicker;

    let g = shadowCtx.createRadialGradient(screenPx, screenPy, 20, screenPx, screenPy, lightRadius);
    // Мерцание прозрачности
    const opacity = 0.9 + Math.random() * 0.1;
    g.addColorStop(0, `rgba(255, 255, 255, ${opacity})`); 
    g.addColorStop(1, "rgba(255, 255, 255, 0)");
    
    shadowCtx.fillStyle = g; 
    shadowCtx.beginPath(); 
    shadowCtx.arc(screenPx, screenPy, lightRadius, 0, Math.PI*2); 
    shadowCtx.fill();

    // --- СВЕТ АЛТАРЯ (ПУЛЬСИРУЕТ) ---
    let screenAx = altar.x - camera.x;
    let screenAy = altar.y - camera.y;
    
    if (screenAx > -300 && screenAx < canvasWidth + 300 && screenAy > -300 && screenAy < canvasHeight + 300) {
        // Пульсация по синусоиде (зависит от времени)
        const pulse = Math.sin(Date.now() / 500) * 10;
        const altarRadius = 220 + pulse;

        let g2 = shadowCtx.createRadialGradient(screenAx, screenAy, 40, screenAx, screenAy, altarRadius);
        g2.addColorStop(0, "rgba(255, 255, 255, 0.9)"); 
        g2.addColorStop(1, "rgba(255, 255, 255, 0)");
        
        shadowCtx.fillStyle = g2; 
        shadowCtx.beginPath(); 
        shadowCtx.arc(screenAx, screenAy, altarRadius, 0, Math.PI*2); 
        shadowCtx.fill();
    }

    // 4. Наложение
    shadowCtx.globalCompositeOperation = 'source-over';
    ctx.drawImage(shadowCanvas, 0, 0);
}