// Utilidades de color para los avatares
// ---------- utilidades de color ----------
export function hex2rgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
export function rgb2hex(r, g, b) { return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
export function shade(hex, p) { const [r, g, b] = hex2rgb(hex); const t = p < 0 ? 0 : 255, k = Math.abs(p); return rgb2hex(r + (t - r) * k, g + (t - g) * k, b + (t - b) * k); }
export const lum = (hex) => { const [r, g, b] = hex2rgb(hex); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
