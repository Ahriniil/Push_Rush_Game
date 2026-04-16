import { buildings, setBuildings } from './buildings.js'; 
import { playerFlesh, setPlayerFlesh } from './combatManager.js';
import { initWorld } from './world.js';

// ПАРАМЕТРЫ КАРТЫ
const MAP_COLS = 10; 
const MAP_ROWS = 5; 

export let globalWorld = []; 
export let currentZoneIndex = 0; 

// --- ГЕНЕРАЦИЯ КАРТЫ ---
export function generateGlobalMap() {
    globalWorld = [];
    
    for (let y = 0; y < MAP_ROWS; y++) {
        for (let x = 0; x < MAP_COLS; x++) {
            const id = y * MAP_COLS + x;
            
            // 0,0 - это СТАРТ (Лес)
            if (x === 0 && y === 0) {
                globalWorld.push({
                    id: id, x: x, y: y,
                    type: 'forest', difficulty: 1, name: "ТЕМНЫЙ ЛЕС",
                    unlocked: true, visited: true, savedData: null
                });
                continue;
            }

            // Океан (30% шанс)
            if (Math.random() < 0.3) {
                globalWorld.push({
                    id: id, x: x, y: y,
                    type: 'ocean', difficulty: 0, name: "МЕРТВОЕ МОРЕ",
                    unlocked: false, visited: false
                });
                continue;
            }

            // Расчет сложности
            const dist = Math.sqrt(x*x + y*y);
            let difficulty = Math.min(5, Math.floor(dist / 2.5) + 1);
            if (difficulty < 1) difficulty = 1;

            // Привязка биома
            let type = 'forest';
            let name = "ЛЕС";
            if (difficulty === 2) { type = 'swamp'; name = "ГНИЛЫЕ ТОПИ"; }
            if (difficulty === 3) { type = 'waste'; name = "ПУСТОШИ"; }
            if (difficulty === 4) { type = 'frost'; name = "МЕРЗЛОТА"; }
            if (difficulty === 5) { type = 'void'; name = "ПУСТОТА"; }

            globalWorld.push({
                id: id, x: x, y: y,
                type: type, difficulty: difficulty, name: name,
                unlocked: false, visited: false, savedData: null
            });
        }
    }
    currentZoneIndex = 0;
    unlockNeighbors(0);
}

function unlockNeighbors(centerIndex) {
    const cx = centerIndex % MAP_COLS;
    const cy = Math.floor(centerIndex / MAP_COLS);
    const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];

    dirs.forEach(([dx, dy]) => {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx >= 0 && nx < MAP_COLS && ny >= 0 && ny < MAP_ROWS) {
            const nIndex = ny * MAP_COLS + nx;
            const zone = globalWorld[nIndex];
            if (zone.type !== 'ocean') {
                zone.unlocked = true;
            } else {
                zone.unlocked = true; 
            }
        }
    });
}

export function getCurrentLocation() {
    return globalWorld[currentZoneIndex] || globalWorld[0];
}

export function saveCurrentLocationData() {
    if (currentZoneIndex === -1) return;
    const zone = globalWorld[currentZoneIndex];
    if (zone.type === 'ocean') return;

    zone.savedData = {
        buildings: JSON.parse(JSON.stringify(buildings)), 
        flesh: [...playerFlesh] 
    };
    zone.visited = true;
}

export function loadLocation(index) {
    if (!globalWorld || globalWorld.length === 0) generateGlobalMap();
    if (index === undefined || index === null || index < 0 || index >= globalWorld.length) return globalWorld[0];

    const zone = globalWorld[index];
    if (!zone) return globalWorld[0];

    if (zone.type === 'ocean') {
        console.log("Океан недоступен");
        return null; 
    }

    currentZoneIndex = index;
    zone.unlocked = true;
    zone.visited = true;

    unlockNeighbors(index);

    if (zone.savedData) {
        setBuildings(zone.savedData.buildings);
        setPlayerFlesh(zone.savedData.flesh);
    } else {
        setBuildings([]); 
        setPlayerFlesh([]); 
    }
    
    return zone;
}

// --- СОХРАНЕНИЯ (ИСПРАВЛЕНО) ---
export function saveGameToBrowser(player, altarScore) {
    saveCurrentLocationData();
    
    const saveData = {
        globalWorld: globalWorld,
        currentZoneIndex: currentZoneIndex,
        altarScore: altarScore,
        playerData: {
            damage: player.damage, 
            maxHp: player.maxHp, 
            hp: player.hp,
            speed: player.baseSpeed, 
            
            // СОХРАНЯЕМ НОВЫЕ РЕСУРСЫ И СТАТЫ
            fleshCubes: player.fleshCubes,
            resonators: player.resonators, // <--- Важно
            
            regen: player.regen,
            vampirism: player.vampirism,
            critChance: player.critChance,
            lootChance: player.lootChance,
            maxStamina: player.maxStamina,
            
            damageMultiplier: player.damageMultiplier // Сохраним мутации на защиту
        }
    };
    localStorage.setItem('darkForestSave_v3', JSON.stringify(saveData));
    console.log("ИГРА СОХРАНЕНА");
}

export function loadGameFromBrowser(player) {
    const str = localStorage.getItem('darkForestSave_v3');
    if (!str) return false;
    try {
        const data = JSON.parse(str);
        globalWorld = data.globalWorld;
        currentZoneIndex = data.currentZoneIndex;
        
        // ВОССТАНАВЛИВАЕМ СТАТЫ
        player.damage = data.playerData.damage;
        player.maxHp = data.playerData.maxHp;
        player.hp = data.playerData.hp;
        player.baseSpeed = data.playerData.speed;
        player.speed = player.baseSpeed;
        
        player.fleshCubes = data.playerData.fleshCubes || 0; 
        player.resonators = data.playerData.resonators || 0; // <--- Важно
        
        player.regen = data.playerData.regen || 0;
        player.vampirism = data.playerData.vampirism || 0;
        player.critChance = data.playerData.critChance || 0;
        player.lootChance = data.playerData.lootChance || 0;
        player.maxStamina = data.playerData.maxStamina || 100;
        
        if (data.playerData.damageMultiplier && data.playerData.damageMultiplier < 1) {
             player.damageMultiplier = data.playerData.damageMultiplier;
        }

        return { altarScore: data.altarScore, loaded: true };
    } catch(e) { 
        console.error("Ошибка загрузки:", e);
        return false; 
    }
}

export function hasSaveGame() { return localStorage.getItem('darkForestSave_v3') !== null; }
export function clearSave() { localStorage.removeItem('darkForestSave_v3'); generateGlobalMap(); }