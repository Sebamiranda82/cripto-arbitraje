/* ══════════════════════════════════════════════════
   CATALOGO_CLIENTE.JS — Catálogo de productos por empresa (Excel con
   columnas Nombre, Precio, Iva). Depende de: Api, excel_utils.js, IvaCalculo.
   El navegador NO valida precios ni IVA: manda las filas tal cual y muestra
   los errores que devuelve el servidor (una sola fuente de reglas).
   Catalogo.autocompletar(input, onSelect) queda listo para el formulario
   de factura (Fase 3).
══════════════════════════════════════════════════ */
const Catalogo = (() => {
    let cache = [];            // productos de la empresa, en memoria
    let incluyeIva = true;
    const esc = Modal.esc;
    const sinAcentos = s => normalizarEncabezado(s);

    async function recargar() {
        const r = await Api.json('/productos', 'GET');
        if (r.ok) cache = r.data.map(p => ({ id: p.id, nombre: p.nombre, precio: Number(p.pvp1), iva: Number(p.iva_pct) }));
        return r;
    }

    function buscar(q, limite) {
        const n = sinAcentos(q);
        if (!n) return [];
        return cache.filter(p => sinAcentos(p.nombre).includes(n)).slice(0, limite || 8);
    }

    // Excel → filas crudas {nombre, precio, iva} (solo mapea columnas)
    async function filasDesdeExcel(file) {
        const rows = await leerFilasExcel(file);
        if (!rows.length) throw new Error('El Excel está vacío.');
        const enc = rows[0].map(normalizarEncabezado);
        const iN = indiceColumna(enc, ['nombre']), iP = indiceColumna(enc, ['precio']), iI = indiceColumna(enc, ['iva']), iC = indiceColumna(enc, ['cantidad']);
        if (iN < 0 || iP < 0 || iI < 0) throw new Error('El Excel debe tener las columnas: Nombre, Precio, Iva (en la primera fila).');
        return rows.slice(1).filter(r => r && r.some(c => String(c).trim() !== ''))
            .map(r => ({ nombre: r[iN], precio: r[iP], iva: r[iI], cantidad: iC >= 0 ? r[iC] : undefined }));
    }

    async function subirExcel(file) {
        const filas = await filasDesdeExcel(file);
        const r = await Api.json('/productos/sync', 'POST', { productos: filas.map(({ nombre, precio, iva }) => ({ nombre, precio, iva })) });
        if (r.ok) await recargar();
        return r;
    }

    async function guardarPreciosIncluyenIva(valor) {
        const r = await Api.json('/empresa/precios-iva', 'PATCH', { incluyen: !!valor });
        if (r.ok) incluyeIva = !!valor;
        return r;
    }

    // Dropdown bajo un <input>. onSelect(producto) al elegir.
    function autocompletar(input, onSelect) {
        const lista = document.createElement('div');
        lista.style.cssText = 'position:absolute;z-index:50;left:0;right:0;top:100%;background:#0f1117;border:1px solid #2d3748;border-radius:8px;max-height:220px;overflow-y:auto;display:none';
        input.parentElement.style.position = 'relative';
        input.parentElement.appendChild(lista);
        input.addEventListener('input', () => {
            const res = buscar(input.value);
            if (!res.length) { lista.style.display = 'none'; return; }
            lista.innerHTML = res.map((p, i) => `<div data-i="${i}" style="padding:9px 12px;font-size:13px;cursor:pointer;border-bottom:1px solid #1a1f2e">${esc(p.nombre)} <span style="color:#94a3b8;float:right">$${p.precio.toFixed(2)} · IVA ${p.iva}%</span></div>`).join('');
            lista.style.display = 'block';
            lista.onclick = e => {
                const el = e.target.closest('[data-i]'); if (!el) return;
                const p = res[Number(el.dataset.i)];
                input.value = p.nombre; lista.style.display = 'none'; onSelect(p);
            };
        });
        input.addEventListener('blur', () => setTimeout(() => { lista.style.display = 'none'; }, 150));
    }

    // Panel completo del catálogo dentro de un contenedor.
    function montarPanel(cont) {
        cont.innerHTML = `
        <div style="background:#1a1f2e;border:1px solid #2d3748;border-radius:16px;padding:20px">
          <div style="font-size:13px;font-weight:700;color:#94a3b8;letter-spacing:2px;margin-bottom:6px">CATÁLOGO DE PRODUCTOS</div>
          <div id="cat-estado" style="font-size:12px;color:#718096;margin-bottom:14px"></div>
          <div id="cat-contenido" style="display:none">
            <label style="display:flex;gap:8px;align-items:center;font-size:12px;color:#e2e8f0;margin-bottom:14px">
              <input type="checkbox" id="cat-incluye"> Los precios de mi Excel ya incluyen IVA</label>
            <input type="file" id="cat-archivo" accept=".xlsx,.xls,.csv" style="display:none">
            <button id="cat-subir" style="background:#1d4ed8;color:#fff;border:none;border-radius:8px;padding:9px 14px;font-size:12px;font-weight:700;cursor:pointer">📂 Cargar Excel (Nombre, Precio, Iva)</button>
            <div style="font-size:11px;color:#718096;margin-top:6px">Iva solo puede ser 0, 5 o 15. Cada carga reemplaza todo el catálogo.</div>
            <div id="cat-errores" style="font-size:12px;color:#f87171;margin-top:10px;white-space:pre-wrap"></div>
            <div style="margin-top:16px;position:relative"><input id="cat-probar" placeholder="Probar búsqueda por nombre…" style="width:100%;box-sizing:border-box;background:#0f1117;border:1px solid #2d3748;border-radius:8px;padding:10px;color:#e2e8f0;font-size:14px"></div>
            <div id="cat-detalle" style="font-size:12px;color:#e2e8f0;margin-top:10px"></div>
          </div>
        </div>`;
        const $ = id => cont.querySelector('#' + id);

        function pintarEstado(extra) { $('cat-estado').textContent = `${cache.length} producto(s) cargado(s). ${extra || ''}`; }

        $('cat-subir').onclick = () => $('cat-archivo').click();
        $('cat-archivo').onchange = async ev => {
            const f = ev.target.files[0]; ev.target.value = ''; if (!f) return;
            $('cat-errores').textContent = ''; $('cat-estado').textContent = 'Cargando…';
            try {
                const r = await subirExcel(f);
                if (!r.ok) { $('cat-errores').textContent = [r.error, ...(r.errores || [])].join('\n'); pintarEstado('No se guardó nada nuevo.'); }
                else pintarEstado('Catálogo actualizado ✅');
            } catch (e) { $('cat-errores').textContent = e.message; pintarEstado(); }
        };
        $('cat-incluye').onchange = async ev => {
            const r = await guardarPreciosIncluyenIva(ev.target.checked);
            if (!r.ok) { ev.target.checked = !ev.target.checked; $('cat-errores').textContent = r.error || 'No se pudo guardar'; }
        };
        autocompletar($('cat-probar'), p => {
            const d = IvaCalculo.desglosar(p.precio, p.iva, incluyeIva);
            $('cat-detalle').innerHTML = `<b>${esc(p.nombre)}</b><br>Precio Excel: $${p.precio.toFixed(2)} (${incluyeIva ? 'incluye IVA' : 'sin IVA'}) · IVA ${p.iva}%<br>Base $${d.base.toFixed(2)} + IVA $${d.iva.toFixed(2)} = <b>Total $${d.total.toFixed(2)}</b>`;
        });

        // Se activa cuando hay sesión con empresa.
        async function activar(empresa) {
            incluyeIva = empresa ? empresa.precios_incluyen_iva !== 0 : true;
            $('cat-incluye').checked = incluyeIva;
            $('cat-contenido').style.display = 'block';
            const r = await recargar();
            if (!r.ok) { $('cat-estado').textContent = r.error || 'No se pudo cargar el catálogo'; return; }
            pintarEstado();
        }
        function desactivar() { cache = []; $('cat-contenido').style.display = 'none'; $('cat-estado').textContent = 'Ingresa con tu cuenta para usar el catálogo.'; }
        desactivar();
        window.addEventListener('sesion-lista', e => activar(e.detail.empresa));
        window.addEventListener('sesion-cerrada', desactivar);
        window.addEventListener('sesion-expirada', desactivar);
    }

    return { montarPanel, buscar, autocompletar, recargar, subirExcel, filasDesdeExcel, get productos() { return cache; }, get incluyeIva() { return incluyeIva; } };
})();
