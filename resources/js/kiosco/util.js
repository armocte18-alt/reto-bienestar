export const AVATARES = {
    cerdito: '🐷', buho: '🦉', abeja: '🐝', zorro: '🦊',
    tortuga: '🐢', rana: '🐸', leon: '🦁', pulpo: '🐙',
};

export const GRUPO_CLASE = { ninos: 'g-ninos', jovenes: 'g-jovenes', adultos: 'g-adultos' };

export function esc(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

export function mezclar(lista) {
    const a = [...lista];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export const fmt = (n) => Number(n || 0).toLocaleString('es-MX');

export const moneda = (n, clase = '') => `<span class="puntos ${clase}"><span class="moneda" aria-hidden="true"></span>${fmt(n)}<span class="sr">&nbsp;pts</span></span>`;

/** Número que aparece y sube desde un elemento, p. ej. "+68". */
export function flotar(texto, ancla) {
    const r = ancla?.getBoundingClientRect?.() ?? { left: innerWidth / 2, top: innerHeight / 2, width: 0 };
    const el = document.createElement('div');
    el.className = 'flota';
    el.textContent = texto;
    el.style.left = `${r.left + r.width / 2 - 30}px`;
    el.style.top = `${r.top}px`;
    document.body.append(el);
    setTimeout(() => el.remove(), 950);
}

export const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
