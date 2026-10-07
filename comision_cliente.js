/* ══════════════════════════════════════════════════
   COMISION_CLIENTE.JS — Monto a facturar = importe de la transferencia × porcentaje.
   Ej.: transferencia de 100 al 2 % → 2.00. Los tres campos son editables:
     · cambia el importe o el porcentaje → se recalcula el monto (precarga);
     · el monto se puede corregir a mano y NO modifica el importe ni el porcentaje.
   Con productos de Excel (LineasFactura) el monto sale de las líneas y esto no actúa.
   Depende de: IvaCalculo.redondear2, LineasFactura.
══════════════════════════════════════════════════ */
const Comision = (() => {
    const PCT_DEFECTO = 2;
    let el = null;

    const num = v => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : null; };

    // Monto = importe × % / 100, a 2 decimales. null si falta algún dato.
    function calcular(importe, pct) {
        const i = num(importe), p = num(pct);
        if (i === null || p === null || i < 0 || p < 0) return null;
        return IvaCalculo.redondear2(i * p / 100);
    }

    function recalcular() {
        if (!el || LineasFactura.hay()) return;
        const m = calcular(el.importe.value, el.pct.value);
        if (m === null) return;
        el.monto.value = m.toFixed(2);
        el.monto.dispatchEvent(new Event('input'));   // avisa a quien escuche el monto
    }

    function reiniciar() { if (el) el.pct.value = PCT_DEFECTO; }
    function bloquear(bloqueado) { if (el) el.pct.disabled = !!bloqueado; }

    function montar({ importe, pct, monto }) {
        el = { importe, pct, monto };
        pct.value = PCT_DEFECTO;
        importe.addEventListener('input', recalcular);
        pct.addEventListener('input', recalcular);
    }

    return { montar, recalcular, reiniciar, bloquear, calcular, PCT_DEFECTO };
})();
