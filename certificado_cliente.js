/* ══════════════════════════════════════════════════
   CERTIFICADO_CLIENTE.JS — Carga del certificado .p12 de la empresa.
   Pieza reutilizable copiada de CFB (mi-empresa.js: onP12Selected / subirP12 /
   setSriP12Status): mismo bloque (cuadro 🔐, contraseña, "Subir", estado) y
   mismos mensajes. Cambia solo el envío: va a POST /certificado del servidor
   (p12Base64 + clave) y no a /cargar-certificado-b64.
   Uso:  Certificado.montar(unDiv)      Depende de: Api, Modal.esc
══════════════════════════════════════════════════ */
const Certificado = (() => {
    const COLORES = { ok: '#4ade80', warn: '#f59e0b', error: '#f87171', info: '#60a5fa' };

    function montar(cont) {
        let archivo = null;
        cont.innerHTML = `
        <div style="font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px">Certificado .p12</div>
        <div data-zona style="border:2px dashed #2d3748;border-radius:6px;padding:18px;text-align:center;cursor:pointer">
            <div style="font-size:26px;margin-bottom:6px">🔐</div>
            <div data-etiqueta style="font-size:13px;color:#94a3b8">Tocá para seleccionar tu archivo <strong>.p12</strong></div>
        </div>
        <input type="file" data-archivo accept=".p12,.pfx" style="display:none">
        <div style="margin-top:10px;display:flex;gap:8px">
            <input data-clave type="password" placeholder="Contraseña del .p12" autocomplete="off"
                style="flex:1;padding:10px 12px;background:#0f1117;border:1px solid #2d3748;border-radius:6px;color:#e2e8f0;font-size:13px">
            <button data-subir type="button" style="padding:10px 16px;background:rgba(0,119,255,.15);border:1px solid rgba(0,119,255,.4);color:#60a5fa;font-weight:700;font-size:12px;border-radius:6px;cursor:pointer;white-space:nowrap">Subir</button>
        </div>
        <div data-estado style="margin-top:8px;font-size:12px;color:#94a3b8"></div>`;
        const $ = s => cont.querySelector(s);

        function estado(msg, tipo) { const el = $('[data-estado]'); el.style.color = COLORES[tipo] || '#94a3b8'; el.textContent = msg; }

        $('[data-zona]').onclick = () => $('[data-archivo]').click();
        $('[data-archivo]').onchange = ev => {
            const f = ev.target.files[0]; if (!f) return;
            archivo = f;
            $('[data-etiqueta]').innerHTML = '✅ <strong>' + Modal.esc(f.name) + '</strong> seleccionado';
            $('[data-zona]').style.borderColor = '#4ade80';
        };

        const aBase64 = f => new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result.split(',')[1]);
            r.onerror = () => reject(new Error('No se pudo leer el archivo'));
            r.readAsDataURL(f);
        });

        $('[data-subir]').onclick = async () => {
            if (!archivo) return estado('Seleccioná un archivo .p12 primero', 'warn');
            const clave = $('[data-clave]').value;
            if (!clave) return estado('Ingresá la contraseña del .p12', 'warn');
            estado('⏳ Leyendo certificado…', 'info');
            try {
                const p12Base64 = await aBase64(archivo);
                estado('📤 Subiendo certificado al servidor…', 'info');
                const r = await Api.json('/certificado', 'POST', { p12Base64, clave });
                if (r.ok) { estado('✅ ' + r.mensaje + ' · ' + r.titular + ' · Vence: ' + r.vencimiento, 'ok'); $('[data-clave]').value = ''; }
                else estado('❌ ' + (r.error || 'No se pudo guardar el certificado'), 'error');
            } catch (e) { estado('❌ ' + e.message, 'error'); }
        };

        return { estado };
    }

    return { montar };
})();
