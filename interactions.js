import { buildings, Building, CELL_SIZE, GRID_SIZE } from './buildings.js';
import { obstacles, spawnPoints } from './world.js'; 
import { playerFlesh, clearPlayerFlesh, spawnBlood } from './combatManager.js';
import { playSound } from './audio.js'; 
import { showMessage } from './ui.js';
import { saveGameToBrowser, getCurrentLocation } from './worldMap.js';

export function getActiveAltar(baseAltar) {
    const loc = getCurrentLocation();
    if (loc.id === 0) return baseAltar;
    const resonator = buildings.find(b => b.type === 'resonator');
    if (resonator) {
        return { x: resonator.x + CELL_SIZE/2, y: resonator.y + CELL_SIZE/2, radius: 45 }; 
    }
    return null; 
}

export function isPlayerFacing(player, mouse, camera, targetX, targetY) {
    const angleToTarget = Math.atan2(targetY - player.y, targetX - player.x);
    const angleMouse = Math.atan2(mouse.y + camera.y - player.y, mouse.x + camera.x - player.x);
    let angleDiff = angleToTarget - angleMouse;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    return Math.abs(angleDiff) < 0.8;
}

export function checkAltarCollision(entity, baseAltar) {
    const loc = getCurrentLocation();
    if (loc.id !== 0) return; 
    const dist = Math.hypot(entity.x - baseAltar.x, entity.y - baseAltar.y);
    const minDist = entity.radius + baseAltar.radius;
    if (dist < minDist) {
        const angle = Math.atan2(entity.y - baseAltar.y, entity.x - baseAltar.x);
        const push = minDist - dist;
        entity.x += Math.cos(angle) * push;
        entity.y += Math.sin(angle) * push;
    }
}

export function donateFleshToAltar(player, altarObj, currentScore) {
    if (!altarObj) {
        showMessage("НЕТ СВЯЗИ С АЛТАРЕМ!", "gray");
        return currentScore;
    }
    if (playerFlesh.length === 0) {
        showMessage("НЕТ МЯСА ДЛЯ ПОЖЕРТВОВАНИЯ", "orange");
        return currentScore;
    }
    let gain = 0;
    playerFlesh.forEach(f => { gain += (f.freshness > 50) ? 10 : (f.freshness > 0 ? 2 : -5); });
    const newScore = currentScore + gain;
    playSound('build'); 
    spawnBlood(altarObj.x, altarObj.y, 15, "#ff00ff"); 
    clearPlayerFlesh();
    showMessage(`ПОЖЕРТВОВАНО: +${gain} ЭССЕНЦИИ`, "#ff00ff");
    saveGameToBrowser(player, newScore);
    return newScore;
}

export function tryInteractWithPresser(player, currentScore) {
    const presser = buildings.find(b => 
        b.type === 'presser' && 
        Math.hypot(player.x - (b.x + 25), player.y - (b.y + 25)) < 100
    );

    if (!presser) return { action: 'NONE' };

    if (presser.isCrafting) {
        return { action: 'MSG', text: "ПРЕСС ЗАНЯТ...", color: "orange" };
    }

    if (playerFlesh.length >= 50 && currentScore >= 50) {
        if (presser.startCrafting()) {
                playerFlesh.splice(0, 50); 
                return { action: 'CRAFT', cost: 50 };
        }
    } else {
        return { action: 'MSG', text: "НУЖНО 50 ПЛОТИ И 50 ЭССЕНЦИИ", color: "red" };
    }
    return { action: 'NONE' };
}

// --- ЛОГИКА СТРОЙКИ ---
export function handleBuildClick(mouse, camera, centerX, centerY, baseAltar, buildMode, currentScore, player, cancelBuildCallback) {
    const worldX = mouse.x + camera.x; const worldY = mouse.y + camera.y;
    const gridX = Math.floor(worldX / CELL_SIZE) * CELL_SIZE; const gridY = Math.floor(worldY / CELL_SIZE) * CELL_SIZE;
    
    const occupied = buildings.some(b => b.x === gridX && b.y === gridY);
    if (occupied) { showMessage("МЕСТО ЗАНЯТО", "red"); return currentScore; }

    const loc = getCurrentLocation();

    // === РЕЗОНАТОР (ИЗ ИНВЕНТАРЯ) ===
    if (buildMode.type === 'resonator') {
        if (loc.id === 0) { showMessage("ЗДЕСЬ УЖЕ ЕСТЬ АЛТАРЬ", "red"); return currentScore; }
        if (buildings.some(b => b.type === 'resonator')) { showMessage("РЕЗОНАТОР УЖЕ ПОСТРОЕН", "orange"); return currentScore; }
        
        let tooClose = false;
        spawnPoints.forEach(sp => { if (Math.hypot(gridX - sp.x, gridY - sp.y) < 8 * CELL_SIZE) tooClose = true; });
        if (tooClose) { showMessage("СЛИШКОМ БЛИЗКО К ГНЕЗДАМ!", "red"); return currentScore; }
    } 
    // === ОБЫЧНЫЕ ЗДАНИЯ ===
    else {
        const activeAltar = getActiveAltar(baseAltar);
        if (!activeAltar) { showMessage("НУЖЕН РЕЗОНАТОР!", "red"); return currentScore; }
        const maxDist = (GRID_SIZE * CELL_SIZE) / 2; 
        const dist = Math.hypot(gridX + 25 - activeAltar.x, gridY + 25 - activeAltar.y);
        if (dist > maxDist) { showMessage("ДАЛЕКО ОТ ЭНЕРГИИ", "orange"); return currentScore; }
    }

    let hitTree = false;
    obstacles.forEach(tree => { if (Math.hypot((gridX+25) - tree.x, (gridY+25) - tree.y) < tree.radius + 20) hitTree = true; });
    
    if (!hitTree) {
        // ОПЛАТА
        if (buildMode.type === 'resonator') {
             // Тратим ПРЕДМЕТ из инвентаря
             if (player.resonators > 0) {
                 player.resonators--;
             } else {
                 showMessage("НЕТ РЕЗОНАТОРОВ!", "red");
                 return currentScore;
             }
        } 
        else if (buildMode.type === 'presser') {
             if (playerFlesh.length < 50) { showMessage("НУЖНО 50 ПЛОТИ", "red"); return currentScore; }
             playerFlesh.splice(0, 50);
        }

        buildings.push(new Building(gridX, gridY, buildMode.type));
        
        // Резонатор бесплатный в момент установки (уже оплачен крафтом)
        let cost = buildMode.type === 'resonator' ? 0 : buildMode.cost;
        let newScore = currentScore - cost;

        spawnBlood(gridX + 25, gridY + 25, 8, "#cccccc"); 
        playSound('build');
        
        // Если это не массовая стройка (стены), закрываем режим
        if (buildMode.type === 'resonator' || buildMode.type === 'presser') {
            cancelBuildCallback();
        }
        
        if (newScore < buildMode.cost && buildMode.type !== 'resonator') cancelBuildCallback();
        return newScore;
    } else {
        showMessage("ЗДЕСЬ НЕЛЬЗЯ СТРОИТЬ", "red");
    }
    return currentScore;
}