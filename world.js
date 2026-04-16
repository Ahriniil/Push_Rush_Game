import { buildings } from './buildings.js';

export let obstacles = [];
export let spawnPoints = [];
export const WORLD_WIDTH = 2000;
export const WORLD_HEIGHT = 2000;
export let currentBiome = 'forest';

// ЦВЕТОВЫЕ ПАЛИТРЫ БИОМОВ
const BIOMES = {
    forest: { grass: ["#1e2f1e", "#223322"], tree: "#1a1212", bg: [30, 40, 50] }, 
    swamp:  { grass: ["#2f2f1e", "#3a3a1a"], tree: "#0a0a05", bg: [20, 30, 20] }, 
    waste:  { grass: ["#3f1e1e", "#442222"], tree: "#111111", bg: [40, 20, 20] }, 
    frost:  { grass: ["#1e2f3f", "#223344"], tree: "#1a1a2a", bg: [20, 30, 60] }, 
    void:   { grass: ["#110011", "#220022"], tree: "#1a001a", bg: [10, 0, 20] }   
};

export function getBiomeColors() {
    return BIOMES[currentBiome].bg;
}

export function initWorld(biomeType = 'forest') {
    currentBiome = biomeType;
    obstacles = [];
    spawnPoints = [];

    // Генерируем 4 точки спавна врагов по углам
    spawnPoints.push({ x: 100, y: 100 });
    spawnPoints.push({ x: WORLD_WIDTH - 100, y: 100 });
    spawnPoints.push({ x: 100, y: WORLD_HEIGHT - 100 });
    spawnPoints.push({ x: WORLD_WIDTH - 100, y: WORLD_HEIGHT - 100 });

    const treeCount = 80; 
    
    // Определяем тип препятствий для биома
    let obsType = 'tree'; // tree, pine, stump, rock, crystal
    if (biomeType === 'frost') obsType = 'pine';
    if (biomeType === 'swamp') obsType = 'stump';
    if (biomeType === 'waste') obsType = 'rock';
    if (biomeType === 'void') obsType = 'crystal';

    for (let i = 0; i < treeCount; i++) {
        let x = Math.random() * WORLD_WIDTH;
        let y = Math.random() * WORLD_HEIGHT;

        // Не ставим деревья в центре (спавн игрока) и на спавнах врагов
        if (Math.hypot(x - WORLD_WIDTH/2, y - WORLD_HEIGHT/2) < 300) continue;
        if (spawnPoints.some(sp => Math.hypot(x - sp.x, y - sp.y) < 200)) continue;

        // Размеры зависят от типа
        let r = 20 + Math.random() * 20;
        if (obsType === 'stump') r = 15 + Math.random() * 10;
        if (obsType === 'rock') r = 25 + Math.random() * 25;
        if (obsType === 'crystal') r = 15 + Math.random() * 15;

        obstacles.push({
            x: x, 
            y: y, 
            radius: r,
            variant: obsType, // Тип для отрисовки
            // Для камней и кристаллов генерируем случайные точки полигона
            poly: (obsType === 'rock' || obsType === 'crystal') ? generatePolygon(r, obsType === 'crystal' ? 6 : 8) : null
        });
    }
}

function generatePolygon(radius, vertices) {
    const points = [];
    for (let i = 0; i < vertices; i++) {
        const angle = (i / vertices) * Math.PI * 2;
        // Немного искажаем радиус для неровности
        const r = radius * (0.8 + Math.random() * 0.4);
        points.push({
            x: Math.cos(angle) * r,
            y: Math.sin(angle) * r
        });
    }
    return points;
}

export function checkObstacleCollision(entity) {
    obstacles.forEach(obs => {
        const dx = entity.x - obs.x;
        const dy = entity.y - obs.y;
        const dist = Math.hypot(dx, dy);
        
        // Коллизия чуть мягче для игрока
        const minDist = obs.radius + entity.radius - 5; 

        if (dist < minDist) {
            const angle = Math.atan2(dy, dx);
            const push = minDist - dist;
            entity.x += Math.cos(angle) * push;
            entity.y += Math.sin(angle) * push;
        }
    });
}

// Отрисовка декораций (травы)
export function drawDecorations(ctx) {
    // Рисуем пятна травы, просто чтобы земля не была пустой
    // В идеале это можно кэшировать, но пока просто рандомно на основе координат
    // (Упрощено для производительности: рисуем просто паттерн)
}

export function drawSpawns(ctx) {
    ctx.save();
    spawnPoints.forEach(sp => {
        // Рисуем жуткие гнезда
        ctx.fillStyle = "rgba(40, 0, 0, 0.5)";
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 60, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = "rgba(100, 0, 0, 0.8)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 40 + Math.sin(Date.now() / 300) * 5, 0, Math.PI * 2);
        ctx.stroke();
    });
    ctx.restore();
}