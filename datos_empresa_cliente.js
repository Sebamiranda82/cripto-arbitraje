/* ══════════════════════════════════════════════════
   DATOS_EMPRESA_CLIENTE.JS — Pestaña Empresa: ver y editar los datos de la empresa de la sesión.
   Lee GET /empresa y guarda con POST /empresa (solo administrador; el servidor valida todo otra vez).
   RUC, establecimiento, punto de emisión y ambiente también se editan aquí mismo; como un error en ellos rompe la numeración o
   emite en el ambiente equivocado, al guardar un cambio en esos cuatro se muestra qué cambia y se pide confirmación.
   Al guardar avisa con el evento 'empresa-actualizada' (Emisor actualiza el encabezado y la vista previa).
   Uso:  DatosEmpresa.montar(unDiv)  →  { recargar }      Depende de: Api, Modal.esc
══════════════════════════════════════════════════ */
const DatosEmpresa = (() => {
    const COLORES = { ok: '#4ade80', warn: '#f59e0b', error: '#f87171', info: '#60a5fa' };
    const REGIMENES = [['GENERAL', 'Régimen general'], ['RIMPE_EMPRENDEDOR', 'RIMPE Emprendedor'], ['RIMPE_NEGOCIO_POPULAR', 'RIMPE Negocio Popular']];
    const AMBIENTES = { '1': 'Pruebas', '2': 'Producción' };
    const ESTILO_INPUT = 'width:100%;box-sizing:border-box;padding:10px 12px;background:#0f1117;border:1px solid #2d3748;border-radius:6px;color:#e2e8f0;font-size:13px;font-family:inherit';

    const campo = (titulo, html) => `<label style="display:block;min-width:0"><div style="font-size:11px;color:#94a3b8;margin-bottom:4px">${titulo}</div>${html}</label>`;
    const input = (id, valor, extra = '') => `<input data-${id} value="${Modal.esc(valor || '')}" ${extra} style="${ESTILO_INPUT}">`;
    const SENSIBLES = [['ruc', 'RUC'], ['estab', 'Establecimiento'], ['ptoEmi', 'Punto de emisión'], ['ambiente', 'Ambiente']];
    const nombreAmbiente = v => AMBIENTES[String(v)] || String(v);
    // Texto de confirmación con lo que cambia en RUC / establecimiento / punto / ambiente (vacío = no cambió ninguno de los cuatro).
    function textoConfirmacion(antes, ahora) {
        const lineas = [];
        SENSIBLES.forEach(([k, t]) => {
            if (String(antes[k] ?? '') === String(ahora[k] ?? '')) return;
            const f = x => k === 'ambiente' ? nombreAmbiente(x) : x;
            lineas.push(`• ${t}: ${f(antes[k])}  →  ${f(ahora[k])}`);
        });
        if (!lineas.length) return '';
        const avisos = [];
        if (String(antes.ambiente) !== String(ahora.ambiente)) avisos.push(String(ahora.ambiente) === '2' ? 'Desde ahora las facturas serán REALES (producción).' : 'Desde ahora las facturas serán de PRUEBA y no tienen validez tributaria.');
        if (String(antes.ruc) !== String(ahora.ruc)) avisos.push('El certificado de firma debe pertenecer al nuevo RUC.');
        if (String(antes.estab) !== String(ahora.estab) || String(antes.ptoEmi) !== String(ahora.ptoEmi)) avisos.push('La numeración sigue la serie establecimiento-punto: una serie nueva empieza en 1.');
        return `⚠️ Vas a cambiar datos de facturación:\n\n${lineas.join('\n')}\n\n${avisos.join('\n')}\n\n¿Estás seguro de guardar este cambio?`;
    }

    function montar(cont) {
        let actual = null;     // lo último leído del servidor (de ahí salen RUC, estab., punto y ambiente)
        const $ = s => cont.querySelector(s);
        const estado = (msg, tipo) => { const e = $('[data-estado]'); if (e) { e.style.color = COLORES[tipo] || '#94a3b8'; e.textContent = msg; } };

        function pintarSinSesion(texto) {
            actual = null;
            cont.innerHTML = `<div data-estado style="font-size:12px;color:#94a3b8">${Modal.esc(texto)}</div>`;
        }

        function pintar(e) {
            actual = e;
            cont.innerHTML = `
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px">
                ${campo('RAZÓN SOCIAL', input('razon', e.razon_social, 'maxlength="300"'))}
                ${campo('NOMBRE COMERCIAL', input('comercial', e.nombre_comercial, 'maxlength="300"'))}
                ${campo('DIRECCIÓN MATRIZ', input('dirmatriz', e.dir_matriz, 'maxlength="300"'))}
                ${campo('DIRECCIÓN DEL ESTABLECIMIENTO', input('direst', e.dir_establecimiento, 'maxlength="300" placeholder="Si es la misma, déjala vacía"'))}
                ${campo('TELÉFONO', input('tel', e.tel, 'maxlength="20" inputmode="tel"'))}
                ${campo('CORREO', input('email', e.email, 'maxlength="100" inputmode="email"'))}
                ${campo('RÉGIMEN', `<select data-regimen style="${ESTILO_INPUT}">${REGIMENES.map(([v, t]) => `<option value="${v}"${v === e.regimen ? ' selected' : ''}>${t}</option>`).join('')}</select>`)}
                ${campo('OBLIGADO A LLEVAR CONTABILIDAD', `<select data-obligado style="${ESTILO_INPUT}"><option value="NO"${e.obligado_contabilidad === 'SI' ? '' : ' selected'}>No</option><option value="SI"${e.obligado_contabilidad === 'SI' ? ' selected' : ''}>Sí</option></select>`)}
            </div>
            <label style="display:flex;gap:8px;align-items:center;margin-top:12px;font-size:12px;color:#cbd5e1;cursor:pointer">
                <input type="checkbox" data-iva ${Number(e.precios_incluyen_iva) === 0 ? '' : 'checked'}> Los precios de mis productos ya incluyen IVA
            </label>
            <div style="margin-top:14px;padding-top:12px;border-top:1px solid #2d3748">
                <div style="font-size:11px;color:#94a3b8;margin-bottom:8px">DATOS DE FACTURACIÓN (al cambiarlos te pedimos confirmación)</div>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px">
                    ${campo('RUC', input('ruc', e.ruc, 'maxlength="13" inputmode="numeric"'))}
                    ${campo('ESTABLECIMIENTO', input('estab', e.estab || '001', 'maxlength="3" inputmode="numeric"'))}
                    ${campo('PUNTO DE EMISIÓN', input('ptoemi', e.pto_emi || '001', 'maxlength="3" inputmode="numeric"'))}
                    ${campo('AMBIENTE', `<select data-ambiente style="${ESTILO_INPUT}">${Object.entries(AMBIENTES).map(([val, t]) => `<option value="${val}"${val === String(e.ambiente) ? ' selected' : ''}>${t}</option>`).join('')}</select>`)}
                </div>
            </div>
            <button data-guardar type="button" style="margin-top:14px;width:100%;padding:11px;background:#1d4ed8;color:#fff;border:none;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer">Guardar datos</button>
            <div data-estado style="margin-top:8px;font-size:12px;color:#94a3b8"></div>`;
            $('[data-guardar]').onclick = guardar;
        }

        const v = s => ($(s).value || '').trim();

        async function guardar() {
            if (!actual) return;
            const ahora = { ruc: v('[data-ruc]'), estab: v('[data-estab]'), ptoEmi: v('[data-ptoemi]'), ambiente: $('[data-ambiente]').value };
            const antes = { ruc: actual.ruc, estab: actual.estab || '001', ptoEmi: actual.pto_emi || '001', ambiente: String(actual.ambiente) };
            const pregunta = textoConfirmacion(antes, ahora);
            if (pregunta && !confirm(pregunta)) { estado('Cambio cancelado: no se guardó nada.', 'info'); return; }
            const btn = $('[data-guardar]'); btn.disabled = true; estado('⏳ Guardando…', 'info');
            try {
                const r = await Api.json('/empresa', 'POST', {
                    ruc: ahora.ruc, estab: ahora.estab, ptoEmi: ahora.ptoEmi, ambiente: ahora.ambiente,
                    razonSocial: v('[data-razon]'), nombreComercial: v('[data-comercial]'),
                    dirMatriz: v('[data-dirmatriz]'), dirEstablecimiento: v('[data-direst]'),
                    tel: v('[data-tel]'), email: v('[data-email]'),
                    regimen: $('[data-regimen]').value, obligadoContabilidad: $('[data-obligado]').value,
                    preciosIncluyenIva: $('[data-iva]').checked,
                });
                if (!r.ok) { estado('❌ ' + (r.error || 'No se pudo guardar'), 'error'); return; }
                const nuevo = await Api.json('/empresa', 'GET');
                if (nuevo.ok && nuevo.data) { pintar(nuevo.data); window.dispatchEvent(new CustomEvent('empresa-actualizada', { detail: { empresa: nuevo.data } })); }
                estado(r.mensaje || 'Datos guardados ✅', 'ok');
            } catch (e) { estado('❌ ' + e.message, 'error'); }
            finally { const b = $('[data-guardar]'); if (b) b.disabled = false; }
        }

        async function recargar() {
            if (!Api.token()) return pintarSinSesion('Ingresá con tu usuario (botón "Ingresar", arriba) para ver y editar los datos de tu empresa.');
            const r = await Api.json('/empresa', 'GET').catch(e => ({ ok: false, error: e.message }));
            if (r.ok && r.data) pintar(r.data); else pintarSinSesion(r.error || 'No se pudieron leer los datos de la empresa.');
        }

        window.addEventListener('sesion-lista', recargar);
        ['sesion-cerrada', 'sesion-expirada'].forEach(ev => window.addEventListener(ev, () => pintarSinSesion('Ingresá con tu usuario (botón "Ingresar", arriba) para ver y editar los datos de tu empresa.')));
        recargar();
        return { recargar };
    }
    return { montar };
})();
