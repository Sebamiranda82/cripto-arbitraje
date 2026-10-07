/* ══════════════════════════════════════════════════
   LINEAS_FACTURA_CLIENTE.JS — Productos de la factura que se está armando
   en el modal de factura EXISTENTE (no es otra pantalla).
   Se llenan leyendo un Excel (Nombre, Precio, Iva; Cantidad opcional).
   Depende de: Catalogo (lectura de columnas), IvaCalculo, Modal.esc.
   El navegador solo muestra el total; las reglas (IVA 0/5/15, precios,
   máximo de líneas) las valida el servidor, que es quien arma el XML.
══════════════════════════════════════════════════ */
const LineasFactura = (() => {
    let lineas = [];                  // {descripcion, cantidad, precio, ivaPct}
    let cont = null, alCambiar = () => {};
    const esc = Modal.esc;
    const num = v => Number(String(v).trim().replace(',', '.'));

    function totalLinea(l) {
        try { return IvaCalculo.desglosar(num(l.precio), num(l.ivaPct), Catalogo.incluyeIva, num(l.cantidad)).total; }
        catch (e) { return null; }       // fila inválida: el servidor explicará por qué
    }
    const total = () => IvaCalculo.redondear2(lineas.reduce((s, l) => s + (totalLinea(l) || 0), 0));

    function pintar() {
        if (!cont) return;
        const tabla = cont.querySelector('[data-lineas]');
        if (!lineas.length) { tabla.innerHTML = ''; tabla.style.display = 'none'; alCambiar(); return; }
        tabla.style.display = 'block';
        tabla.innerHTML = lineas.map((l, i) => {
            const t = totalLinea(l);
            return `<div style="display:flex;gap:6px;align-items:center;padding:6px 8px;border-bottom:1px solid #1a1f2e;font-size:12px;color:${t === null ? '#f87171' : '#e2e8f0'}">
              <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(l.descripcion)}</span>
              <input data-cant="${i}" value="${esc(l.cantidad)}" inputmode="decimal" style="width:48px;background:#0f1117;border:1px solid #2d3748;border-radius:6px;color:#e2e8f0;padding:4px;text-align:center">
              <span style="width:56px;text-align:right">$${esc(l.precio)}</span>
              <span style="width:34px;text-align:right;color:#94a3b8">${esc(l.ivaPct)}%</span>
              <b data-tot="${i}" style="width:64px;text-align:right">${t === null ? '—' : '$' + t.toFixed(2)}</b>
              <button data-quitar="${i}" type="button" style="background:none;border:none;color:#f87171;cursor:pointer;font-size:14px">✕</button></div>`;
        }).join('');
        alCambiar();
    }

    async function leerExcel(file) {
        const filas = await Catalogo.filasDesdeExcel(file);
        if (!filas.length) throw new Error('El Excel no tiene productos.');
        lineas = filas.map(f => ({ descripcion: String(f.nombre).trim(), cantidad: f.cantidad === undefined || f.cantidad === '' ? '1' : String(f.cantidad), precio: String(f.precio).trim(), ivaPct: String(f.iva).trim() }));
        pintar();
    }

    function montar(contenedor, onCambio) {
        cont = contenedor; alCambiar = onCambio || alCambiar;
        const archivo = cont.querySelector('[data-archivo]');
        cont.querySelector('[data-leer]').onclick = () => archivo.click();
        archivo.onchange = async ev => {
            const f = ev.target.files[0]; ev.target.value = ''; if (!f) return;
            try { await leerExcel(f); } catch (e) { alert('⚠️ ' + e.message); }
        };
        const tabla = cont.querySelector('[data-lineas]');
        tabla.addEventListener('input', ev => {
            const i = ev.target.dataset.cant; if (i === undefined) return;
            lineas[i].cantidad = ev.target.value;
            const t = totalLinea(lineas[i]);       // se actualiza solo el total de la fila (repintar todo quitaría el foco)
            const b = tabla.querySelector(`[data-tot="${i}"]`); if (b) b.textContent = t === null ? '—' : '$' + t.toFixed(2);
            alCambiar();
        });
        tabla.addEventListener('click', ev => {
            const i = ev.target.dataset.quitar; if (i === undefined) return;
            lineas.splice(Number(i), 1); pintar();
        });
    }

    return {
        montar,
        hay: () => lineas.length > 0,
        total,
        limpiar() { lineas = []; pintar(); },
        // Lo que se manda al servidor en datos.lineas
        paraServidor: () => lineas.map(l => ({ descripcion: l.descripcion, cantidad: l.cantidad, precio: l.precio, ivaPct: l.ivaPct })),
        resumenTexto: () => lineas.map(l => `${l.cantidad} x ${l.descripcion}  $${l.precio} (IVA ${l.ivaPct}%)`).join('\n') +
            `\nTOTAL $${total().toFixed(2)}\n(El XML oficial lo arma el servidor con estas líneas.)`,
    };
})();
