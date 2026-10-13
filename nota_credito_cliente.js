/* ══════════════════════════════════════════════════
   NOTA_CREDITO_CLIENTE.JS — Emitir Notas de Crédito (el listado está en "Listado de Documentos").
   Depende de: Api, Modal, Sesion. El cálculo, la numeración y el envío al
   SRI los hace el servidor (/notas-credito/emitir); aquí solo se pide el
   motivo y el valor, y se muestra el resultado y el listado.
══════════════════════════════════════════════════ */
const NotaCredito = (() => {
    let modal = null, pollTimer = null, pollVeces = 0;
    const esc = Modal.esc;

    function abrir(factura) {
        if (!Api.token()) { Sesion.mostrarLogin(); return; }
        if (!modal) modal = Modal.crear();
        modal.caja.innerHTML = `<h3>NOTA DE CRÉDITO</h3>
            <div class="nota">Sobre la factura <b>${esc(factura.numero)}</b> · $${parseFloat(factura.total || 0).toFixed(2)} · ${esc(factura.cliente || 'CONSUMIDOR FINAL')}</div>
            <label>Motivo (obligatorio)</label><input id="nc-motivo" maxlength="300" placeholder="Ej: devolución, anulación de la venta">
            <label>Valor a acreditar (vacío = todo lo disponible)</label><input id="nc-valor" inputmode="decimal" placeholder="${parseFloat(factura.total || 0).toFixed(2)}">
            <div class="msg"></div>
            <button class="btn" id="nc-emitir">Emitir nota de crédito</button>
            <button class="btn sec" id="nc-cerrar">Cancelar</button>`;
        modal.caja.querySelector('#nc-cerrar').onclick = modal.cerrar;
        modal.caja.querySelector('#nc-emitir').onclick = () => emitir(factura);
        modal.abrir();
    }

    async function emitir(factura) {
        const motivo = modal.caja.querySelector('#nc-motivo').value.trim();
        const valor = modal.caja.querySelector('#nc-valor').value.trim();
        if (!motivo) return modal.msg('Escribe el motivo.');
        const detalle = valor ? `$${valor}` : 'el total disponible';
        if (!confirm(`Se emitirá una nota de crédito por ${detalle} sobre la factura ${factura.numero} y se enviará al SRI. ¿Continuar?`)) return;
        const btn = modal.caja.querySelector('#nc-emitir'); btn.disabled = true;
        modal.msg('⏳ Enviando al SRI…', true);
        const r = await Api.json('/notas-credito/emitir', 'POST', { facturaNum: factura.numero, motivo, valor: valor || undefined }).catch(e => ({ ok: false, error: e.message }));
        if (!r.ok) { btn.disabled = false; return modal.msg('❌ ' + (r.error || 'No se pudo emitir')); }
        modal.msg(`✅ Recibida por el SRI: ${r.numero} ($${Number(r.valor).toFixed(2)}). La autorización se confirma sola en segundo plano.`, true);
        btn.style.display = 'none'; modal.caja.querySelector('#nc-cerrar').textContent = 'Cerrar';
        vigilarPendientes();
    }

    // Tras emitir, refresca el Listado de Documentos unas veces para que la nota pase sola a Autorizado.
    function vigilarPendientes() {
        clearTimeout(pollTimer); pollVeces = 0;
        const paso = async () => {
            pollVeces++;
            if (typeof ListadoDocumentos !== 'undefined') await ListadoDocumentos.refrescar().catch(() => {});
            if (pollVeces < 8) pollTimer = setTimeout(paso, 6000);
        };
        pollTimer = setTimeout(paso, 6000);
    }

    return { abrir };
})();
