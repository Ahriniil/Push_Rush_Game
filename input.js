export const keys = {};
export const mouse = { x: 0, y: 0, isDown: false };

export function initInput(canvas) {
    window.addEventListener('keydown', e => keys[e.key] = true);
    window.addEventListener('keyup', e => keys[e.key] = false);

    canvas.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
    });

    canvas.addEventListener('mousedown', () => mouse.isDown = true);
    canvas.addEventListener('mouseup', () => mouse.isDown = false);
}