// audio.js - Процедурный звуковой движок

const AudioContext = window.AudioContext || window.webkitAudioContext;
let ctx = new AudioContext();

// Генератор шума (для взрывов и ударов)
function createNoiseBuffer() {
    const bufferSize = ctx.sampleRate * 2; // 2 секунды буфера
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    return buffer;
}
const noiseBuffer = createNoiseBuffer();

export function initAudio() {
    if (ctx.state === 'suspended') {
        ctx.resume();
    }
}

export function playSound(type) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'shoot') {
        // Пью-пью (Резкий спад частоты)
        osc.type = 'square';
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        osc.start(t); osc.stop(t + 0.1);
    } 
    else if (type === 'hit') {
        // Удар (Шум + Низкий тон)
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        const noiseGain = ctx.createGain();
        noise.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        
        noiseGain.gain.setValueAtTime(0.2, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        noise.start(t); noise.stop(t + 0.1);
    } 
    else if (type === 'build') {
        // Стройка (Короткий высокий клик)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, t);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
        osc.start(t); osc.stop(t + 0.05);
    }
    else if (type === 'enemy_death') {
        // Смерть (Низкочастотный скрежет)
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.linearRampToValueAtTime(50, t + 0.2);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.2);
        osc.start(t); osc.stop(t + 0.2);
    }
    else if (type === 'boss_spawn') {
        // БОСС (Громкий, долгий гул)
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, t);
        osc.frequency.linearRampToValueAtTime(300, t + 1.0); // Сирена
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.linearRampToValueAtTime(0, t + 2.0);
        osc.start(t); osc.stop(t + 2.0);
    }
}