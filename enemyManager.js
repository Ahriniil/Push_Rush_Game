import { Enemy } from './entities.js';
import { spawnPoints, obstacles, checkObstacleCollision, WORLD_WIDTH, WORLD_HEIGHT } from './world.js';
import { buildings, checkBuildingCollision } from './buildings.js';
import { spawnBlood } from './combatManager.js'; 
import { playSound, showMessage } from './game.js'; 

export const mobs = [];
let bossSpawned = false; 

export let currentDifficulty = 1;
let bossSummonTimer = 0; 
let spawnTimer = 0;

// ОГРАНИЧЕНИЕ КОЛИЧЕСТВА ВРАГОВ
const MAX_MOBS = 40; // Максимум врагов на карте одновременно

export function setDifficulty(diff) {
    currentDifficulty = diff;
}

export function spawnMob(playerX, playerY, forcedType = null, isRusher = false) {
    // Если врагов слишком много - не спавним новых (кроме босса)
    if (mobs.length >= MAX_MOBS && forcedType !== 'boss') return;

    const sp = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
    // Небольшой разброс вокруг точки спавна
    const x = sp.x + (Math.random() - 0.5) * 200;
    const y = sp.y + (Math.random() - 0.5) * 200;
    
    let type = forcedType;
    if (!type) {
        const rand = Math.random();
        // Шансы зависят от сложности
        const tankChance = 0.05 * currentDifficulty;
        const spitterChance = 0.08 * currentDifficulty;

        if (rand < tankChance) type = 'tank';
        else if (rand < tankChance + spitterChance) type = 'spitter';
        else type = 'runner';
    }

    const mob = new Enemy(x, y, type);
    mob.isRusher = isRusher;
    
    // Усиление от сложности
    mob.hp *= (1 + (currentDifficulty * 0.2));
    mob.damage = (mob.damage || 10) * (1 + (currentDifficulty * 0.1));

    mobs.push(mob);
}

export function handleSpawning(deltaTime, dayTime, altarScore, player) {
    spawnTimer -= deltaTime;

    // ДНЕМ враги спавнятся редко
    // НОЧЬЮ (dayTime > 0.75) спавнятся часто
    let spawnRate = (dayTime > 0.75) ? 2.5 : 6.0; 
    
    // Чем выше сложность, тем быстрее спавн (но не слишком быстро)
    spawnRate /= (1 + currentDifficulty * 0.2);
    
    // Не даем спавниться чаще чем раз в 1 секунду
    if (spawnRate < 1.0) spawnRate = 1.0;

    if (spawnTimer <= 0) {
        spawnMob(player.x, player.y);
        // Случайная задержка до следующего
        spawnTimer = spawnRate + Math.random() * 2.0; 
    }

    // ЛОГИКА БОССА (Приходит ночью, если очков много)
    if (!bossSpawned && altarScore > 2000 * currentDifficulty && dayTime > 0.8) {
        bossSummonTimer += deltaTime;
        if (bossSummonTimer > 10) { // Предупреждение 10 сек
            spawnMob(player.x, player.y, 'boss');
            bossSpawned = true;
            showMessage("ПРИШЕЛ ХОЗЯИН ЗОНЫ!", "red");
            playSound('boss_spawn');
        }
    }
}

export function updateEnemies(deltaTime, player, altar) {
    mobs.forEach((mob, index) => {
        mob.update(deltaTime, player, altar);
        checkObstacleCollision(mob);
        
        // Враги атакуют здания
        buildings.forEach(b => { 
             // Урон по зданиям снижен
             let dmg = 0.5 * currentDifficulty; 
             if (mob.type === 'boss') dmg = 5.0; 
             
             // Если моб касается здания
             if (Math.hypot(mob.x - (b.x+25), mob.y - (b.y+25)) < 45) {
                 b.hp -= dmg * deltaTime * 10; // Урон в секунду
             }
        });

        // Удаление мертвых
        if (mob.hp <= 0) {
            mobs.splice(index, 1);
        }
    });
}

// Рендеринг врагов вызывается в renderer.js, но функция нужна для логики
export function drawEnemies(ctx) {
    mobs.forEach(mob => mob.draw(ctx));
}

export function isBossDead() {
    // Если босс был заспавнен, но его нет в списке мобов -> он мертв
    return bossSpawned && !mobs.some(m => m.type === 'boss');
}