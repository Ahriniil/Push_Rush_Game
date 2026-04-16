import { globalWorld, currentZoneIndex } from './worldMap.js';
import { isSummonerUnlocked } from './mutations.js'; 

export const uiElements = {
    altarPower: document.getElementById('altarPower'),
    dayCycle: document.getElementById('dayCycle'),
    upgradeMenu: document.getElementById('upgradeMenu'),
    hpBar: document.getElementById('hpBar'),
    staminaBar: document.getElementById('staminaBar'),
    fleshCount: document.getElementById('fleshCount'),
    fleshStatus: document.getElementById('fleshStatus'),
    cubeCount: document.getElementById('cubeCount'),
    
    msg: document.getElementById('message'),
    gameOver: document.getElementById('gameOverScreen'),
    mapScreen: document.getElementById('worldMapScreen'),
    mapGrid: document.getElementById('mapGrid'),
    closeMapBtn: document.getElementById('closeMapBtn')
};

// HUD Дополнительный
let resCountDisplay = document.getElementById('resCount');
if (!resCountDisplay) {
    const statBox = document.querySelector('.stat-box');
    if (statBox) {
        const p = document.createElement('p');
        p.innerHTML = `Резонаторы: <span id="resCount" style="color: cyan; font-weight: bold;">0</span>`;
        statBox.appendChild(p);
        resCountDisplay = document.getElementById('resCount');
    }
}

let skillIcon = document.getElementById('skillIcon');
if (!skillIcon) {
    const barsContainer = document.querySelector('.bars-container');
    if (barsContainer) {
        const skillContainer = document.createElement('div');
        skillContainer.style.marginTop = "10px";
        skillContainer.style.display = "flex";
        skillContainer.style.alignItems = "center";
        skillContainer.style.gap = "10px";
        skillContainer.innerHTML = `
            <div style="position: relative; width: 40px; height: 40px; border: 2px solid white; background: #300;">
                <div id="skillCdOverlay" style="position: absolute; bottom: 0; left: 0; width: 100%; height: 0%; background: rgba(0,0,0,0.8); transition: height 0.1s;"></div>
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-weight: bold; font-size: 20px;">Q</div>
            </div>
            <span style="font-size: 12px; color: #f88;">ВЗРЫВ / ЖЕРТВА</span>
        `;
        barsContainer.appendChild(skillContainer);
        skillIcon = document.getElementById('skillCdOverlay');
    }
}

// ФУНКЦИЯ СОЗДАНИЯ КНОПОК (ИСПРАВЛЕНО ВИЗУАЛЬНОЕ ОФОРМЛЕНИЕ)
function ensureMenuButtonsExist() {
    // Ищем именно сетку, куда добавлять карточки
    const gridContainer = document.querySelector('#viewBuild .upgrade-grid');
    if (!gridContainer) return;

    // 1. ЛЕДЯНАЯ БАШНЯ
    if (!document.getElementById('btnBuildIce')) {
        const btn = document.createElement('div');
        btn.id = 'btnBuildIce';
        btn.className = 'upgrade-card'; // Используем класс карточки
        btn.style.borderColor = "#00ffff"; 
        
        btn.innerHTML = `
            <h3 style="color: #00ffff;">ЛЕД. БАШНЯ</h3>
            <p>Замедление</p>
            <button>Цена: 60</button>
        `;
        
        // Вставляем перед порталом (если он есть), чтобы портал был в конце
        const portalBtn = document.getElementById('btnBuildPortal');
        if (portalBtn) gridContainer.insertBefore(btn, portalBtn);
        else gridContainer.appendChild(btn);
    }

    // 2. ПРЕСОВАТЕЛЬ
    if (!document.getElementById('btnBuildPresser')) {
        const btn = document.createElement('div');
        btn.id = 'btnBuildPresser';
        btn.className = 'upgrade-card';
        btn.style.borderColor = "#800000"; 
        
        btn.innerHTML = `
            <h3 style="color: #ff4444;">ПРЕСС</h3>
            <p style="font-size: 10px;">50 Эсс + 50 Пл</p>
            <button style="font-size: 12px;">Построить</button>
        `;
        
        gridContainer.appendChild(btn);
    }
    
    // 3. РЕЗОНАТОР (КРАФТ)
    if (!document.getElementById('btnBuildResonator')) {
        const btn = document.createElement('div');
        btn.id = 'btnBuildResonator';
        btn.className = 'upgrade-card';
        btn.style.borderColor = "#ff00ff"; 
        
        btn.innerHTML = `
            <h3 style="color: #ff00ff;">РЕЗОНАТОР</h3>
            <p style="font-size: 9px;">500Эс+20Пл+5Куб</p>
            <button style="font-size: 12px; background: #4a004a;">Скрафтить</button>
        `;
        
        gridContainer.appendChild(btn);
    }
}

function initTabs(onOpenMutations) {
    const tabMutations = document.getElementById('tabMutations');
    const tabBuild = document.getElementById('tabBuild');
    const viewMutations = document.getElementById('viewMutations'); 
    const viewBuild = document.getElementById('viewBuild');

    if (tabMutations) {
        tabMutations.style.display = 'block'; 
        tabMutations.innerText = "🧬 МУТАЦИИ";
        tabMutations.classList.remove('active');
        
        tabMutations.onclick = () => {
            if (onOpenMutations) onOpenMutations();
        };
    }

    if (tabBuild) {
        tabBuild.classList.add('active');
        tabBuild.style.width = ""; 
        tabBuild.innerText = "🔨 СТРОЙКА";
        tabBuild.onclick = () => {};
    }

    if (viewBuild) viewBuild.style.display = 'block';
    if (viewMutations) viewMutations.style.display = 'none';
}

export function initUIButtons(callbacks) {
    ensureMenuButtonsExist();
    initTabs(callbacks.onOpenMutations);

    const btnWall = document.getElementById('btnBuildWall');
    const btnTower = document.getElementById('btnBuildTower');
    const btnGate = document.getElementById('btnBuildGate');
    const btnSpikes = document.getElementById('btnBuildSpikes');
    const btnPortal = document.getElementById('btnBuildPortal'); 
    
    // Получаем кнопки, которые мы только что создали или которые уже были
    const btnPresser = document.getElementById('btnBuildPresser');
    const btnResonator = document.getElementById('btnBuildResonator');
    const btnIce = document.getElementById('btnBuildIce');

    if(btnWall) btnWall.onclick = () => callbacks.onBuild('wall', 10);
    if(btnTower) btnTower.onclick = () => callbacks.onBuild('tower', 40);
    if(btnIce) btnIce.onclick = () => callbacks.onBuild('ice_tower', 60);
    if(btnGate) btnGate.onclick = () => callbacks.onBuild('gate', 15);
    if(btnSpikes) btnSpikes.onclick = () => callbacks.onBuild('spikes', 5);
    
    if(btnPortal) {
        btnPortal.onclick = () => callbacks.onBuild('portal', 0);
        btnPortal.style.display = 'block'; // Убеждаемся, что он виден
    }
    
    // Вешаем события на клик по всему блоку (так как внутри есть h3, p, button)
    if(btnPresser) btnPresser.onclick = () => callbacks.onBuild('presser', 50);
    if(btnResonator) btnResonator.onclick = () => callbacks.onBuild('resonator', 500);

    if(uiElements.closeMapBtn) {
        uiElements.closeMapBtn.onclick = () => { uiElements.mapScreen.style.display = 'none'; };
    }
}

export function openWorldMap(onTravelCallback) {
    if (!uiElements.mapScreen || !uiElements.mapGrid) return;
    uiElements.mapScreen.style.display = 'flex';
    uiElements.mapGrid.innerHTML = ''; 
    uiElements.mapGrid.style.display = 'grid';
    uiElements.mapGrid.style.gridTemplateColumns = 'repeat(10, 60px)';
    uiElements.mapGrid.style.gap = '10px';
    uiElements.mapGrid.style.justifyContent = 'center';

    globalWorld.forEach((zone) => {
        const div = document.createElement('div');
        div.className = 'map-cell';
        div.style.width = "60px"; div.style.height = "60px";
        div.style.display = "flex"; div.style.justifyContent = "center"; div.style.alignItems = "center";
        div.style.fontSize = "10px"; div.style.textAlign = "center";
        div.style.border = "1px solid #333"; div.style.position = "relative";

        if (zone.id === currentZoneIndex) {
            div.style.borderColor = "#00ff00"; div.style.backgroundColor = "#004400";
            div.innerHTML = `📍<br>${zone.name}`;
        } else if (zone.unlocked) {
            div.style.borderColor = "#ffff00"; div.style.backgroundColor = "#222"; div.style.cursor = "pointer";
            div.innerHTML = `${zone.name}<br>Ур.${zone.difficulty}`;
            div.onclick = () => {
                if (zone.id === currentZoneIndex) return; 
                uiElements.mapScreen.style.display = 'none'; 
                onTravelCallback(zone.id); 
            };
        } else {
            div.style.backgroundColor = "#111"; div.style.color = "#444"; div.innerHTML = "???";
        }
        if (zone.type === 'ocean') {
             div.style.backgroundColor = "#001133"; div.innerHTML = "~";
             div.style.borderColor = "#002244"; div.style.cursor = "default"; div.onclick = null;
        }
        uiElements.mapGrid.appendChild(div);
    });
}

export function unlockPortalButton() {
    const btn = document.getElementById('btnBuildPortal');
    if (btn) { btn.style.display = 'block'; btn.style.borderColor = "cyan"; btn.querySelector('h3').style.color = "cyan"; }
}

export function showMessage(text, color="white") {
    if (!uiElements.msg) return;
    uiElements.msg.innerText = text; uiElements.msg.style.color = color; uiElements.msg.style.display = "block";
    if (uiElements.msgTimer) clearTimeout(uiElements.msgTimer);
    uiElements.msgTimer = setTimeout(() => { uiElements.msg.style.display = "none"; }, 2000);
}

export function setMenuVisible(isVisible) {
    if (uiElements.upgradeMenu) { uiElements.upgradeMenu.style.display = isVisible ? "flex" : "none"; }
}

export function updateHUD(player, altarScore, playerFlesh, dayTime) {
    if(uiElements.altarPower) uiElements.altarPower.innerText = altarScore;
    if(uiElements.fleshCount) uiElements.fleshCount.innerText = playerFlesh.length;
    if(uiElements.cubeCount) uiElements.cubeCount.innerText = player.fleshCubes || 0;
    
    // Обновляем резонаторы
    const resCount = document.getElementById('resCount');
    if (resCount) resCount.innerText = player.resonators || 0;

    if(uiElements.hpBar) uiElements.hpBar.style.width = Math.max(0, (player.hp / player.maxHp) * 100) + "%";
    if(uiElements.staminaBar) uiElements.staminaBar.style.width = (player.stamina / player.maxStamina * 100) + "%";
    
    if (skillIcon) { const pct = (player.skillTimer / player.skillCooldown) * 100; skillIcon.style.height = pct + "%"; }
    let timeText = ""; let timeColor = "white";
    if (dayTime < 0.5) { timeText = "ДЕНЬ"; timeColor = "yellow"; }
    else if (dayTime < 0.8) { timeText = "ЗАКАТ"; timeColor = "orange"; }
    else { timeText = "НОЧЬ"; timeColor = "red"; }
    if(uiElements.dayCycle) { uiElements.dayCycle.innerText = timeText; uiElements.dayCycle.style.color = timeColor; }
    if(uiElements.fleshStatus) {
        if (playerFlesh.length > 0) {
            let avg = playerFlesh.reduce((a,b)=>a+b.freshness,0) / playerFlesh.length;
            uiElements.fleshStatus.innerText = avg > 60 ? "СВЕЖАЯ" : "ГНИЕТ";
            uiElements.fleshStatus.style.color = avg > 60 ? "#ff3333" : "orange";
        } else { uiElements.fleshStatus.innerText = "Пусто"; uiElements.fleshStatus.style.color = "#555"; }
    }
}

export function drawMinimap(ctx, player, altar, mobs, buildings, worldW, worldH, canvasW, canvasH) {
    const mapSize = 150; const margin = 20;
    const mapX = canvasW - mapSize - margin; const mapY = canvasH - mapSize - margin;
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)"; ctx.fillRect(mapX, mapY, mapSize, mapSize);
    ctx.strokeStyle = "#444"; ctx.lineWidth = 2; ctx.strokeRect(mapX, mapY, mapSize, mapSize);
    const toMapX = (x) => mapX + (x / worldW) * mapSize;
    const toMapY = (y) => mapY + (y / worldH) * mapSize;
    
    if (currentZoneIndex === 0) {
        ctx.fillStyle = "#d0f"; ctx.beginPath(); ctx.arc(toMapX(altar.x), toMapY(altar.y), 3, 0, Math.PI*2); ctx.fill();
    }
    buildings.forEach(b => {
        if (b.type === 'portal') { ctx.fillStyle = "cyan"; ctx.beginPath(); ctx.arc(toMapX(b.x), toMapY(b.y), 4, 0, Math.PI*2); ctx.fill(); } 
        else if (b.type === 'resonator') { ctx.fillStyle = "#ff00ff"; ctx.beginPath(); ctx.arc(toMapX(b.x), toMapY(b.y), 4, 0, Math.PI*2); ctx.fill(); }
        else { ctx.fillStyle = "#44f"; ctx.fillRect(toMapX(b.x), toMapY(b.y), 2, 2); }
    });
    mobs.forEach(mob => {
        if (mob.type === 'boss') { ctx.fillStyle = "red"; ctx.beginPath(); ctx.arc(toMapX(mob.x), toMapY(mob.y), 5, 0, Math.PI*2); ctx.fill(); }
        else { ctx.fillStyle = "#f44"; ctx.fillRect(toMapX(mob.x), toMapY(mob.y), 2, 2); }
    });
    ctx.fillStyle = "white"; ctx.beginPath(); ctx.arc(toMapX(player.x), toMapY(player.y), 3, 0, Math.PI*2); ctx.fill();
    ctx.restore();
}