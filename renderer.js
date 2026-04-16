import { drawSpawns, drawDecorations, getBiomeColors } from './world.js';
import { drawLighting } from './lighting.js';
import { drawEnemies } from './enemyManager.js';
import { drawCombatEffects, drawGroundEffects, drawCombatEffects as drawVFX } from './combatManager.js';
import { drawMinimap } from './ui.js';
import { drawMutationsMenu } from './mutations.js';
import { currentZoneIndex } from './worldMap.js'; 

export function drawGame(ctx, canvas, state) {
    const { 
        player, altar, camera, altarScore, dayTime, 
        shakeTimer, buildMode, buildings, obstacles, 
        mobs, playerFlesh, transitionAlpha, 
        CELL_SIZE, GRID_SIZE, centerX, centerY, 
        WORLD_WIDTH, WORLD_HEIGHT, isPlayerFacing 
    } = state;

    ctx.save();
    
    if (shakeTimer > 0) ctx.translate((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
    
    // 1. Фон
    const bgColors = getBiomeColors(); 
    ctx.fillStyle = `rgb(${bgColors[0]}, ${bgColors[1]}, ${bgColors[2]})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Камера
    ctx.translate(-camera.x, -camera.y);

    // 2. Декорации
    drawSpawns(ctx);        
    drawDecorations(ctx);   
    drawGroundEffects(ctx); 

    // 3. Сетка базы
    if (buildMode) {
        ctx.save();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 1;
        const startX = Math.floor(camera.x / CELL_SIZE) * CELL_SIZE;
        const startY = Math.floor(camera.y / CELL_SIZE) * CELL_SIZE;
        for (let x = startX; x < startX + canvas.width + CELL_SIZE; x += CELL_SIZE) {
            ctx.beginPath(); ctx.moveTo(x, camera.y); ctx.lineTo(x, camera.y + canvas.height); ctx.stroke();
        }
        for (let y = startY; y < startY + canvas.height + CELL_SIZE; y += CELL_SIZE) {
            ctx.beginPath(); ctx.moveTo(camera.x, y); ctx.lineTo(camera.x + canvas.width, y); ctx.stroke();
        }
        if (currentZoneIndex === 0) {
            ctx.strokeStyle = "rgba(0, 255, 255, 0.2)";
            ctx.lineWidth = 2;
            ctx.strokeRect(centerX - GRID_SIZE*CELL_SIZE/2, centerY - GRID_SIZE*CELL_SIZE/2, GRID_SIZE*CELL_SIZE, GRID_SIZE*CELL_SIZE);
        }
        ctx.restore();
    }

    // 4. АЛТАРЬ (Только в лесу)
    if (currentZoneIndex === 0) {
        ctx.save();
        ctx.translate(altar.x, altar.y);
        const pulse = Math.sin(Date.now() / 500) * 5;
        ctx.shadowBlur = 20 + pulse; ctx.shadowColor = "purple";
        ctx.fillStyle = "#222"; ctx.beginPath(); ctx.arc(0, 0, altar.radius, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#ff00ff"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-15, -15); ctx.lineTo(15, 15); ctx.moveTo(15, -15); ctx.lineTo(-15, 15); ctx.stroke();
        ctx.restore();
    }

    // 5. Постройки, Враги, Игрок
    buildings.forEach(b => b.draw(ctx));
    drawEnemies(ctx);
    player.draw(ctx, state.mouseX + camera.x, state.mouseY + camera.y, playerFlesh.length);

    // 6. ПРЕПЯТСТВИЯ (УНИКАЛЬНЫЕ БИОМЫ)
    obstacles.forEach(obs => {
        ctx.save();
        ctx.translate(obs.x, obs.y);
        
        // Тень
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.beginPath();
        ctx.ellipse(5, 5, obs.radius, obs.radius * 0.6, 0, 0, Math.PI*2);
        ctx.fill();

        // Форма
        if (obs.variant === 'pine') {
            // ЕЛЬ (Мерзлота)
            ctx.fillStyle = "#1a2a3a"; 
            ctx.beginPath();
            ctx.moveTo(0, -obs.radius * 1.5); // Верхушка
            ctx.lineTo(obs.radius, obs.radius);
            ctx.lineTo(-obs.radius, obs.radius);
            ctx.fill();
            // Снег на верхушке
            ctx.fillStyle = "#d0e0f0";
            ctx.beginPath();
            ctx.moveTo(0, -obs.radius * 1.5);
            ctx.lineTo(obs.radius * 0.5, -obs.radius * 0.2);
            ctx.lineTo(-obs.radius * 0.5, -obs.radius * 0.2);
            ctx.fill();

        } else if (obs.variant === 'stump') {
            // ПЕНЬ (Болото)
            ctx.fillStyle = "#2a2a1a";
            ctx.beginPath();
            ctx.arc(0, 0, obs.radius, 0, Math.PI * 2);
            ctx.fill();
            // Кольца
            ctx.strokeStyle = "#1a1a0a";
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, 0, obs.radius * 0.6, 0, Math.PI * 2); ctx.stroke();

        } else if (obs.variant === 'rock') {
            // КАМЕНЬ (Пустошь)
            ctx.fillStyle = "#333";
            ctx.beginPath();
            if (obs.poly) {
                ctx.moveTo(obs.poly[0].x, obs.poly[0].y);
                for(let i=1; i<obs.poly.length; i++) ctx.lineTo(obs.poly[i].x, obs.poly[i].y);
            } else {
                ctx.rect(-obs.radius, -obs.radius, obs.radius*2, obs.radius*2);
            }
            ctx.fill();
            // Трещины
            ctx.strokeStyle = "#111";
            ctx.lineWidth = 1;
            ctx.stroke();

        } else if (obs.variant === 'crystal') {
            // КРИСТАЛЛ (Пустота)
            ctx.fillStyle = `hsl(${Date.now()/20 % 360}, 50%, 20%)`; // Пульсирующий цвет
            ctx.shadowBlur = 10; ctx.shadowColor = "purple";
            ctx.beginPath();
            if (obs.poly) {
                ctx.moveTo(obs.poly[0].x, obs.poly[0].y);
                for(let i=1; i<obs.poly.length; i++) ctx.lineTo(obs.poly[i].x, obs.poly[i].y);
            }
            ctx.fill();
            ctx.strokeStyle = "#ff00ff";
            ctx.stroke();
            ctx.shadowBlur = 0;

        } else {
            // ОБЫЧНОЕ ДЕРЕВО (Лес)
            ctx.fillStyle = "#1a1212"; // Ствол
            ctx.beginPath(); ctx.arc(0, 0, obs.radius, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#112211"; // Листва
            ctx.beginPath(); ctx.arc(0, 0, obs.radius * 0.7, 0, Math.PI * 2); ctx.fill();
        }

        ctx.restore();
    });

    drawCombatEffects(ctx);

    // 7. Призрак стройки
    if (buildMode) {
        const mx = state.mouseX + camera.x;
        const my = state.mouseY + camera.y;
        const gridX = Math.floor(mx / CELL_SIZE) * CELL_SIZE;
        const gridY = Math.floor(my / CELL_SIZE) * CELL_SIZE;
        
        ctx.save();
        const occupied = buildings.some(b => b.x === gridX && b.y === gridY);
        let onAltar = false;
        if (currentZoneIndex === 0) {
            const altarDist = Math.hypot(gridX + 25 - altar.x, gridY + 25 - altar.y);
            onAltar = altarDist < altar.radius + 30;
        }
        let hitTree = false;
        obstacles.forEach(tree => { if (Math.hypot((gridX+25) - tree.x, (gridY+25) - tree.y) < tree.radius + 20) hitTree = true; });
        
        const isValid = !occupied && !onAltar && !hitTree;
        ctx.fillStyle = isValid ? "rgba(0, 255, 0, 0.6)" : "rgba(255, 0, 0, 0.6)"; 
        ctx.fillRect(gridX, gridY, CELL_SIZE, CELL_SIZE); 
        ctx.strokeStyle = "white"; ctx.lineWidth = 2; 
        ctx.strokeRect(gridX, gridY, CELL_SIZE, CELL_SIZE);
        
        if (buildMode.type === 'tower') {
            ctx.beginPath(); ctx.arc(gridX+25, gridY+25, 300, 0, Math.PI*2);
            ctx.fillStyle = "rgba(0, 0, 255, 0.1)"; ctx.fill(); ctx.strokeStyle = "rgba(0, 0, 255, 0.3)"; ctx.stroke();
        }
        ctx.restore();
    }

    ctx.restore(); 
    
    // UI Слой
    drawLighting(ctx, dayTime, player, altar, camera, canvas.width, canvas.height);
    
    if (transitionAlpha > 0) {
        ctx.fillStyle = `rgba(0, 0, 0, ${transitionAlpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (transitionAlpha > 0.5) {
            ctx.fillStyle = "white"; ctx.font = "30px Courier New"; ctx.textAlign = "center";
            ctx.fillText("ЗАГРУЗКА БИОМА...", canvas.width/2, canvas.height/2);
        }
    }

    drawMinimap(ctx, player, altar, mobs, buildings, WORLD_WIDTH, WORLD_HEIGHT, canvas.width, canvas.height);
    drawMutationsMenu(ctx, canvas.width, canvas.height, altarScore);
}