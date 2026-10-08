/* ══════════════════════════════════════════════════
   COMPROBANTE_UI_CLIENTE.JS — "🖨 Imprimir" de una factura: pide los datos al servidor, deja elegir A4 o ticket
   (como el modal de impresión de CFB: con "Recordar mi elección"), muestra una vista previa y imprime.
   Orquesta las piezas: ComprobanteDatos (datos) · ComprobantePdf / ComprobanteTicket (dibujo) · Impresion (imprimir).
   Uso:  Comprobante.configurar({ emisor: () => EMISOR });   Comprobante.imprimir('001-002-000000423');
   Depende de: Api, Modal, LogoEmpresa (opcional)
══════════════════════════════════════════════════ */
const Comprobante = (() => {
    const NUMERO = /^\d{3}-\d{3}-\d{9}$/;
    let modal = null, emisor = () => ({});

    const configurar = (o) => { if (o && o.emisor) emisor = o.emisor; };
    const ventana = () => modal || (modal = Modal.crear());

    function dibujar(datos, tipo) {
        return tipo === 'ticket'
            ? { html: ComprobanteTicket.html(datos), css: ComprobanteTicket.css, ticket: true, titulo: 'Ticket ' + datos.numero }
            : { html: ComprobantePdf.html(datos), css: ComprobantePdf.css, ticket: false, titulo: 'Factura ' + datos.numero };
    }

    // Formato A4 o ticket; con la preferencia guardada no pregunta.
    function elegir(datos) {
        const m = ventana();
        m.caja.innerHTML = `<h3>🖨 IMPRIMIR FACTURA ${Modal.esc(datos.numero)}</h3>
            <button class="btn" data-a4>📄 Hoja A4 (PDF)</button>
            <button class="btn" data-ticket style="background:#374151">🧾 Ticket (80 mm)</button>
            <label style="display:flex;gap:8px;align-items:center;cursor:pointer;margin-top:14px"><input type="checkbox" data-recordar style="width:auto"> Recordar mi elección</label>
            <button class="btn sec" data-cerrar>Cancelar</button>`;
        const ir = tipo => { if (m.caja.querySelector('[data-recordar]').checked) Impresion.guardarPreferencia(tipo); vistaPrevia(datos, tipo); };
        m.caja.querySelector('[data-a4]').onclick = () => ir('a4');
        m.caja.querySelector('[data-ticket]').onclick = () => ir('ticket');
        m.caja.querySelector('[data-cerrar]').onclick = m.cerrar;
        m.abrir();
    }

    function vistaPrevia(datos, tipo) {
        const m = ventana(), doc = dibujar(datos, tipo);
        m.caja.innerHTML = `<h3>${tipo === 'ticket' ? '🧾 TICKET' : '📄 HOJA A4'} · ${Modal.esc(datos.numero)}</h3>
            <iframe data-vista style="width:100%;height:55vh;border:1px solid #2d3748;border-radius:8px;background:#fff"></iframe>
            <div class="msg" data-msg></div>
            <button class="btn" data-imprimir>🖨 Imprimir / Guardar PDF</button>
            <button class="btn sec" data-otro>Cambiar formato</button>
            <button class="btn sec" data-cerrar>Cerrar</button>`;
        m.caja.querySelector('[data-vista]').srcdoc = Impresion.documento(doc);
        m.caja.querySelector('[data-imprimir]').onclick = () => {
            if (!Impresion.imprimir(doc)) m.caja.querySelector('[data-msg]').textContent = 'El navegador bloqueó la ventana de impresión. Permitila para este sitio e intentá de nuevo.';
        };
        m.caja.querySelector('[data-otro]').onclick = () => { Impresion.olvidarPreferencia(); elegir(datos); };
        m.caja.querySelector('[data-cerrar]').onclick = m.cerrar;
        m.abrir();
    }

    async function imprimir(numero) {
        if (!NUMERO.test(String(numero || ''))) return;
        const m = ventana();
        m.caja.innerHTML = '<h3>🖨 IMPRIMIR FACTURA</h3><div class="msg ok" data-msg>⏳ Preparando la factura…</div><button class="btn sec" data-cerrar>Cerrar</button>';
        m.caja.querySelector('[data-cerrar]').onclick = m.cerrar; m.abrir();
        const r = await Api.json(`/facturas-historial/${encodeURIComponent(numero)}/comprobante`, 'GET').catch(e => ({ ok: false, error: e.message }));
        if (!r.ok) { const el = m.caja.querySelector('[data-msg]'); el.className = 'msg'; el.textContent = '❌ ' + (r.error || 'No se pudo preparar la factura'); return; }
        const logo = (typeof LogoEmpresa !== 'undefined' && LogoEmpresa.actual) ? LogoEmpresa.actual() : null;
        const datos = ComprobanteDatos.armar({ fila: r.fila, xml: r.xml, emisorActual: emisor(), logo });
        const pref = Impresion.preferencia();
        if (pref) vistaPrevia(datos, pref); else elegir(datos);
    }

    return { configurar, imprimir };
})();
