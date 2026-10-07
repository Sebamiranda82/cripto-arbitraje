/* ══════════════════════════════════════════════════
   CONCEPTO_CLIENTE.JS — Campo "Concepto" (nombre del producto/servicio) de una factura de un solo monto.
   Viene precargado con "SERVICIOS PRESTADOS" (el caso del 95 %: comisión por transferencias) y se puede
   editar para el resto. Con productos de Excel (LineasFactura) cada línea trae su propio nombre y este
   campo se bloquea. El servidor vuelve a validarlo (largo, vacío): esto solo lo muestra y lo envía.
══════════════════════════════════════════════════ */
const Concepto = (() => {
    const DEFECTO = 'SERVICIOS PRESTADOS';
    const MAX = 300;                       // mismo límite que valida el servidor
    let el = null;

    function montar(input) {
        el = input;
        el.maxLength = MAX;
        el.value = DEFECTO;
        el.addEventListener('input', () => { el.value = el.value.toUpperCase(); });
    }
    function reiniciar() { if (el) el.value = DEFECTO; }
    // Lo que se envía y se ve en el XML: si lo dejan vacío, vale el de siempre.
    function valor() { return (el && el.value.trim()) || DEFECTO; }
    function bloquear(si) { if (el) el.disabled = !!si; }

    return { montar, reiniciar, valor, bloquear, DEFECTO, MAX };
})();
