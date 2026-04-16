import { Player } from './entities.js';
import { initInput, keys, mouse } from './input.js';
import { initWorld, obstacles, checkObstacleCollision, WORLD_WIDTH, WORLD_HEIGHT, currentBiome } from './world.js';
import { Building, buildings, checkBuildingCollision, CELL_SIZE, GRID_SIZE } from './buildings.js';
import { updateHUD, showMessage, setMenuVisible, initUIButtons, uiElements, unlockPortalButton, openWorldMap } from './ui.js';
import { initLighting } from './lighting.js';
import { initAudio, playSound as playAudio } from './audio.js';
import { mobs, updateEnemies, handleSpawning, isBossDead, setDifficulty } from './enemyManager.js';
import { updateCombat, playerFlesh, clearPlayerFlesh, spawnBlood, playerShoot, lootItems, puddles, bloodStains, castBloodNova, playerProjectiles, enemyProjectiles, showDamage } from './combatManager.js';
import { generateGlobalMap, loadLocation, saveCurrentLocationData, saveGameToBrowser, loadGameFromBrowser, hasSaveGame, clearSave, getCurrentLocation } from './worldMap.js';
import { initMutations, toggleMutationsMenu, handleMutationsClick, isMutationsMenuOpen } from './mutations.js';
import { drawGame } from './renderer.js';
import { isPlayerFacing, checkAltarCollision, donateFleshToAltar, handleBuildClick, getActiveAltar, tryInteractWithPresser } from './interactions.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

initInput(canvas);
initLighting(canvas.width, canvas.height);
initMutations(); 

const centerX = WORLD_WIDTH / 2;
const centerY = WORLD_HEIGHT / 2;
const player = new Player(centerX, centerY + 100); 

const baseAltar = { x: centerX, y: centerY, radius: 45 }; 
let camera = { x: 0, y: 0 };

let altarScore = 200; 
let isGameOver = false;
let isVictory = false;
let portalUnlocked = false; 
let isMenuOpen = false;   
let isGamePaused = true; 
let buildMode = null;     
let shakeTimer = 0;
let dayTime = 0; 
const dayDuration = 60; 

let harvestTimer = 0;
let lastTime = 0;
let transitionAlpha = 0;
let isTransitioning = false;
let gameRunning = false; 

export function playSound(type) { playAudio(type); }
export { showMessage };

const menuScreen = document.getElementById('mainMenuScreen');
const btnNewGame = document.getElementById('btnNewGame');
const btnContinue = document.getElementById('btnContinue');

if (hasSaveGame()) { btnContinue.style.display = 'block'; }

btnNewGame.onclick = () => { 
    clearSave(); 
    generateGlobalMap(); 
    const startZone = loadLocation(0);
    initWorld(startZone.type);
    setDifficulty(startZone.difficulty);
    startGame(); 
};

btnContinue.onclick = () => {
    const result = loadGameFromBrowser(player);
    if (result && result.loaded) {
        altarScore = result.altarScore; 
        const zoneData = loadLocation(result.currentZoneIndex || 0);
        initWorld(zoneData.type);
        setDifficulty(zoneData.difficulty);
        startGame(); 
        showMessage("ИГРА ЗАГРУЖЕНА", "cyan");
    } else { 
        generateGlobalMap(); 
        const startZone = loadLocation(0);
        initWorld(startZone.type);
        setDifficulty(startZone.difficulty);
        startGame(); 
    }
};

function startGame() {
    menuScreen.style.display = 'none';
    isGamePaused = false;
    gameRunning = true;
    initAudio();
    
    // Начальное мясо (для теста)
    for(let i = 0; i < 100; i++) {
        playerFlesh.push({ x: 0, y: 0, freshness: 100, radius: 5 });
    }
    
    lastTime = performance.now(); 
    requestAnimationFrame(loop);
}

function toggleUpgradeMenu() {
    isMenuOpen = !isMenuOpen; 
    isGamePaused = isMenuOpen; 
    if(isMenuOpen) buildMode = null; 
    setMenuVisible(isMenuOpen);
}

function cancelBuild() { 
    buildMode = null; 
    isGamePaused = false; 
    showMessage("СТРОЙКА ЗАВЕРШЕНА"); 
}

function shakeScreen(amount) { shakeTimer = amount; }

function travelToZone(targetIndex) {
    saveCurrentLocationData();
    const zoneData = loadLocation(targetIndex);
    if (!zoneData) { showMessage("ТУДА НЕЛЬЗЯ ПОПАСТЬ", "red"); return; }
    isTransitioning = true;
    showMessage(`ПУТЕШЕСТВИЕ В: ${zoneData.name}`, "cyan");
    playSound('boss_spawn'); 
    setTimeout(() => {
        mobs.length = 0; lootItems.length = 0; puddles.length = 0; 
        bloodStains.length = 0; playerProjectiles.length = 0; enemyProjectiles.length = 0;
        initWorld(zoneData.type);
        setDifficulty(zoneData.difficulty);
        player.x = centerX; player.y = centerY + 100;
        dayTime = 0; portalUnlocked = false; 
        isGamePaused = false;
        saveGameToBrowser(player, altarScore);
        isTransitioning = false;
        if (zoneData.id !== 0) { showMessage("ПОСТРОЙ РЕЗОНАТОР! (Кнопка 3)", "purple"); }
    }, 1000);
}

initUIButtons({
    onOpenMutations: () => {
        setMenuVisible(false); 
        isMenuOpen = false;    
        isGamePaused = toggleMutationsMenu(true); 
    },
    onBuild: (type, cost) => {
        if (type === 'presser') {
            const fleshCost = 50; 
            if (altarScore >= cost && playerFlesh.length >= fleshCost) {
                buildMode = { type: 'presser', cost: cost, fleshCost: fleshCost };
                toggleUpgradeMenu(); isGamePaused = false;
                showMessage("СТРОЙКА: ПРЕСОВАТЕЛЬ (ЛКМ)");
            } else {
                showMessage(`НУЖНО: ${cost} Эссенции и ${fleshCost} Плоти`, "red");
            }
            return;
        }
        
        if (type === 'resonator') {
             if (player.resonators >= 5) {
                 showMessage("МАКСИМУМ 5 РЕЗОНАТОРОВ", "orange");
                 return;
             }
             if (altarScore >= cost && playerFlesh.length >= 20 && player.fleshCubes >= 5) {
                 altarScore -= cost;
                 playerFlesh.splice(0, 20);
                 player.fleshCubes -= 5;
                 player.resonators++;
                 playSound('build');
                 showMessage(`РЕЗОНАТОР СОЗДАН! (${player.resonators}/5)`, "cyan");
             } else {
                 showMessage(`НУЖНО: 500 Эсс + 20 Плоти + 5 Кубов`, "red");
             }
             return;
        }
        
        if (altarScore >= cost) {
            buildMode = { type: type, cost: cost };
            toggleUpgradeMenu(); isGamePaused = false; 
            showMessage("СТРОЙКА: ЛКМ - Поставить | ПКМ - Выход");
        } else { showMessage("НЕ ХВАТАЕТ РЕСУРСОВ", "red"); }
    }
});

// --- ГЛАВНЫЙ ОБРАБОТЧИК КЛАВИШ ---
window.addEventListener('keydown', e => {
    if (!gameRunning) return;

    const isInteractKey = (e.key === 'e' || e.key === 'E' || e.key === 'у');

    // 1. Если открыты МУТАЦИИ -> Закрываем их на E или Esc
    if (isMutationsMenuOpen) {
        if (isInteractKey || e.key === 'Escape') {
            isMenuOpen = false;
            setMenuVisible(false);
            isGamePaused = toggleMutationsMenu(false); // Принудительно закрываем
        }
        return; // Блокируем остальное
    }

    // 2. Если открыто МЕНЮ СТРОЙКИ (HTML) -> Закрываем его на E или Esc
    if (isMenuOpen) {
        if (isInteractKey || e.key === 'Escape') {
            toggleUpgradeMenu();
        }
        return; // Блокируем остальное
    }

    // 3. Если активен РЕЖИМ СТРОЙКИ (Призрак) -> Отменяем на E или Esc
    if (buildMode) {
        if (isInteractKey || e.key === 'Escape') {
            cancelBuild();
        }
        // Не делаем return, чтобы работали кнопки движения, но блокируем взаимодействие ниже
    }

    // [3] - Выбрать РЕЗОНАТОР (если есть)
    if (e.key === '3' && !buildMode) {
        if (player.resonators > 0) {
            buildMode = { type: 'resonator', cost: 0 };
            showMessage("РЕЖИМ: УСТАНОВКА РЕЗОНАТОРА", "purple");
        } else {
            showMessage("НЕТ РЕЗОНАТОРОВ (Скрафти в меню E)", "red");
        }
    }

    // [Q] - СПОСОБНОСТЬ
    if (e.key === 'q' || e.key === 'Q' || e.key === 'й') {
        const activeAltar = getActiveAltar(baseAltar);
        if (activeAltar && Math.hypot(player.x - activeAltar.x, player.y - activeAltar.y) < activeAltar.radius + 80) {
            altarScore = donateFleshToAltar(player, activeAltar, altarScore);
        } else {
            if (player.hp > 15) { 
                player.hp -= 10; player.skillTimer = player.skillCooldown; castBloodNova(player); 
            } else { showMessage("СЛИШКОМ МАЛО КРОВИ", "red"); }
        }
    }

    // [E] - ВЗАИМОДЕЙСТВИЕ (Только если не строим и меню закрыты)
    if (isInteractKey && !isGameOver && !isVictory && !buildMode) {
        let actionDone = false;
        
        // Пресователь
        const presserAction = tryInteractWithPresser(player, altarScore);
        if (presserAction.action === 'CRAFT') {
            altarScore -= presserAction.cost; playSound('build'); showMessage("КРАФТ ЗАПУЩЕН (1 ДЕНЬ)", "gold"); actionDone = true;
        } else if (presserAction.action === 'MSG') {
            showMessage(presserAction.text, presserAction.color); actionDone = true;
        }

        // База (Меню)
        if (!actionDone) {
            const activeAltar = getActiveAltar(baseAltar);
            if (activeAltar && Math.hypot(player.x - activeAltar.x, player.y - activeAltar.y) < activeAltar.radius + 80) {
                if (isPlayerFacing(player, mouse, camera, activeAltar.x, activeAltar.y)) {
                    toggleUpgradeMenu(); 
                    Object.keys(keys).forEach(key => keys[key] = false); 
                    actionDone = true;
                } else { showMessage("ПОВЕРНИСЬ К БАЗЕ", "yellow"); actionDone = true; }
            }
        }

        // Портал
        if (!actionDone) {
            buildings.forEach(b => {
                if (b.type === 'portal') {
                    const cx = b.x + 25; const cy = b.y + 25;
                    if (Math.hypot(player.x - cx, player.y - cy) < 80) {
                        if (isPlayerFacing(player, mouse, camera, cx, cy)) {
                            openWorldMap(travelToZone); actionDone = true;
                        } else { showMessage("СМОТРИ НА ПОРТАЛ", "cyan"); actionDone = true; }
                    }
                }
            });
        }
    }

    if (e.key === 'Escape') {
        document.getElementById('worldMapScreen').style.display = 'none';
    }
});

canvas.addEventListener('mousedown', (e) => {
    if (!gameRunning) return;
    initAudio(); 
    
    if (isMutationsMenuOpen) {
        const result = handleMutationsClick(e.clientX, e.clientY, player, altarScore, (newScore) => altarScore = newScore);
        if (result === 'BACK') { 
            isGamePaused = toggleMutationsMenu(false); 
            toggleUpgradeMenu(); 
        } 
        else if (result === true) { saveGameToBrowser(player, altarScore); }
        return; 
    }

    if (isMenuOpen || isGameOver || isVictory) return;
    if (e.button === 2) { if (buildMode) cancelBuild(); return; }
    
    if (buildMode) { 
        altarScore = handleBuildClick(mouse, camera, centerX, centerY, baseAltar, buildMode, altarScore, player, cancelBuild);
        return; 
    }
    
    if (!isGamePaused) {
        if (player.weapon === 'melee' && player.attackTimer <= 0) {
            player.attacking = true; player.attackTimer = 0.35; playSound('build'); 
            let hitSomething = false;
            mobs.forEach((mob) => {
                const dist = Math.hypot(mob.x - player.x, mob.y - player.y);
                if (dist < 90) {
                    const angleToMob = Math.atan2(mob.y - player.y, mob.x - player.x);
                    const angleMouse = Math.atan2(mouse.y + camera.y - player.y, mouse.x + camera.x - player.x);
                    let diff = angleToMob - angleMouse;
                    while (diff > Math.PI) diff -= Math.PI*2; while (diff < -Math.PI) diff += Math.PI*2;
                    if (Math.abs(diff) < 1.2) {
                        
                        let dmg = player.damage * (player.damageMultiplier || 1);
                        let isCrit = false;

                        if (player.critChance > 0 && Math.random() < player.critChance) {
                            dmg *= 2; isCrit = true;
                        }
                        if (player.vampirism > 0 && player.hp < player.maxHp) {
                            const heal = dmg * player.vampirism;
                            player.hp = Math.min(player.maxHp, player.hp + heal);
                        }

                        mob.takeDamage(dmg, player); 
                        spawnBlood(mob.x, mob.y, 4, '#ff0000');
                        shakeScreen(0.1); hitSomething = true; playSound('hit');
                        showDamage(mob.x, mob.y, Math.floor(dmg), isCrit ? "gold" : "white");
                    }
                }
            });
            if(!hitSomething) shakeScreen(0.05);
        }
        else if (player.weapon === 'range' && player.shootTimer <= 0) {
            if (player.stamina >= 10) {
                playerShoot(player, mouse.x + camera.x, mouse.y + camera.y);
                player.stamina -= 10; player.shootTimer = 0.4; shakeScreen(0.1);
            } else { showMessage("НЕТ СТАМИНЫ!", "orange"); }
        }
    }
});
canvas.addEventListener('contextmenu', e => e.preventDefault());

function update(deltaTime) {
    if (player.damageMultiplier > 1) { 
        player.rageTimer -= deltaTime; 
        if (player.rageTimer <= 0) { player.damageMultiplier = 1; showMessage("ЯРОСТЬ ЗАКОНЧИЛАСЬ", "white"); } 
    }
    
    if (isTransitioning) { if (transitionAlpha < 1) transitionAlpha += deltaTime * 2; } 
    else { if (transitionAlpha > 0) transitionAlpha -= deltaTime * 2; }

    player.update(deltaTime, keys, mobs);
    checkObstacleCollision(player); 
    checkBuildingCollision(player); 
    checkAltarCollision(player, baseAltar); 

    if (currentBiome === 'waste') {
        const activeAltar = getActiveAltar(baseAltar);
        let safe = false;
        if (activeAltar) {
            const dist = Math.hypot(player.x - activeAltar.x, player.y - activeAltar.y);
            if (dist < 600) safe = true; 
        }
        if (!safe) {
            if (Math.random() < deltaTime) { 
                player.hp -= 1;
                spawnBlood(player.x, player.y, 1, "#ff5500");
                showMessage("РАДИАЦИЯ! НУЖЕН РЕЗОНАТОР!", "red");
            }
        }
    }

    let targetCamX = player.x - canvas.width / 2; 
    let targetCamY = player.y - canvas.height / 2;
    const mouseOffsetX = (mouse.x - canvas.width / 2) * 0.3; 
    const mouseOffsetY = (mouse.y - canvas.height / 2) * 0.3;
    targetCamX += mouseOffsetX; targetCamY += mouseOffsetY;
    targetCamX = Math.max(0, Math.min(targetCamX, WORLD_WIDTH - canvas.width));
    targetCamY = Math.max(0, Math.min(targetCamY, WORLD_HEIGHT - canvas.height));
    camera.x += (targetCamX - camera.x) * 4 * deltaTime; 
    camera.y += (targetCamY - camera.y) * 4 * deltaTime;

    buildings.forEach((b, index) => { 
        b.update(deltaTime, mobs, player, dayDuration); 
        if (b.hp <= 0) buildings.splice(index, 1); 
    });

    dayTime += deltaTime / dayDuration; 
    if (dayTime > 1) dayTime = 0;

    if (dayTime > 0.75) { 
        harvestTimer += deltaTime;
        if (harvestTimer >= 5.0) {
            harvestTimer = 0; 
            const baseChance = 0.05; 
            mobs.forEach(mob => {
                const chance = baseChance * (1.0 - mob.harvestResistance);
                if (Math.random() < chance) { 
                    mob.isRusher = true; mob.state = 'chase'; mob.currentTarget = null; 
                    spawnBlood(mob.x, mob.y, 3, "#aa00aa"); 
                }
            });
        }
    }

    handleSpawning(deltaTime, dayTime, altarScore, player);
    const currentAltarTarget = getActiveAltar(baseAltar) || { x: -9999, y: -9999 };
    updateEnemies(deltaTime, player, currentAltarTarget);
    updateCombat(deltaTime, player, shakeScreen);

    if (player.hp <= 0) { isGameOver = true; uiElements.gameOver.style.display = "flex"; clearSave(); }
    
    if (isBossDead() && !portalUnlocked) { 
        portalUnlocked = true; showMessage("БОСС ПОВЕРЖЕН! ПОРТАЛ ОТКРЫТ.", "gold"); 
        unlockPortalButton(); saveCurrentLocationData(); 
    }
    
    if (shakeTimer > 0) shakeTimer -= deltaTime;
}

function loop(timestamp) {
    if (!gameRunning) return;
    let deltaTime = (timestamp - lastTime) / 1000;
    if (deltaTime > 0.1) deltaTime = 0.1;
    lastTime = timestamp;
    if (!isGamePaused && !isGameOver && !isVictory) update(deltaTime);
    updateHUD(player, altarScore, playerFlesh, dayTime);
    
    const state = {
        player, altar: baseAltar, camera, altarScore, dayTime, shakeTimer, buildMode,
        buildings, obstacles, mobs, playerFlesh, transitionAlpha,
        CELL_SIZE, GRID_SIZE, centerX, centerY, WORLD_WIDTH, WORLD_HEIGHT,
        mouseX: mouse.x, mouseY: mouse.y, 
        isPlayerFacing: (tx, ty) => isPlayerFacing(player, mouse, camera, tx, ty)
    };
    drawGame(ctx, canvas, state);
    requestAnimationFrame(loop);
}