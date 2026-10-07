/* ══════════════════════════════════════════════════
   UI_MODAL.JS — Ventana modal oscura reutilizable (login, nota de crédito, etc.).
   Modal.crear() devuelve { caja, abrir, cerrar, msg }. Los estilos de
   formularios dentro de la caja (label, input, .btn, .btn.sec, .msg, .tabs, .nota)
   viven aquí, una sola vez.
══════════════════════════════════════════════════ */
const Modal = (() => {
    const CSS = `
    .mdl{display:none;position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.88);align-items:center;justify-content:center}
    .mdl.open{display:flex}
    .mdl .caja{background:#1a1f2e;border:1px solid #2d3748;border-radius:16px;padding:24px;width:92%;max-width:400px;max-height:92vh;overflow-y:auto;color:#e2e8f0}
    .mdl h3{margin:0 0 14px;font-size:14px;letter-spacing:1px;color:#f7c948}
    .mdl label{display:block;font-size:11px;color:#94a3b8;margin:10px 0 4px}
    .mdl input,.mdl textarea{width:100%;box-sizing:border-box;background:#0f1117;border:1px solid #2d3748;border-radius:8px;padding:10px;color:#e2e8f0;font-size:14px;font-family:inherit}
    .mdl .btn{width:100%;margin-top:14px;padding:11px;border:none;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;background:#1d4ed8;color:#fff}
    .mdl .btn:disabled{opacity:.5;cursor:default}
    .mdl .btn.sec{background:transparent;border:1px solid #2d3748;color:#94a3b8}
    .mdl .msg{margin-top:10px;font-size:12px;min-height:16px;color:#f87171}
    .mdl .msg.ok{color:#4ade80}
    .mdl .tabs{display:flex;gap:4px;background:#0f1117;border-radius:8px;padding:3px;margin-bottom:6px}
    .mdl .tabs button{flex:1;padding:8px;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;background:transparent;color:#718096}
    .mdl .tabs button.on{background:#1a1f2e;color:#f7c948}
    .mdl .nota{font-size:11px;color:#718096;margin-top:8px;line-height:1.5}`;
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    let cssPuesto = false;

    function crear() {
        if (!cssPuesto) { const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st); cssPuesto = true; }
        const el = document.createElement('div');
        el.className = 'mdl';
        el.innerHTML = '<div class="caja"></div>';
        document.body.appendChild(el);
        const caja = el.firstChild;
        return {
            caja,
            abrir: () => el.classList.add('open'),
            cerrar: () => el.classList.remove('open'),
            estaAbierto: () => el.classList.contains('open'),
            // Muestra un texto en el elemento .msg de la caja (ok=true en verde).
            msg(txt, ok) { const m = caja.querySelector('.msg'); if (m) { m.textContent = txt || ''; m.className = 'msg' + (ok ? ' ok' : ''); } },
        };
    }
    return { crear, esc };
})();
