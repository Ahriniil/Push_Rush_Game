import { showMessage } from './ui.js'; 
import { playSound } from './audio.js'; 
import { mouse } from './input.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let centerX, centerY;

export let isMutationsMenuOpen = false;
export let altarRank = 0; 
export let isSummonerUnlocked = false; 

let nodes = [];
let core = null;
let radius = 220;   

// --- НАСТРОЙКА 10 РАНГОВ ---
const TIERS = {
    // РАНГ 0: СТАРТ
    0: [
        { id: 'dmg1', name: "КОСТЯНОЙ МЕЧ", icon: "⚔️", cost: 200, effect: (p) => p.damage += 10 },
        { id: 'hp1', name: "ТОЛСТАЯ КОЖА", icon: "💖", cost: 200, effect: (p) => { p.maxHp += 50; p.hp += 50; } },
        { id: 'spd1', name: "СУХОЖИЛИЯ", icon: "👟", cost: 200, effect: (p) => p.baseSpeed += 20 },
        { id: 'presser_bp', name: "ЧЕРТЕЖ: ПРЕСС", icon: "📜", cost: 500, effect: (p) => { isSummonerUnlocked = true; } }
    ],
    // РАНГ 1: ВЫЖИВАНИЕ
    1: [
        { id: 'stm1', name: "ВТОРОЕ ДЫХАНИЕ", icon: "⚡", cost: 400, effect: (p) => p.maxStamina += 40 },
        { id: 'def1', name: "ХИТИН", icon: "🛡️", cost: 450, effect: (p) => p.damageMultiplier = (p.damageMultiplier || 1) * 0.9 }, 
        { id: 'reg1', name: "РЕГЕНЕРАЦИЯ I", icon: "🩸", cost: 600, effect: (p) => p.regen = (p.regen || 0) + 1 }
    ],
    // РАНГ 2: АГРЕССИЯ
    2: [
        { id: 'dmg2', name: "ЗАТОЧКА КОСТЕЙ", icon: "⚔️", cost: 800, effect: (p) => p.damage += 15 },
        { id: 'atk_spd1', name: "БЕШЕНСТВО", icon: "😤", cost: 900, effect: (p) => p.attackCooldownMult = 0.8 }, 
        { id: 'crit1', name: "ТОЧКА УЯЗВИМОСТИ", icon: "🎯", cost: 1000, effect: (p) => p.critChance = 0.1 }
    ],
    // РАНГ 3: УКРЕПЛЕНИЕ
    3: [
        { id: 'build_hp1', name: "АРХИТЕКТОР ПЛОТИ", icon: "🏗️", cost: 1200, effect: (p) => { /* Глобальный флаг на HP зданий */ } },
        { id: 'hp2', name: "СЕРДЦЕ ГИГАНТА", icon: "💖", cost: 1500, effect: (p) => { p.maxHp += 100; p.hp += 100; } },
        { id: 'dash_cd', name: "РЫВОК ХИЩНИКА", icon: "⏩", cost: 1300, effect: (p) => p.dashCooldownMax = 0.5 } 
    ],
    // РАНГ 4: МАСТЕРСТВО
    4: [
        { id: 'skill_cd1', name: "МИСТИЦИЗМ", icon: "🔮", cost: 2000, effect: (p) => p.skillCooldown -= 1.0 },
        { id: 'vamp1', name: "ЖАЖДА КРОВИ", icon: "🧛", cost: 2500, effect: (p) => p.vampirism = 0.05 }, 
        { id: 'luck1', name: "МАРОДЕР", icon: "🍀", cost: 2200, effect: (p) => p.lootChance = 0.2 } 
    ],
    // РАНГ 5: ЭЛИТА
    5: [
        { id: 'dmg3', name: "МАСТЕР КЛИНКА", icon: "⚔️", cost: 3000, effect: (p) => p.damage += 30 },
        { id: 'spd2', name: "СКОРОСТЬ ТЬМЫ", icon: "👟", cost: 3000, effect: (p) => p.baseSpeed += 40 },
        { id: 'def2', name: "КОСТЯНАЯ БРОНЯ", icon: "🛡️", cost: 3500, effect: (p) => p.damageMultiplier *= 0.8 }
    ],
    // РАНГ 6: КУЛЬТИСТ
    6: [
        { id: 'res_cost', name: "ЭКОНОМИЯ КРОВИ", icon: "🩸", cost: 4000, effect: (p) => { /* Скидка на резонатор */ } },
        { id: 'skill_cd2', name: "ЧЕРНАЯ МАГИЯ", icon: "🔮", cost: 4500, effect: (p) => p.skillCooldown -= 1.5 },
        { id: 'reg2', name: "РЕГЕНЕРАЦИЯ II", icon: "💖", cost: 5000, effect: (p) => p.regen += 2 }
    ],
    // РАНГ 7: МОНСТР
    7: [
        { id: 'hp3', name: "ЛЕВИАФАН", icon: "🐋", cost: 6000, effect: (p) => { p.maxHp += 200; p.hp += 200; } },
        { id: 'dmg4', name: "УБИЙЦА БОГОВ", icon: "☠️", cost: 7000, effect: (p) => p.damage += 50 },
        { id: 'crit2', name: "СМЕРТЕЛЬНЫЙ УДАР", icon: "🎯", cost: 7500, effect: (p) => p.critChance += 0.15 }
    ],
    // РАНГ 8: БЕССМЕРТНЫЙ
    8: [
        { id: 'vamp2', name: "ПОЖИРАТЕЛЬ", icon: "🧛", cost: 9000, effect: (p) => p.vampirism += 0.1 },
        { id: 'stm2', name: "ВЕЧНЫЙ ДВИГАТЕЛЬ", icon: "⚡", cost: 8500, effect: (p) => p.maxStamina += 100 },
        { id: 'def3', name: "АЛМАЗНАЯ КОЖА", icon: "🛡️", cost: 10000, effect: (p) => p.damageMultiplier *= 0.7 }
    ],
    // РАНГ 9: АСЦЕНДЕНТ (ФИНАЛ)
    9: [
        { id: 'god', name: "АВАТАРА КРОВИ", icon: "👹", cost: 20000, effect: (p) => { 
            p.damage *= 2; 
            p.maxHp *= 2; p.hp = p.maxHp;
            p.baseSpeed *= 1.5;
        }}
    ]
};

// --- ГЕНЕРАЦИЯ МЕНЮ ---

export function initMutations() {
    centerX = canvas.width / 2;
    centerY = canvas.height / 2;
    loadRank(0);
}

function loadRank(rank) {
    altarRank = rank;
    nodes = [];
    
    // Центральное ядро
    core = {
        x: centerX, y: centerY,
        r: 40,
        label: `РАНГ ${rank}`,
        isUnlocked: false,
        cost: 1000 * (rank + 1), 
        isCore: true
    };

    const tierData = TIERS[rank];
    if (!tierData) return; 

    const count = tierData.length;
    const angleStep = (Math.PI * 2) / count;

    tierData.forEach((mut, i) => {
        const angle = i * angleStep - Math.PI / 2;
        nodes.push({
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius,
            size: 60,
            data: mut,
            isUnlocked: false
        });
    });
}

// --- ОТРИСОВКА ---

export function drawMutationsMenu(ctx, w, h, currentScore) {
    if (!isMutationsMenuOpen) return;

    // Затемнение
    ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
    ctx.fillRect(0, 0, w, h);

    centerX = w / 2; centerY = h / 2;

    // Линии к ядру
    ctx.lineWidth = 4;
    nodes.forEach(node => {
        ctx.strokeStyle = node.isUnlocked ? "#00ff00" : "#550000";
        ctx.beginPath();
        ctx.moveTo(core.x, core.y);
        ctx.lineTo(node.x, node.y);
        ctx.stroke();
    });

    // Узлы (Мутации)
    nodes.forEach(node => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size/2, 0, Math.PI*2);
        ctx.fillStyle = node.isUnlocked ? "#004400" : "#220000";
        ctx.fill();
        ctx.strokeStyle = node.isUnlocked ? "#00ff00" : (currentScore >= node.data.cost ? "#ffff00" : "#550000");
        ctx.lineWidth = 3;
        ctx.stroke();

        // Иконка
        ctx.fillStyle = "white";
        ctx.font = "30px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(node.data.icon, node.x, node.y);

        // Текст под узлом
        ctx.fillStyle = node.isUnlocked ? "#0f0" : "#aaa";
        ctx.font = "14px Courier New";
        ctx.fillText(node.data.name, node.x, node.y + 50);
        
        if (!node.isUnlocked) {
            ctx.fillStyle = currentScore >= node.data.cost ? "#ff0" : "#888";
            ctx.fillText(node.data.cost, node.x, node.y + 65);
        }
    });

    // ЦЕНТРАЛЬНОЕ ЯДРО
    const allUnlocked = nodes.every(n => n.isUnlocked);
    
    ctx.beginPath();
    ctx.arc(core.x, core.y, core.r, 0, Math.PI*2);
    
    if (allUnlocked) {
        const pulse = Math.sin(Date.now() / 200) * 5;
        ctx.fillStyle = "#550055";
        ctx.strokeStyle = "#ff00ff";
        ctx.shadowBlur = 20 + pulse;
        ctx.shadowColor = "purple";
    } else {
        ctx.fillStyle = "#111";
        ctx.strokeStyle = "#333";
        ctx.shadowBlur = 0;
    }
    
    ctx.lineWidth = 5;
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = "white";
    ctx.font = "bold 16px Courier New";
    ctx.fillText(core.label, core.x, core.y - 5);
    
    if (allUnlocked) {
         ctx.fillStyle = "#ff00ff";
         ctx.font = "12px Courier New";
         ctx.fillText(`UPGRADE: ${core.cost}`, core.x, core.y + 15);
    } else {
         ctx.fillStyle = "#555";
         ctx.fillText("LOCKED", core.x, core.y + 15);
    }

    // Кнопка ВЫХОД
    ctx.fillStyle = "#330000";
    ctx.fillRect(20, h - 60, 150, 40);
    ctx.strokeStyle = "red";
    ctx.strokeRect(20, h - 60, 150, 40);
    ctx.fillStyle = "red";
    ctx.font = "20px Courier New";
    ctx.fillText("ЗАКРЫТЬ [E]", 95, h - 40);
}

// --- ЛОГИКА КЛИКОВ ---

export function handleMutationsClick(mouseX, mouseY, player, altarScore, setAltarScore) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const mX = (mouseX - rect.left) * scaleX;
    const mY = (mouseY - rect.top) * scaleY;

    // 1. Кнопка НАЗАД
    if (mX > 20 && mX < 170 && mY > canvas.height - 60 && mY < canvas.height - 20) {
        playSound('build');
        return 'BACK'; 
    }

    // 2. Клики по мутациям
    for(let node of nodes) {
        if (!node.isUnlocked && Math.hypot(mX - node.x, mY - node.y) < node.size/2) {
            if (altarScore >= node.data.cost) {
                setAltarScore(altarScore - node.data.cost);
                node.isUnlocked = true;
                
                node.data.effect(player);
                playSound('build');
                
                if (node.data.id === 'presser_bp') {
                    showMessage("ЧЕРТЕЖ ОТКРЫТ: ПРЕСОВАТЕЛЬ", "cyan");
                } else {
                    showMessage("МУТАЦИЯ ПРИЖИЛАСЬ", "lime");
                }
                return true; 
            } else {
                showMessage("НЕДОСТАТОЧНО ЭССЕНЦИИ", "gray");
                return true;
            }
        }
    }

    // 3. Клик по ЯДРУ
    const allUnlocked = nodes.every(n => n.isUnlocked);
    if (allUnlocked && Math.hypot(mX - core.x, mY - core.y) < core.r) {
        if (altarScore >= core.cost) {
            if (TIERS[altarRank + 1]) {
                setAltarScore(altarScore - core.cost);
                loadRank(altarRank + 1);
                playSound('boss_spawn');
                showMessage(`РАНГ ${altarRank} ДОСТИГНУТ!`, "gold");
                return true;
            } else {
                showMessage("ЭТО МАКСИМАЛЬНЫЙ РАНГ", "gold");
            }
        } else {
            showMessage(`НУЖНО ${core.cost} ЭССЕНЦИИ`, "red");
        }
    } else if (!allUnlocked && Math.hypot(mX - core.x, mY - core.y) < core.r) {
        showMessage("СНАЧАЛА ОТКРОЙ ВСЕ МУТАЦИИ", "orange");
    }

    return false;
}

// --- ИСПРАВЛЕННАЯ ФУНКЦИЯ ПЕРЕКЛЮЧЕНИЯ ---
export function toggleMutationsMenu(forceState) {
    if (typeof forceState === 'boolean') {
        isMutationsMenuOpen = forceState; // Принудительно устанавливаем состояние
    } else {
        isMutationsMenuOpen = !isMutationsMenuOpen; // Переключаем, если нет аргумента
    }
    return isMutationsMenuOpen;
}