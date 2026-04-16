import { WORLD_WIDTH, WORLD_HEIGHT, obstacles, currentBiome } from './world.js'; 
import { buildings } from './buildings.js'; 
import { enemyProjectiles, castBloodNova, spawnBlood, showDamage } from './combatManager.js'; 

export class Player {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.radius = 12; 
        this.baseSpeed = 220; 
        this.vx = 0; this.vy = 0; 
        
        this.maxHp = 100; this.hp = 100;
        this.maxStamina = 100; this.stamina = 100;
        
        // БОЕВЫЕ СТАТЫ
        this.damage = 25; 
        this.damageMultiplier = 1; 
        this.regen = 0;        
        this.vampirism = 0;    
        this.critChance = 0;   
        this.lootChance = 0;   
        
        // ИНВЕНТАРЬ
        this.fleshCubes = 10; 
        this.resonators = 5; 
        
        this.attacking = false; this.attackTimer = 0; this.attackMaxTime = 0.35; // Для анимации
        this.shootTimer = 0; 
        this.isDashing = false; this.dashCooldown = 0;
        this.animTimer = 0;
        this.skillCooldown = 5.0; this.skillTimer = 0;
        this.trail = []; this.trailTimer = 0;
        this.weapon = 'melee'; 
    }

    update(deltaTime, keys, mobs) {
        if (keys['1']) this.weapon = 'melee';
        if (keys['2']) this.weapon = 'range';
        
        if (!this.isDashing && this.stamina < this.maxStamina) this.stamina += deltaTime * 10; 
        
        if (this.regen > 0 && this.hp < this.maxHp && this.hp > 0) {
            this.hp += this.regen * deltaTime;
            if (this.hp > this.maxHp) this.hp = this.maxHp;
        }

        if (this.skillTimer > 0) this.skillTimer -= deltaTime;

        // РЫВОК
        if (keys[' '] && this.stamina > 30 && !this.isDashing) {
            this.isDashing = true; this.stamina -= 30; 
            let dashDirX = 0; let dashDirY = 0;
            if (keys['w'] || keys['ц']) dashDirY = -1;
            if (keys['s'] || keys['ы']) dashDirY = 1;
            if (keys['a'] || keys['ф']) dashDirX = -1;
            if (keys['d'] || keys['в']) dashDirX = 1;
            if (dashDirX === 0 && dashDirY === 0) dashDirX = 1;
            const len = Math.hypot(dashDirX, dashDirY);
            this.vx = (dashDirX / len) * 800; this.vy = (dashDirY / len) * 800;
            this.dashCooldown = 0.15;
            setTimeout(() => { this.isDashing = false; }, 150);
        }

        if (this.isDashing) {
            this.trailTimer -= deltaTime;
            if (this.trailTimer <= 0) { this.trail.push({x: this.x, y: this.y, alpha: 0.6}); this.trailTimer = 0.03; }
            this.dashCooldown -= deltaTime;
            if (this.dashCooldown <= 0) {
                mobs.forEach(mob => {
                    if (Math.hypot(mob.x - this.x, mob.y - this.y) < this.radius + mob.radius + 10) {
                        mob.takeDamage(15, this); spawnBlood(mob.x, mob.y, 2, "cyan"); showDamage(mob.x, mob.y, 15);
                    }
                });
                this.dashCooldown = 0.1;
            }
        }
        for(let i = this.trail.length - 1; i >= 0; i--) {
            this.trail[i].alpha -= deltaTime * 4; if (this.trail[i].alpha <= 0) this.trail.splice(i, 1);
        }

        let dx = 0, dy = 0;
        if (keys['w'] || keys['ц']) dy = -1;
        if (keys['s'] || keys['ы']) dy = 1;
        if (keys['a'] || keys['ф']) dx = -1;
        if (keys['d'] || keys['в']) dx = 1;

        if (dx !== 0 || dy !== 0) {
            const length = Math.hypot(dx, dy);
            dx /= length; dy /= length;
            this.animTimer += deltaTime * 10;
        } else { this.animTimer = 0; }

        if (this.isDashing) { } 
        else if (currentBiome === 'frost') {
            const acceleration = 1500; const friction = 2.0;
            this.vx += dx * acceleration * deltaTime; this.vy += dy * acceleration * deltaTime;
            this.vx -= this.vx * friction * deltaTime; this.vy -= this.vy * friction * deltaTime;
            const maxIceSpeed = this.baseSpeed * 1.3;
            const currentSpeed = Math.hypot(this.vx, this.vy);
            if (currentSpeed > maxIceSpeed) { this.vx = (this.vx / currentSpeed) * maxIceSpeed; this.vy = (this.vy / currentSpeed) * maxIceSpeed; }
        } 
        else {
            let speedMod = 1.0;
            if (currentBiome === 'swamp') speedMod = 0.7; 
            this.vx = dx * this.baseSpeed * speedMod;
            this.vy = dy * this.baseSpeed * speedMod;
        }
        this.x += this.vx * deltaTime; this.y += this.vy * deltaTime;
        this.x = Math.max(20, Math.min(WORLD_WIDTH - 20, this.x));
        this.y = Math.max(20, Math.min(WORLD_HEIGHT - 20, this.y));

        if (this.attackTimer > 0) this.attackTimer -= deltaTime; else this.attacking = false;
        if (this.shootTimer > 0) this.shootTimer -= deltaTime; 
    }

    draw(ctx, mouseX, mouseY, fleshCount = 0) {
        this.trail.forEach(t => { ctx.save(); ctx.globalAlpha = t.alpha; ctx.fillStyle = "#00ffff"; ctx.beginPath(); ctx.arc(t.x, t.y, this.radius, 0, Math.PI*2); ctx.fill(); ctx.restore(); });
        
        ctx.save(); 
        ctx.translate(this.x, this.y);
        const angle = Math.atan2(mouseY - this.y, mouseX - this.x); 
        ctx.rotate(angle);
        
        // Рюкзак
        const bagSize = Math.min(fleshCount, 10) * 1.5; 
        if (bagSize > 0) { ctx.fillStyle = "#8B4513"; ctx.beginPath(); ctx.rect(-10 - bagSize/2, -8, 6 + bagSize, 16); ctx.fill(); ctx.strokeStyle = "#3e2723"; ctx.lineWidth = 1; ctx.stroke(); }
        
        // Тело
        ctx.shadowBlur = 10; ctx.shadowColor = "white"; ctx.fillStyle = this.isDashing ? "#00ccff" : "#dcdcdc"; ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fill();
        // Руки
        ctx.fillStyle = "#555"; ctx.beginPath(); ctx.arc(6, 9, 5, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(6, -9, 5, 0, Math.PI * 2); ctx.fill(); 
        
        ctx.save();
        if (this.weapon === 'melee') {
            // === НОВАЯ АНИМАЦИЯ УДАРА (SWING) ===
            if (this.attacking) {
                // Вычисляем прогресс удара (от 0 до 1)
                const progress = 1 - (this.attackTimer / this.attackMaxTime);
                // Взмах от -45 градусов до +45 градусов (в радианах)
                const swingAngle = -0.8 + (progress * 1.6);
                
                ctx.rotate(swingAngle); 
                
                // Лезвие меча (белое)
                ctx.fillStyle = "#fff"; 
                ctx.shadowBlur = 10; ctx.shadowColor = "white";
                ctx.beginPath();
                ctx.moveTo(10, -2);
                ctx.lineTo(45, -4); // Острие
                ctx.lineTo(45, 4);
                ctx.lineTo(10, 2);
                ctx.fill();
                
                // Рукоять
                ctx.fillStyle = "#444"; ctx.shadowBlur = 0;
                ctx.fillRect(5, -3, 8, 6);
                
                // Эффект взмаха (шлейф)
                if (progress > 0.2 && progress < 0.8) {
                    ctx.beginPath();
                    ctx.arc(0, 0, 45, -0.2, 0.2);
                    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }

            } else {
                // Покой
                ctx.rotate(-0.5); 
                ctx.fillStyle = "#ddd"; ctx.fillRect(8, -2, 24, 4); 
                ctx.fillStyle = "#444"; ctx.fillRect(6, -5, 4, 10); 
            }
        } else {
            // Арбалет
            ctx.fillStyle = "#5D4037"; ctx.fillRect(5, -4, 15, 8); ctx.fillStyle = "#888"; ctx.fillRect(15, -12, 2, 24); 
            if (this.shootTimer <= 0) { ctx.fillStyle = "black"; ctx.fillRect(5, -1, 15, 2); }
        }
        ctx.restore();
        ctx.restore();
    }
}

export class Enemy {
    constructor(spawnX, spawnY, type = 'runner') {
        this.x = spawnX; this.y = spawnY; this.type = type;
        this.state = 'wander'; this.wanderTimer = 0; 
        this.currentTarget = null; this.targetX = this.x; this.targetY = this.y;
        this.isRusher = false; this.knockbackX = 0; this.knockbackY = 0;
        this.animOffset = Math.random() * 100; this.animTimer = 0;
        this.shootCooldown = 0; this.hitFlashTimer = 0; 
        this.harvestResistance = 0.1;
        
        // НОВОЕ: Таймер замедления
        this.slowTimer = 0; 

        if (type === 'tank') { this.radius = 22; this.baseSpeed = 40; this.hp = 120; this.color = '#5a0a0a'; this.harvestResistance = 0.3; } 
        else if (type === 'spitter') { this.radius = 15; this.baseSpeed = 70; this.hp = 50; this.color = '#006400'; } 
        else if (type === 'boss') { this.radius = 45; this.baseSpeed = 35; this.hp = 1000; this.color = '#111'; this.state = 'chase'; this.harvestResistance = 1.0; } 
        else { this.radius = 12; this.baseSpeed = 90; this.hp = 30; this.color = '#cc2222'; }
        
        this.maxHp = this.hp; // Запоминаем макс ХП для полоски
        this.speed = this.baseSpeed * 0.5;
    }

    takeDamage(amount, attacker) {
        this.hp -= amount; this.hitFlashTimer = 0.1; 
        const force = (this.type === 'boss') ? 2 : 15;
        let fromX = this.x; let fromY = this.y;
        if (attacker && attacker.x !== undefined) { fromX = attacker.x; fromY = attacker.y; }
        const angle = Math.atan2(this.y - fromY, this.x - fromX);
        this.knockbackX = Math.cos(angle) * force; this.knockbackY = Math.sin(angle) * force;
        this.alert(attacker);
    }

    alert(target) { 
        this.state = 'chase'; 
        if (target) this.currentTarget = target;
        return true; 
    }

    update(deltaTime, player, altar) {
        if (this.hitFlashTimer > 0) this.hitFlashTimer -= deltaTime;
        this.x += this.knockbackX; this.y += this.knockbackY;
        this.knockbackX *= 0.9; this.knockbackY *= 0.9;
        this.animTimer += deltaTime * 10;
        if(this.shootCooldown > 0) this.shootCooldown -= deltaTime;
        if (this.currentTarget && this.currentTarget.hp <= 0) { this.currentTarget = null; }

        // ОБРАБОТКА ЗАМЕДЛЕНИЯ
        let speedMultiplier = 1.0;
        if (this.slowTimer > 0) {
            this.slowTimer -= deltaTime;
            speedMultiplier = 0.5; // 50% скорости если заморожен
        }
        
        // Устанавливаем скорость для движения
        this.speed = this.baseSpeed * speedMultiplier; 
        if (this.state === 'wander') this.speed *= 0.5;

        let targetEntity = null;
        const distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);
        
        if (distToPlayer < 300) { targetEntity = player; this.state = 'chase'; } 
        else if (altar && altar.x !== -9999) { targetEntity = altar; } 
        else { targetEntity = player; }

        if (this.type === 'boss') targetEntity = altar && altar.x !== -9999 ? altar : player;

        if (this.state === 'wander' && !this.isRusher && !targetEntity) {
            this.wanderTimer -= deltaTime;
            if (this.wanderTimer <= 0) {
                const roamDist = 300;
                this.targetX = Math.max(50, Math.min(WORLD_WIDTH - 50, this.x + (Math.random() - 0.5) * roamDist));
                this.targetY = Math.max(50, Math.min(WORLD_HEIGHT - 50, this.y + (Math.random() - 0.5) * roamDist));
                this.wanderTimer = 2 + Math.random() * 3;
            }
        } else {
            if (targetEntity) { this.targetX = targetEntity.x; this.targetY = targetEntity.y; }
            else { this.targetX = player.x; this.targetY = player.y; }

            if (this.type === 'spitter' && targetEntity) {
                const dist = Math.hypot(targetEntity.x - this.x, targetEntity.y - this.y);
                if (dist < 300 && dist > 100) { this.targetX = this.x; this.targetY = this.y; }
            }
        }
        
        let dx = this.targetX - this.x; let dy = this.targetY - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 5) {
            dx /= dist; dy /= dist;
            const lookAhead = 50; 
            let avoidX = 0; let avoidY = 0;
            obstacles.forEach(tree => {
                const distToTree = Math.hypot(this.x - tree.x, this.y - tree.y);
                if (distToTree < lookAhead + tree.radius) {
                    let pushX = this.x - tree.x; let pushY = this.y - tree.y;
                    const len = Math.hypot(pushX, pushY);
                    if (len > 0) { pushX /= len; pushY /= len; const strength = (1.0 - (distToTree / (lookAhead + tree.radius))) * 4.0; avoidX += pushX * strength; avoidY += pushY * strength; }
                }
            });
            buildings.forEach(b => {
                if (b.type === 'spikes' || b.type === 'portal') return;
                const bx = b.x + 25; const by = b.y + 25;
                const distToB = Math.hypot(this.x - bx, this.y - by);
                if (distToB < lookAhead + 35) {
                     let pushX = this.x - bx; let pushY = this.y - by;
                     const len = Math.hypot(pushX, pushY);
                     if(len > 0) { pushX /= len; pushY /= len; const strength = 3.0; avoidX += pushX * strength; avoidY += pushY * strength; }
                }
            });
            dx += avoidX; dy += avoidY;
            const finalLen = Math.hypot(dx, dy);
            if (finalLen > 0) { dx /= finalLen; dy /= finalLen; }
            
            let speedMod = 1.0;
            if (currentBiome === 'swamp') speedMod = 0.7;

            this.x += dx * this.speed * speedMod * deltaTime;
            this.y += dy * this.speed * speedMod * deltaTime;
        }
    }
    
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y);
        ctx.strokeStyle = this.color; ctx.lineWidth = (this.type === 'boss') ? 4 : 2;
        const legCount = this.type === 'tank' ? 4 : (this.type === 'boss' ? 8 : 3);
        for(let i = 0; i < legCount; i++) {
            const legOffset = Math.sin(this.animTimer + i * 2) * 5; const yPos = (i - (legCount/2)) * 6;
            ctx.beginPath(); ctx.moveTo(0, yPos); ctx.lineTo(-this.radius - 5 + legOffset, yPos - 5); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, yPos); ctx.lineTo(this.radius + 5 - legOffset, yPos - 5); ctx.stroke();
        }
        
        // Цвет тела (синий, если заморожен)
        ctx.fillStyle = (this.slowTimer > 0) ? "#00ffff" : this.color; 
        
        if (this.hitFlashTimer > 0) { ctx.fillStyle = "#ffffff"; ctx.shadowBlur = 10; ctx.shadowColor = "white"; }
        ctx.beginPath(); ctx.ellipse(0, 0, this.radius, this.radius * 0.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        if (this.type === 'tank') { ctx.fillStyle = "#333"; ctx.fillRect(-10, -10, 20, 20); }
        ctx.fillStyle = (this.state === 'chase' || this.currentTarget || this.isRusher) ? "#ff0000" : "#ffff00"; 
        if (this.type === 'boss') {
            ctx.beginPath(); ctx.arc(-10, -10, 4, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(10, -10, 4, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(-5, 10, 4, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(5, 10, 4, 0, Math.PI*2); ctx.fill();
        } else { ctx.beginPath(); ctx.arc(-5, -this.radius/2, 2, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(5, -this.radius/2, 2, 0, Math.PI*2); ctx.fill(); }
        if (this.type === 'spitter') { ctx.fillStyle = "#32CD32"; ctx.beginPath(); ctx.arc(0, 5, 6, 0, Math.PI*2); ctx.fill(); }
        
        // === ПОЛОСКА ЗДОРОВЬЯ НАД ГОЛОВОЙ ===
        if (this.hp < this.maxHp) { 
            const barW = this.radius * 2 + 10;
            const barH = 4;
            const barY = -this.radius - 12;
            
            ctx.fillStyle = 'red'; 
            ctx.fillRect(-barW/2, barY, barW, barH); 
            
            ctx.fillStyle = '#00ff00'; 
            ctx.fillRect(-barW/2, barY, barW * (this.hp / this.maxHp), barH); 
        }
        
        ctx.restore();
    }
}