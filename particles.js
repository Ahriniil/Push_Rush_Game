// particles.js - Визуальные эффекты

export class Particle {
    constructor(x, y, color, speed) {
        this.x = x; this.y = y; this.color = color;
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * speed;
        this.vx = Math.cos(angle) * velocity;
        this.vy = Math.sin(angle) * velocity;
        this.life = 1.0; 
        this.decay = 0.02 + Math.random() * 0.03; 
        this.size = Math.random() * 3 + 1;
    }
    update() {
        this.x += this.vx; this.y += this.vy;
        this.life -= this.decay; this.size *= 0.95;
    }
    draw(ctx) {
        ctx.save(); ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
}

// НОВЫЙ КЛАСС: Всплывающий текст урона
export class FloatingText {
    constructor(x, y, text, color) {
        this.x = x + (Math.random() - 0.5) * 20; // Чуть разброса
        this.y = y;
        this.text = text;
        this.color = color;
        this.life = 1.0;
        this.vy = -30; // Летит вверх
        this.size = 20;
    }
    update(deltaTime) {
        this.y += this.vy * deltaTime;
        this.life -= deltaTime * 1.5;
        this.vy *= 0.9; // Замедление полета
    }
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;
        ctx.font = `bold ${this.size}px Courier New`;
        ctx.shadowBlur = 4; ctx.shadowColor = "black";
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

// НОВЫЙ КЛАСС: Пятна крови (остаются на земле)
export class BloodStain {
    constructor(x, y, size, color) {
        this.x = x; this.y = y;
        this.size = size;
        this.color = color;
        this.shapeSeed = Math.random(); 
        
        // НОВОЕ: Время жизни (60 секунд)
        this.life = 60.0;
        this.maxLife = 60.0;
    }

    // НОВОЕ: Метод обновления для исчезновения
    update(deltaTime) {
        this.life -= deltaTime;
    }

    draw(ctx) {
        // Если жизнь кончилась - не рисуем
        if (this.life <= 0) return;

        ctx.save();
        // Прозрачность зависит от оставшейся жизни
        // Начинает исчезать, когда осталось 50% времени
        let alpha = 0.6;
        if (this.life < this.maxLife * 0.5) {
            alpha = 0.6 * (this.life / (this.maxLife * 0.5));
        }
        ctx.globalAlpha = alpha;
        
        ctx.fillStyle = this.color;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.shapeSeed * Math.PI * 2); 
        
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size, this.size * 0.6, 0, 0, Math.PI*2);
        ctx.fill();
        
        ctx.beginPath(); ctx.arc(this.size*0.8, 0, this.size*0.2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(-this.size*0.6, this.size*0.5, this.size*0.15, 0, Math.PI*2); ctx.fill();
        
        ctx.restore();
    }
}