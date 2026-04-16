import { showDamage } from './combatManager.js'; 
import { showMessage, playSound } from './game.js';

export const CELL_SIZE = 50; 
export const GRID_SIZE = 10; 
export const buildings = []; 
export const projectiles = []; 

export class Building {
    constructor(x, y, type) {
        this.x = x; 
        this.y = y; 
        this.type = type;
        this.width = CELL_SIZE; 
        this.height = CELL_SIZE;
        this.hp = 100; 
        this.maxHp = 100;
        this.color = "#555";
        
        if (type === 'wall') { this.hp = 200; this.maxHp = 200; } 
        else if (type === 'tower') { this.color = "#4444ff"; this.range = 300; this.cooldown = 0; this.damage = 20; } 
        
        // ЛЕДЯНАЯ БАШНЯ
        else if (type === 'ice_tower') { 
            this.color = "#00ffff"; // Голубой
            this.range = 250; 
            this.cooldown = 0; 
            this.damage = 5; // Мало урона, но замедляет
            this.hp = 80; this.maxHp = 80;
        }
        
        else if (type === 'gate') { this.hp = 150; this.maxHp = 150; this.color = "#8B4513"; } 
        else if (type === 'spikes') { this.hp = 50; this.maxHp = 50; this.color = "#333"; this.damageTimer = 0; } 
        else if (type === 'portal') { this.hp = 10000; this.maxHp = 10000; this.angle = 0; }
        else if (type === 'presser') {
            this.hp = 300; this.maxHp = 300;
            this.color = "#800000";
            this.craftingTime = 60.0;
            this.craftingTimer = 0; 
            this.isCrafting = false;
        }
        else if (type === 'resonator') {
            this.hp = 2000; this.maxHp = 2000; 
            this.color = "#ff00ff";
            this.pulse = 0;
        }
    }

    update(deltaTime, mobs, player, dayDuration) {
        if (this.type === 'presser') {
            if (this.isCrafting) {
                this.craftingTimer -= deltaTime;
                if (this.craftingTimer <= 0) {
                    this.isCrafting = false;
                    player.fleshCubes++; 
                    showMessage("КУБ ПЛОТИ ГОТОВ!", "gold");
                    playSound('boss_spawn'); 
                }
            }
        }
        
        if (this.type === 'resonator') {
            this.pulse += deltaTime * 2;
        }

        // --- ЛОГИКА БАШЕН (Обычная и Ледяная) ---
        if (this.type === 'tower' || this.type === 'ice_tower') {
            if (this.cooldown > 0) this.cooldown -= deltaTime;
            else {
                let target = null; let minDst = this.range;
                for(let mob of mobs) {
                    const dist = Math.hypot(mob.x - (this.x + CELL_SIZE/2), mob.y - (this.y + CELL_SIZE/2));
                    if (dist < minDst) { minDst = dist; target = mob; }
                }
                if (target) {
                    // Создаем снаряд
                    projectiles.push({
                        x: this.x + CELL_SIZE/2, y: this.y + CELL_SIZE/2,
                        targetX: target.x, targetY: target.y,
                        speed: 400, 
                        damage: this.damage, 
                        life: 1.0, 
                        source: this,
                        isIce: (this.type === 'ice_tower') // Флаг льда
                    });
                    this.cooldown = (this.type === 'ice_tower') ? 1.0 : 0.8; // Ледяная стреляет реже
                }
            }
        }
        
        if (this.type === 'spikes') {
            this.damageTimer -= deltaTime;
            if (this.damageTimer <= 0) {
                let hit = false;
                mobs.forEach(mob => {
                    if (mob.x > this.x && mob.x < this.x + CELL_SIZE && mob.y > this.y && mob.y < this.y + CELL_SIZE) {
                        mob.takeDamage(5, this); mob.speed = mob.baseSpeed * 0.5; showDamage(mob.x, mob.y, 5); hit = true; this.hp -= 1;
                    }
                });
                if (hit) this.damageTimer = 0.5; 
            }
        }

        if (this.type === 'portal') { this.angle += deltaTime * 2; }
    }

    startCrafting() {
        if (!this.isCrafting) {
            this.isCrafting = true;
            this.craftingTimer = 60.0;
            return true;
        }
        return false;
    }

    draw(ctx) {
        ctx.save();
        
        if (this.type === 'spikes') {
            ctx.fillStyle = "#222"; ctx.fillRect(this.x, this.y, CELL_SIZE, CELL_SIZE);
            ctx.strokeStyle = "#888"; ctx.lineWidth = 2; ctx.beginPath();
            ctx.moveTo(this.x, this.y); ctx.lineTo(this.x + CELL_SIZE, this.y + CELL_SIZE);
            ctx.moveTo(this.x + CELL_SIZE, this.y); ctx.lineTo(this.x, this.y + CELL_SIZE); ctx.stroke();
        } 
        else if (this.type === 'portal') {
            const cx = this.x + CELL_SIZE/2; const cy = this.y + CELL_SIZE/2;
            ctx.shadowBlur = 30; ctx.shadowColor = "cyan"; ctx.translate(cx, cy); ctx.rotate(this.angle);
            ctx.strokeStyle = "#00ffff"; ctx.lineWidth = 4; ctx.beginPath();
            for(let i=0; i<4; i++) { ctx.rotate(Math.PI/2); ctx.moveTo(10, 0); ctx.lineTo(25, 0); ctx.arc(0, 0, 20, 0, Math.PI/2); } ctx.stroke();
            ctx.rotate(-this.angle * 2); ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI*2); ctx.fill();
        } 
        else if (this.type === 'presser') {
            ctx.fillStyle = '#5a0a0a'; ctx.fillRect(this.x, this.y, CELL_SIZE, CELL_SIZE);
            ctx.strokeStyle = '#300'; ctx.lineWidth = 2; ctx.strokeRect(this.x, this.y, CELL_SIZE, CELL_SIZE);
            const holeSize = 20; const holeX = this.x + (CELL_SIZE - holeSize) / 2; const holeY = this.y + (CELL_SIZE - holeSize) / 2;
            
            if (this.isCrafting) {
                const glow = Math.sin(Date.now() / 200) * 0.5 + 0.5;
                ctx.fillStyle = `rgba(255, 50, 50, ${glow})`;
            } else {
                ctx.fillStyle = 'black';
            }
            ctx.fillRect(holeX, holeY, holeSize, holeSize);
            ctx.strokeStyle = '#ff0000'; ctx.lineWidth = 1; ctx.strokeRect(holeX - 2, holeY - 2, holeSize + 4, holeSize + 4);
            
            if (this.isCrafting) {
                ctx.fillStyle = 'lime';
                const pct = 1.0 - (this.craftingTimer / 60.0);
                ctx.fillRect(this.x, this.y - 5, CELL_SIZE * pct, 4);
            }
        }
        else if (this.type === 'resonator') {
            const cx = this.x + CELL_SIZE/2; const cy = this.y + CELL_SIZE/2;
            const p = Math.sin(this.pulse) * 5;
            ctx.shadowBlur = 15; ctx.shadowColor = "#ff00ff";
            ctx.fillStyle = "#2a0e0e"; ctx.beginPath(); ctx.arc(cx, cy, 20 + p, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = "#ff00ff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 15, 0, Math.PI*2); ctx.stroke();
        }
        else {
            // СТЕНЫ, БАШНИ, ВОРОТА
            ctx.fillStyle = this.color; 
            ctx.fillRect(this.x, this.y, CELL_SIZE, CELL_SIZE);
            ctx.strokeStyle = "black"; ctx.lineWidth = 2; 
            ctx.strokeRect(this.x, this.y, CELL_SIZE, CELL_SIZE);
            
            ctx.fillStyle = "white"; ctx.font = "20px Arial"; ctx.textAlign = "center";
            if (this.type === 'wall') ctx.fillText("🧱", this.x + 25, this.y + 32);
            if (this.type === 'tower') ctx.fillText("🏹", this.x + 25, this.y + 32);
            if (this.type === 'ice_tower') ctx.fillText("❄️", this.x + 25, this.y + 32); // Иконка снежинки
            if (this.type === 'gate') ctx.fillText("🚪", this.x + 25, this.y + 32);
        }

        if (this.type !== 'portal' && this.hp < this.maxHp) {
            ctx.fillStyle = "red"; 
            ctx.fillRect(this.x + 5, this.y - 10, 40, 5); 
            ctx.fillStyle = "#0f0"; 
            ctx.fillRect(this.x + 5, this.y - 10, 40 * (this.hp / this.maxHp), 5);
        }
        ctx.restore();
    }
}

export function checkBuildingCollision(entity) {
    buildings.forEach(b => {
        if (b.type === 'portal' || b.type === 'spikes') return; 
        
        let testX = entity.x; 
        let testY = entity.y;

        if (entity.x < b.x) testX = b.x; 
        else if (entity.x > b.x + CELL_SIZE) testX = b.x + CELL_SIZE;
        
        if (entity.y < b.y) testY = b.y; 
        else if (entity.y > b.y + CELL_SIZE) testY = b.y + CELL_SIZE;

        const distX = entity.x - testX; 
        const distY = entity.y - testY; 
        const distance = Math.sqrt((distX*distX) + (distY*distY));

        if (distance <= entity.radius) {
            const angle = Math.atan2(distY, distX); 
            const push = entity.radius - distance + 1; 
            entity.x += Math.cos(angle) * push; 
            entity.y += Math.sin(angle) * push;
        }
    });
}

export function setBuildings(savedData) {
    buildings.length = 0; 
    projectiles.length = 0;

    savedData.forEach(data => {
        const b = new Building(data.x, data.y, data.type);
        b.hp = data.hp;
        if (data.type === 'spikes') b.damageTimer = data.damageTimer || 0;
        if (data.type === 'portal') b.angle = data.angle || 0;
        buildings.push(b);
    });
}