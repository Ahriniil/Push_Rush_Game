import { Particle, FloatingText, BloodStain } from './particles.js';
import { mobs } from './enemyManager.js';
import { projectiles as towerProjectiles } from './buildings.js'; 
import { playSound, showMessage } from './game.js'; 

export const particles = [];
export const floatingTexts = [];
export const bloodStains = [];   
export const droppedFlesh = [];
export let playerFlesh = []; 
export const playerProjectiles = []; 
export const enemyProjectiles = [];  
export const puddles = []; 
export const lootItems = []; 

class LootItem {
    constructor(x, y, type) { this.x = x; this.y = y; this.type = type; this.life = 15.0; this.bobOffset = Math.random() * 10; }
    update(deltaTime, player) {
        this.life -= deltaTime;
        const dist = Math.hypot(player.x - this.x, player.y - this.y);
        if (dist < 100) { this.x += (player.x - this.x) * 2 * deltaTime; this.y += (player.y - this.y) * 2 * deltaTime; }
        if (dist < player.radius + 15) { this.applyEffect(player); this.life = 0; }
    }
    applyEffect(player) {
        playSound('build');
        if (this.type === 'heal') { player.hp = Math.min(player.hp + 25, player.maxHp); showMessage("+25 HP", "#00ff00"); }
        else if (this.type === 'stamina') { player.stamina = 100; showMessage("СТАМИНА ВОССТАНОВЛЕНА", "cyan"); }
        else if (this.type === 'rage') { player.damageMultiplier = 2; player.rageTimer = 10.0; showMessage("ЯРОСТЬ! (x2 УРОН)", "red"); }
    }
    draw(ctx) {
        const bob = Math.sin(Date.now() / 200 + this.bobOffset) * 5;
        ctx.save(); ctx.translate(this.x, this.y + bob); ctx.shadowBlur = 15;
        if (this.type === 'heal') { ctx.fillStyle = "#00ff00"; ctx.shadowColor = "#00ff00"; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(3, -3); ctx.lineTo(10, 0); ctx.lineTo(3, 3); ctx.lineTo(0, 10); ctx.lineTo(-3, 3); ctx.lineTo(-10, 0); ctx.lineTo(-3, -3); ctx.fill(); } 
        else if (this.type === 'stamina') { ctx.fillStyle = "#00ffff"; ctx.shadowColor = "#00ffff"; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill(); } 
        else if (this.type === 'rage') { ctx.fillStyle = "#ff0000"; ctx.shadowColor = "#ff0000"; ctx.beginPath(); ctx.moveTo(-6,-6); ctx.lineTo(6,-6); ctx.lineTo(0,8); ctx.fill(); }
        ctx.restore();
    }
}

class AcidPuddle {
    constructor(x, y) { this.x = x; this.y = y; this.radius = 0; this.maxRadius = 30; this.life = 5.0; this.timer = 0; }
    update(deltaTime, player) {
        this.life -= deltaTime;
        if (this.radius < this.maxRadius) this.radius += deltaTime * 50;
        this.timer += deltaTime;
        if (this.timer > 0.2) { spawnBlood(this.x + (Math.random()-0.5)*this.radius, this.y + (Math.random()-0.5)*this.radius, 1, "#00ff00"); this.timer = 0; }
        if (Math.hypot(player.x - this.x, player.y - this.y) < this.radius) { player.speed = player.baseSpeed * 0.5; player.hp -= deltaTime * 5; }
    }
    draw(ctx) {
        ctx.save(); ctx.globalAlpha = 0.6 * (this.life / 5.0); ctx.fillStyle = "#32CD32";
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = "#006400"; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    }
}

export function castBloodNova(player) {
    playSound('boss_spawn'); spawnBlood(player.x, player.y, 50, "#8B0000"); particles.push(new Particle(player.x, player.y, "red", 20)); 
    mobs.forEach(mob => {
        const dist = Math.hypot(mob.x - player.x, mob.y - player.y);
        if (dist < 200) { mob.takeDamage(100, player); showDamage(mob.x, mob.y, 100, true); }
    });
}

export function clearPlayerFlesh() { playerFlesh = []; }
export function setPlayerFlesh(data) { playerFlesh = data || []; }
export function spawnBlood(x, y, count, color) { for(let i=0; i<count; i++) particles.push(new Particle(x, y, color, 5)); }
export function showDamage(x, y, amount, isCrit = false) {
    const color = isCrit ? "#ffcc00" : "#ffffff";
    const text = "-" + Math.floor(amount);
    floatingTexts.push(new FloatingText(x, y, text, color));
}

export function playerShoot(player, targetX, targetY) {
    const angle = Math.atan2(targetY - player.y, targetX - player.x);
    const spread = (Math.random() - 0.5) * 0.1;
    const dmg = 40 * (player.damageMultiplier || 1);
    playerProjectiles.push({ x: player.x, y: player.y, vx: Math.cos(angle + spread) * 600, vy: Math.sin(angle + spread) * 600, damage: dmg, life: 1.5 });
    playSound('shoot'); 
}

export function updateCombat(deltaTime, player, shakeScreenCallback) {
    for (let i = bloodStains.length - 1; i >= 0; i--) { bloodStains[i].update(deltaTime); if (bloodStains[i].life <= 0) bloodStains.splice(i, 1); }
    for (let i = puddles.length - 1; i >= 0; i--) { puddles[i].update(deltaTime, player); if (puddles[i].life <= 0) puddles.splice(i, 1); }
    for (let i = lootItems.length - 1; i >= 0; i--) { lootItems[i].update(deltaTime, player); if (lootItems[i].life <= 0) lootItems.splice(i, 1); }

    // БАШНИ
    for (let i = towerProjectiles.length - 1; i >= 0; i--) {
        let p = towerProjectiles[i]; p.life -= deltaTime;
        const angle = Math.atan2(p.targetY - p.y, p.targetX - p.x); p.x += Math.cos(angle) * p.speed * deltaTime; p.y += Math.sin(angle) * p.speed * deltaTime;
        let hit = false;
        for (let mob of mobs) {
            if (Math.hypot(mob.x - p.x, mob.y - p.y) < mob.radius + 5) {
                // ВАЖНО: передаем p.source (Башню)
                mob.takeDamage(p.damage, p.source); 
                showDamage(mob.x, mob.y, p.damage); hit = true; break;
            }
        }
        if (hit || p.life <= 0) towerProjectiles.splice(i, 1);
    }

    // ИГРОК (АРБАЛЕТ)
    for (let i = playerProjectiles.length - 1; i >= 0; i--) {
        let p = playerProjectiles[i]; p.life -= deltaTime; p.x += p.vx * deltaTime; p.y += p.vy * deltaTime;
        let hit = false;
        for (let mob of mobs) {
            if (Math.hypot(mob.x - p.x, mob.y - p.y) < mob.radius + 10) {
                let dmg = p.damage; let isCrit = Math.random() < 0.2; if (isCrit) dmg *= 1.5;
                // ВАЖНО: передаем player
                mob.takeDamage(dmg, player); 
                spawnBlood(mob.x, mob.y, 5, "#ffff00"); showDamage(mob.x, mob.y, dmg, isCrit); playSound('hit'); hit = true; break;
            }
        }
        if (hit || p.life <= 0) playerProjectiles.splice(i, 1);
    }

    for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
        let p = enemyProjectiles[i]; p.life -= deltaTime;
        const angle = Math.atan2(p.targetY - p.y, p.targetX - p.x); p.x += Math.cos(angle) * p.speed * deltaTime; p.y += Math.sin(angle) * p.speed * deltaTime;
        if (Math.hypot(player.x - p.x, player.y - p.y) < player.radius + 5 && !player.isDashing) {
            player.hp -= p.damage; shakeScreenCallback(0.2); spawnBlood(player.x, player.y, 5, "#00ff00"); showDamage(player.x, player.y, p.damage, true); enemyProjectiles.splice(i, 1); continue;
        }
        if (p.life <= 0) { puddles.push(new AcidPuddle(p.x, p.y)); enemyProjectiles.splice(i, 1); }
    }

    mobs.forEach(mob => { if (Math.hypot(player.x - mob.x, player.y - mob.y) < player.radius + mob.radius && !player.isDashing) { player.hp -= 0.5; shakeScreenCallback(0.2); } });

    for (let i = mobs.length - 1; i >= 0; i--) {
        if (mobs[i].hp <= 0) {
            let color = mobs[i].type === 'tank' ? '#8B0000' : (mobs[i].type === 'spitter' ? '#006400' : '#ff0000');
            spawnBlood(mobs[i].x, mobs[i].y, 20, color);
            droppedFlesh.push({ x: mobs[i].x, y: mobs[i].y, freshness: 100, radius: 6 });
            bloodStains.push(new BloodStain(mobs[i].x, mobs[i].y, 15 + Math.random()*10, color));
            
            if (Math.random() < 0.1) {
                const r = Math.random(); let type = 'heal';
                if (r < 0.33) type = 'stamina'; else if (r < 0.66) type = 'rage';
                lootItems.push(new LootItem(mobs[i].x, mobs[i].y, type));
            }
            shakeScreenCallback(0.3); playSound('enemy_death'); mobs.splice(i, 1);
        }
    }

    droppedFlesh.forEach((f, i) => { if (Math.hypot(player.x - f.x, player.y - f.y) < 25) { playerFlesh.push(f); droppedFlesh.splice(i, 1); } });
    playerFlesh.forEach(f => f.freshness -= deltaTime * 4);
    particles.forEach((p, index) => { p.update(); if (p.life <= 0) particles.splice(index, 1); });
    floatingTexts.forEach((t, index) => { t.update(deltaTime); if (t.life <= 0) floatingTexts.splice(index, 1); });
}

export function drawGroundEffects(ctx) {
    puddles.forEach(p => p.draw(ctx));
    bloodStains.forEach(b => b.draw(ctx));
    lootItems.forEach(l => l.draw(ctx));
    droppedFlesh.forEach(f => { ctx.fillStyle = '#ff6666'; ctx.beginPath(); ctx.arc(f.x, f.y, f.radius, 0, Math.PI*2); ctx.fill(); });
}

export function drawCombatEffects(ctx) {
    particles.forEach(p => p.draw(ctx));
    towerProjectiles.forEach(p => { ctx.fillStyle = "#aaaaff"; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI*2); ctx.fill(); });
    playerProjectiles.forEach(p => { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx)); ctx.fillStyle = "white"; ctx.fillRect(-10, -1, 20, 2); ctx.restore(); });
    enemyProjectiles.forEach(p => { ctx.fillStyle = "#00ff00"; ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI*2); ctx.fill(); });
    floatingTexts.forEach(t => t.draw(ctx));
}