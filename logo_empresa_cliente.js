/* ══════════════════════════════════════════════════
   LOGO_EMPRESA_CLIENTE.JS — Logo de la empresa: elegir imagen, reducirla, guardarla y mostrarla
   en el encabezado (#emisor-logo). Va a GET/POST/DELETE /empresa/logo (solo el administrador cambia).
   La imagen se reduce AQUÍ (máx. 480×240) para que pese poco; el servidor vuelve a validar (PNG/JPG ≤ 64 KB).
   Uso:  LogoEmpresa.montar(unDiv)      Depende de: Api
══════════════════════════════════════════════════ */
const LogoEmpresa = (() => {
    const MAX_ANCHO = 480, MAX_ALTO = 240, OBJETIVO_BYTES = 60 * 1024;
    const COLORES = { ok: '#4ade80', warn: '#f59e0b', error: '#f87171', info: '#60a5fa' };

    // Tamaño que cabe en la caja máxima sin deformar y sin agrandar. Función pura.
    function tamanoReducido(ancho, alto, maxAncho = MAX_ANCHO, maxAlto = MAX_ALTO) {
        const f = Math.min(1, maxAncho / ancho, maxAlto / alto);
        return { ancho: Math.max(1, Math.round(ancho * f)), alto: Math.max(1, Math.round(alto * f)) };
    }
    const bytesDe = dataUrl => Math.floor((dataUrl.length - dataUrl.indexOf(',') - 1) * 3 / 4);

    function cargarImagen(archivo) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(archivo), img = new Image();
            img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
            img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen. Usá un PNG o JPG.')); };
            img.src = url;
        });
    }

    // PNG (conserva transparencia); si pesa mucho, JPG sobre fondo blanco; si aún pesa, se achica más.
    async function reducir(archivo) {
        const img = await cargarImagen(archivo);
        let { ancho, alto } = tamanoReducido(img.naturalWidth || img.width, img.naturalHeight || img.height);
        for (let intento = 0; intento < 6; intento++) {
            const c = document.createElement('canvas'); c.width = ancho; c.height = alto;
            const g = c.getContext('2d');
            g.drawImage(img, 0, 0, ancho, alto);
            let url = c.toDataURL('image/png');
            if (bytesDe(url) > OBJETIVO_BYTES) {
                g.globalCompositeOperation = 'destination-over'; g.fillStyle = '#fff'; g.fillRect(0, 0, ancho, alto);
                url = c.toDataURL('image/jpeg', 0.85);
            }
            if (bytesDe(url) <= OBJETIVO_BYTES) return url;
            ancho = Math.max(1, Math.round(ancho * 0.75)); alto = Math.max(1, Math.round(alto * 0.75));
        }
        throw new Error('La imagen es demasiado pesada. Probá con otra más simple.');
    }

    // Encabezado de la pantalla: el logo reemplaza al ícono 📄.
    function pintarEncabezado(logo) {
        const el = document.getElementById('emisor-logo'); if (!el) return;
        el.innerHTML = '';
        if (!logo) { el.textContent = '📄'; return; }
        const img = document.createElement('img');
        img.src = logo; img.alt = 'Logo'; img.style.cssText = 'height:40px;max-width:120px;object-fit:contain;display:block;border-radius:4px';
        el.appendChild(img);
    }

    function montar(cont) {
        cont.innerHTML = `
        <div data-vista style="display:flex;align-items:center;justify-content:center;min-height:90px;background:#0f1117;border:1px dashed #2d3748;border-radius:8px;padding:10px;margin-bottom:10px">
            <span data-vacio style="font-size:12px;color:#4a5568">Todavía no cargaste un logo</span>
        </div>
        <input type="file" data-archivo accept="image/png,image/jpeg,image/webp" style="display:none">
        <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button data-elegir type="button" style="flex:1;min-width:140px;padding:10px 14px;background:rgba(0,119,255,.15);border:1px solid rgba(0,119,255,.4);color:#60a5fa;font-weight:700;font-size:12px;border-radius:6px;cursor:pointer">🖼 Elegir logo</button>
            <button data-quitar type="button" style="padding:10px 14px;background:transparent;border:1px solid #2d3748;color:#94a3b8;font-weight:700;font-size:12px;border-radius:6px;cursor:pointer;display:none">Quitar</button>
        </div>
        <div data-estado style="margin-top:8px;font-size:12px;color:#94a3b8"></div>`;
        const $ = s => cont.querySelector(s);
        const estado = (msg, tipo) => { const e = $('[data-estado]'); e.style.color = COLORES[tipo] || '#94a3b8'; e.textContent = msg; };

        function mostrar(logo) {
            const vista = $('[data-vista]');
            vista.querySelectorAll('img').forEach(i => i.remove());
            $('[data-vacio]').style.display = logo ? 'none' : '';
            $('[data-quitar]').style.display = logo ? '' : 'none';
            if (logo) { const i = document.createElement('img'); i.src = logo; i.alt = 'Logo'; i.style.cssText = 'max-width:100%;max-height:120px;object-fit:contain'; vista.appendChild(i); }
            pintarEncabezado(logo);
        }

        async function cargar() {
            if (!Api.token()) { mostrar(null); estado('Ingresá con tu usuario para ver y cambiar el logo.', 'info'); return; }
            const r = await Api.json('/empresa/logo', 'GET').catch(() => ({ ok: false }));
            if (r.ok) { mostrar(r.logo); estado('', 'info'); } else estado('❌ ' + (r.error || 'No se pudo leer el logo'), 'error');
        }

        $('[data-elegir]').onclick = () => {
            if (!Api.token()) return estado('Ingresá con tu usuario para cambiar el logo.', 'warn');
            $('[data-archivo]').click();
        };
        $('[data-archivo]').onchange = async ev => {
            const f = ev.target.files[0]; ev.target.value = ''; if (!f) return;
            estado('⏳ Preparando la imagen…', 'info');
            try {
                const imagen = await reducir(f);
                estado('📤 Guardando el logo…', 'info');
                const r = await Api.json('/empresa/logo', 'POST', { imagen });
                if (r.ok) { mostrar(r.logo); estado(r.mensaje, 'ok'); } else estado('❌ ' + (r.error || 'No se pudo guardar el logo'), 'error');
            } catch (e) { estado('❌ ' + e.message, 'error'); }
        };
        $('[data-quitar]').onclick = async () => {
            const r = await Api.json('/empresa/logo', 'DELETE').catch(e => ({ ok: false, error: e.message }));
            if (r.ok) { mostrar(null); estado('Logo quitado', 'ok'); } else estado('❌ ' + (r.error || 'No se pudo quitar el logo'), 'error');
        };

        window.addEventListener('sesion-lista', cargar);
        ['sesion-cerrada', 'sesion-expirada'].forEach(ev => window.addEventListener(ev, () => { mostrar(null); estado('', 'info'); }));
        if (Api.token()) cargar();
        return { cargar, mostrar };
    }

    return { montar, tamanoReducido, reducir, pintarEncabezado };
})();
if (typeof module !== 'undefined') module.exports = LogoEmpresa;
