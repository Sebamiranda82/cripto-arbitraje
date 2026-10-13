/* ══════════════════════════════════════════════════
   LISTADO_DOCUMENTOS_CLIENTE.JS — Pestaña "Listado de Documentos": filtro por tipo (facturas, notas de crédito, notas de
   débito, guías de remisión, retenciones o todos) y por rango de fechas. Por defecto muestra FACTURAS, que es lo más consultado.
   · Facturas: sigue usando la tabla de siempre (con imprimir y nota de crédito); aquí solo se le aplica el rango de fechas.
   · Los demás tipos salen del servidor (GET /comprobantes?tipo=) y se muestran en una tabla común.
   Pieza reutilizable: no sabe nada de la página; recibe lo que necesita en iniciar().
══════════════════════════════════════════════════ */
const ListadoDocumentos = (() => {
    const TIPOS = [['01', 'Facturas'], ['04', 'Notas de crédito'], ['05', 'Notas de débito'], ['06', 'Guías de remisión'], ['07', 'Retenciones'], ['todos', 'Todos los documentos']];
    const NOMBRE_CORTO = { '01': 'Factura', '04': 'Nota crédito', '05': 'Nota débito', '06': 'Guía', '07': 'Retención' };
    const estado = { tipo: '01', desde: '', hasta: '' };
    let dep = null, filas = [], cargando = false, error = '', ultimaCarga = 0;

    const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    // 'dd/mm/yyyy' · 'yyyy-mm-dd' (con o sin hora) → 'yyyy-mm-dd'; si no se entiende → ''.
    function fechaISO(v) {
        const s = String(v == null ? '' : v).trim();
        let m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/); if (m) return `${m[3]}-${m[2]}-${m[1]}`;
        m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[1]}-${m[2]}-${m[3]}` : '';
    }
    // ¿Esta fecha entra en el rango elegido? Sin rango, todo entra; con rango, una fecha ilegible no entra.
    function pasaFecha(fecha) {
        if (!estado.desde && !estado.hasta) return true;
        const f = fechaISO(fecha); if (!f) return false;
        return (!estado.desde || f >= estado.desde) && (!estado.hasta || f <= estado.hasta);
    }
    const fmtFecha = v => { const f = fechaISO(v); return f ? `${f.slice(8)}/${f.slice(5, 7)}/${f.slice(0, 4)}` : (v || '-'); };

    const aFilaFactura = f => ({ tipo: '01', numero: f.numero, fechaEmision: f.fechaEmision, cliente: f.cliente || 'CONSUMIDOR FINAL', total: Number(f.total || 0), docSustento: '', estado: f.estadoSri || '' });
    const aFilaComprobante = c => ({ tipo: c.tipo, numero: c.numero, fechaEmision: c.fechaEmision, cliente: c.cliente || '', total: Number(c.total || 0), docSustento: c.docSustento || '', estado: c.estado || '' });

    async function traerTipo(tipo) {
        const resp = await dep.api.fetch('/comprobantes?tipo=' + tipo);
        const data = await resp.json();
        if (!data.ok) throw new Error(data.error || 'No se pudo leer la lista');
        return data.comprobantes.map(aFilaComprobante);
    }

    async function cargar() {
        if (estado.tipo === '01') { filas = []; error = ''; return; }
        const tipos = estado.tipo === 'todos' ? ['04', '05', '06', '07'] : [estado.tipo];
        cargando = true; error = ''; pintar();
        try {
            const listas = await Promise.all(tipos.map(traerTipo));
            filas = [].concat(...listas);
            ultimaCarga = Date.now();
        } catch (e) { filas = []; error = e.message; }
        cargando = false;
    }

    // Filas visibles de la tabla común (tipo ≠ facturas): con el rango aplicado, de la más nueva a la más vieja.
    function visibles() {
        let todas = filas;
        if (estado.tipo === 'todos') todas = todas.concat(dep.obtenerFacturas().map(aFilaFactura));
        return todas.filter(r => pasaFecha(r.fechaEmision))
            .sort((a, b) => (fechaISO(b.fechaEmision) + b.numero).localeCompare(fechaISO(a.fechaEmision) + a.numero));
    }

    function pintarBarra() {
        const caja = document.getElementById('filtros-documentos'); if (!caja) return;
        const estilo = 'background:#0f1117;color:#e2e8f0;border:1px solid #2d3748;border-radius:8px;padding:8px 10px;font-size:12px;';
        caja.innerHTML = `
            <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin-bottom:14px;">
                <label style="display:flex;flex-direction:column;gap:4px;font-size:10px;color:#718096;letter-spacing:1px;">TIPO DE DOCUMENTO
                    <select id="doc-tipo" style="${estilo}">${TIPOS.map(([v, n]) => `<option value="${v}"${v === estado.tipo ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
                <label style="display:flex;flex-direction:column;gap:4px;font-size:10px;color:#718096;letter-spacing:1px;">DESDE
                    <input id="doc-desde" type="date" value="${esc(estado.desde)}" style="${estilo}"></label>
                <label style="display:flex;flex-direction:column;gap:4px;font-size:10px;color:#718096;letter-spacing:1px;">HASTA
                    <input id="doc-hasta" type="date" value="${esc(estado.hasta)}" style="${estilo}"></label>
                <button id="doc-limpiar" type="button" style="${estilo}cursor:pointer;color:#94a3b8;">Limpiar fechas</button>
            </div>
            <div id="doc-resumen" style="font-size:11px;color:#718096;margin:-6px 0 12px;"></div>`;
        document.getElementById('doc-tipo').onchange = e => { estado.tipo = e.target.value; refrescar(); };
        document.getElementById('doc-desde').onchange = e => { estado.desde = e.target.value; repintar(); };
        document.getElementById('doc-hasta').onchange = e => { estado.hasta = e.target.value; repintar(); };
        document.getElementById('doc-limpiar').onclick = () => { estado.desde = ''; estado.hasta = ''; pintarBarra(); repintar(); };
    }

    function pintarTablaComun() {
        const tbody = document.getElementById('tbody-documentos'); if (!tbody) return;
        const aviso = (txt, color = '#4a5568') => `<tr><td colspan="7" style="padding:30px;text-align:center;color:${color};">${txt}</td></tr>`;
        if (cargando) { tbody.innerHTML = aviso('Cargando…'); return; }
        if (error) { tbody.innerHTML = aviso('No se pudo cargar: ' + esc(error), '#f87171'); return; }
        const rows = visibles();
        if (!rows.length) { tbody.innerHTML = aviso('No hay documentos con ese filtro'); return; }
        tbody.innerHTML = rows.map((r, i) => `
            <tr style="border-bottom:1px solid #1a1f2e;${i % 2 === 0 ? 'background:#0f1117' : ''};">
                <td style="padding:10px 12px;color:#e2e8f0;white-space:nowrap;">${esc(fmtFecha(r.fechaEmision))}</td>
                <td style="padding:10px 12px;color:#fbbf24;white-space:nowrap;">${esc(NOMBRE_CORTO[r.tipo] || r.tipo)}</td>
                <td style="padding:10px 12px;color:#60a5fa;white-space:nowrap;font-family:monospace;">${esc(r.numero || '-')}</td>
                <td style="padding:10px 12px;color:#94a3b8;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(r.cliente)}">${esc(r.cliente || '-')}</td>
                <td style="padding:10px 12px;color:#4ade80;text-align:right;font-weight:700;">${r.tipo === '06' ? '-' : '$' + r.total.toFixed(2)}</td>
                <td style="padding:10px 12px;color:#718096;font-family:monospace;font-size:11px;white-space:nowrap;">${esc(r.docSustento || '-')}</td>
                <td style="padding:10px 12px;white-space:nowrap;">${dep.badge(r.estado)}</td>
            </tr>`).join('');
    }

    // Muestra la tabla que corresponde al tipo elegido y la rellena.
    function pintar() {
        const esFact = estado.tipo === '01';
        const verFact = document.getElementById('contenedor-tabla-facturas'), verComun = document.getElementById('contenedor-tabla-documentos');
        if (verFact) verFact.style.display = esFact ? 'block' : 'none';
        if (verComun) verComun.style.display = esFact ? 'none' : 'block';
        if (esFact) dep.pintarFacturas(); else pintarTablaComun();
        const res = document.getElementById('doc-resumen');
        if (res) {
            const n = esFact ? dep.obtenerFacturas().filter(f => pasaFecha(f.fechaEmision)).length : (cargando || error ? 0 : visibles().length);
            res.textContent = cargando ? '' : `${n} documento${n === 1 ? '' : 's'}${estado.desde || estado.hasta ? ' en el rango elegido' : ''}`;
        }
    }
    const repintar = () => pintar();
    async function refrescar() { await cargar(); pintar(); }

    // Excel de lo que se ve (facturas con su exportador de siempre).
    function exportarComunes() {
        const rows = visibles(); if (!rows.length) return;
        const hoja = rows.map(r => ({ 'Fecha': fmtFecha(r.fechaEmision), 'Tipo': NOMBRE_CORTO[r.tipo] || r.tipo, 'Número': r.numero, 'Cliente': r.cliente, 'Total USD': r.total, 'Documento sustento': r.docSustento, 'Estado': String(r.estado).split(':')[0] }));
        const ws = XLSX.utils.json_to_sheet(hoja), wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Documentos SRI');
        XLSX.writeFile(wb, `documentos_sri_${dep.usuario || 'facturador'}.xlsx`);
    }
    const exportar = () => estado.tipo === '01' ? dep.exportarFacturas() : exportarComunes();

    // dependencias: { api, obtenerFacturas(), pintarFacturas(), exportarFacturas(), badge(estado), usuario }
    function iniciar(dependencias) { dep = dependencias; pintarBarra(); pintar(); }
    // Al abrir la pestaña: si el tipo no es facturas, vuelve a pedir al servidor (puede haber documentos nuevos).
    function alAbrir() { if (dep && estado.tipo !== '01') refrescar(); }
    const obtenerEstado = () => Object.assign({}, estado);

    return { iniciar, alAbrir, refrescar, repintar, pasaFecha, fechaISO, exportar, obtenerEstado, TIPOS };
})();
