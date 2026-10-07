/* ══════════════════════════════════════════════════
   NOTA_CREDITO_CLIENTE.JS — Emitir y listar Notas de Crédito.
   Depende de: Api, Modal, Sesion. El cálculo, la numeración y el envío al
   SRI los hace el servidor (/notas-credito/emitir); aquí solo se pide el
   motivo y el valor, y se muestra el resultado y el listado.
══════════════════════════════════════════════════ */
const NotaCredito = (() => {
    let modal = null, tbody = null, badge = x => x, pollTimer = null, pollVeces = 0;
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
        recargar(); vigilarPendientes();
    }

    async function recargar() {
        if (!tbody) return null;
        if (!Api.token()) { tbody.innerHTML = filaMensaje('Ingresa con tu cuenta para ver tus notas de crédito.'); return null; }
        const r = await Api.json('/notas-credito', 'GET').catch(e => ({ ok: false, error: e.message }));
        if (!r.ok) { tbody.innerHTML = filaMensaje(esc(r.error || 'No se pudo cargar')); return null; }
        tbody.innerHTML = r.data.length ? r.data.map(n => `
            <tr style="border-bottom:1px solid #1a1f2e">
                <td style="padding:10px 12px;color:#60a5fa;font-family:monospace;white-space:nowrap">${esc(n.num)}</td>
                <td style="padding:10px 12px;color:#94a3b8;font-family:monospace;white-space:nowrap">${esc(n.factura_ref_num)}</td>
                <td style="padding:10px 12px;color:#94a3b8;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(n.cliente_raz)}</td>
                <td style="padding:10px 12px;color:#4ade80;text-align:right;font-weight:700">$${Number(n.total).toFixed(2)}</td>
                <td style="padding:10px 12px;white-space:nowrap">${badge(n.estado)}</td>
            </tr>`).join('') : filaMensaje('Todavía no emitiste notas de crédito.');
        return r.data;
    }
    const filaMensaje = txt => `<tr><td colspan="5" style="padding:30px;text-align:center;color:#4a5568">${txt}</td></tr>`;

    // Mientras haya notas RECIBIDA_PENDIENTE, refresca cada 6 s (hasta ~2 min) sin molestar.
    function vigilarPendientes() {
        clearTimeout(pollTimer); pollVeces = 0;
        const paso = async () => {
            const filas = await recargar();
            pollVeces++;
            if (filas && filas.some(n => n.estado === 'RECIBIDA_PENDIENTE') && pollVeces < 20) pollTimer = setTimeout(paso, 6000);
        };
        pollTimer = setTimeout(paso, 6000);
    }

    function montarPanel(cont, opciones) {
        badge = (opciones && opciones.badge) || badge;
        cont.innerHTML = `
        <div style="background:#1a1f2e;border:1px solid #2d3748;border-radius:16px;padding:20px">
          <div style="font-size:13px;font-weight:700;color:#94a3b8;letter-spacing:2px;margin-bottom:6px">NOTAS DE CRÉDITO</div>
          <div style="font-size:11px;color:#718096;margin-bottom:16px">Para emitir una, usa el botón ↩ NC en la fila de la factura.</div>
          <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
            <thead><tr style="background:#0f1117;color:#94a3b8;text-align:left">
              <th style="padding:10px 12px">Número</th><th style="padding:10px 12px">Factura</th><th style="padding:10px 12px">Cliente</th>
              <th style="padding:10px 12px;text-align:right">Total</th><th style="padding:10px 12px">Estado</th></tr></thead>
            <tbody id="tbody-notas"></tbody></table></div>
        </div>`;
        tbody = cont.querySelector('#tbody-notas');
        tbody.innerHTML = filaMensaje('Cargando…');
        window.addEventListener('sesion-lista', () => { recargar(); });
        window.addEventListener('sesion-cerrada', () => { tbody.innerHTML = filaMensaje('Ingresa con tu cuenta para ver tus notas de crédito.'); });
    }

    return { abrir, montarPanel, recargar };
})();
