/* ══════════════════════════════════════════════════
   TEMAS_FACTURADOR_CLIENTE.JS — Puente entre ESTA pantalla y el tema. Es la única pieza específica del facturador.

   La pantalla fue escrita con colores fijos del modo oscuro (#0f1117, #94a3b8, …) dentro de cada elemento.
   Este archivo dice qué color equivale a cada uno en el tema claro, usando las variables de la paleta
   (--bg, --surface, --border, --accent, --text, --muted de temas_paleta.css). En el tema oscuro no cambia nada.

   Cuando la pantalla use directamente las variables, este archivo deja de hacer falta.
   Para ajustar un color del tema claro, se cambia UNA línea de la tabla EQUIVALENCIAS.
   Depende de: temas_paleta.css (las variables).
══════════════════════════════════════════════════ */
(() => {
    // [color fijo del modo oscuro] → [lo que debe verse en el tema claro]
    const EQUIVALENCIAS = {
        fondo: {
            '#0f1117': 'var(--bg)', '#12151d': 'var(--bg)',                 // zonas "hundidas" (los campos de texto los pone el estilo VB6)
            '#1a1f2e': 'var(--surface)', '#16213e': 'var(--surface)',       // tarjetas y encabezado
            '#1a2744': '#e8f0fb', '#0a1a0a': '#e6f4ea', '#3b2f0a': '#fff4d6', '#3b1010': '#fde8e8',
            '#1d4ed8': 'var(--accent)', '#166534': '#2e7d32', '#7c3aed': '#6a3fb5', '#374151': 'var(--bg)',
        },
        texto: {
            '#e2e8f0': 'var(--text)', '#cbd5e1': 'var(--text)',
            '#94a3b8': 'var(--muted)', '#718096': 'var(--muted)', '#4a5568': 'var(--muted)',
            '#f7c948': 'var(--accent)', '#60a5fa': 'var(--accent2)',
            '#4ade80': '#1b7a3a', '#f87171': '#b3261e', '#fbbf24': '#8a5a00',   // verde, rojo y ámbar con buen contraste sobre claro
        },
        borde: {
            '#2d3748': 'var(--border)', '#374151': 'var(--border)', '#4a6fa5': 'var(--accent)', '#2d4a8a': 'var(--accent2)',
            '#166534': '#2e7d32', '#16a34a': '#2e7d32', '#92400e': '#b08000', '#991b1b': '#c0392b',
        },
    };

    const rgb = hex => { const n = parseInt(hex.slice(1), 16); return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`; };
    // Reconoce el color escrito en el HTML (#hex) y el puesto por el programa (rgb(...)).
    const formas = (prefijos, hex) => prefijos.flatMap(p => [`[style*="${p}${hex}" i]`, `[style*="${p}${rgb(hex)}" i]`]);
    const SIN_BOTON = ':not(button):not(.btn-xml)';                    // los botones tienen su propio estilo (temas_vb6.css)
    const SIN_CAMPO = ':not(input):not(select):not(textarea)';         // los campos también

    function css() {
        const L = 'html[data-theme="light"]', reglas = [];
        const por = (mapa, prefijos, propiedad, extra = '') => Object.entries(mapa).forEach(([oscuro, claro]) =>
            reglas.push(`${formas(prefijos, oscuro).map(s => `${L} ${s}${SIN_BOTON}${extra}`).join(',')}{${propiedad}:${claro} !important}`));
        por(EQUIVALENCIAS.fondo, ['background:', 'background: ', 'background-color:', 'background-color: '], 'background', SIN_CAMPO);
        por(EQUIVALENCIAS.texto, ['color:', 'color: '], 'color');
        por(EQUIVALENCIAS.borde, [''], 'border-color');
        return reglas.join('\n') + `
        ${L} body{background:var(--bg) !important;color:var(--text) !important}
        ${L} [style*="linear-gradient(135deg" i]{background:var(--surface) !important}
        ${L} .modal-box{background:var(--surface) !important;border-color:var(--border) !important}
        ${L} .modal-title{color:var(--accent) !important}
        ${L} .label-sm{color:var(--muted) !important}
        ${L} .xml-preview{background:var(--bg) !important;color:var(--text) !important;border-color:var(--border) !important}
        ${L} .badge{background:#e8f0fb !important;border-color:var(--accent2) !important;color:var(--accent) !important}
        ${L} input[type="date"]{color-scheme:light}
        html[data-theme] #barra-tabs{background:transparent !important;border-radius:0 !important}`;
    }

    const estilo = document.createElement('style'); estilo.id = 'temas-facturador-css';
    estilo.textContent = css();
    (document.head || document.documentElement).appendChild(estilo);
})();
